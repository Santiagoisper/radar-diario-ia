# Threat model mínimo — Radar diario IA

## Superficie

- **SPA estática**: HTML/JS públicos; sin secretos en bundle (`VITE_*` solo DSN público de Sentry si se usa).
- **API serverless**: `/api/radar/snapshot` (GET), `/api/radar/run` (POST).
- **Postgres (Neon)**: cadena de conexión solo en variables de servidor.

## Riesgos y mitigaciones

| Riesgo                                  | Mitigación                                                                         |
| --------------------------------------- | ---------------------------------------------------------------------------------- |
| Abuso de GET snapshot (scraping, costo) | Rate limit en capa edge/Vercel; respuestas cacheables; sin datos sensibles en JSON |
| Invocación no autorizada del run diario | `Authorization: Bearer CRON_SECRET`; secret rotado en Vercel                       |
| Inyección / query abuse                 | Validación Zod en query/body; fechas acotadas                                      |
| SSRF vía arXiv                          | Solo URLs fijas `export.arxiv.org`; sin URL user-supplied                          |
| Exfiltración de `DATABASE_URL`          | Nunca en cliente; logs sin imprimir connection string completa                     |
| Cuentas futuras                         | RLS o filtro `user_id`; política de retención documentada                          |

## Datos personales

- MVP sin cuentas: no hay PII en DB salvo lo que arXiv expone (autores públicos).
- Con auth: revisar GDPR/consentimiento y borrado.
