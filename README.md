# Studio

Proyecto Next.js (app router) usado por el equipo. Este README ofrece pasos rápidos para arrancar el proyecto y recomendaciones mínimas para mejorar la calidad del desarrollo.

## Requisitos
- Node.js 18+ (recomendado)
- npm / pnpm / yarn

## Instalación rápida
1. Instala dependencias:

```bash
npm install
```

2. Copia variables de entorno:

```bash
cp .env.example .env
# luego rellena las variables necesarias
```

3. Ejecuta en desarrollo:

```bash
npm run dev
```

## Scripts útiles
- `npm run dev` — arranca Next en modo desarrollo
- `npm run build` — construcción para producción
- `npm run start` — arranca servidor de producción
- `npm run lint` — corre ESLint (Next)
- `npm run lint:fix` — intenta arreglar problemas de lint
- `npm run typecheck` — chequeo TypeScript
- `npm run format` — formatea el proyecto con Prettier (usando `npx`)
- `npm run ci` — atajo para CI: typecheck + lint + build

## Recomendaciones (pasos siguientes)
Para mejorar calidad y DX, considera añadir:

- ESLint / Prettier: `npm install -D eslint prettier eslint-config-prettier eslint-plugin-prettier`
- Husky + lint-staged: `npm install -D husky lint-staged` y `npx husky install`
- Test runner (Vitest) + @testing-library/react para tests de componentes
- Añadir `.env.example` (ya existe) y documentar variables de entorno críticas
- Añadir workflow de CI (GitHub Actions) que corra `npm run ci` en Pull Requests

## Variables de entorno adicionales

Este proyecto usa un cache en memoria dentro del `middleware` para reducir
peticiones repetidas a Supabase cuando se resuelven `numero_expediente -> id`.

- `MIDDLEWARE_CACHE_TTL_SECONDS` (opcional): segundos que permanece una entrada
	en cache. Valor por defecto: `300` (5 minutos).
- `MIDDLEWARE_CACHE_MAX_ENTRIES` (opcional): número máximo de entradas en el
	cache del middleware. Valor por defecto: `1000`.

Nota: el cache es in-memory; en entornos Edge puede resetearse cuando el worker
se recicla. Para caché persistente entre instancias considera usar Redis u otro
almacenamiento externo.

Si quieres, puedo aplicar los cambios recomendados automáticamente (ESLint/Prettier/Husky/CI/tests).
