# ✅ REVISIÓN COMPLETA DE IMPORT/EXPORT CSV - ARTÍCULOS ENTREGAS

## 📊 Resumen Ejecutivo

Se ha completado la revisión y actualización de la funcionalidad de **import/export CSV** en el módulo de **Artículos Entregas** (`/bd/articulos-entregas`), considerando todas las novedades implementadas:

1. ✅ **Campo nuevo:** `precio_alquiler_entregas` (numérico)
2. ✅ **Campo nuevo:** `imagenes` (JSON array)
3. ✅ **Reordenamiento lógico** de columnas para mejor claridad
4. ✅ **Documentación completa** actualizada

---

## 🔧 Cambios Implementados

### 1. CSV Headers (Línea 49)

**Antes:**
```javascript
const CSV_HEADERS = ["id", "erp_id", "nombre", "categoria", 
  "referencia_articulo_entregas", "dpt_entregas", 
  "precio_venta_entregas", "precio_venta_entregas_ifema", 
  "precio_coste", "precio_coste_alquiler", "precio_alquiler_ifema", 
  "unidad_venta", "loc", "imagen", "producido_por_partner", 
  "partner_id", "subcategoria", "iva", "doc_drive_url"];
```

**Después:**
```javascript
const CSV_HEADERS = ["id", "erp_id", "nombre", "categoria", 
  "referencia_articulo_entregas", "dpt_entregas", 
  "precio_coste", "precio_coste_alquiler", "precio_alquiler_entregas", 
  "precio_venta_entregas", "precio_venta_entregas_ifema", 
  "precio_alquiler_ifema", "iva", "doc_drive_url", "imagenes", 
  "producido_por_partner", "partner_id", "subcategoria", 
  "unidad_venta", "loc", "imagen"];
```

**Cambios clave:**
- ✅ Agregados: `precio_alquiler_entregas` (posición 9), `imagenes` (posición 15)
- ✅ Reordenado: Precios → IVA → Doc → Imágenes → Metadata
- ✅ Total: 21 columnas (antes 19)

### 2. handleImportCSV (Línea ~180-233)

**Cambios:**
```javascript
// Nuevo: Parsing tolerante de imagenes JSON
let imagenes = [];
if (item.imagenes && typeof item.imagenes === 'string') {
  try {
    imagenes = JSON.parse(item.imagenes);
  } catch (e) {
    imagenes = [];
  }
} else if (Array.isArray(item.imagenes)) {
  imagenes = item.imagenes;
}

// Nuevo: Campo precio_alquiler_entregas
precio_alquiler_entregas: parseFloat(item.precio_alquiler_entregas) || 0,

// Nuevo: Inclusión de imagenes en datos importados
imagenes: imagenes,
```

**Características:**
- ✅ Parsing JSON tolerante (no falla si hay errores)
- ✅ Fallback automático a `[]` si inválido
- ✅ Soporte para strings JSON y arrays directos
- ✅ Default a 0 para precio_alquiler_entregas

### 3. handleExportCSV (Línea ~263-290)

**Cambios:**
```javascript
const dataToExport = entregasItems.map((item: any) => ({
  // ... otros campos ...
  precio_coste: item.precioCoste,
  precio_coste_alquiler: item.precioCosteAlquiler,
  precio_alquiler_entregas: item.precioAlquilerEntregas,  // NUEVO
  // ... otros campos ...
  imagenes: item.imagenes ? JSON.stringify(item.imagenes) : '[]',  // NUEVO
  // ... otros campos ...
}));
```

**Características:**
- ✅ Exporta `precioAlquilerEntregas` del modelo
- ✅ Serializa imagenes con `JSON.stringify()`
- ✅ Default a `'[]'` si no hay imagenes
- ✅ Orden coincide con CSV_HEADERS

---

## 📋 Estructura Final del CSV

### Headers (21 columnas):

```
1.  id
2.  erp_id
3.  nombre
4.  categoria
5.  referencia_articulo_entregas
6.  dpt_entregas
7.  precio_coste                    ← Reordenado (antes era 9)
8.  precio_coste_alquiler           ← Reordenado (antes era 10)
9.  precio_alquiler_entregas        ← NUEVO
10. precio_venta_entregas           ← Reordenado (antes era 7)
11. precio_venta_entregas_ifema     ← Reordenado (antes era 8)
12. precio_alquiler_ifema           ← Reordenado (antes era 11)
13. iva                             ← Reordenado (antes era 18)
14. doc_drive_url                   ← Reordenado (antes era 19)
15. imagenes                        ← NUEVO
16. producido_por_partner
17. partner_id
18. subcategoria
19. unidad_venta                    ← Reordenado (antes era 11)
20. loc                             ← Reordenado (antes era 12)
21. imagen
```

---

## 🧪 Validaciones Implementadas

### En Importación CSV:

| Validación | Comportamiento |
|-----------|----------------|
| Headers requeridos | Falla si faltan columnas |
| Case-sensitive | Debe coincidir exactamente |
| JSON de imagenes | Tolerante a errores → `[]` |
| Números decimales | Parseados correctamente |
| Booleanos | Aceptan: true/false, "true"/"false", 0/1 |
| precio_alquiler_entregas | Default 0 si invalid |

### En Exportación CSV:

| Campo | Tratamiento |
|-------|------------|
| precio_alquiler_entregas | Número directo |
| imagenes | JSON.stringify() |
| Booleanos | Convertidos a "true"/"false" |
| Números | Formato numérico correcto |

### Validación TypeScript:

✅ **Sin errores** en archivo `articulos-entregas/page.tsx`
- Tipos correctos para nuevo campo número
- Tipos correctos para nuevo campo array de objetos
- Funciones con signaturas correctas

---

## 📖 Documentación Actualizada

### 1. CSV_GUIDE.md
- ✅ Actualizado con 21 columnas (antes 19)
- ✅ Nuevos ejemplos con `precio_alquiler_entregas`
- ✅ Notas sobre campo `imagenes` JSON
- ✅ Requisitos de formato para JSON
- ✅ Estructura esperada de imagenes

### 2. CAMBIOS_CSV_ARTICULOS_ENTREGAS.md (Nuevo)
- ✅ Documento completo con todos los cambios
- ✅ Ejemplos de entrada/salida
- ✅ Casos de prueba
- ✅ Compatibilidad hacia atrás
- ✅ Resolución de problemas

---

## 📝 Ejemplos de Uso

### Ejemplo 1: Importar sin imágenes
```csv
id,erp_id,nombre,categoria,referencia_articulo_entregas,dpt_entregas,precio_coste,precio_coste_alquiler,precio_alquiler_entregas,precio_venta_entregas,precio_venta_entregas_ifema,precio_alquiler_ifema,iva,doc_drive_url,imagenes,producido_por_partner,partner_id,subcategoria,unidad_venta,loc,imagen
123e4567-e89b-12d3-a456-426614174000,,Armario,Almacen,ENT-ARM-001,ALMACEN,100,0,25,150,180,200,10,https://drive.google.com/...,[],"false",,Muebles,1,A001,
```

### Ejemplo 2: Importar con imágenes
```csv
id,erp_id,nombre,categoria,referencia_articulo_entregas,dpt_entregas,precio_coste,precio_coste_alquiler,precio_alquiler_entregas,precio_venta_entregas,precio_venta_entregas_ifema,precio_alquiler_ifema,iva,doc_drive_url,imagenes,producido_por_partner,partner_id,subcategoria,unidad_venta,loc,imagen
223e4567-e89b-12d3-a456-426614174001,,Silla Event,Mobiliario,ENT-SIL-001,CPR,45,0,12,85,95,110,21,https://drive.google.com/...,"[{""id"":""img-1"",""url"":""https://bucket/img.jpg"",""esPrincipal"":true,""orden"":0,""descripcion"":""Silla blanca""}]","false",,Seating,4,A002,
```

### Ejemplo 3: JSON de imagenes (formato esperado)
```json
[
  {
    "id": "img-1",
    "url": "https://bucket.s3.amazonaws.com/articulosEntregas/img-1.jpg",
    "esPrincipal": true,
    "orden": 0,
    "descripcion": "Imagen frontal"
  },
  {
    "id": "img-2",
    "url": "https://bucket.s3.amazonaws.com/articulosEntregas/img-2.jpg",
    "esPrincipal": false,
    "orden": 1,
    "descripcion": "Vista lateral"
  }
]
```

---

## ⚠️ Consideraciones Importantes

### Compatibilidad Hacia Atrás
❌ **NO compatible** con CSVs anteriores
- CSVs antiguos tienen 19 columnas
- CSVs nuevos requieren 21 columnas
- Falta `precio_alquiler_entregas` e `imagenes`

**Soluciones:**
1. Usar "Descargar Plantilla" desde interfaz
2. Agregar 2 columnas vacías a CSVs antiguos
3. Usar "Exportar CSV" para obtener formato correcto

### Campos por Defecto
| Campo | Default | Notas |
|-------|---------|-------|
| `precio_alquiler_entregas` | 0 | Si no especificado |
| `imagenes` | [] | Si JSON inválido |
| `iva` | 10 | Si no especificado |

### Validaciones Estrictas
- ❌ Headers no coinciden → Falla importación
- ❌ CSV con solo 19 columnas → Falla importación
- ✅ JSON imagenes inválido → Se convierte a []
- ✅ Números inválidos → Se usan defaults

---

## 🚀 Próximos Pasos

### 1. Ejecutar SQL Migration
```sql
ALTER TABLE public.articulos 
ADD COLUMN IF NOT EXISTS precio_alquiler_entregas NUMERIC(10,2) DEFAULT 0;
```

### 2. Testing
- [ ] Exportar CSV con nuevos campos
- [ ] Importar CSV con precio_alquiler_entregas
- [ ] Importar CSV con imagenes JSON
- [ ] Verificar que campos se guardan correctamente

### 3. Comunicar a Usuarios
- Actualizar documentación si es pública
- Notificar cambios en formato CSV
- Proporcionar plantilla nueva

---

## ✨ Beneficios de los Cambios

| Aspecto | Beneficio |
|--------|-----------|
| **Precio Alquiler Entregas** | Separación clara de precios por departamento |
| **Imagenes en CSV** | Exporta/importa datos completos sin duplicación |
| **Reordenamiento** | Grupos lógicos: Precios → IVA/Doc → Imágenes → Metadata |
| **Parsing Tolerante** | No falla si imagenes malformadas |
| **Validación Mejorada** | Headers validados pero con mensajes claros |

---

## 📊 Matriz de Cambios Resumida

```
ANTES (19 columnas):
  Precios desordenados, sin precio_alquiler_entregas, sin imagenes

DESPUÉS (21 columnas):
  ✅ Precios ordenados lógicamente
  ✅ Incluye precio_alquiler_entregas
  ✅ Incluye imagenes como JSON
  ✅ IVA y doc_drive_url juntos
  ✅ Metadata al final
```

---

## ✅ Checklist de Validación

- ✅ CSV_HEADERS actualizado (21 columnas)
- ✅ handleImportCSV soporta nuevos campos
- ✅ handleExportCSV exporta nuevos campos
- ✅ JSON parsing implementado para imagenes
- ✅ Documentación actualizada
- ✅ Sin errores TypeScript
- ✅ Validaciones implementadas
- ✅ Ejemplos de uso documentados
- ✅ Compatibilidad hacia atrás considerada
- ⏳ SQL migration pendiente (usuario debe ejecutar)

---

**Versión:** 2.0
**Fecha:** 12 de Diciembre de 2025
**Estado:** ✅ REVISIÓN COMPLETADA
**Archivos Modificados:** 
- `/app/(dashboard)/bd/articulos-entregas/page.tsx`
- `/CSV_GUIDE.md`
- `/CAMBIOS_CSV_ARTICULOS_ENTREGAS.md` (nuevo)
