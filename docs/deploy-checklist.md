# Checklist de Despliegue y Producción

Esta guía asegura que el proyecto está listo para ser desplegado en producción de forma segura y robusta.

## 1. Auditoría de Código
- [x] Eliminar carpetas y archivos legacy.
- [x] Verificar que solo existen rutas y módulos nuevos.
- [x] Confirmar que no hay referencias a localStorage en el nuevo código.
- [x] Validar tipado estricto en todos los modelos y hooks.

## 2. Pruebas Automatizadas
- [ ] Ejecutar todos los tests unitarios y de integración (Vitest).
- [ ] Revisar cobertura de tests en hooks y componentes clave.
- [ ] Validar que no hay errores ni warnings en consola.

## 3. Configuración y Variables
- [ ] Revisar variables de entorno (Supabase, Next.js, etc.).
- [ ] Confirmar que las claves y tokens no están expuestos.
- [ ] Validar configuración de seguridad y CORS.

## 4. Despliegue
- [ ] Realizar build de producción (`next build`).
- [ ] Probar la app en entorno staging antes de publicar.
- [ ] Verificar integración con Supabase y servicios externos.
- [ ] Confirmar funcionamiento de utilidades (scroll UX, limpieza localStorage).

## 5. Post-Despliegue
- [ ] Monitorizar logs y errores en tiempo real.
- [ ] Validar experiencia de usuario y rendimiento.
- [ ] Documentar cualquier incidencia o ajuste realizado.

---

**Recomendación:** Mantén este checklist actualizado y úsalo en cada ciclo de despliegue para asegurar calidad y estabilidad.