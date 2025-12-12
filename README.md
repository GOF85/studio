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

## 🎨 Gestor de Imágenes para Artículos

**NUEVO:** Se ha añadido un gestor completo de imágenes para artículos (crear y editar).

### Características
- ✅ Máximo 5 imágenes por artículo
- ✅ Selección de imagen principal
- ✅ Drag & drop para reordenar
- ✅ Soporte JPEG, PNG, HEIC
- ✅ Almacenamiento en Supabase Storage (bucket: `articulosMice`)
- ✅ Persistencia en base de datos (columna `imagenes` JSONB)
- ✅ Compatible con cámara (mobile)

### Activar (3 pasos, 8 minutos)
1. **Migración SQL:** Copia [`migrations/008_add_imagenes_to_articulos.sql`](migrations/008_add_imagenes_to_articulos.sql) a Supabase SQL Editor y ejecuta
2. **Verificar bucket:** Ve a Supabase Storage y confirma que bucket `articulosMice` existe y es PUBLIC
3. **Test:** Abre `http://localhost:3000/bd/articulos/nuevo` y crea un artículo con imágenes

### Documentación completa
- 🟢 [`COMIENZA_AQUI.md`](COMIENZA_AQUI.md) - Punto de entrada rápido (2 min)
- 🟡 [`QUICK_REFERENCE.md`](QUICK_REFERENCE.md) - Referencia rápida (3 min)
- 📘 [`INDEX_MAESTRO.md`](INDEX_MAESTRO.md) - Índice completo de documentación
- 📗 [`GUIA_IMAGENES_ARTICULOS.md`](GUIA_IMAGENES_ARTICULOS.md) - Detalle técnico (20 min)
- 📙 [`CHECKLIST_IMPLEMENTACION.md`](CHECKLIST_IMPLEMENTACION.md) - Testing paso a paso (45 min)

### Archivos modificados
- `app/(dashboard)/bd/articulos/nuevo/page.tsx` - Crear nuevo artículo
- `app/(dashboard)/bd/articulos/[id]/page.tsx` - Editar artículo existente
- `migrations/008_add_imagenes_to_articulos.sql` - Nueva migración

### Más información
- Estado: ✅ 100% implementado y listo
- Calidad: Production-ready
- Ver: [`TABLERO_CONTROL.md`](TABLERO_CONTROL.md) para estado del proyecto

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
