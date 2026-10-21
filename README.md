# Mi proyecto: desarrollo e implementación de sistemas de información

## API REST de inventario (Node.js + PostgreSQL)

API CRUD para recursos `items`, empaquetada con Docker y lista para n8n y Render.

### Ejecutar con Docker Compose

```powershell
docker compose up --build -d
```

- API: http://localhost:8000
- Salud y conexión a PostgreSQL: http://localhost:8000/health
- n8n: http://localhost:5678

Endpoints: `GET/POST /items`, `GET/PUT/DELETE /items/{id}`. Los datos se conservan en `postgres_data`; n8n conserva su configuración en `n8n_data`.

Para que n8n devuelva un registro distinto al cambiar el ID, importa el flujo y modifica el campo `id` del nodo **Cambiar ID aquí**. El nodo HTTP consulta `GET /items/{id}`. Cada `POST /items` crea un registro nuevo y PostgreSQL le asigna el siguiente ID; consulta `GET /items` para ver los IDs existentes.

Ejemplo para crear un registro:

```json
{ "name": "Producto de ejemplo", "description": "Registro nuevo" }
```

Envíalo con `POST http://localhost:8000/items` (o la URL pública de Render cuando esté desplegada). Después usa el `id` devuelto en n8n.

### n8n

Importa `n8n/n8n-items-workflow.json`. El nodo HTTP consulta `http://api:8000/items/{id}` dentro de Docker Compose usando el valor del nodo **Cambiar ID aquí**.

### Render

El Blueprint `render.yaml` crea el servicio web y PostgreSQL administrado. Conecta este repositorio y despliega el Blueprint para obtener la URL pública del API. La URL de n8n local no sirve desde Render; en un flujo alojado fuera de Docker, configura el nodo HTTP con la URL pública del API.
