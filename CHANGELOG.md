# Changelog

Este proyecto sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/) y versionado semántico aproximado.

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
