# Mantenimiento Integral - Studio (Next.js + Supabase + Genkit)

## Contexto del Proyecto

Studio es una aplicación Next.js 15 (App Router) con Supabase como backend y autenticación, TanStack Query para data fetching, y Genkit para flujos de IA. El frontend usa Radix UI, Tailwind CSS (shadcn/ui) y lucide-react para iconos. La arquitectura y convenciones están documentadas en `docs/` y `.github/copilot-instructions.md`.

---

## Checklist de Mantenimiento Detallado

### 1. Código y Dependencias
- **Actualizar dependencias:**
  - Ejecutar `npm outdated` y actualizar paquetes críticos (Next.js, Supabase, TanStack Query, Genkit, Shadcn/ui, etc.).
  - Revisar breaking changes en changelogs oficiales.
- **Limpieza de scripts y utilidades:**
  - Eliminar scripts temporales, archivos de debug, migración y pruebas manuales en la raíz y subcarpetas.
  - Revisar scripts de shell (`*.sh`) y VBS (`*.vbs`), mantener solo los documentados y activos.
- **Código muerto y legacy:**
  - Buscar y eliminar hooks, componentes, servicios y funciones no usados.
  - Revisar duplicados y refactors incompletos.
- **Tipos y convenciones:**
  - Mantener tipos centralizados en `types/` y archivos de dominio.
  - Confirmar uso de PascalCase para componentes y kebab-case para archivos.
  - Revisar que los helpers estén fuera de los componentes principales.
- **Patrones de arquitectura:**
  - Confirmar que la lógica de negocio compleja está en `services/` y no en hooks o componentes.
  - Revisar que los hooks de datos sigan el patrón centralizado en `hooks/use-data-queries.ts`.

### 2. Pruebas y Calidad
- **Tests automáticos:**
  - Ejecutar `npm run test` y revisar cobertura en `coverage/`.
  - Eliminar tests obsoletos y agregar para nuevas features y bugs corregidos.
  - Revisar que los tests usen mocks adecuados para Supabase y React Query.
- **Lint y typecheck:**
  - Ejecutar `npm run lint` y `npm run typecheck` antes de cada PR.
  - Corregir advertencias y errores, especialmente en hooks y servicios.
- **Error boundaries:**
  - Confirmar que las zonas críticas de UI están protegidas con `ErrorBoundary`.
  - Revisar que los errores de red y Supabase tengan feedback claro al usuario.

### 3. Infraestructura y Seguridad
- **Supabase:**
  - Revisar roles, policies y RLS (Row Level Security) en la consola de Supabase.
  - Confirmar que las tablas sensibles no permiten acceso anónimo.
  - Verificar que los endpoints de API no expongan datos innecesarios.
- **Variables de entorno:**
  - Limpiar `.env.local` de variables no usadas.
  - Documentar todas las variables requeridas en `docs/`.
- **Middleware:**
  - Auditar `middleware.ts` para asegurar autenticación, path rewriting y performance.
  - Revisar el uso de LRUCache y fetchWithRetry.
- **Backups y migraciones:**
  - Confirmar existencia de backups automáticos en Supabase.
  - Verificar que las migraciones estén versionadas y documentadas.

### 4. Documentación
- **Actualización continua:**
  - Mantener actualizados los archivos en `docs/`, especialmente guías rápidas, mapas de arquitectura y convenciones.
  - Revisar que los diagramas y ejemplos de código reflejen el estado actual.
- **Limpieza de documentación:**
  - Archivar o borrar reportes de migración y revisiones ya finalizadas.
  - Mantener un changelog claro de cambios mayores y migraciones.
- **README y quick-start:**
  - Revisar que reflejen el stack, comandos y flujos actuales.
  - Incluir pasos de troubleshooting y enlaces a scripts de diagnóstico.

### 5. UX/UI
- **Patrones de diseño:**
  - Confirmar uso de componentes Shadcn/ui, Radix y Tailwind según las guías.
  - Revisar que los colores y estilos sigan la paleta semántica definida.
- **Feedback de usuario:**
  - Verificar skeletons, estados vacíos y mensajes de error claros.
  - Revisar que los loaders sean skeletons estructurales, no spinners genéricos.
- **Navegación y scroll:**
  - Confirmar que los cambios de pestaña y navegación forcen scroll al top y mantengan el estado vía URL.
  - Revisar el uso de `router.push` para navegación programática.
- **Accesibilidad:**
  - Revisar uso de roles, labels y focus management en componentes interactivos.

### 6. Automatización y CI/CD
- **Workflows de CI:**
  - Confirmar que los pipelines ejecuten lint, typecheck y tests.
  - Revisar que los despliegues de preview y producción estén sincronizados y sin archivos legacy.
- **Despliegue y rollback:**
  - Documentar el proceso de rollback y recuperación ante fallos.
  - Verificar que los scripts de despliegue (`deploy-fix.sh`, etc.) estén actualizados y documentados.

---

## Frecuencia Recomendada
- **Mensual:**
  - Actualizar dependencias.
  - Limpiar scripts/archivos temporales.
  - Revisar seguridad y backups.
- **Por release:**
  - Ejecutar tests, lint, typecheck.
  - Actualizar documentación.
  - Revisar UX/UI.
- **Continuo:**
  - Mantener arquitectura y convenciones.
  - Eliminar código/documentación legacy tras cada migración o refactor.

---

## Recursos Clave
- `docs/DOCUMENTACION_INDEX.md`: Mapa de documentación.
- `docs/guia_rapida/START_HERE.md`: Guía rápida para nuevos desarrollos.
- `.github/copilot-instructions.md`: Convenciones y arquitectura.
- `diagnose-setup.sh`: Diagnóstico de entorno.

---

> **Nota:** Esta checklist debe ser revisada y adaptada tras cada migración mayor o cambio de stack.
