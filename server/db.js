// db/server/db.js
const sql = require('mssql');

const config = {
  server: 'covid-dashboard-sql-server.database.windows.net',
  authentication: {
    type: 'default',
    options: {
      userName: 'covidadmin',
      password: 'P4ssw0rd!Seguro'
    }
  },
  options: {
    database: 'covid-dashboard-db',
    encrypt: true,
    trustServerCertificate: false,
    connectTimeout: 30000,
    requestTimeout: 30000,
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000
    }
  }
};

// Función para probar la conexión
async function testConnection() {
  try {
    console.log('Intentando conectar a la base de datos...');
    const pool = await sql.connect(config);
    const result = await pool.request().query('SELECT 1 AS test');
    console.log('Conexión exitosa:', result.recordset);
    return pool;
  } catch (err) {
    console.error('Error de conexión:');
    console.error('- Código:', err.code);
    console.error('- Mensaje:', err.message);
    
    if (err.originalError) {
      console.error('- Error original:', err.originalError.message);
      console.error('- Número de error SQL:', err.originalError.number);
    }
    
    throw err; // Re-lanzar el error para manejo adicional
  }
}

// Conexión inicial
const poolPromise = testConnection()
  .then(pool => {
    console.log('Conexión establecida correctamente');
    return pool;
  })
  .catch(err => {
    console.error('No se pudo conectar a la base de datos');
    process.exit(1);
  });

module.exports = {
  sql, poolPromise
};