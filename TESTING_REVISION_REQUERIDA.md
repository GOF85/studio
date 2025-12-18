# ✅ TESTING - Sistema de Revisión Requerida

**Fecha:** 18 de Diciembre de 2025  
**Estado:** Listo para Testing

---

## 🧪 Test 1: Crear Elaboración CON Revisión (5 min)

### Pasos:
1. Ve a `/book/elaboraciones`
2. Haz click en "Nueva Elaboración"
3. Llena datos básicos:
   - **Nombre:** "Test Revisión - Chocolate" (o cualquier nombre)
   - **Partida:** FRIO
   - **Unidad:** KG
   - **Producción Total:** 1
4. Haz click en tab "Información General"
5. Marca el checkbox **"¿Requiere revisión?"**
6. Verifica que aparezcan:
   - ✓ Campo "Comentarios" (editable)
   - ✓ Campo "Responsable" (read-only, gris)
   - ✓ Campo "Fecha de Revisión" (read-only, gris)
7. Escribe en "Comentarios": "Probar sistema de revisión"
8. Haz click en **"Guardar"**

### Resultado Esperado:
```
✅ No hay error
✅ Toast: "Elaboración guardada correctamente"
✅ Se redirecciona a lista
✅ En Responsable debe aparecer tu email
✅ En Fecha debe aparecer la fecha actual
```

### Si funciona → Ir a Test 2 ✅
### Si hay error → Captura pantalla y comparte el error ❌

---

## 🧪 Test 2: Reabrir Elaboración CON Revisión (3 min)

### Pasos:
1. Desde la lista, haz click en la elaboración que creaste
2. Abre tab "Información General"

### Resultado Esperado:
```
✅ Checkbox "¿Requiere revisión?" está marcado
✅ Comentarios muestran el texto que escribiste
✅ Responsable muestra tu email (read-only)
✅ Fecha muestra la fecha actual (read-only)
✅ En la lista, aparece ⚠️ AlertCircle icon
✅ El item tiene fondo amber claro
```

### Si funciona → Ir a Test 3 ✅
### Si falta algo → Comparte screenshot ❌

---

## 🧪 Test 3: Editar Comentario SIN Cambiar Responsable/Fecha (3 min)

### Pasos:
1. Desde la elaboración abierta
2. En campo "Comentarios", agrega más texto (ej: " + Aumentar tiempo")
3. Haz click en **"Guardar"**
4. Espera confirmación
5. Recarga la página (Ctrl+R)

### Resultado Esperado:
```
✅ Comentario se actualizó
✅ Responsable SIGUE SIENDO el mismo (tu email)
✅ Fecha SIGUE SIENDO la misma (fecha original)
✅ No cambiaron porque ya tenían valores
```

### Si funciona → Ir a Test 4 ✅
### Si cambiaron responsable/fecha → Hay bug ❌

---

## 🧪 Test 4: Desmarcar Revisión (3 min)

### Pasos:
1. Desde la elaboración abierta
2. En tab "Información General"
3. **Desmarca** el checkbox "¿Requiere revisión?"
4. Verifica que los campos desaparezcan
5. Haz click en **"Guardar"**
6. Recarga página

### Resultado Esperado:
```
✅ Campos de revisión desaparecen
✅ Checkbox está desmarcado
✅ En la lista, NO aparece ⚠️ icon
✅ NO tiene fondo amber
```

### Si funciona → Ir a Test 5 ✅
### Si algo no funciona → Comparte error ❌

---

## 🧪 Test 5: Volver a Marcar para Revisión (3 min)

### Pasos:
1. Desde la elaboración (desmarcada)
2. Marca nuevamente "¿Requiere revisión?"
3. Escribe un comentario diferente
4. Guarda

### Resultado Esperado:
```
✅ Se captura nuevo usuario (tu email)
✅ Se captura nueva fecha (fecha actual)
✅ Comentario es el nuevo
✅ Los campos read-only actualizan
```

### Si funciona → Ir a Test 6 ✅

---

## 🧪 Test 6: Vista Móvil (Responsive) (3 min)

### Pasos:
1. Presiona F12 (Dev Tools)
2. Click en icono de celular (responsive mode)
3. Selecciona un tamaño de móvil (ej: iPhone 12)
4. Abre tab "Información General"
5. Verifica que aparezca la sección de revisión

### Resultado Esperado:
```
✅ Sección Revisión se ve completa
✅ Checkbox funciona
✅ Campos están organizados en 1 columna (mobile)
✅ Sin errores de layout
```

### Si funciona → Ir a Test 7 ✅

---

## 🧪 Test 7: Lista - Indicadores Visuales (3 min)

### Pasos:
1. Ve a `/book/elaboraciones`
2. Busca las elaboraciones que creaste CON revisión
3. Verifica que muestren:
   - ⚠️ AlertCircle icon en el nombre
   - Fondo amber claro

### Vista Desktop:
```
☐ | Nombre                    ⚠️  | Partida  | €X.XX | ✎ ⊗
```

### Vista Móvil:
```
Nombre de Elaboración ⚠️
€X.XX / KG              →
(fondo amber, borde left amber)
```

### Resultado Esperado:
```
✅ Las elaboraciones CON revisión muestran ⚠️
✅ Las elaboraciones SIN revisión NO muestran ⚠️
✅ El fondo y estilos son correctos
```

### Si funciona → Test COMPLETADO ✅

---

## ✅ Checklist Final

- [ ] Test 1: Crear elaboración CON revisión
- [ ] Test 2: Reabrir y verificar datos
- [ ] Test 3: Editar comentario (responsable/fecha no cambian)
- [ ] Test 4: Desmarcar revisión
- [ ] Test 5: Volver a marcar
- [ ] Test 6: Vista móvil responsive
- [ ] Test 7: Indicadores en lista

---

## 🎊 Si TODO funciona:

```
STATUS: ✅ COMPLETADO Y VALIDADO
El sistema de revisión requerida está funcionando perfecto.
Listo para producción.
```

---

## ⚠️ Si algo NO funciona:

1. **Captura el error** (pantalla completa o dev console)
2. **Comparte:** El test que falló + el error
3. Arreglamos juntos 👍

---

## 🔍 Debugging (Si es necesario)

### Abrir Console (F12):
Si ves errores en rojo, comparte:
- El texto del error
- La línea donde ocurre

### En Supabase:
Puedes verificar que los datos se guardaron:
1. Ve a [app.supabase.com](https://app.supabase.com)
2. Database → Tables → elaboraciones
3. Busca la elaboración que creaste
4. Verifica que tenga los campos:
   - `requiere_revision: true`
   - `comentario_revision: tu texto`
   - `fecha_revision: timestamp`
   - `responsable_revision: tu email`

---

**Cuando termines los tests, avísame qué tal fue** 👍
