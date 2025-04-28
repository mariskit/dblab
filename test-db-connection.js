const sql = require('mssql');

async function testConnection() {
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

  try {
    console.log('Intentando conectar...');
    await sql.connect(config);
    
    console.log('Conectado. Probando consulta...');
    const result = await sql.query`SELECT TOP 5 * FROM Countries`;
    console.log('Resultado de prueba:', result.recordset);
    
    await sql.close();
    console.log('Conexión cerrada. Prueba exitosa!');
  } catch (err) {
    console.error('ERROR DETALLADO:');
    console.error('Código:', err.code);
    console.error('Mensaje:', err.message);
    
    if (err.originalError) {
      console.error('Error original:', err.originalError.message);
      console.error('Número de error SQL:', err.originalError.number);
    }
    
    if (err.originalError?.info) {
      console.error('Información adicional:', err.originalError.info);
    }
  }
}

testConnection();