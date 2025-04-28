// test-covid-data.js
const sql = require('mssql');

async function testCovidData() {
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
      encrypt: true
    }
  };

  try {
    await sql.connect(config);
    const result = await sql.query`SELECT TOP 5 * FROM CovidData`;
    console.log('Datos de CovidData:', result.recordset);
  } catch (err) {
    console.error('Error al consultar CovidData:', err);
  } finally {
    await sql.close();
  }
}

testCovidData();