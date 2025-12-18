## Contexto para Gemini CLI

Este archivo explica cómo debe trabajar Gemini CLI en este repositorio: qué tecnologías usamos, cómo ejecutarlo y, sobre todo, el estilo de producto, UX y código que esperamos.

### Stack y fundamento
- Framework: Next.js (App Router)
- Lenguaje: TypeScript (tipado estricto pero pragmático)
- Backend: Supabase
- Data fetching: React Query (hooks personalizados)
- Estilos: Tailwind CSS
- UI: Radix UI + shadcn/ui + iconos Lucide
- AI: Genkit

### Cómo arrancar
1) Instalar dependencias: `npm install`
2) Variables: crear `.env.local` con `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3) Desarrollo: `npm run dev`
4) Build: `npm run build` y producción: `npm run start`

### Estructura clave
- app/: rutas Next (grupos `(auth)` público y `(dashboard)` privado con layout compartido)
- components/: UI reutilizable (ui/, layout/, dashboard/…)
- hooks/: lógica de datos encapsulada (React Query)
- lib/: utilidades y clientes (ej. supabase.ts)
- providers/: contextos (auth, query)
- ai/: configuración de Genkit
- migrations/: SQL
- middleware.ts: protección de rutas (redirección a /login si no hay sesión)
- docs/: toda la documentación temática (consultar docs/README.md)

### Guía de estilo y UX (resumen de style.md)
- Clean Page: en cada page.tsx el orden es Imports → Helpers puros → Subcomponentes locales tipados → Componente principal (hooks al inicio, efectos de UX, manejo de loading/error, JSX limpio).
- Cero redundancia: si el breadcrumb ya indica el contexto, evita repetirlo en H1.
- Scroll reset: al cambiar de pestañas o navegar a detalle, forzar scroll a (0,0) `behavior: 'instant'` para sensación de velocidad.
- UI guiada por URL: pestañas/filtros deben reflejarse en la URL (`?tab=`). Recargar debe mantener el estado.
- Feedback constante:
	- Loading: skeletons que imitan la estructura final (no spinners genéricos).
	- Empty states: componentes dedicados con icono y mensaje claro.
	- Hover: tarjetas interactivas con borde/sombra sutil (p. ej. `hover:border-amber-400`).
- Diseño visual:
	- Paleta semántica con acento ámbar para estados de atención/revisión.
	- Tarjetas: `rounded-lg`, posible `border-l-4` por estado, usar `group` para animar hijos en hover.
	- Badges: variantes suaves (secondary) para contadores en tabs.
	- Sticky headers/toolbars: `sticky top-0` + `backdrop-blur` para contexto en scroll.
- Buenas prácticas de código:
	- Siempre tipar props (interfaces) incluso en subcomponentes locales.
	- Navegación programática en tarjetas clicables (`router.push`) en vez de envolver todo en Link.
	- La página no conoce el fetch: solo llama a hooks (ej. `useRecetas()`), la lógica vive en hooks.
	- Fechas con `Intl.DateTimeFormat('es-ES')` para consistencia.
- Checklist antes de entregar:
	- ¿La URL refleja el estado (tabs/filtros)?
	- ¿Sin títulos redundantes respecto a breadcrumb?
	- ¿Scroll correcto al cargar/cambiar?
	- ¿Hay estado de loading y empty state?
	- ¿Props tipados? ¿Subcomponentes locales donde toque?

### Qué espera el usuario
- Experiencia rápida y clara: navegación sin fricción, feedback inmediato.
- Visual “limpio y profesional”, con acentos ámbar para pendientes/atención.
- Código fácil de mantener: hooks para datos, páginas ligeras, componentes bien tipados.

### Referencias útiles
- Documentación central: docs/DOCUMENTACION_INDEX.md y docs/SUMMARY.md
- Guía rápida: docs/guia_rapida/START_HERE.md
- Implementación/Checklist: docs/implementacion/COMO_PROCEDER.md
- Fixes técnicos: docs/fixes/README_FIX_FETCH_ERROR.md
- Optimización: docs/optimizaciones/RESUMEN_OPTIMIZACIONES.md

### Instrucciones para prompts a Gemini
- Siempre pedir soluciones alineadas con el estilo anterior (Clean Page, URL-driven UI, skeletons, empty states, acentos ámbar).
- Responder en español, conciso y accionable.
- Priorizar TypeScript estricto y componentes tipados.
- Proponer navegación programática en tarjetas clicables y mantener accesibilidad.
- Si se sugiere UI, incluir clases Tailwind coherentes con la paleta y patrones descritos.
