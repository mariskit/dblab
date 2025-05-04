const sql = require('mssql');

const config = {
  server: process.env.DB_SERVER,
  authentication: {
    type: 'default',
    options: {
      userName: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    }
  },
  options: {
    database: process.env.DB_NAME,
    encrypt: true, // SSL obligatorio en Azure
    trustServerCertificate: false, // Para producción
    requestTimeout: 30000, // 30 segundos
    connectionTimeout: 30000
  }
};

const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then(pool => {
    console.log('Conexión exitosa a SQL Server');
    return pool;
  })
  .catch(err => {
    console.error('Error de conexión:', err);
    throw err;
  });

module.exports = { poolPromise, sql };