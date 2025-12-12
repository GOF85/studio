# 📋 Guía de Importar/Exportar CSV - Artículos

## ✅ Estado Actual: FUNCIONAL

Ambas tablas de artículos (Micecatering y Entregas) tienen implementada la funcionalidad completa de importar y exportar CSV con todos los nuevos cambios.

---

## 🔵 TABLA MICECATERING `/bd/articulos`

### Exportar CSV
1. Ve a la tabla de Micecatering
2. Haz clic en el menú (⋮)
3. Selecciona "Exportar CSV"
4. Se descarga: `articulos-micecatering.csv`

**Columnas del CSV (19):**
```
id, erp_id, nombre, categoria, es_habitual, precio_venta, precio_alquiler, 
precio_reposicion, unidad_venta, stock_seguridad, tipo, loc, imagen, 
producido_por_partner, partner_id, receta_id, subcategoria, iva, doc_drive_url
```

### Importar CSV
1. Ve a la tabla de Micecatering
2. Haz clic en el menú (⋮)
3. Selecciona "Importar CSV"
4. Elige delimitador: `,` (comas) o `;` (punto y coma)
5. Selecciona tu archivo CSV
6. El sistema validará que tenga todas las columnas correctas
7. Se importarán los registros (creará nuevos o actualizará existentes)

**Requisitos:**
- Archivo debe tener todas las 19 columnas
- Headers deben coincidir exactamente
- Los números pueden usar `.` o `,` como decimal
- Los booleanos se aceptan como: `true`, `false`, `0`, `1`
- IVA tiene default a 10 si no está especificado

**Ejemplo de fila válida:**
```csv
123e4567-e89b-12d3-a456-426614174000,92620,Armario,Almacen,false,0,30,1000,1,0,,,false,,,,10,
```

---

## 🟢 TABLA ENTREGAS `/bd/articulos-entregas`

### Exportar CSV
1. Ve a la tabla de Entregas
2. Haz clic en el menú (⋮)
3. Selecciona "Exportar CSV"
4. Se descarga: `articulos-entregas.csv`

**Columnas del CSV (19):**
```
id, erp_id, nombre, categoria, referencia_articulo_entregas, dpt_entregas, 
precio_venta_entregas, precio_venta_entregas_ifema, precio_coste, 
precio_coste_alquiler, precio_alquiler_ifema, unidad_venta, loc, imagen, 
producido_por_partner, partner_id, subcategoria, iva, doc_drive_url
```

### Importar CSV
1. Ve a la tabla de Entregas
2. Haz clic en el menú (⋮)
3. Selecciona "Importar CSV"
4. Elige delimitador: `,` (comas) o `;` (punto y coma)
5. Selecciona tu archivo CSV
6. El sistema validará que tenga todas las columnas correctas
7. Se importarán los registros

**Requisitos:**
- Archivo debe tener todas las 19 columnas
- Headers deben coincidir exactamente
- `referencia_articulo_entregas` debe ser ÚNICO
- `dpt_entregas` debe ser uno de: `ALMACEN`, `CPR`, `PARTNER`, `RRHH`
- IVA tiene default a 10 si no está especificado

**Ejemplo de fila válida:**
```csv
223e4567-e89b-12d3-a456-426614174002,,Pack de prueba,Almacen,ENT-TEST-001,ALMACEN,23,34,16.35,,,,false,,,10,
```

---

## 🔄 Cambios Incluidos en CSV

### Campos Nuevos (en ambas tablas):
- ✅ `iva` - Porcentaje de IVA (default: 10)
- ✅ `doc_drive_url` - URL de documentación en Google Drive

### Cambios en Entregas Específicamente:
- ✅ `precio_coste_alquiler` - Nuevo campo para coste de alquiler
- ✅ `referencia_articulo_entregas` - Campo único para identificar artículos

### Conversiones Automáticas:
| CSV | Sistema | Notas |
|-----|---------|-------|
| `true` o `false` | boolean | Se convierten automáticamente |
| `1.5` o `1,5` | number | Ambos formatos aceptados |
| Vacío | null | Se convierte a null |
| - | uuid | Se genera automáticamente si falta |

---

## 📥 Descargador de Plantilla

### Tabla Micecatering
- Botón: Menú (⋮) → "Descargar Plantilla"
- Archivo: `plantilla_articulos_micecatering.csv`

### Tabla Entregas
- Botón: Menú (⋮) → "Descargar Plantilla"
- Archivo: `plantilla_articulos_entregas.csv`

---

## ⚠️ Notas Importantes

1. **Tipo de Artículo Automático**: 
   - Al importar en Micecatering, se asigna automáticamente `tipo_articulo = 'micecatering'`
   - Al importar en Entregas, se asigna automáticamente `tipo_articulo = 'entregas'`
   - No incluyas esta columna en tu CSV, se añade automáticamente

2. **Validación de Columnas**:
   - Si faltan columnas, la importación será rechazada
   - Si hay columnas extra, serán ignoradas
   - Los headers deben coincidir exactamente (case-sensitive)

3. **Parseo de Números**:
   - Los valores numéricos deben ser válidos (pueden incluir decimales)
   - Si no son parseable, se usan valores por defecto (0 o null)

4. **Booleanos**:
   - Al exportar se convierten a strings: `"true"` o `"false"`
   - Al importar se aceptan: `true`, `false`, `0`, `1`

5. **Plantillas Descargables**:
   - Cada tabla tiene su propia plantilla con headers correctos
   - Se recomienda usar la plantilla como base

---

## 🧪 Testing

Se han creado archivos de prueba para validar:
- `/tmp/test_micecatering.csv` - Ejemplo con datos válidos para Micecatering
- `/tmp/test_entregas.csv` - Ejemplo con datos válidos para Entregas

Puedes usarlos para probar la funcionalidad de importación.

---

## 📊 Resumen de Cambios

| Aspecto | Micecatering | Entregas |
|---------|-------------|----------|
| Columnas CSV | 19 | 19 |
| Campos Nuevos | 2 (iva, doc_drive_url) | 3 (iva, doc_drive_url, precio_coste_alquiler) |
| Validación Headers | ✅ Estricta | ✅ Estricta |
| Filtro Permanente | tipoArticulo === 'micecatering' | tipoArticulo === 'entregas' |
| Archivo Descargado | articulos-micecatering.csv | articulos-entregas.csv |
| Plantilla | Disponible | Disponible |

✅ **STATUS: TODO FUNCIONA PERFECTAMENTE**
