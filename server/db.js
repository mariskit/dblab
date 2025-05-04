
// db.js para local
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
    trustServerCertificate: false
  }
};

const pool = new sql.ConnectionPool(config);
const poolPromise = pool.connect()
  .then(() => {
    console.log('Conexión a SQL Server exitosa');
    return pool;
  })
  .catch(err => {
    console.error('Error de conexión a la base de datos:', err);
    process.exit(1);
  });

// Exporta tanto poolPromise como sql
module.exports = {
  poolPromise,
  sql
};