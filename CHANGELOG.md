# Changelog

Este proyecto sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/) y versionado semántico aproximado.

## [Unreleased]

### Añadido

- `ingestArxivForSources`: `MAX_RESULTS` configurable vía `ARXIV_MAX_RESULTS` (default 25); warning en log cuando el feed arXiv devuelve 0 entradas (feed vacío no es error, el pipeline usa fallback a seeds).
- Test de integración `runDailyRadarWorkflowAsync.test.ts`: verifica pipeline completo con payloads inyectados, ingesta vacía (fallback a seeds) y propagación de errores de red.
- Tests adicionales en `ingestArxiv.test.ts`: feed vacío, múltiples autores, resolución de `source_id` con múltiples fuentes activas.

## [0.1.0] - 2026-05-08

### Añadido

- API Vercel: `GET /api/radar/snapshot`, `POST|GET /api/radar/run` (Bearer `CRON_SECRET`), persistencia opcional en Neon (Drizzle, tabla `radar_snapshots`).
- Ingesta arXiv en servidor con rate limit, reintentos y parser testeable (`parseArxivFeedXml`).
- Front: TanStack Query, estados de carga/error, flag `VITE_USE_MOCK_DATA` y cliente `fetchRadarAppData`.
- Observabilidad: Sentry opcional (`VITE_SENTRY_DSN`), métricas Web Vitals en consola (dev).
- Seguridad: cabeceras y CSP en `vercel.json`; cron documentado.
- CI: lint, tests, build, E2E, comprobación Prettier, prueba de accesibilidad con axe-playwright.
- Documentación: `docs/ARCHITECTURE.md`, `docs/THREAT_MODEL.md`, este runbook y `.env.example`.

### Cambiado

- View models de páginas principales reciben `RadarAppData` explícito (datos desde mock local o API).
