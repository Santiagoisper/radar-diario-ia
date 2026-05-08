# Memoria de Claudio — Radar Diario de IA

Fecha de actualización: 2026-05-05

## Estado general

Proyecto base implementado y desplegado.

- GitHub: https://github.com/Santiagoisper/radar-diario-ia
- Vercel producción: https://radar-diario-ia.vercel.app

Detalles de infraestructura (IDs de proveedor, ramas de base de datos, nombres internos de proyecto) deben vivir **fuera del repo** — por ejemplo en el panel del proveedor, gestor de secretos o documentación privada del equipo.

## Bloques completados

- Bloque 1: Base estructural
- Bloque 2: Home dashboard
- Bloque 3: Papers
- Bloque 4: Briefing diario
- Bloque 5: Autores
- Bloque 6: Archivo
- Bloque 7: Tendencias
- Bloque 8: Configuración
- Bloque 9: Motor lógico (servicios en src/domain/services/radar)

## Motor lógico implementado

Ubicación: `src/domain/services/radar`

Funciones:

- ingestSources
- normalizePaper
- deduplicatePapers
- classifyThemes
- calculatePaperScore
- generateDailyBriefing
- generateTrendSnapshot
- runDailyRadarWorkflow

Archivo de validación:

- validateWorkflow.ts

## Configuración centralizada

- src/data/seeds/sources.seed.ts
- src/data/seeds/settings.seed.ts
- src/ui/pages/settings/settingsViewModel.ts

Incluye:

- fuentes activas (cs.AI, cs.LG, cs.CL, cs.IR)
- autores observados
- keywords por tema
- pesos de scoring
- horario de workflow mock

## Nota operativa

Todavía NO hay integración real con arXiv ni LLM (por diseño de esta fase).
El pipeline está listo para conectar adapters reales sin rehacer arquitectura.
