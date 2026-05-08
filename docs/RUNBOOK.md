# Runbook operativo — radar-diario-ia

## Entornos

- **Preview / producción** en Vercel: variables `DATABASE_URL`, `CRON_SECRET`, sin secretos con prefijo `VITE_` en el servidor.
- **Cliente**: `VITE_USE_MOCK_DATA` (mock local), `VITE_API_BASE_URL` si la API no es same-origin, `VITE_RADAR_SOURCE` (`mock` | `live`), `VITE_SENTRY_DSN` opcional.

## Cron diario

- Definido en `vercel.json`: `GET /api/radar/run?source=live` a las **06:00 UTC** (ajustar según “día de negocio” si hace falta otra TZ).
- Vercel envía `Authorization: Bearer <CRON_SECRET>` cuando `CRON_SECRET` está configurado.
- Ejecución manual equivalente: `curl -X POST https://<dominio>/api/radar/run -H "Authorization: Bearer $CRON_SECRET" -H "Content-Type: application/json" -d '{"source":"live"}'`.

## Re-ejecutar un día concreto

Mismo endpoint con `date` en body (POST) o query (GET): `date=YYYY-MM-DD`.

## Lectura de snapshot (UI / integraciones)

- `GET /api/radar/snapshot?date=YYYY-MM-DD&source=mock|live` — respuesta JSON `RadarAppData`.
- `refresh=1` fuerza recomputo sin caché de fila (ver implementación en API).

## Base de datos (Neon)

- Migraciones SQL en `drizzle/`. Generar nuevas: `npm run db:generate` (requiere `DATABASE_URL`).
- Aplicar en entorno: `npm run db:migrate` o flujo Neon / `drizzle-kit push` según política del equipo.
- **Backups / RPO**: gestionados por Neon; restauración desde consola Neon (punto en el tiempo según plan).

## Rotación de secretos

1. Generar nuevo `CRON_SECRET` en Vercel (producción y preview si aplica).
2. Desplegar; las crons usarán el nuevo valor automáticamente.
3. No commitear secretos; revisar que no aparezcan en logs de cliente.

## Caída de arXiv o errores de ingesta

- La API registra eventos JSON (`api/lib/logger`). Revisar logs de función en Vercel.
- Reintentos y rate limit están en `src/server/arxiv/ingestArxiv.ts`.
- Si persiste: ejecutar run con `source=mock` para validar UI mientras se recupera el proveedor.

## Rollback de migración

- Restaurar backup Neon previo al cambio o revertir migración con script SQL inverso (mantener migraciones versionadas en repo).
