# Runbook operativo — radar-diario-ia

## Entornos

- **Preview / producción** en Vercel: variables `DATABASE_URL`, `CRON_SECRET`, sin secretos con prefijo `VITE_` en el servidor.
- **Cliente**: `VITE_USE_MOCK_DATA` (mock local), `VITE_API_BASE_URL` si la API no es same-origin, `VITE_RADAR_SOURCE` (`mock` | `live`), `VITE_SENTRY_DSN` opcional.

## Primer deploy (checklist mínima)

1. En Vercel (preview/prod según corresponda): `DATABASE_URL`, `CRON_SECRET` en variables de **servidor**; nunca `VITE_DATABASE_URL` ni secretos reales con prefijo `VITE_`.
2. Si la UI debe usar API en lugar de mock: build con `VITE_USE_MOCK_DATA=false` (y `VITE_RADAR_SOURCE=live` si querés leer filas `live`).
3. Push y deploy (p. ej. integración Git → Vercel).
4. **Antes de confiar en la UI contra API:** ejecutar o esperar al menos un **`/api/radar/run` autenticado** (`Authorization: Bearer <CRON_SECRET>`) que persista en `radar_snapshots` (manual con POST/curl o cron GET).
5. Comprobar `GET /api/radar/snapshot?...` → **200** con JSON; si la DB está vacía para ese modo, **404** hasta que el paso 4 haya tenido éxito.

## Cron diario

- **`/api/radar/run`** acepta **GET** (Vercel Cron) y **POST** (manual / integraciones). **Ambos** exigen `Authorization: Bearer <CRON_SECRET>`.
- Definido en `vercel.json`: `GET /api/radar/run?source=live` a las **06:00 UTC** (ajustar según “día de negocio” si hace falta otra TZ).
- Vercel envía `Authorization: Bearer <CRON_SECRET>` cuando `CRON_SECRET` está configurado.
- Ejecución manual: `curl -X POST https://<dominio>/api/radar/run -H "Authorization: Bearer $CRON_SECRET" -H "Content-Type: application/json" -d '{"source":"live"}'`.

## Re-ejecutar un día concreto

Mismo endpoint con `date` en body (POST) o query (GET): `date=YYYY-MM-DD`.

## Lectura de snapshot (UI / integraciones)

- `GET /api/radar/snapshot?date=YYYY-MM-DD&source=mock|live` — **solo lectura** de `radar_snapshots`: fila exacta o última del mismo `source`; respuesta JSON `RadarAppData`, o **404** si no hay datos persistidos. El parámetro `refresh` se ignora (el recomputo es solo vía `/api/radar/run` autenticado).

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
