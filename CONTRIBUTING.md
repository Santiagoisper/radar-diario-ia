# Contribuir

## Requisitos

- Node.js 20 o superior (el CI usa Node 22).

## Arranque

```bash
npm ci
npm run dev
```

Antes de abrir un PR:

```bash
npm run lint
npm test
npm run build
```

## Datos y UI

Las pantallas de listado y métricas deben basarse en `getRadarAppData()` / `getLatestRadarState()` desde [`src/data/radarSnapshot.ts`](src/data/radarSnapshot.ts), no en semillas sueltas, para que la UI refleje el mismo pipeline que `runDailyRadarWorkflow`.

La **configuración** mostrada en Settings puede seguir leyendo seeds hasta exista persistencia real.

## Ramas

Trabajá en una rama descriptiva y abrí PR hacia `main`.
