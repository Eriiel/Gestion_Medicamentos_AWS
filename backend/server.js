const express = require('express');
const fs = require('fs');
const { Pool } = require('pg');

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;

// Conexión a RDS: todo llega por variables de entorno / Secrets Manager
const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true'
    ? { ca: fs.readFileSync('/app/global-bundle.pem', 'utf8') }
    : false,
});

const COLS = `id, nombre, principio_activo, presentacion, lote,
  to_char(fecha_vencimiento, 'YYYY-MM-DD') AS fecha_vencimiento,
  stock, requiere_receta, creado_en`;

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS medicamentos (
      id                SERIAL PRIMARY KEY,
      nombre            VARCHAR(120) NOT NULL,
      principio_activo  VARCHAR(120) NOT NULL,
      presentacion      VARCHAR(60)  NOT NULL,
      lote              VARCHAR(40)  NOT NULL,
      fecha_vencimiento DATE         NOT NULL,
      stock             INTEGER      NOT NULL CHECK (stock >= 0),
      requiere_receta   BOOLEAN      NOT NULL DEFAULT FALSE,
      creado_en         TIMESTAMP    NOT NULL DEFAULT NOW()
    )`);
  console.log('Tabla medicamentos lista en RDS');
}

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'conectada' });
  } catch (e) {
    res.status(503).json({ status: 'error', db: e.message });
  }
});

// INSERT
app.post('/api/medicamentos', async (req, res) => {
  const { nombre, principio_activo, presentacion, lote,
          fecha_vencimiento, stock, requiere_receta } = req.body;
  if (!nombre || !principio_activo || !presentacion || !lote ||
      !fecha_vencimiento || stock === undefined || stock === '') {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO medicamentos
         (nombre, principio_activo, presentacion, lote, fecha_vencimiento, stock, requiere_receta)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING ${COLS}`,
      [nombre, principio_activo, presentacion, lote, fecha_vencimiento,
       Number(stock), Boolean(requiere_receta)]);
    console.log(`INSERT medicamento id=${rows[0].id} (${rows[0].nombre})`);
    res.status(201).json(rows[0]);
  } catch (e) {
    console.error('Error INSERT:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// SELECT (listado con búsqueda)
app.get('/api/medicamentos', async (req, res) => {
  try {
    const q = `%${req.query.q || ''}%`;
    const { rows } = await pool.query(
      `SELECT ${COLS} FROM medicamentos
       WHERE nombre ILIKE $1 OR principio_activo ILIKE $1
       ORDER BY id DESC`, [q]);
    console.log(`SELECT medicamentos -> ${rows.length} registro(s)`);
    res.json(rows);
  } catch (e) {
    console.error('Error SELECT:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// SELECT por id
app.get('/api/medicamentos/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT ${COLS} FROM medicamentos WHERE id = $1`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Medicamento no encontrado' });
    console.log(`SELECT medicamento id=${req.params.id}`);
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, async () => {
  console.log(`API farmacia escuchando en puerto ${PORT}`);
  for (let i = 1; i <= 10; i++) {
    try { await initDb(); return; }
    catch (e) {
      console.error(`Intento ${i} de conexión a RDS falló: ${e.message}`);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
});
