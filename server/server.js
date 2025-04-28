// db/server/server.js
const express = require('express');
const path = require('path');
const cors = require('cors');
const router = require('./routes');
const { poolPromise } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Verificar la conexión a la base de datos al iniciar
async function testDatabaseConnection() {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT 1 AS test');
    console.log('Conexión a la base de datos verificada correctamente');
  } catch (err) {
    console.error('ERROR CRÍTICO: No se pudo verificar la conexión a la base de datos:', err);
    process.exit(1);
  }
}

// Configuración del servidor
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Rutas
app.use(router);

// Iniciar servidor
app.listen(PORT, async () => {
  console.log(`Servidor iniciado en http://localhost:${PORT}`);
  await testDatabaseConnection();
});