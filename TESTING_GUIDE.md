# 🧪 TESTING GUIDE - GESTOR DE IMÁGENES

**Para:** QA testers y desarrolladores que necesitan validar la funcionalidad  
**Tiempo:** 45-60 minutos (testing completo)  
**Prerequisitos:** Migración SQL ejecutada, bucket articulosMice verificado

---

## 📋 PLAN DE TESTING

### FASE 1: Preparación (5 minutos)
### FASE 2: Tests de creación (15 minutos)
### FASE 3: Tests de edición (15 minutos)
### FASE 4: Tests de validación (10 minutos)
### FASE 5: Tests de integración (10 minutos)
### FASE 6: Reporte (5 minutos)

---

## FASE 1: PREPARACIÓN

### Ambiente
```
[ ] Node.js 18+ instalado
[ ] npm install ejecutado
[ ] .env.local configurado con Supabase keys
[ ] npm run dev ejecutándose (localhost:3000)
[ ] Supabase SQL ejecutada (migrations/008_...)
[ ] Bucket articulosMice existe y es PUBLIC
[ ] DevTools abierto (F12 → Console)
```

### Herramientas
```
[ ] Navegador Chrome/Firefox (con DevTools)
[ ] Supabase Dashboard abierto en otra pestaña
[ ] Imágenes de test preparadas:
    - 1x JPEG (300x300, ~50KB)
    - 1x PNG (300x300, ~50KB)
    - 1x HEIC si tienes iPhone (opcional)
    - 1x imagen grande (~2MB, para testing)
```

### Datos de test
```
Artículo test 1 (NUEVO):
- Nombre: "Test Imágenes Simple"
- Tipo: MiceCatering
- Categoría: Bebidas
- Precio: 10.00
- Stock: 50

Artículo test 2 (NUEVO):
- Nombre: "Test Imágenes Avanzado"
- Tipo: Entregas
- Categoría: Packs
- Precio: 25.00
- Stock: 20
```

---

## FASE 2: TESTS DE CREACIÓN

### TEST 2.1: Crear artículo SIN imágenes

```
PASOS:
1. Ve a: http://localhost:3000/bd/articulos/nuevo
2. Rellena:
   - Nombre: "Test 2.1 - Sin Imágenes"
   - Tipo: MiceCatering
   - Categoría: Bebidas
   - Precio: 5.00
   - Stock: 100
3. NO subas imágenes
4. Click "Guardar"

VALIDACIONES:
✅ [ ] Página redirecciona a /articulos
✅ [ ] Artículo aparece en tabla
✅ [ ] Supabase: columna imagenes = [] (vacío)
✅ [ ] Console: Sin errores [ERROR]
✅ [ ] Console: Log [SUCCESS] "Artículo guardado"
```

### TEST 2.2: Crear artículo CON 1 imagen

```
PASOS:
1. Ve a: http://localhost:3000/bd/articulos/nuevo
2. Rellena forma básica
   - Nombre: "Test 2.2 - 1 Imagen"
3. Scrollea hasta "Imágenes (0/5)"
4. Sube 1 imagen (JPEG):
   - Opción: Drag & drop a la zona
   - O click en área + seleccionar
5. Verifica:
   - [ ] Contador: "Imágenes (1/5)"
   - [ ] Thumbnail se ve
   - [ ] Icono 👑 está presente (principal)
6. Click "Guardar"

VALIDACIONES:
✅ [ ] Sin errores en formulario
✅ [ ] Artículo guardado
✅ [ ] Supabase imagenes = [{...}] (1 elemento)
✅ [ ] URL pública generada correctamente
✅ [ ] Console log [IMAGES]: "Nueva imagen añadida"
✅ [ ] Storage: Archivo en /articulosMice/[id]/img-...
```

### TEST 2.3: Crear artículo CON 3 imágenes

```
PASOS:
1. Ve a: http://localhost:3000/bd/articulos/nuevo
2. Rellena forma: "Test 2.3 - 3 Imágenes"
3. Sube 3 imágenes (alternando formatos):
   - Imagen 1: JPEG (drag & drop)
   - Imagen 2: PNG (click + seleccionar)
   - Imagen 3: JPEG (otra vez drag & drop)
4. Verifica orden: [IMG1] [IMG2] [IMG3]
5. Verifica contador: "Imágenes (3/5)"
6. Click "Guardar"

VALIDACIONES:
✅ [ ] Todas las imágenes subidas correctamente
✅ [ ] Contador actualizado a 3/5
✅ [ ] Orden preservado: orden: 0, 1, 2
✅ [ ] Primera imagen principal: esPrincipal: true
✅ [ ] Las otras: esPrincipal: false
✅ [ ] Supabase: imagenes array = 3 elementos
✅ [ ] Storage: 3 archivos en carpeta artículo
```

### TEST 2.4: Intentar subir 6ª imagen (validación)

```
PASOS:
1. En formulario nuevo, sube 5 imágenes exitosamente
2. Intenta subir la 6ª imagen
3. Verifica:
   - [ ] Toast notification: "Máximo 5 imágenes"
   - [ ] Imagen NO se añade
   - [ ] Contador sigue en "Imágenes (5/5)"
4. Click "Guardar"

VALIDACIONES:
✅ [ ] Límite de 5 imágenes se respeta
✅ [ ] Toast message clara
✅ [ ] Console log [ERROR]: "Límite de imágenes"
✅ [ ] No hay inconsistencia en BD
```

### TEST 2.5: Imagen muy grande (validación)

```
PASOS:
1. En formulario, intenta subir imagen >10MB
2. Verifica:
   - [ ] Error en consola
   - [ ] Imagen rechazada
   - [ ] Toast notification con error
3. Intenta otra imagen (normal):
   - [ ] Se sube correctamente

VALIDACIONES:
✅ [ ] Tamaño máximo validado
✅ [ ] Mensaje error claro
✅ [ ] Recuperación sin problemas
```

---

## FASE 3: TESTS DE EDICIÓN

### TEST 3.1: Abrir artículo y ver imágenes cargadas

```
PASOS:
1. Ve a tabla de artículos
2. Abre artículo que creaste en 2.3 (3 imágenes)
3. Scrollea a "Imágenes"

VALIDACIONES:
✅ [ ] Se cargan las 3 imágenes automáticamente
✅ [ ] Contador: "Imágenes (3/5)"
✅ [ ] Se ven thumbnails de todas
✅ [ ] Icono 👑 en la principal
✅ [ ] Orden es correcto: [IMG1] [IMG2] [IMG3]
✅ [ ] Console log [IMAGES]: "Imágenes cargadas"
```

### TEST 3.2: Reordenar imágenes (drag & drop)

```
PASOS:
1. En editor del artículo con 3 imágenes
2. Arrastra IMG3 al principio (antes de IMG1)
3. Verifica visual: orden es [IMG3] [IMG1] [IMG2]
4. Click "Guardar"
5. Recarga página (F5)

VALIDACIONES:
✅ [ ] Drag & drop funciona
✅ [ ] Orden visual se actualiza inmediatamente
✅ [ ] Orden persiste en BD: orden: 0→2, 1→0, 2→1
✅ [ ] Después de recargar, orden es igual: [IMG3] [IMG1] [IMG2]
✅ [ ] Console log [IMAGES]: "Imágenes reordenadas"
```

### TEST 3.3: Cambiar imagen principal

```
PASOS:
1. En editor del artículo
2. Click en icono 👑 de IMG2
3. Verifica visual:
   - [ ] IMG2 ahora tiene 👑
   - [ ] IMG1 perdió 👑
4. Click "Guardar"
5. Recarga página

VALIDACIONES:
✅ [ ] Principal se cambió visualmente
✅ [ ] BD: IMG2.esPrincipal = true, otros = false
✅ [ ] Persiste después de recargar
✅ [ ] Console log [IMAGES]: "Imagen principal actualizada"
```

### TEST 3.4: Eliminar imagen

```
PASOS:
1. En editor, click ❌ en IMG2
2. Verifica:
   - [ ] Imagen desaparece
   - [ ] Contador: "Imágenes (2/5)"
   - [ ] Quedan IMG1 y IMG3
3. Click "Guardar"
4. Recarga página

VALIDACIONES:
✅ [ ] Imagen eliminada visualmente
✅ [ ] BD: imagenes array = 2 elementos
✅ [ ] Storage: Archivo también eliminado
✅ [ ] No quedan references rotas
✅ [ ] Console log [IMAGES]: "Imagen eliminada"
```

### TEST 3.5: Añadir imágenes en editor

```
PASOS:
1. En editor de artículo con 2 imágenes
2. Sube 1 imagen más
3. Verifica: Contador "Imágenes (3/5)"
4. Sube otra imagen
5. Verifica: Contador "Imágenes (4/5)"
6. Click "Guardar"
7. Recarga

VALIDACIONES:
✅ [ ] Nuevas imágenes se añaden correctamente
✅ [ ] Contador actualizado
✅ [ ] BD: 4 imágenes guardadas
✅ [ ] Orden correcto (las nuevas al final)
✅ [ ] Todas las URLs válidas
```

---

## FASE 4: TESTS DE VALIDACIÓN

### TEST 4.1: Formatos soportados

```
JPEG:
[ ] Sube JPEG → ✅ OK

PNG:
[ ] Sube PNG → ✅ OK

HEIC:
[ ] Sube HEIC (si tienes) → ✅ OK

Formato no soportado (BMP, TIFF, etc):
[ ] Intenta BMP → ❌ Rechazado + error message
```

### TEST 4.2: Validación de orden

```
PASOS:
Crea artículo con 3 imágenes:
1. Sube IMG1, IMG2, IMG3 en ese orden
2. Verifica BD:
   - IMG1: orden = 0
   - IMG2: orden = 1
   - IMG3: orden = 2
3. Reordena (arrastra IMG3 al inicio)
4. Verifica:
   - IMG3: orden = 0
   - IMG1: orden = 1
   - IMG2: orden = 2

VALIDACIONES:
✅ [ ] Orden inicial correcto
✅ [ ] Orden se actualiza correctamente
✅ [ ] Sin gaps o duplicados
✅ [ ] BD es consistente
```

### TEST 4.3: Validación de principal

```
PASOS:
1. Crea con 3 imágenes
2. Verifica: Solo 1 tiene esPrincipal: true
3. Cambia principal
4. Verifica: La nueva tiene true, las otras false
5. Guarda y recarga
6. Verifica: Persiste correctamente

VALIDACIONES:
✅ [ ] Una y solo una imagen es principal
✅ [ ] No hay duplicados de principal
✅ [ ] No hay ninguna sin principal
✅ [ ] Persiste en BD
```

### TEST 4.4: URLs válidas

```
PASOS:
1. Crea artículo con 3 imágenes
2. En BD, verifica cada URL

URL Estructura:
✅ [ ] Inicia con: https://articulosmice.supabase.co/storage/v1/object/public/articulosMice/
✅ [ ] Contiene: [article-id]/img-[timestamp]
✅ [ ] Termina con: extensión (.jpg, .png, .heic)

URL Funcional:
✅ [ ] Click en URL en navegador → imagen se descarga
✅ [ ] Imagen se ve correctamente
```

---

## FASE 5: TESTS DE INTEGRACIÓN

### TEST 5.1: Editor vs Viewer

```
PASOS:
1. Crea artículo en /nuevo
2. Edítalo en /[id]
3. Vuelve a listar en /articulos
4. Vuelve a /[id]

VALIDACIONES:
✅ [ ] Datos consistentes en todos lados
✅ [ ] Imágenes persisten
✅ [ ] Orden correcto siempre
✅ [ ] Principal es siempre la misma
```

### TEST 5.2: Múltiples artículos

```
PASOS:
1. Crea artículo A con 2 imágenes
2. Crea artículo B con 3 imágenes
3. Crea artículo C con 0 imágenes
4. Edita cada uno
5. Verifica que cada uno tenga sus propias imágenes

VALIDACIONES:
✅ [ ] Las imágenes de A NO aparecen en B
✅ [ ] Las imágenes de B NO aparecen en C
✅ [ ] Cada artículo tiene sus datos propios
✅ [ ] Sin contaminación de datos
```

### TEST 5.3: Cambio de Tipo (MiceCatering vs Entregas)

```
PASOS:
1. Crea artículo tipo MiceCatering CON imágenes
2. Edita y crea artículo tipo Entregas CON imágenes
3. Navega entre ambos
4. Verifica que cada uno mantiene sus imágenes

VALIDACIONES:
✅ [ ] Ambos tipos soportan imágenes
✅ [ ] Cambiar tipo NO afecta imágenes
✅ [ ] Imágenes persisten correctamente
```

### TEST 5.4: Performance (carga con muchas imágenes)

```
PASOS:
1. Crea artículo con 5 imágenes
2. Mide tiempo de carga en /[id]:
   - ¿Se carga rápido? (<2 segundos)
   - ¿Todas las imágenes aparecen?
3. Edita (sube/elimina) y guarda
4. Verifica que NO hay lag o retrasos

VALIDACIONES:
✅ [ ] Carga inicial: <2 segundos
✅ [ ] UI responsiva (no bloquea)
✅ [ ] Imágenes se cargan progresivamente
✅ [ ] Sin memory leaks
```

---

## FASE 6: REPORTE

### Resumen de Test Results

```
CREAR SIN IMÁGENES:             [ ] PASS  [ ] FAIL
CREAR CON 1 IMAGEN:             [ ] PASS  [ ] FAIL
CREAR CON 3 IMÁGENES:           [ ] PASS  [ ] FAIL
VALIDAR 6ª IMAGEN RECHAZADA:    [ ] PASS  [ ] FAIL
VALIDAR IMAGEN GRANDE:          [ ] PASS  [ ] FAIL

ABRIR Y VER IMÁGENES:           [ ] PASS  [ ] FAIL
REORDENAR IMÁGENES:             [ ] PASS  [ ] FAIL
CAMBIAR PRINCIPAL:              [ ] PASS  [ ] FAIL
ELIMINAR IMAGEN:                [ ] PASS  [ ] FAIL
AÑADIR EN EDITOR:               [ ] PASS  [ ] FAIL

JPEG FORMAT:                    [ ] PASS  [ ] FAIL
PNG FORMAT:                     [ ] PASS  [ ] FAIL
HEIC FORMAT:                    [ ] PASS  [ ] FAIL
FORMATO NO SOPORTADO:           [ ] PASS  [ ] FAIL

VALIDAR ORDEN:                  [ ] PASS  [ ] FAIL
VALIDAR PRINCIPAL:              [ ] PASS  [ ] FAIL
VALIDAR URLS:                   [ ] PASS  [ ] FAIL

MÚLTIPLES ARTÍCULOS:            [ ] PASS  [ ] FAIL
CAMBIO DE TIPO:                 [ ] PASS  [ ] FAIL
PERFORMANCE:                    [ ] PASS  [ ] FAIL

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOTAL:     ____ / 25 tests PASSED
RESULTADO: [ ] APROBADO  [ ] FALLIDO
```

### Issues Encontrados

```
1. Describe cualquier issue aquí
   - Paso donde falló:
   - Error exacto (screenshot):
   - Reproducibilidad: siempre / a veces / nunca

2. Next issue...
```

### Notas y Observaciones

```
- Rendimiento observado: [excelente / bueno / regular / lento]
- UX feedback: [positivo / neutral / negativo]
- Recomendaciones: [lista de mejoras potenciales]
```

---

## 🚨 DEBUGGING DURANTE TESTS

### Si algo falla:

1. **Abre Console (F12)**
   - Busca: `[ERROR]`, `[IMAGES]`, `[FORM]`
   - Copia error completo

2. **Abre Network tab**
   - Busca: requests a `articulosMice`
   - Status debe ser 200 (success)

3. **Verifica BD**
   - Supabase Table Editor → articulos
   - Expande columna "imagenes"
   - Verifica JSON estructura

4. **Verifica Storage**
   - Supabase Storage → articulosMice
   - Busca carpeta de tu artículo
   - Verifica que archivos existan

5. **Reinicia**
   - npm run dev nuevamente
   - Hard refresh: Ctrl+Shift+R
   - Limpia caché del navegador

---

## 📋 CHECKLIST FINAL

```
ANTES DE REPORTAR:
[ ] He ejecutado TODO los tests
[ ] He verificado Console (F12)
[ ] He verificado Supabase BD
[ ] He verificado Storage
[ ] He intentado reiniciar dev server
[ ] He intentado hard refresh

REPORTE INCLUYE:
[ ] Test number que falló
[ ] Pasos exactos para reproducir
[ ] Error screenshot (console)
[ ] BD screenshot (si es relevante)
[ ] Storage screenshot (si es relevante)
[ ] Navegador y versión
[ ] Timestamp aproximado
```

---

## 🎉 SI TODO PASA

```
¡FELICIDADES!

El gestor de imágenes está:
✅ 100% FUNCIONAL
✅ Production-ready
✅ Listo para usar

Ahora puedes:
1. Lanzar a producción
2. Entrenar al equipo
3. Monitorear en tiempo real
4. Hacer backup regular
```

---

**Tiempo total:** 45-60 minutos  
**Versión:** 1.0  
**Última actualización:** 2024-12-11  
**Status:** Testing ready ✅
