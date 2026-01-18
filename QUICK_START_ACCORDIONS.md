# ⚡ Quick Start - Single Page Accordions

## 🚀 Para Empezar Inmediatamente

### 1. Servidor Dev (Ya está Corriendo)
```bash
✅ Running: http://localhost:3002

# Si necesitas reiniciar:
npm run dev
```

### 2. Abrir en Navegador
```
http://localhost:3002/os/[numero_expediente]/control-panel
```

### 3. Qué Ver
```
✅ 5 secciones colapsables (Espacio, Sala, Cocina, Logística, Personal)
✅ Header sticky en top con VIP badge
✅ Hacer click en headers para expandir/colapsar
✅ Scroll vertical entre secciones
✅ Auto-save cada 2 segundos (revisar Network tab)
```

---

## ✅ Checklist Rápido

### Visual Check (1 min)
- [ ] ¿Se ve la página cargada?
- [ ] ¿Hay 5 secciones visibles?
- [ ] ¿Se pueden expandir/colapsar?
- [ ] ¿Hay colores corporativos (white/gray/green)?

### Functional Check (3 min)
- [ ] Escribir dato en "Fechas" del Espacio
- [ ] ¿Se detecta el cambio?
- [ ] Esperar 2 segundos y revisar Network tab
- [ ] ¿Hay POST a /api/os/panel/save exitoso (200)?
- [ ] Recargar página y verificar datos persisten

### URL Check (2 min)
- [ ] Agregar `?tab=sala` a la URL y Enter
- [ ] ¿Se abre la sección Sala automáticamente?
- [ ] Cambiar a `?tab=cocina`
- [ ] ¿Se abre Cocina?

### Mobile Check (2 min)
- [ ] F12 → DevTools mobile emulation (375px)
- [ ] ¿Se ve todo bien?
- [ ] ¿Se puede scroll?
- [ ] ¿Se pueden expandir/colapsar?

---

## 📊 Resultados Esperados

### ✅ Si Todo Está Bien
```
✅ Accordion se expande/colapsa suavemente
✅ Form input funciona en todas las secciones
✅ Auto-save sin errores (HTTP 200)
✅ URL parameters funcionan (?tab=)
✅ Mobile responsive
✅ No hay console errors

RESULTADO: Production ready 🚀
```

### ⚠️ Si Algo No Funciona
```
❌ Accordion no se expande
❌ Form no acepta input
❌ Auto-save devuelve 400 error
❌ URL parameters no funcionan
❌ Mobile se ve roto
❌ Console errors

ACCIÓN: Ver REVERSION_EMERGENCY_PLAN.md
```

---

## 🧪 5 Quick Tests

### Test 1: Expand/Collapse (30 sec)
```
1. Click en "🍽️ Sala & Servicios"
2. Debe expandirse suavemente
3. Click otra vez
4. Debe colapsarse
5. ✅ Si se ve fluido → OK
```

### Test 2: Form Input (1 min)
```
1. En Espacio, agregar número en un campo
2. Cambiar a Sala (click en header)
3. Volver a Espacio
4. ¿El número sigue ahí?
5. ✅ Si persiste → OK
```

### Test 3: Auto-Save (1 min)
```
1. F12 → Network tab
2. Cambiar un campo
3. Esperar 2 segundos
4. ¿Aparece POST a /api/os/panel/save?
5. ✅ Si es 200 OK → OK
```

### Test 4: URL Navigation (1 min)
```
1. URL actual: /os/.../control-panel?tab=espacio
2. Cambiar a: /os/.../control-panel?tab=cocina
3. ¿Se abre Cocina automáticamente?
4. Back button
5. ✅ Si vuelve a Espacio → OK
```

### Test 5: Mobile (2 min)
```
1. F12 → Device emulation
2. Select iPhone 12 (390px width)
3. Scroll vertical
4. Click expand/collapse
5. ✅ Si se ve bien → OK
```

---

## 📋 Debugging Rápido

### Issue: Accordion no se expande
```bash
# Verificar:
1. Console → ¿Hay errors? Ver qué dice
2. Network → ¿Hay fetch errors?
3. Verificar que Accordion imports están: 
   grep "Accordion" page.tsx

# Solución:
npm run build && npm run dev
```

### Issue: Form datos no persisten
```bash
# Verificar:
1. Todos los secciones comparten mismo form prop? ✓
2. useOsPanelAutoSave activo? ✓
3. Network tab muestra POST? ✓

# Solución:
Revisar console.log en hooks/useOsPanelAutoSave.ts
```

### Issue: Auto-save devuelve 400
```bash
# Verificar:
1. /api/os/panel/save está limpiando datos? ✓
2. SafeParse activo? ✓
3. Qué error específico?

# Solución:
Check console → error message
Luego revisar endpoint validations
```

### Issue: URL parameters no funcionan
```bash
# Verificar:
1. activeTab state se actualiza?
2. defaultValue={[activeTab]} en Accordion?
3. searchParams extrayendo ?tab= correctamente?

# Solución:
npm run dev
Revisar Network tab → qué URL está yendo
```

---

## 🔍 Donde Buscar Cosas

### Archivo Principal
```
/app/(dashboard)/os/[numero_expediente]/control-panel/page.tsx
├── Línea ~240: Accordion configuration
├── Línea ~260: AccordionItem for "espacio"
├── Línea ~275: AccordionItem for "sala"
└── Etc...
```

### Componentes Tab
```
/app/(dashboard)/os/[numero_expediente]/control-panel/tabs/
├── EspacioTab.tsx (Línea 1: imports, Línea 50+: JSX)
├── SalaTab.tsx
├── CocinaTab.tsx
├── LogisticaTab.tsx
└── PersonalTab.tsx
```

### Auto-Save API
```
/app/api/os/panel/save/route.ts
├── Línea 30-40: Data cleaning
├── Línea 45-50: safeParse validation
└── Línea 60+: Response handling
```

### Hooks
```
/hooks/
├── useOsPanelAutoSave.ts (Debounce 2000ms)
├── useOsPanel.ts (Data fetching)
└── useOsPanelHistory.ts (Historial)
```

---

## 💡 Pro Tips

### 1. Ver Console Logs
```javascript
// En page.tsx:
console.log('activeTab:', activeTab);
console.log('formData:', formData);
```

### 2. Network Debugging
```
F12 → Network tab
Cambiar campo
Buscar POST a /os/panel/save
Click para ver request/response
```

### 3. React DevTools
```
F12 → React DevTools
Inspector → OsPanelPage
Ver state → activeTab, formData, syncStatus
```

### 4. Mobile Testing
```bash
# En terminal:
npm run dev

# En navegador:
http://localhost:3002
F12 → Toggle device toolbar (Ctrl+Shift+M)
```

---

## 🆘 Si Necesitas Revertir

```bash
# Opción 1: Revert último commit
git revert HEAD

# Opción 2: Revert solo page.tsx
git checkout HEAD~1 -- app/(dashboard)/os/[numero_expediente]/control-panel/page.tsx

# Opción 3: Manual revert
Ver REVERSION_EMERGENCY_PLAN.md
```

---

## 📚 Documentación para Referencia

| Doc | Para Qué |
|-----|----------|
| VALIDACION_COMPLETA.md | Ver qué fue verificado ✅ |
| ARQUITECTURA_SINGLE_PAGE_ACCORDIONS.md | Entender cambios técnicos 🔧 |
| VISUAL_COMPARISON.md | Ver diagrama antes/después 📊 |
| DEV_TESTING_GUIDE.md | Tests más detallados 🧪 |
| REVERSION_EMERGENCY_PLAN.md | Si algo sale mal ⚠️ |

---

## ✨ Summary

| Paso | Acción | Duración |
|------|--------|----------|
| 1 | Abrir dev server | ~2 min (ya corriendo) |
| 2 | Visual check | ~1 min |
| 3 | 5 quick tests | ~5 min |
| 4 | Total testing | **~8 min** |

**Total Time: ~8 minutos para validar todo**

---

## 🎯 Success Criteria

✅ Si TODAS estas son verdad:
- [ ] Accordion se expande/colapsa sin lag
- [ ] Form input funciona en todas secciones
- [ ] Auto-save no genera 400 errors
- [ ] URL params abren correct section
- [ ] Mobile responsive funciona
- [ ] No hay console errors
- [ ] Header sticky works
- [ ] VIP badge visible sin flicker

**RESULTADO: 🚀 PRODUCTION READY**

---

## 🏁 Next Steps

### Si Todo Funciona ✅
```
→ Informar a usuarios sobre cambios
→ Monitor en production
→ Collect feedback
→ Iterate if needed
```

### Si Algo Falla ❌
```
→ Check debugging section arriba
→ Revisar console/network errors
→ Leer documentación correspondiente
→ Si no se puede arreglar → REVERTIR
```

---

**Ready?** Abre http://localhost:3002 y prueba! 🚀

