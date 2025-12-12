# ✅ CHECKLIST DE IMPLEMENTACIÓN - GESTOR DE IMÁGENES

## 📋 FASE 1: PREPARACIÓN (5-10 minutos)

- [ ] **1.1** Abre el archivo `migrations/008_add_imagenes_to_articulos.sql`
  - Ubicación: `/Users/guillermo/mc/studio/migrations/008_add_imagenes_to_articulos.sql`
  - Deberías ver 4 líneas SQL
  
- [ ] **1.2** Abre Supabase en el navegador
  - URL: https://app.supabase.com
  - Proyecto: Studio
  - Sección: SQL Editor
  
- [ ] **1.3** Crea nueva query en SQL Editor
  - Click en "+ New query"
  - Pon un nombre: "Add imagenes column"
  - Deja la query vacía (la llenarás en el paso 1.4)

---

## 🗄️ FASE 2: EJECUTAR MIGRACIÓN SQL (2-3 minutos)

- [ ] **2.1** Copia el contenido del archivo SQL
  ```sql
  ALTER TABLE public.articulos
  ADD COLUMN IF NOT EXISTS imagenes jsonb DEFAULT '[]'::jsonb;

  CREATE INDEX IF NOT EXISTS idx_articulos_imagenes 
  ON public.articulos 
  USING gin (imagenes);

  COMMENT ON COLUMN public.articulos.imagenes 
  IS 'Array JSONB de objetos imagen con id, url, esPrincipal, orden, descripcion';
  ```

- [ ] **2.2** Pega en la query de Supabase

- [ ] **2.3** Ejecuta la query
  - Click en "▶️ Run" o presiona `Ctrl+Enter`
  - Deberías ver: "1 statement executed successfully"

- [ ] **2.4** Verifica en Table Editor
  - Ir a: Table Editor → articulos
  - Scrollear a la derecha
  - Deberías ver columna "imagenes" (vacía, en blanco)
  - Tipo: `jsonb`

---

## 🪣 FASE 3: VERIFICAR BUCKET (3-5 minutos)

- [ ] **3.1** Abre Supabase Storage
  - Supabase Dashboard → Storage → Buckets

- [ ] **3.2** Busca bucket "articulosMice"
  - ¿Existe? → Ve al paso 3.4
  - ¿No existe? → Ve al paso 3.3

- [ ] **3.3** Crea bucket "articulosMice" (si no existe)
  - Click en "+ New bucket"
  - Nombre: `articulosMice`
  - Policy: Public (✅ permite lectura pública)
  - Click "Create bucket"

- [ ] **3.4** Verifica permisos
  - Click en bucket articulosMice
  - Ir a: Policies
  - Deberías ver al menos:
    - ✅ SELECT (permitir lectura pública)
    - ✅ INSERT (permitir subida)
    - ✅ DELETE (permitir eliminar)
  - Si faltan permisos, pide ayuda 🆘

---

## 🚀 FASE 4: PRUEBA EN LOCALHOST (10-15 minutos)

- [ ] **4.1** Asegúrate que el dev server está corriendo
  ```bash
  # En terminal:
  npm run dev
  # O: yarn dev
  # Deberías ver: ✓ ready started server on 0.0.0.0:3000
  ```

- [ ] **4.2** Abre navegador en modo desarrollo
  - URL: http://localhost:3000/bd/articulos/nuevo
  - Abre: DevTools (F12 o Cmd+Option+I en Mac)
  - Pestaña: Console
  - Filtra por: `[IMAGES]` o `[FORM]`

- [ ] **4.3** Crea un artículo de prueba NUEVO
  - **Nombre:** "Artículo Test Imágenes"
  - **Tipo:** MiceCatering
  - **Categoría:** Bebidas (o la que quieras)
  - **Precio:** 10.00
  - **Stock:** 5
  - **Unidad:** Unidad

- [ ] **4.4** Scrollea hasta "Imágenes"
  - Deberías ver sección: "Imágenes (0/5)"
  - Con área de "Drag & Drop"
  - Botón "+ Añadir imagen"

- [ ] **4.5** Sube una imagen
  - Opción A: Click en área → selecciona foto de tu disco
  - Opción B: Arrastra foto a la zona
  - Opción C: Usa 📷 cámara (si tienes)
  
  **Verifica en consola:**
  - [ ] Ves log: `[IMAGES] Nueva imagen añadida:`
  - [ ] Cuenta de imágenes: "Imágenes (1/5)"
  - [ ] Se ve thumbnail de la foto

- [ ] **4.6** Prueba reordenar (si subiste 2+ imágenes)
  - Arrastra una imagen encima de otra
  - Verifica log: `[IMAGES] Imágenes reordenadas:`

- [ ] **4.7** Prueba cambiar principal
  - Click en icono 👑 de una imagen
  - Verifica: Otra imagen pierde 👑, esta la gana
  - Verifica log: `[IMAGES] Imagen principal actualizada:`

- [ ] **4.8** Prueba eliminar
  - Click en ❌ de una imagen
  - Verifica: Se elimina
  - Verifica log: `[IMAGES] Imagen eliminada:`

- [ ] **4.9** Intenta subir 6ª imagen
  - Deberías ver notificación: "Máximo 5 imágenes"
  - Verifica log: `[ERROR] Límite de imágenes alcanzado`

- [ ] **4.10** Guarda el artículo
  - Click en "Guardar"
  - Verifica en consola:
    - [ ] Log: `[FORM] Guardando artículo...`
    - [ ] Log: `[SUPABASE] insertData:` (ve el JSON con imagenes)
    - [ ] Log: `[SUCCESS] Artículo guardado:` + id
  - Deberías ser redirigido a `/bd/articulos`

---

## 🔍 FASE 5: VERIFICAR EN SUPABASE (5 minutos)

- [ ] **5.1** Abre Supabase Table Editor
  - Supabase → Table Editor → articulos

- [ ] **5.2** Busca el artículo que acabas de crear
  - Filtra por nombre: "Artículo Test Imágenes"

- [ ] **5.3** Haz click en la columna "imagenes"
  - Deberías ver JSON como:
    ```json
    [
      {
        "id": "img-123456789",
        "url": "https://articulosmice.supabase.co/...",
        "esPrincipal": true,
        "orden": 0,
        "descripcion": "foto.jpg"
      }
    ]
    ```

- [ ] **5.4** Verifica en Storage
  - Storage → articulosMice → [articuloId]/
  - Deberías ver archivos: `img-123456789.jpg` (comprimido)

---

## ✏️ FASE 6: PROBAR EDITOR DE ARTÍCULOS (5-10 minutos)

- [ ] **6.1** Abre el artículo que creaste
  - Desde tabla articulos: click en artículo
  - URL: http://localhost:3000/bd/articulos/[id]

- [ ] **6.2** Verifica que las imágenes cargaron
  - Deberías ver:
    - [ ] La sección "Imágenes" con tu foto
    - [ ] Gallería con thumbnail
    - [ ] Icono 👑 en la principal
    - [ ] Contador: "Imágenes (1/5)"
  - Verifica en consola:
    - [ ] Log: `[IMAGES] Imágenes cargadas:`

- [ ] **6.3** Sube más imágenes
  - Añade 2-3 imágenes más
  - Verifica contador: "Imágenes (4/5)"

- [ ] **6.4** Cambia principal
  - Click 👑 en otra imagen
  - Verifica cambio en la UI

- [ ] **6.5** Reordena
  - Arrastra imágenes
  - Verifica orden se actualiza

- [ ] **6.6** Guarda cambios
  - Click "Guardar"
  - Verifica en consola:
    - [ ] Log: `[SUPABASE] UPDATE articulos...`
    - [ ] Log: `[SUCCESS] Artículo actualizado:`

- [ ] **6.7** Recarga página
  - Presiona F5 o Cmd+R
  - Verifica que imágenes persisten
  - El orden que guardaste está igual

---

## 🎓 FASE 7: PRUEBAS AVANZADAS (5-10 minutos)

- [ ] **7.1** Prueba con diferentes formatos
  - Sube: 1 JPEG, 1 PNG, 1 HEIC (si tienes iPhone)
  - Verifica: Todas aparecen

- [ ] **7.2** Prueba eliminar imagen
  - En editor, click ❌ en una imagen
  - Guarda
  - Recarga
  - Verifica: Desaparece de BD

- [ ] **7.3** Prueba cambiar de artículo
  - Crea otro artículo CON imágenes
  - Edítalo y añade/quita imágenes
  - Verifica: Cada artículo tiene sus propias imágenes

- [ ] **7.4** Prueba navegación
  - Crea artículo 1 (con imágenes)
  - Crea artículo 2 (con imágenes)
  - Navega: artículo 1 → artículo 2 → artículo 1
  - Verifica: Cada uno mantiene sus imágenes

---

## 🚨 FASE 8: DEBUGGING (si algo falla)

- [ ] **8.1** Revisa Console en DevTools
  - Abre: F12 → Console
  - Busca logs rojos (❌ errors)
  - Busca logs: `[ERROR]`, `[FORM]`, `[SUPABASE]`
  
  **Errores comunes:**
  
  | Error | Solución |
  |-------|----------|
  | `412 Precondition Failed` | Bucket no existe o no tiene permisos públicos |
  | `JSONB Parse Error` | El JSON de imagenes está corrupto (raro) |
  | `Storage path error` | Ruta de Supabase Storage incorrecta |
  | `Imagen no se sube` | Exceede tamaño, formato no soportado, o bucket lleno |

- [ ] **8.2** Verifica Network tab
  - DevTools → Network tab
  - Sube imagen
  - Verifica petición: `POST /storage/...`
  - Deberías ver: `200 OK` (éxito) o `4xx` (error)

- [ ] **8.3** Verifica Logs en Supabase
  - Supabase → Logs → Edge Functions (o Realtime)
  - Busca errores de 5xx

- [ ] **8.4** Verifica RLS policies
  - Supabase → Authentication → Policies
  - Storage → articulosMice → Policies
  - Deberías tener reglas para:
    - `SELECT` (lectura pública)
    - `INSERT` (subida autenticada)
    - `DELETE` (borrado autenticado)

---

## ✨ CHECKLIST DE ACEPTACIÓN FINAL

- [ ] ✅ Migración SQL ejecutada (columna imagenes añadida)
- [ ] ✅ Bucket articulosMice existe y es público
- [ ] ✅ Puedo crear artículo nuevo CON imágenes
- [ ] ✅ Puedo subir hasta 5 imágenes
- [ ] ✅ Puedo reordenar imágenes (drag & drop)
- [ ] ✅ Puedo seleccionar imagen principal (👑)
- [ ] ✅ Puedo eliminar imágenes (❌)
- [ ] ✅ Las imágenes se guardan en Supabase BD (columna imagenes)
- [ ] ✅ Las imágenes se guardan en Storage (bucket articulosMice)
- [ ] ✅ Puedo editar artículo existente y modificar imágenes
- [ ] ✅ Las imágenes persisten después de recargar
- [ ] ✅ Formatos JPEG, PNG, HEIC funcionan
- [ ] ✅ Consola muestra logs [IMAGES] correctamente
- [ ] ✅ No hay errores rojo en consola

---

## 🎉 ÉXITO TOTAL

Si marcaste ✅ en TODOS los items de la sección final, **¡FELICIDADES!** 🎉

El sistema de gestión de imágenes está **100% funcional**.

### Qué hacer ahora:

1. **Integración en producción:** Cuando hagas deploy, la migración ya está en el repo
2. **Entrenar usuarios:** Muéstrale a tu equipo cómo subir imágenes
3. **Monitorear:** Revisa ocasionalmente la columna imagenes en Supabase
4. **Optimizar:** Si ves que las imágenes son muy grandes, ajusta la compresión en ImageManager

---

## 📞 SOPORTE RÁPIDO

Si algo no funciona, antes de rendirte:

1. **Limpia caché:** Ctrl+Shift+R (hard refresh)
2. **Reinicia dev server:** Ctrl+C en terminal, `npm run dev` de nuevo
3. **Revisa Network:** ¿Las imágenes se suben? ¿Storage responde 200?
4. **Verifica BD:** ¿La columna imagenes existe en Supabase?
5. **Lee los logs:** Busca `[ERROR]` en consola browser

---

**Última actualización:** 2024
**Estado:** ✅ Listo para usar
**Responsable:** Implementación de gestor de imágenes v1.0
