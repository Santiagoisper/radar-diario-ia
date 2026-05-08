# Arquitectura — Radar diario IA

## Alcance actual (MVP producción)

- **Single-tenant por despliegue**: un radar por proyecto Vercel; multiusuario diferido a Fase 3+ (tablas con `user_id` / Clerk).
- **API**: Vercel Serverless en `/api/*` (Node), mismo repo que la SPA Vite.
- **Datos**: ingestión mock en cliente; ingestión **arXiv** y persistencia opcional **Neon** cuando `DATABASE_URL` está definida en servidor.
- **Lectura pública**: `GET /api/radar/snapshot` sin auth. **Mutación / pipeline**: `GET` o `POST /api/radar/run` con `Authorization: Bearer <CRON_SECRET>` — **GET** para Vercel Cron (como en `vercel.json`), **POST** para ejecución manual u otras integraciones autenticadas.

## Entornos

| Variable             | Dónde             | Uso                                                               |
| -------------------- | ----------------- | ----------------------------------------------------------------- |
| `DATABASE_URL`       | Servidor (Vercel) | Neon Postgres; si falta, `GET /api/radar/snapshot` no puede leer filas y devuelve 404 |
| `CRON_SECRET`        | Servidor          | Protege `GET` y `POST` en `/api/radar/run` (Bearer obligatorio)   |
| `VITE_USE_MOCK_DATA` | Build cliente     | `false` para leer API; por defecto mock síncrono en `npm run dev` |
| `VITE_API_BASE_URL`  | Build cliente     | Origen del API (ej. vacío = mismo host en prod)                   |
| `VITE_SENTRY_DSN`    | Build cliente     | Opcional; errores front                                           |

## Flujo

1. Cliente: TanStack Query llama a snapshot mock local o `GET /api/radar/snapshot?date=YYYY-MM-DD`.
2. API: `GET /api/radar/snapshot` solo lee JSON persistido en Postgres. `GET|POST /api/radar/run` (con secret) ejecuta workflow + ingestión arXiv si `live` y persiste en `radar_snapshots`.
3. Cron (Vercel): `GET /api/radar/run?...` con el mismo `Authorization: Bearer` (requiere plan con Cron si aplica).

## Código clave

- Dominio: `src/domain/services/radar/`
- Fachada app: `src/data/radarSnapshot.ts`
- API: `api/radar/*.ts`
- DB: `src/db/` (Drizzle)
