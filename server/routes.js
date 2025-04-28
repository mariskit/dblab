const express = require('express');
const router = express.Router();
const { poolPromise, sql } = require('./db');

// Middleware para manejo de errores
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// los json van a app.js
// Obtener lista de países con datos
router.get('/api/countries', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT DISTINCT c.CountryCode, c.CountryName 
      FROM Countries c
      JOIN CovidData cd ON c.CountryCode = cd.CountryCode
      WHERE cd.TotalCases > 0
      ORDER BY c.CountryName
    `);
    
    if (!result.recordset.length) {
      return res.status(404).json({ message: 'No se encontraron países' });
    }
    
    res.json(result.recordset);
  } catch (err) {
    console.error('Error en /api/countries:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener datos resumidos
router.get('/api/summary', asyncHandler(async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      WITH LatestData AS (
        SELECT 
          CountryCode,
          TotalCases,
          TotalDeaths,
          TotalVaccinations,
          ROW_NUMBER() OVER (PARTITION BY CountryCode ORDER BY RecordDate DESC) AS rn
        FROM CovidData
        WHERE TotalCases > 0
      )
      SELECT 
        SUM(CAST(TotalCases AS BIGINT)) AS globalCases,
        SUM(CAST(TotalDeaths AS BIGINT)) AS globalDeaths,
        SUM(CAST(TotalVaccinations AS BIGINT)) AS globalVaccinations,
        MAX((SELECT MAX(RecordDate) FROM CovidData)) AS lastUpdated
      FROM LatestData
      WHERE rn = 1
    `);

    if (!result.recordset[0]) {
      return res.status(404).json({ error: "No se encontraron datos globales" });
    }

    const { globalCases, globalDeaths, globalVaccinations, lastUpdated } = result.recordset[0];

    res.json({
      totals: {
        cases: globalCases || 0,
        deaths: globalDeaths || 0,
        vaccinations: globalVaccinations || 0
      },
      lastUpdated
    });

  } catch (error) {
    console.error('Error en /api/summary:', error);
    res.status(500).json({ 
      error: "Error al calcular totales globales",
      details: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
}));

// Obtener series temporales por país
router.get('/api/timeseries/:countryCode', asyncHandler(async (req, res) => {
  const { countryCode } = req.params;
  const { startDate, endDate } = req.query;
  
  const pool = await poolPromise;
  const request = pool.request()
    .input('countryCode', sql.VarChar(3), countryCode.toUpperCase());

  let query = `
    SELECT 
      CONVERT(VARCHAR(10), RecordDate, 120) AS date,
      TotalCases,
      NewCases,
      TotalDeaths,
      NewDeaths,
      TotalVaccinations,
      CAST(ROUND(TotalCases*1000.0/NULLIF(Population,0), 2) AS cases_per_thousand
    FROM CovidData cd
    JOIN Countries c ON cd.CountryCode = c.CountryCode
    WHERE cd.CountryCode = @countryCode
      AND cd.TotalCases > 0
  `;

  // Filtros opcionales de fecha
  if (startDate) {
    query += ` AND RecordDate >= @startDate`;
    request.input('startDate', sql.Date, startDate);
  }
  
  if (endDate) {
    query += ` AND RecordDate <= @endDate`;
    request.input('endDate', sql.Date, endDate);
  }

  query += ` ORDER BY RecordDate`;

  try {
    const result = await request.query(query);
    
    if (!result.recordset.length) {
      return res.status(404).json({ 
        error: 'No se encontraron datos',
        details: `País: ${countryCode}` 
      });
    }

    res.json(result.recordset);
  } catch (err) {
    console.error('Error en timeseries:', {
      query: query,
      params: { countryCode, startDate, endDate },
      error: err
    });
    
    res.status(500).json({ 
      error: 'Error al obtener series temporales',
      details: process.env.NODE_ENV === 'development' ? err.message : null
    });
  }
}));

// Obtener datos para mapa
router.get('/api/map-data', asyncHandler(async (req, res) => {
  const pool = await poolPromise;
  const result = await pool.request().query(`
    WITH LatestData AS (
      SELECT 
        c.CountryCode,
        c.CountryName,
        cd.TotalCases,
        cd.TotalDeaths,
        cd.TotalVaccinations,
        c.Population,
        ROW_NUMBER() OVER (PARTITION BY c.CountryCode ORDER BY cd.RecordDate DESC) AS rn
      FROM Countries c
      JOIN CovidData cd ON c.CountryCode = cd.CountryCode
      WHERE cd.TotalCases > 0
    )
    SELECT 
      CountryName,
      CountryCode,
      TotalCases,
      TotalDeaths,
      TotalVaccinations,
      Population,
      (TotalCases*1000.0/Population) AS CasesPerThousand,
      (TotalDeaths*1000.0/Population) AS DeathsPerThousand
    FROM LatestData
    WHERE rn = 1
  `);
  
  res.json(result.recordset);
}));

// Manejo centralizado de errores
router.use((err, req, res, next) => {
  console.error('Error en API:', err);
  res.status(500).json({ 
    error: 'Error interno del servidor',
    details: process.env.NODE_ENV === 'development' ? err.message : null
  });
});

module.exports = router;