# ⚡ Pasos Rápidos para Activar el Gestor de Imágenes

## 🎯 ANTES DE NADA

Ejecuta la migración SQL en Supabase:

### Paso 1: Ir a Supabase
1. Abre [supabase.com](https://supabase.com)
2. Selecciona tu proyecto
3. Ir a **SQL Editor** (arriba a la izquierda)

### Paso 2: Copiar y Ejecutar SQL
Copia esto:
```sql
-- Añadir columna imagenes a articulos
ALTER TABLE public.articulos
ADD COLUMN IF NOT EXISTS imagenes jsonb DEFAULT '[]'::jsonb;

-- Crear índice para optimización
CREATE INDEX IF NOT EXISTS idx_articulos_imagenes ON public.articulos USING gin (imagenes);
```

Luego:
1. Click en el editor SQL (grande en blanco)
2. Pega el código
3. Click en **Run** (botón verde abajo a la derecha)

Deberías ver: ✅ "1 statement executed successfully"

---

## 🚀 Ahora Prueba en tu Aplicación

### Paso 3: Crear Artículo NUEVO
```
1. Abre http://localhost:3000/bd/articulos/nuevo
2. Rellena:
   - Tipo de Artículo: "Micecatering"
   - Nombre: "Test" (verás que es GRANDE)
   - Categoría: "Bebidas"
   - Precio Venta: "5"
3. Scrollea hasta abajo
4. Ve la sección "Imágenes (0/5)" ← NUEVA
5. Click en la zona gris
6. Selecciona una foto de tu ordenador
7. Verás la preview
8. Click "Guardar"
```

**Resultado esperado:**
- Artículo se guarda
- En consola (F12) ves logs `[IMAGES]` y `[FORM]`
- El artículo aparece en la lista

### Paso 4: Verificar en Supabase
```
1. Abre Supabase
2. Ir a Table Editor
3. Selecciona tabla: articulos
4. Busca tu artículo (por nombre "Test")
5. Expande columna "imagenes"
6. Deberías ver el JSON con tu foto
```

---

## 🎨 Lo que Cambió Visualmente

### Formulario ANTES
```
[Tipo: Micecatering]  [Nombre: pequeño] [Vínculo ERP: grande]
```

### Formulario AHORA
```
[Tipo: Micecatering]  [Vínculo ERP: compacto]

[NOMBRE: GRANDE Y DESTACADO EN FILA NUEVA]

[Categoría]

... otros campos ...

Imágenes (0/5)
┌─────────────────┐
│ + Añadir imagen │
│ (cámara, fotos) │
└─────────────────┘
```

---

## 📱 Características del Gestor de Imágenes

### Cómo Subir
- Click en la zona gris → Selecciona archivo
- O Drag & Drop una foto a la zona
- O Click en 📷 para usar cámara

### Cómo Cambiar Imagen Principal
- Cuando subes, la primera es principal automáticamente
- Para cambiar: click en botón "Principal" de otra imagen

### Cómo Reordenar
- Drag & Drop las imágenes en el orden que quieras
- Los números se actualizan automáticamente

### Cómo Eliminar
- Click en el ❌ de cada imagen
- Si era la principal, la siguiente se hace principal

### Límites
- **Máximo: 5 imágenes**
- Si intentas añadir la 6ª, verás un toast: "Límite alcanzado"

---

## 🔍 Debugging (Si Algo Falla)

### Abre Consola (F12 → Console)

**Deberías ver algo así al subir imagen:**
```javascript
[IMAGES] Nueva imagen añadida: mi-foto.jpg
```

**Deberías ver al guardar artículo:**
```javascript
[FORM] Iniciando submit con datos: {nombre: "Test", ...}
[SUPABASE] Datos a insertar: {..., imagenes: [{id: "img-1702...", url: "https://...", ...}]}
[SUPABASE] Query completada en 245.32ms
[SUCCESS] Artículo insertado: 550e8400-e29b-41d4-a716-446655440000
```

**Si ves error:**
```javascript
[ERROR] Error de Supabase: {code: "PGRST...", message: "..."}
```

Revisa la migración SQL fue ejecutada correctamente.

---

## 🛠️ Editar Artículos Existentes

### Ahora También Puedes:
1. Ir a un artículo existente
2. Añadir imágenes nuevas
3. Cambiar la principal
4. Eliminar imágenes
5. Guardar cambios

**Todo funciona igual que en el formulario nuevo.**

---

## ✅ Checklist Final

- [ ] Ejecuté la migración SQL en Supabase
- [ ] El bucket `articulosMice` existe en Storage
- [ ] Abrí http://localhost:3000/bd/articulos/nuevo
- [ ] Vi la sección "Imágenes" al final
- [ ] Subí una imagen de prueba
- [ ] Guardé el artículo
- [ ] Verifiqué en Supabase que se guardó
- [ ] Revisé los logs en consola
- [ ] Probé editar un artículo existente

---

## 📞 Si Algo No Funciona

### Error: "Cannot find module '@/components/book/images/ImageManager'"
- [ ] Verificar que existe: `components/book/images/ImageManager.tsx`
- [ ] Si no existe, buscar dónde está el `ImageManager`

### Error: "imagenes column does not exist"
- [ ] La migración SQL no se ejecutó
- [ ] Ir a Supabase SQL Editor
- [ ] Ejecutar el comando SQL nuevamente

### Las imágenes no se guardan
- [ ] Revisar consola para logs de error
- [ ] Verificar que Supabase Storage está funcionando
- [ ] Revisar permisos del bucket `articulosMice`

### Las imágenes no se cargan al editar
- [ ] Revisar que el artículo tiene datos en columna `imagenes`
- [ ] En Supabase: `SELECT imagenes FROM articulos WHERE id = 'xxx';`

---

## 🎓 Archivos Modificados

✅ `app/(dashboard)/bd/articulos/nuevo/page.tsx`
✅ `app/(dashboard)/bd/articulos/[id]/page.tsx`
✅ `migrations/008_add_imagenes_to_articulos.sql`

---

## 📚 Documentación

- **RESUMEN_CAMBIOS.md** ← Visual y rápido
- **GUIA_IMAGENES_ARTICULOS.md** ← Técnico y detallado
- **DEBUG_LOGS_FORMULARIO.md** ← Debugging anterior

---

## 🎉 ¡Listo!

Ya tienes el gestor de imágenes completamente integrado en:
- ✅ Formulario nuevo de artículos
- ✅ Editor de artículos existentes
- ✅ Base de datos Supabase
- ✅ Logs de debugging

Solo ejecuta la migración SQL y ¡a disfrutar!

**Próximo paso:** 
1. Abre DevTools (F12)
2. Ve a http://localhost:3000/bd/articulos/nuevo
3. ¡Prueba a subir una imagen!
