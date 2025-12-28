# Resumen: Scroll UX y Limpieza Final

Este proyecto incluye dos utilidades clave para mejorar la experiencia y la gestión de datos en la aplicación:

## 1. Scroll UX (useScrollTop)
- Hook React que asegura el scroll al inicio en cada cambio de ruta.
- Mejora la navegación y evita posiciones intermedias tras cambios de módulo.
- Integración recomendada en layouts y páginas principales.
- Documentación: [scroll-ux.md](./scroll-ux.md)

## 2. Limpieza Final (ClearLocalStorageButton)
- Componente React para borrar todas las claves de localStorage con un clic.
- Útil para hard reset tras migraciones, debugging o refactorizaciones.
- Confirmación visual tras borrar.
- Documentación: [clear-localstorage.md](./clear-localstorage.md)

## Recomendaciones generales
- Usa ambos recursos en páginas de administración y layouts para máxima robustez y experiencia de usuario.
- Consulta los archivos .md para ejemplos y detalles de integración.

---

**Estado del proyecto:** 100% completado y listo para producción.
# Documentación del Proyecto

Esta carpeta contiene toda la documentación organizada por temas. Consulta el índice principal en `DOCUMENTACION_INDEX.md` o `SUMMARY.md` para navegar por las distintas secciones.

---

## Limpieza manual de carpetas legacy

Tras la migración y refactorización, fue necesario eliminar manualmente las siguientes carpetas legacy en `/app/(dashboard)/os/`:

- almacen
- bodega
- bio
- alquiler
- comercial
- cta-explotacion
- decoracion
- gastronomia
- hielo
- personal-externo
- personal-mice
- prueba-menu
- transporte
- atipicos

**Pasos realizados:**
1. Intento de borrado automático vía terminal (`rm -rf`) fallido por permisos o rutas.
2. Eliminación manual de carpetas y archivos legacy desde el explorador de archivos o comandos con permisos elevados.
3. Verificación de ausencia de referencias en el código (solo permanecen en enums, tipos estrictos y rutas dinámicas nuevas).

**Resultado:**
- El código y la estructura están libres de módulos legacy.
- Todas las referencias activas corresponden a la nueva arquitectura y tipado estricto.
- Proyecto listo para producción y futuras ampliaciones.
