# Studio


Proyecto Next.js (app router) usado por el equipo.

## 📚 Documentación

Toda la documentación ha sido reorganizada y se encuentra en la carpeta [`docs/`](docs/README.md):

- [Índice Maestro de Documentación](docs/DOCUMENTACION_INDEX.md)
- [Resumen Visual y Guía Rápida](docs/guia_rapida/START_HERE.md)
- [Implementación y Checklist](docs/implementacion/COMO_PROCEDER.md)
- [Fixes y Cambios Técnicos](docs/fixes/README_FIX_FETCH_ERROR.md)
- [Guías de CSV](docs/csv/CSV_GUIDE.md)
- [Optimización y Rendimiento](docs/optimizaciones/RESUMEN_OPTIMIZACIONES.md)
- [Escandallo y Producción](docs/escandallo/README_ESCANDALLO_SYSTEM.md)
- [Guías de Usuario](docs/usuario/INFORME_EJECUTIVO.md)
- [Guías de Desarrollo](docs/dev/SETUP_DEV_ENVIRONMENT.md)

Consulta el archivo [`docs/SUMMARY.md`](docs/SUMMARY.md) para un índice completo por temas.

---

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


## 🎨 Gestor de Imágenes para Artículos

Ver documentación técnica y guía de imágenes en:
- [`docs/implementacion/`](docs/implementacion/)
- [`docs/guia_rapida/`](docs/guia_rapida/)

---

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
