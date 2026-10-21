const http = require('node:http');
const { URL } = require('node:url');
const { Pool } = require('pg');

const port = Number(process.env.PORT || 8000);
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://api:api_local_password@db:5432/api_db' });
const demoProducts = [
  ['Cuaderno profesional', 'Cuaderno de 100 hojas'],
  ['Bolígrafo azul', 'Bolígrafo de tinta azul'],
  ['Lápiz HB', 'Lápiz de grafito HB'],
  ['Borrador blanco', 'Borrador para lápiz'],
  ['Regla 30 cm', 'Regla escolar de 30 centímetros'],
  ['Sacapuntas doble', 'Sacapuntas con depósito para lápices'],
  ['Marcador negro', 'Marcador permanente de tinta negra'],
  ['Marcador rojo', 'Marcador permanente de tinta roja'],
  ['Resaltador amarillo', 'Resaltador fluorescente amarillo'],
  ['Resaltador verde', 'Resaltador fluorescente verde'],
  ['Tijeras escolares', 'Tijeras de punta redonda'],
  ['Pegamento en barra', 'Adhesivo escolar en barra'],
  ['Cinta adhesiva', 'Rollo de cinta transparente'],
  ['Carpeta azul', 'Carpeta tamaño carta color azul'],
  ['Carpeta roja', 'Carpeta tamaño carta color rojo'],
  ['Juego de geometría', 'Kit escolar de geometría con transportador'],
  ['Papel bond', 'Paquete de hojas blancas tamaño carta'],
  ['Notas adhesivas', 'Bloc de notas adhesivas amarillas'],
  ['Corrector líquido', 'Corrector líquido de secado rápido'],
  ['Plumón verde', 'Plumón escolar de tinta verde'],
  ['Plumón morado', 'Plumón escolar de tinta morada'],
  ['Engrapadora', 'Engrapadora compacta para oficina'],
  ['Caja de grapas', 'Grapas estándar para engrapadora'],
  ['Clips metálicos', 'Caja con clips metálicos'],
  ['Calculadora básica', 'Calculadora escolar de operaciones básicas']
];

async function seedDemoProducts() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(78399101)');
    const marker = await client.query("SELECT 1 FROM api_meta WHERE key = 'demo_products_v1'");
    if (marker.rowCount === 0) {
      const count = await client.query('SELECT COUNT(*)::int AS count FROM items');
      if (count.rows[0].count === 0) {
        const values = demoProducts.flatMap(([name, description], index) => [index + 1, name, description]);
        const placeholders = demoProducts.map((_, index) => {
          const first = index * 3 + 1;
          return `($${first}, $${first + 1}, $${first + 2})`;
        }).join(', ');
        await client.query(`INSERT INTO items(id, name, description) VALUES ${placeholders}`, values);
        await client.query("SELECT setval(pg_get_serial_sequence('items', 'id'), $1, true)", [demoProducts.length]);
        console.log(`Cargados ${demoProducts.length} productos de ejemplo`);
      }
      await client.query("INSERT INTO api_meta(key) VALUES ('demo_products_v1') ON CONFLICT DO NOTHING");
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function initializeDatabase() {
  for (let attempt = 1; attempt <= 30; attempt++) {
    try {
      await pool.query(`CREATE TABLE IF NOT EXISTS items (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        description TEXT
      )`);
      await pool.query(`CREATE TABLE IF NOT EXISTS api_meta (
        key TEXT PRIMARY KEY,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);
      await seedDemoProducts();
      return;
    } catch (error) {
      if (attempt === 30) throw error;
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}

function send(res, status, data) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(data === undefined ? '' : JSON.stringify(data));
}

async function readJson(req) {
  let body = '';
  for await (const chunk of req) body += chunk;
  try { return JSON.parse(body || '{}'); }
  catch { const error = new Error('Invalid JSON'); error.status = 400; throw error; }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const path = url.pathname;

  try {
    if (req.method === 'GET' && path === '/health') {
      await pool.query('SELECT 1');
      return send(res, 200, { status: 'ok', database: 'connected' });
    }

    if (req.method === 'GET' && path === '/items') {
      const limit = Math.min(500, Math.max(1, Number(url.searchParams.get('limit') || 100)));
      const offset = Math.max(0, Number(url.searchParams.get('offset') || 0));
      const result = await pool.query('SELECT id, name, description FROM items ORDER BY id LIMIT $1 OFFSET $2', [limit, offset]);
      return send(res, 200, result.rows);
    }

    if (req.method === 'POST' && path === '/items') {
      const body = await readJson(req);
      if (typeof body.name !== 'string' || !body.name.trim() || body.name.length > 200) return send(res, 400, { detail: 'name es requerido (máximo 200 caracteres)' });
      const result = await pool.query('INSERT INTO items(name, description) VALUES ($1, $2) RETURNING id, name, description', [body.name.trim(), body.description ?? null]);
      return send(res, 201, result.rows[0]);
    }

    const match = path.match(/^\/items\/(\d+)$/);
    if (match) {
      const id = Number(match[1]);
      if (req.method === 'GET') {
        const result = await pool.query('SELECT id, name, description FROM items WHERE id = $1', [id]);
        return result.rowCount ? send(res, 200, result.rows[0]) : send(res, 404, { detail: 'Item not found' });
      }
      if (req.method === 'PUT') {
        const body = await readJson(req);
        if (typeof body.name !== 'string' || !body.name.trim() || body.name.length > 200) return send(res, 400, { detail: 'name es requerido (máximo 200 caracteres)' });
        const result = await pool.query('UPDATE items SET name = $1, description = $2 WHERE id = $3 RETURNING id, name, description', [body.name.trim(), body.description ?? null, id]);
        return result.rowCount ? send(res, 200, result.rows[0]) : send(res, 404, { detail: 'Item not found' });
      }
      if (req.method === 'DELETE') {
        const result = await pool.query('DELETE FROM items WHERE id = $1', [id]);
        return result.rowCount ? send(res, 204) : send(res, 404, { detail: 'Item not found' });
      }
    }

    return send(res, 404, { detail: 'Not found' });
  } catch (error) {
    return send(res, error.status || 500, { detail: error.status ? error.message : 'Internal server error' });
  }
});

initializeDatabase().then(() => {
  server.listen(port, '0.0.0.0', () => console.log(`API escuchando en el puerto ${port}`));
}).catch((error) => {
  console.error('No se pudo inicializar PostgreSQL:', error.message);
  process.exit(1);
});

process.on('SIGTERM', async () => { server.close(); await pool.end(); process.exit(0); });

