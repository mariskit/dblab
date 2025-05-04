const express = require('express');
const { poolPromise, sql } = require('./db'); // Asegúrate de importar sql aquí
const router = express.Router();

router.get('/api/global-time-series', async (req, res) => {
  try {
    const { metric, period } = req.query;
    const validMetrics = ['TotalCases', 'NewCases', 'TotalDeaths', 'NewDeaths', 'TotalVaccinations'];
    
    if (!validMetrics.includes(metric)) {
      return res.status(400).json({ error: 'Métrica no válida' });
    }

    // Configurar timeout extendido
    const pool = await poolPromise;
    pool.config.requestTimeout = 30000;

    if (metric.startsWith('Total')) {
      // Consulta optimizada para métricas acumulativas
      const result = await pool.request().query(`
        -- Paso 1: Obtener el último valor no nulo por país y fecha
        WITH UltimosValores AS (
          SELECT 
            CountryCode,
            RecordDate,
            ${metric},
            ROW_NUMBER() OVER (
              PARTITION BY CountryCode, CAST(RecordDate AS DATE)
              ORDER BY RecordDate DESC
            ) AS rn
          FROM CovidData
          WHERE ${metric} IS NOT NULL AND ${metric} > 0
          ${period === 'lastYear' ? "AND RecordDate >= DATEADD(YEAR, -1, GETDATE())" : ""}
          ${period === 'last6Months' ? "AND RecordDate >= DATEADD(MONTH, -6, GETDATE())" : ""}
        )
        
        -- Paso 2: Sumar por fecha y calcular máximo acumulado
        SELECT 
          FORMAT(RecordDate, 'yyyy-MM-dd') AS RecordDate,
          SUM(CAST(${metric} AS FLOAT)) AS ${metric}
        FROM UltimosValores
        WHERE rn = 1
        GROUP BY RecordDate
        ORDER BY RecordDate
      `);

      // Procesamiento para asegurar no decrecimiento
      let maxValue = 0;
      const processedData = result.recordset.map(item => {
        maxValue = Math.max(maxValue, item[metric] || 0);
        return {
          RecordDate: item.RecordDate,
          [metric]: maxValue
        };
      });

      res.json(processedData);
    } else {
      // Consulta para métricas diarias (NewCases, NewDeaths)
      const result = await pool.request().query(`
        SELECT 
          FORMAT(RecordDate, 'yyyy-MM-dd') AS RecordDate,
          SUM(CAST(${metric} AS FLOAT)) AS ${metric}
        FROM CovidData
        WHERE ${metric} IS NOT NULL
        ${period === 'lastYear' ? "AND RecordDate >= DATEADD(YEAR, -1, GETDATE())" : ""}
        ${period === 'last6Months' ? "AND RecordDate >= DATEADD(MONTH, -6, GETDATE())" : ""}
        GROUP BY RecordDate
        ORDER BY RecordDate
      `);

      res.json(result.recordset);
    }
  } catch (err) {
    console.error('Error en global-time-series:', err);
    res.status(500).json({ 
      error: 'Error en el servidor',
      details: 'Por favor, intente con un rango de fechas más pequeño'
    });
  }
});
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
      -- 1. Encontrar la última fecha con valor > 0 para cada país
      WITH UltimosValidos AS (
        SELECT 
            CountryCode,
            MAX(RecordDate) AS UltimaFecha
        FROM CovidData
        WHERE ${metric} > 0  -- Solo valores mayores que cero
        ${dateCondition}
        GROUP BY CountryCode
      ),
      
      -- 2. Obtener los valores correspondientes a esas fechas
      DatosFiltrados AS (
        SELECT 
          cd.CountryCode,
          c.CountryName,
          CAST(cd.${metric} AS FLOAT) AS value,
          cd.RecordDate
        FROM CovidData cd
        JOIN UltimosValidos uv ON cd.CountryCode = uv.CountryCode AND cd.RecordDate = uv.UltimaFecha
        JOIN Countries c ON cd.CountryCode = c.CountryCode
        WHERE cd.${metric} > 0  -- Doble verificación
      )
      
      -- 3. Unir con todos los países para mantener consistencia
      SELECT 
        c.CountryName,
        COALESCE(df.value, 0) AS value
      FROM Countries c
      LEFT JOIN DatosFiltrados df ON c.CountryName = df.CountryName
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