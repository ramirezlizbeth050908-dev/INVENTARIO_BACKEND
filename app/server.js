const http = require('node:http');
const { URL } = require('node:url');
const { Pool } = require('pg');

const port = Number(process.env.PORT || 8000);
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://api:api_local_password@db:5432/api_db' });

async function initializeDatabase() {
  for (let attempt = 1; attempt <= 30; attempt++) {
    try {
      await pool.query(`CREATE TABLE IF NOT EXISTS items (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        description TEXT
      )`);
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
