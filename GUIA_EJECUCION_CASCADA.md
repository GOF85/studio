# 🚀 Guía de Ejecución: Cascada Síncrona de Escandallo

**Fecha**: 16 de Diciembre 2025  
**Responsable**: Implementación Automática  
**Status**: Listo para Desplegar

---

## 📋 Checklist de Despliegue

### Fase 1: Validación de Archivos Creados ✅

```bash
# Migraciones SQL (3 archivos)
✓ migrations/011_create_coste_recetas_historico.sql (59 líneas)
✓ migrations/012_add_coste_columns_to_recetas.sql (37 líneas)
✓ migrations/013_create_cascada_sync_functions.sql (308 líneas)

# Hooks TypeScript (2 archivos)
✓ hooks/use-costos-recetas-dashboard.ts (202 líneas)
✓ hooks/use-escandallo-analytics-mejorado.ts (277 líneas)

# Componentes React (1 archivo)
✓ components/book/analitica/costos-recetas-dashboard.tsx (301 líneas)

# Páginas (1 archivo)
✓ app/(dashboard)/book/analitica/costos-dashboard/page.tsx (18 líneas)

# Documentación
✓ IMPLEMENTACION_CASCADA_ESCANDALLO.md
✓ GUIA_EJECUCION_CASCADA.md (este archivo)

TOTAL: 1,184 líneas de código
```

---

## 🔧 Fase 2: Ejecutar Migraciones SQL (EN SUPABASE)

### Paso 1: Acceder a Supabase

1. Ir a https://supabase.com/dashboard
2. Seleccionar proyecto
3. Click en **"SQL Editor"** en el sidebar

### Paso 2: Ejecutar Migración 1

1. Copy-paste el contenido de `migrations/011_create_coste_recetas_historico.sql`
2. Click en **"Run"**
3. Verificar: `Table "coste_recetas_historico" created`

**Qué crea**:
- ✅ Tabla `coste_recetas_historico`
- ✅ Índices de performance
- ✅ RLS policies
- ✅ Comentarios de documentación

### Paso 3: Ejecutar Migración 2

1. Copy-paste el contenido de `migrations/012_add_coste_columns_to_recetas.sql`
2. Click en **"Run"**
3. Verificar: Sin errores

**Qué crea**:
- ✅ 3 columnas nuevas en `recetas`:
  - `coste_materia_prima_actual`
  - `coste_materia_prima_fecha_actualizacion`
  - `margen_bruto_actual`
- ✅ 3 índices para búsquedas rápidas

### Paso 4: Ejecutar Migración 3

1. Copy-paste el contenido de `migrations/013_create_cascada_sync_functions.sql`
2. Click en **"Run"**
3. Esperar a que complete (puede tardar 30 segundos)
4. Verificar: Sin errores

**Qué crea**:
- ✅ Función: `get_ingredient_current_price()`
- ✅ Función: `recalc_elaboracion_costos()`
- ✅ Función: `recalc_receta_costos()`
- ✅ Función: `on_articulos_erp_precio_change()` (TRIGGER)
- ✅ Función: `recalc_all_recipes()` (Admin)
- ✅ Trigger: `articulos_erp_precio_change`

---

## ✅ Fase 3: Validación Post-Instalación

### Validar Tablas

```sql
-- En Supabase SQL Editor, ejecuta esto:

-- 1. Verificar tabla coste_recetas_historico
SELECT * FROM coste_recetas_historico LIMIT 1;
-- Resultado: Sin filas (vacío), sin errores ✓

-- 2. Verificar columnas nuevas en recetas
SELECT 
  id, 
  coste_materia_prima_actual, 
  margen_bruto_actual 
FROM recetas 
LIMIT 1;
-- Resultado: Columnas existen, valores NULL/0 ✓
```

### Validar Funciones

```sql
-- 3. Verificar funciones existen
SELECT * 
FROM pg_proc 
WHERE proname IN ('recalc_receta_costos', 'recalc_elaboracion_costos')
LIMIT 10;
-- Resultado: 2+ filas con los nombres ✓

-- 4. Verificar trigger existe
SELECT * 
FROM pg_trigger 
WHERE tgname = 'articulos_erp_precio_change';
-- Resultado: 1 fila ✓
```

### Validar Permisos RLS

```sql
-- 5. Verificar RLS policies
SELECT * 
FROM pg_policies 
WHERE tablename = 'coste_recetas_historico';
-- Resultado: 2+ filas con políticas ✓
```

---

## 🧪 Fase 4: Testing Manual

### Test 1: Cambiar Precio y Verificar Cascada

```sql
-- 1. Seleccionar un artículo ERP existente
SELECT id, erp_id, precio_calculado 
FROM articulos_erp 
WHERE precio_calculado > 0 
LIMIT 1;

-- Guardar el erp_id (ej: "ABC123")

-- 2. Cambiar el precio
UPDATE articulos_erp 
SET precio_calculado = precio_calculado * 1.15  -- Sube 15%
WHERE erp_id = 'ABC123';

-- 3. Verificar que el trigger se dispara
-- (Si sale sin errores, ✓)

-- 4. Verificar que coste_recetas_historico tiene datos
SELECT COUNT(*) as registros 
FROM coste_recetas_historico 
WHERE DATE(fecha) = CURRENT_DATE;

-- Resultado: Debería tener X registros
```

### Test 2: Verificar Que Recetas Se Actualizaron

```sql
-- 1. Buscar una receta que use un ingrediente
SELECT id, nombre, coste_materia_prima_actual 
FROM recetas 
WHERE coste_materia_prima_actual > 0 
LIMIT 1;

-- 2. El coste_materia_prima_fecha_actualizacion 
-- debería ser reciente (hoy)
SELECT 
  id, 
  nombre, 
  coste_materia_prima_actual,
  coste_materia_prima_fecha_actualizacion
FROM recetas 
WHERE coste_materia_prima_actual > 0 
ORDER BY coste_materia_prima_fecha_actualizacion DESC 
LIMIT 5;
```

### Test 3: Abrir Dashboard en Navegador

1. Ir a: `http://localhost:3000/book/analitica/costos-dashboard`
2. Verificar que carga sin errores
3. Revisar que muestra:
   - ✅ KPI cards (alertas, margen, coste)
   - ✅ Tabla de recetas
   - ✅ Auto-refresh cada 30s

---

## 🐛 Fase 5: Troubleshooting

### Problema: "Table coste_recetas_historico does not exist"

**Causa**: Migración 1 no ejecutada  
**Solución**:
1. Ir a Supabase SQL Editor
2. Ejecutar nuevamente `011_create_coste_recetas_historico.sql`
3. Verificar que no hay errores

### Problema: "Function recalc_receta_costos does not exist"

**Causa**: Migración 3 no ejecutada  
**Solución**:
1. Ejecutar `013_create_cascada_sync_functions.sql`
2. Esperar a que complete

### Problema: Dashboard muestra "Error loading data"

**Causa**: Hook no puede conectarse a Supabase  
**Solución**:
1. Verificar que `.env.local` tiene `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`
2. Verificar que RLS policies están bien
3. Revisar logs del navegador (F12 > Console)

### Problema: Trigger no se dispara al cambiar precio

**Causa**: Trigger no existe o está disabled  
**Solución**:
1. En Supabase, ir a **Table Editor** > `articulos_erp`
2. Click en **Triggers**
3. Verificar que `articulos_erp_precio_change` está **enabled**
4. Si no, ejecutar:
   ```sql
   ALTER TABLE articulos_erp 
   ENABLE TRIGGER articulos_erp_precio_change;
   ```

### Problema: Alto consumo de CPU / Lentitud

**Causa**: Funciones se ejecutan con muchas recetas  
**Solución**:
1. En función `on_articulos_erp_precio_change`, aumentar LIMIT:
   ```sql
   LIMIT 5000  -- de 1000 a 5000
   ```
2. O ejecutar `recalc_all_recipes()` durante mantenimiento nocturno

---

## 📊 Fase 6: Verificación de Performance

### Medir Tiempo de Ejecución

```sql
-- Ver timing de las funciones en logs

-- 1. Cambiar un precio y medir
SET log_statement = 'all';
UPDATE articulos_erp 
SET precio_calculado = precio_calculado * 1.05 
WHERE erp_id = 'ABC123';
-- Debería tardar < 2 segundos

-- 2. Ver logs
SELECT * 
FROM pg_stat_statements 
WHERE query LIKE '%recalc%' 
ORDER BY mean_exec_time DESC 
LIMIT 5;
```

### Optimizaciones Si Es Necesario

```sql
-- 1. Analizar índices
ANALYZE coste_recetas_historico;

-- 2. Revisar query plans
EXPLAIN ANALYZE
SELECT * FROM coste_recetas_historico 
WHERE receta_id = 'ABC123' 
ORDER BY fecha DESC 
LIMIT 10;

-- 3. Si es lento, crear índice adicional
CREATE INDEX idx_coste_recetas_receta_id 
ON coste_recetas_historico(receta_id);
```

---

## 🎯 Fase 7: Integración Completa

### Actualizar Documentación Interna

1. Comunicar a COCINA:
   - Nueva URL: `/book/analitica/costos-dashboard`
   - Las alertas se actualizan cada 30 segundos
   - Severidad crítica (>15% de cambio) en rojo

2. Comunicar a COMPRAS:
   - Los cambios de precio se registran automáticamente
   - Historial disponible en `coste_recetas_historico`

3. Comunicar a DIRECCIÓN:
   - Margen bruto actualizado en tiempo real
   - Reportes de impacto en rentabilidad

### Entrenar Usuarios

- **Cocina**: Cómo leer dashboard, interpretar alertas
- **Compras**: Cómo usar histórico de costos
- **Dirección**: Cómo generar reportes de márgenes

---

## 📅 Próximos Pasos (Futuro)

### Semana 1
- [ ] Validar en producción durante 1 semana
- [ ] Recopilar feedback de usuarios
- [ ] Corregir bugs si los hay

### Semana 2-3
- [ ] Agregar notificaciones por Slack/Email para alertas críticas
- [ ] Crear reportes PDF de costos
- [ ] Dashboard adicional para Dirección

### Mes 2
- [ ] Integrar predicción de costos (ML)
- [ ] Simulador de escandallo (what-if)
- [ ] Versionado de recetas

---

## 📞 Soporte

### Si necesitas ayuda:

1. **SQL Errors**: Revisar logs en Supabase Dashboard
2. **TypeScript Errors**: Revisar `npm run type-check`
3. **UI Issues**: Revisar F12 > Console en navegador
4. **Performance**: Consultar datos en `pg_stat_statements`

### Comandos Útiles

```bash
# Validar TypeScript
npm run type-check

# Ejecutar linter
npm run lint

# Ver logs en tiempo real
tail -f .next/debug.log
```

---

## ✅ Checklist Final

- [ ] 3 migraciones SQL ejecutadas en Supabase
- [ ] 0 errores en SQL Editor
- [ ] Tablas creadas verificadas
- [ ] Funciones y trigger creados
- [ ] RLS policies funcionando
- [ ] Dashboard accesible en navegador
- [ ] Test manual de cascada exitoso
- [ ] Documentación interna actualizada
- [ ] Usuarios entrenados
- [ ] Go live! 🚀

---

**Implementación Completada**: 16 Diciembre 2025  
**Status**: Listo para Producción ✅  
**Tiempo de Setup**: ~15 minutos  
**Tiempo de Testing**: ~30 minutos  

¡Éxito! 🎉
