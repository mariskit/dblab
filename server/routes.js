const express = require('express');
const { poolPromise, sql } = require('./db'); // Asegúrate de importar sql aquí
const router = express.Router();

// Ruta para obtener estadísticas globales actualizada
router.get('/api/stats', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      -- Paso 1: obtener los máximos por país
      WITH maximos_por_pais AS (
          SELECT 
              CountryCode,
              MAX(TRY_CAST(TotalCases AS BIGINT)) AS max_cases,
              MAX(TRY_CAST(TotalDeaths AS BIGINT)) AS max_deaths,
              MAX(TRY_CAST(TotalVaccinations AS BIGINT)) AS max_vaccinations,
              MAX(RecordDate) AS last_update
          FROM dbo.CovidData
          GROUP BY CountryCode
      )

      -- Paso 2: sumar los totales y obtener la fecha más reciente
      SELECT 
          SUM(max_cases) AS totalCases,
          SUM(max_deaths) AS totalDeaths,
          SUM(max_vaccinations) AS totalVaccinations,
          MAX(last_update) AS lastDate
      FROM maximos_por_pais
    `);
    
    const stats = {
      lastDate: result.recordset[0]?.lastDate || 'N/A',
      totalCases: result.recordset[0]?.totalCases || 0,
      totalDeaths: result.recordset[0]?.totalDeaths || 0,
      totalVaccinations: result.recordset[0]?.totalVaccinations || 0
    };
    
    res.json(stats);
  } catch (err) {
    console.error('Error en consulta SQL:', err);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: err.message
    });
  }
});

// Ruta para series temporales actualizada
router.get('/api/time-series', async (req, res) => {
  try {
    const { country, metric, period } = req.query;
    const validMetrics = ['TotalCases', 'NewCases', 'TotalDeaths', 'NewDeaths', 'TotalVaccinations'];
    
    if (!validMetrics.includes(metric)) {
      return res.status(400).json({ error: 'Invalid metric parameter' });
    }

    let dateCondition = '';
    if (period === 'lastYear') {
      dateCondition = 'AND RecordDate >= DATEADD(YEAR, -1, GETDATE())';
    } else if (period === 'last6Months') {
      dateCondition = 'AND RecordDate >= DATEADD(MONTH, -6, GETDATE())';
    }

    const pool = await poolPromise;
    let query = `
      SELECT 
        c.CountryName,
        FORMAT(cd.RecordDate, 'yyyy-MM-dd') AS RecordDate,
        CAST(cd.${metric} AS FLOAT) AS Value
      FROM CovidData cd
      JOIN Countries c ON cd.CountryCode = c.CountryCode
      WHERE cd.${metric} IS NOT NULL
      ${country ? 'AND c.CountryName = @country' : ''}
      ${dateCondition}
      ORDER BY cd.RecordDate
    `;

    const request = pool.request();
    if (country) request.input('country', sql.NVarChar, country);

    const result = await request.query(query);
    
    const formattedData = result.recordset.map(item => ({
      CountryName: item.CountryName,
      RecordDate: item.RecordDate,
      [metric]: item.Value
    }));
    
    res.json(formattedData);
  } catch (err) {
    console.error('Error en time-series:', {
      message: err.message,
      stack: err.stack,
      query: err.query || 'No query information'
    });
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: err.message
    });
  }
});

// Ruta para datos geográficos actualizada
router.get('/api/geo-data', async (req, res) => {
  try {
    const { metric, period } = req.query;
    const validMetrics = ['TotalCases', 'TotalDeaths', 'TotalVaccinations'];
    
    if (!validMetrics.includes(metric)) {
      return res.status(400).json({ error: 'Invalid metric parameter' });
    }

    let dateCondition = '';
    if (period === 'lastYear') {
      dateCondition = 'AND RecordDate >= DATEADD(YEAR, -1, GETDATE())';
    } else if (period === 'last6Months') {
      dateCondition = 'AND RecordDate >= DATEADD(MONTH, -6, GETDATE())';
    }

    const pool = await poolPromise;
    const result = await pool.request().query(`
      -- Obtenemos los últimos datos para cada país
      WITH UltimosDatos AS (
        SELECT 
            CountryCode,
            MAX(RecordDate) AS UltimaFecha
        FROM CovidData
        WHERE ${metric} IS NOT NULL
        ${dateCondition}
        GROUP BY CountryCode
      ),
      
      -- Obtenemos los valores más recientes para la métrica seleccionada
      DatosRecientes AS (
        SELECT 
          cd.CountryCode,
          c.CountryName,
          CAST(cd.${metric} AS FLOAT) AS value
        FROM CovidData cd
        JOIN UltimosDatos ud ON cd.CountryCode = ud.CountryCode AND cd.RecordDate = ud.UltimaFecha
        JOIN Countries c ON cd.CountryCode = c.CountryCode
      )
      
      -- Combinamos con todos los países para asegurarnos de incluirlos todos
      SELECT 
        c.CountryName,
        COALESCE(dr.value, 0) AS value
      FROM Countries c
      LEFT JOIN DatosRecientes dr ON c.CountryName = dr.CountryName
      ORDER BY c.CountryName
    `);
    
    res.json(result.recordset);
  } catch (err) {
    console.error('Error en geo-data:', {
      message: err.message,
      stack: err.stack,
      query: err.query || 'No query information'
    });
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: err.message
    });
  }
});

// Ruta para lista de países actualizada
router.get('/api/countries', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT CountryName 
      FROM Countries
      ORDER BY CountryName
    `);
    res.json(result.recordset.map(item => item.CountryName));
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Ruta para tasa de mortalidad actualizada
router.get('/api/mortality-rate', async (req, res) => {
  try {
    const { period } = req.query;
    
    let dateCondition = '';
    if (period === 'lastYear') {
      dateCondition = 'AND RecordDate >= DATEADD(YEAR, -1, GETDATE())';
    } else if (period === 'last6Months') {
      dateCondition = 'AND RecordDate >= DATEADD(MONTH, -6, GETDATE())';
    }

    const pool = await poolPromise;
    const result = await pool.request().query(`
      WITH UltimosDatos AS (
        SELECT 
            CountryCode,
            MAX(RecordDate) AS UltimaFecha
        FROM CovidData
        WHERE TotalCases > 0 AND TotalDeaths > 0
        ${dateCondition}
        GROUP BY CountryCode
      )
      SELECT 
        c.CountryName,
        cd.TotalCases,
        cd.TotalDeaths,
        CASE 
          WHEN cd.TotalCases > 0 THEN (cd.TotalDeaths * 100.0 / cd.TotalCases)
          ELSE 0 
        END AS MortalityRate
      FROM CovidData cd
      JOIN UltimosDatos ud ON cd.CountryCode = ud.CountryCode AND cd.RecordDate = ud.UltimaFecha
      JOIN Countries c ON cd.CountryCode = c.CountryCode
      WHERE cd.TotalCases > 10000
      ORDER BY MortalityRate DESC
    `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).send(err.message);
  }
});
module.exports = router