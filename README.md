# Radar diario IA

Aplicación web para un **radar intelectual diario** de papers de IA: home con métricas, briefing del día, listado de papers, autores seguidos, archivo, tendencias y configuración.

## Stack

- React 19, TypeScript, Vite 8
- React Router 7

## Estado del proyecto

Los datos mostrados en la UI provienen de **semillas mock** (`src/data/seeds`). El **motor de dominio** en `src/domain/services/radar` implementa el pipeline completo (ingesta stub, normalización, deduplicación, temas, scoring, briefing y snapshot de tendencias) y está **preparado para conectar adapters reales** (p. ej. arXiv, LLM) sin rehacer la arquitectura.

## Requisitos

- Node.js 20+ (recomendado LTS actual)

## Comandos

```bash
npm ci
npm run dev      # desarrollo con HMR
npm run build    # TypeScript (project references) + bundle de producción
npm run lint
npm test         # tests unitarios (Vitest)
npm run preview  # vista previa del build
```

## Despliegue

- Producción (Vercel): [radar-diario-ia.vercel.app](https://radar-diario-ia.vercel.app)
- Código: [github.com/Santiagoisper/radar-diario-ia](https://github.com/Santiagoisper/radar-diario-ia)

## Roadmap (orientativo)

- Integración real con fuentes (arXiv / RSS)
- Uso de LLM para resúmenes o clasificación, según diseño de producto

## Documentación interna

Notas de contexto del proyecto (sin secretos de infra): [CLAUDIO_MEMORY.md](./CLAUDIO_MEMORY.md).
