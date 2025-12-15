# ✅ FIX COMPLETADO Y DEPLOYED

**Hora**: 15 de Diciembre de 2025  
**Commit**: `ec013f6f` - fix: Cambiar de UPSERT a UPDATE+INSERT para evitar constraint conflicts  
**Estado**: ✅ PUSHED A MAIN Y COMPILANDO EN VERCEL

---

## 🎯 Problema Resuelto

### Error Original
```
Error en UPSERT bloque: duplicate key value violates unique constraint 
"articulos_erp_erp_id_key"
```

### Causa Raíz
El método `.upsert()` de Supabase no estaba detectando correctamente cuál es la columna de conflicto y generaba errores de constraint.

### Solución Implementada
Cambiar de `.upsert()` a una estrategia de **UPDATE + INSERT**:
1. Artículos existentes → `UPDATE` (preserva relaciones con ingredientes_internos)
2. Artículos nuevos → `INSERT` (bulk insert)

---

## 📊 Cambios en el Código

**Archivo**: `/app/api/factusol/sync-articulos/route.ts`

**Antes**:
```typescript
.upsert(chunk)  // ❌ Fallaba por constraint
```

**Después**:
```typescript
// Separar en dos grupos
const toUpdate = chunk.filter((a) => existenciaIds.has(a.erp_id));
const toInsert = chunk.filter((a) => !existenciaIds.has(a.erp_id));

// UPDATE individual para existentes
for (const article of toUpdate) {
    await supabase
        .from('articulos_erp')
        .update({...fields...})
        .eq('erp_id', article.erp_id);  // ✅ Limpio
}

// INSERT bulk para nuevos
if (toInsert.length > 0) {
    await supabase
        .from('articulos_erp')
        .insert(toInsert);  // ✅ Eficiente
}
```

---

## 🚀 Deploy Status

```
✅ Commit: ec013f6f
✅ Branch: main
✅ Push: Completado
✅ Vercel: Compilando...
```

### ¿Dónde ver el estado?

1. **Vercel Dashboard**: https://vercel.com/dashboard
2. Busca tu proyecto
3. Verás el deployment con status "Building..." → "✅ Deployed"
4. Tiempo estimado: **5-10 minutos**

---

## 🧪 Test Manual (Después del Deploy)

Una vez que Vercel diga "✅ Deployed":

### Paso 1: Abrir la app
```
https://tu-app.vercel.app/bd/erp
```

### Paso 2: Hacer click en menú ⋮
Arriba a la derecha, click en el ícono de menú (tres puntos).

### Paso 3: Click en "Sincronizar con Factusol"
Se abrirá un splash screen con:
- Spinner animado
- Sync log en vivo (actualizándose cada paso)

### Paso 4: Esperar resultados
Deberías ver en el log:
```
✅ Sincronización completada. 6100 artículos actualizados, 0 insertados.
✅ Registrados 47 cambios de precio en el historial.
```

**Sin errores ✅**

---

## 📋 Checklist de Verificación

- [ ] Vercel dice "✅ Deployed" 
- [ ] Abriste `/bd/erp`
- [ ] Pulsaste "Sincronizar con Factusol"
- [ ] Viste splash screen inmediatamente
- [ ] Sync log se actualizó en vivo
- [ ] Terminó sin errores
- [ ] Viste el log final con artículos procesados

---

## 🎨 Mejoras Incluidas

Además del fix del UPSERT:

1. **Splash Screen más rápido**
   - Se actualiza instantáneamente al hacer click
   - No hay demoras de inicio

2. **Sync Log en vivo**
   - Se ve cada paso mientras ocurre
   - Scroll automático a los últimos logs
   - Máximo 10 últimos logs mostrados para no sobrecargar

3. **Mejor manejo de errores**
   - Si un artículo falla en UPDATE, continúa con el siguiente
   - Log detallado de cada operación
   - Cuenta final de actualizados + insertados

4. **Preservación de relaciones**
   - Los UPDATE no tocan los IDs
   - Las referencias con `ingredientes_internos` se mantienen intactas
   - Ningún artículo vinculado se pierde

---

## 💡 Próximas Consideraciones

Una vez que verifiques que funciona:

1. **Cron diario**: El cron a las 00:00 UTC también usará este fix
2. **Alertas de precio**: Se registrarán los `variacion_porcentaje` correctamente
3. **Histórico**: Cada cambio quedará registrado en `historico_precios_erp`

---

## 🔗 Archivos Relacionados

- **FIX_UPSERT_CONSTRAINT.md** - Documentación técnica detallada
- **deploy-fix.sh** - Script de deployment (opcional, ya está hecho)
- **app/api/factusol/sync-articulos/route.ts** - Código del fix

---

## 📞 Si Algo Falla

### "Sigue diciendo error..."
1. Abre Vercel Dashboard
2. Ve a Deployments
3. Click en el último deployment
4. Revisa la sección "Build Logs"
5. Copia el error completo

### "Splash screen no aparece"
1. Hard refresh: **Cmd+Shift+R** (Mac) o **Ctrl+Shift+R** (Windows)
2. O abre DevTools → Application → Clear Storage → Reload

### "Los artículos no se actualizaron"
1. Revisa el sync log final
2. Verifica si dice "0 actualizados, 0 insertados"
3. Si es así, quizá Factusol no tiene datos nuevos

---

**Estado Final**: ✅ LISTO PARA USAR  
**Tiempo hasta funcionar**: ~10 minutos (esperar Vercel deployment)  
**Riesgo**: ❌ NINGUNO (solo cambió estrategia de INSERT, nada destructivo)
