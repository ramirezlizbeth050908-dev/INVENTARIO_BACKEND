# API REST de inventario (Node.js + PostgreSQL)

API CRUD para `items`, preparada para Docker, n8n y Render.

## Ejecutar localmente con Docker Compose

```powershell
docker volume create n8n_data
docker compose up --build -d
```

- API: http://localhost:8000
- Salud y conexión a PostgreSQL: http://localhost:8000/health
- n8n: http://localhost:5678
- PostgreSQL conserva datos en `postgres_data`; n8n usa el volumen `n8n_data`.

Endpoints: `GET/POST /items` y `GET/PUT/DELETE /items/{id}`. Cada `POST /items` crea un registro y devuelve su ID. Si la tabla está vacía en el primer arranque, se cargan 25 productos de ejemplo (IDs 1–25), sin reemplazar datos existentes.

## Consumir desde n8n

Importa `n8n/n8n-items-workflow.json`. Cambia el número `id` del nodo **Cambiar ID aquí**; el nodo HTTP consulta el producto correspondiente.

URL pública en Render:

```text
https://items-api-pudp.onrender.com/items/{{$json.id}}
```

Para llamar a la API local dentro de Docker Compose, usa:

```text
http://api:8000/items/{{$json.id}}
```

Para usar la integración de Sheets de ejemplo, importa `n8n/n8n-preparar-columnas-inventario.json` y ejecútalo una sola vez; luego importa `n8n/n8n-render-inventory-sheets-workflow.json`. La plantilla conserva las columnas previas y añade `Producto API` y `Descripción API` para los IDs del 1 al 25. Reemplaza `ID_DE_TU_HOJA_GOOGLE`, asigna tus credenciales de Google Sheets y Gmail, reconéctalas si n8n lo solicita y configura el destinatario antes de ejecutar el flujo.

## Render

API desplegada: https://items-api-pudp.onrender.com
