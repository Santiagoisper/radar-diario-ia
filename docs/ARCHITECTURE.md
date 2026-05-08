# Arquitectura — Radar diario IA

## Alcance actual (MVP producción)

- **Single-tenant por despliegue**: un radar por proyecto Vercel; multiusuario diferido a Fase 3+ (tablas con `user_id` / Clerk).
- **API**: Vercel Serverless en `/api/*` (Node), mismo repo que la SPA Vite.
- **Datos**: ingestión mock en cliente; ingestión **arXiv** y persistencia opcional **Neon** cuando `DATABASE_URL` está definida en servidor.
- **Lectura pública**: `GET /api/radar/snapshot` sin auth. **Escritura / cron**: `POST /api/radar/run` con `Authorization: Bearer <CRON_SECRET>`.

## Entornos

| Variable             | Dónde             | Uso                                                               |
| -------------------- | ----------------- | ----------------------------------------------------------------- |
| `DATABASE_URL`       | Servidor (Vercel) | Neon Postgres; si falta, snapshot solo en memoria en cada request |
| `CRON_SECRET`        | Servidor          | Protege `POST /api/radar/run`                                     |
| `VITE_USE_MOCK_DATA` | Build cliente     | `false` para leer API; por defecto mock síncrono en `npm run dev` |
| `VITE_API_BASE_URL`  | Build cliente     | Origen del API (ej. vacío = mismo host en prod)                   |
| `VITE_SENTRY_DSN`    | Build cliente     | Opcional; errores front                                           |

## Flujo

1. Cliente: TanStack Query llama a snapshot mock local o `GET /api/radar/snapshot?date=YYYY-MM-DD`.
2. API: ejecuta `runDailyRadarWorkflow` (mock) o ingestión arXiv + `executeRadarPipelineFromPayloads`; opcionalmente lee/escribe JSON en Postgres.
3. Cron (Vercel): `POST /api/radar/run` con secret (requiere plan con Cron si aplica).

## Código clave

- Dominio: `src/domain/services/radar/`
- Fachada app: `src/data/radarSnapshot.ts`
- API: `api/radar/*.ts`
- DB: `src/db/` (Drizzle)
