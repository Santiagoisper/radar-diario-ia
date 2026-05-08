# Arquitectura — Radar diario IA

## Alcance actual (MVP producción)

- **Single-tenant por despliegue**: un radar por proyecto Vercel; multiusuario diferido a Fase 3+ (tablas con `user_id` / Clerk).
- **API**: Vercel Serverless en `/api/*` (Node), mismo repo que la SPA Vite.
- **Datos**: ingestión mock en cliente; ingestión **arXiv** y persistencia opcional **Neon** cuando `DATABASE_URL` está definida en servidor.
- **Lectura pública**: `GET /api/radar/snapshot` sin auth. **Mutación / pipeline**: `GET` o `POST /api/radar/run` con `Authorization: Bearer <CRON_SECRET>` — **GET** para Vercel Cron (como en `vercel.json`), **POST** para ejecución manual u otras integraciones autenticadas.

## Entornos

| Variable               | Dónde             | Uso                                                                 |
| ---------------------- | ----------------- | ------------------------------------------------------------------- |
| `DATABASE_URL`         | Servidor (Vercel) | Neon Postgres; obligatoria para snapshot/run con persistencia       |
| `CRON_SECRET`          | Servidor          | Protege `GET` y `POST` en `/api/radar/run` (Bearer obligatorio)     |
| `VITE_USE_MOCK_DATA`   | Build / runtime cliente | `false` para usar la API (`GET /api/radar/snapshot`) en lugar del mock local |
| `VITE_RADAR_SOURCE`    | Build / runtime cliente | `live` si el front debe pedir snapshots `source=live` (default en código: `mock`) |
| `VITE_API_BASE_URL`    | Build / runtime cliente | Solo si el API **no** es same-origin; vacío = mismo host que la SPA |
| `VITE_SENTRY_DSN`      | Build cliente     | Opcional; errores front                                             |

Sin `DATABASE_URL` en servidor, `GET /api/radar/snapshot` no lee filas y devuelve **404**.

## Flujo

1. Cliente: TanStack Query llama a snapshot mock local o `GET /api/radar/snapshot?date=YYYY-MM-DD`.
2. API: `GET /api/radar/snapshot` solo lee JSON persistido en Postgres. `GET|POST /api/radar/run` (con secret) ejecuta workflow + ingestión arXiv si `live` y persiste en `radar_snapshots`.
3. Cron (Vercel): `GET /api/radar/run?...` con el mismo `Authorization: Bearer` (requiere plan con Cron si aplica).

## Código clave

- Dominio: `src/domain/services/radar/`
- Fachada app: `src/data/radarSnapshot.ts`
- API: `api/radar/*.ts`
- DB: `src/db/` (Drizzle)
