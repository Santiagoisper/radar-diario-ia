# Radar diario IA

Aplicación web para un **radar intelectual diario** de papers de IA: home con métricas, briefing del día, listado de papers, autores seguidos, archivo, tendencias y configuración.

## Stack

- React 19, TypeScript, Vite 8
- React Router 7

## Estado del proyecto

Los datos mostrados en la UI provienen de **semillas mock** (`src/data/seeds`), pero las pantallas (home, briefing, papers, autores, archivo, tendencias) se alimentan a través de **`getRadarAppData()`** en [`src/data/radarSnapshot.ts`](src/data/radarSnapshot.ts), que ejecuta **`runDailyRadarWorkflow`**: misma fuente de verdad que el pipeline (ingesta stub, normalización, deduplicación, temas, scoring, briefing y snapshot de tendencias). Así, cambios en el dominio se reflejan en la interfaz. La **configuración** en Settings sigue leyendo seeds hasta haber persistencia o API.

El motor está **preparado para conectar adapters reales** (p. ej. arXiv, LLM) sin rehacer la arquitectura.

## Requisitos

- Node.js 20+ (recomendado LTS actual)

## Comandos

```bash
npm ci
npm run dev      # desarrollo con HMR
npm run build    # TypeScript (project references) + bundle de producción
npm run lint
npm test         # tests unitarios (Vitest)
npm run test:e2e # smoke + accesibilidad (axe); Playwright levanta Vite en :5174
npm run preview  # vista previa del build
```

### Tests E2E (Playwright)

Tras `npm ci`, instalá el navegador de Chromium **una vez** (sin esto, `npm run test:e2e` puede fallar al no encontrar el ejecutable):

```bash
npx playwright install chromium
```

En Linux, para dependencias del sistema (similar al CI): `npx playwright install --with-deps chromium`.

Para depurar: `npm run test:e2e:ui` o `npx playwright test --debug`.

## Despliegue

- Producción (Vercel): [radar-diario-ia.vercel.app](https://radar-diario-ia.vercel.app)
- Código: [github.com/Santiagoisper/radar-diario-ia](https://github.com/Santiagoisper/radar-diario-ia)

## Roadmap (orientativo)

**Fase técnica siguiente**

- Cliente arXiv / RSS en `ingestSources`, límites de tasa y manejo de errores (proxy o backend si hay CORS).
- Opcional: persistencia (p. ej. API + base de datos) y estados de carga en la UI en lugar de snapshot síncrono.

**Producto**

- Uso de LLM para resúmenes o clasificación, según diseño.

## Documentación interna

Notas de contexto del proyecto (sin secretos de infra): [CLAUDIO_MEMORY.md](./CLAUDIO_MEMORY.md).
