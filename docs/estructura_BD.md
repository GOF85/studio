# Estructura de Base de Datos Supabase

**Última actualización:** 19 de diciembre de 2025

---

## Tabla de Contenidos

1. [activity_logs](#activity_logs)
2. [articulo_packs](#articulo_packs)
3. [articulos](#articulos)
4. [articulos_erp](#articulos_erp)
5. [atipicos_catalogo](#atipicos_catalogo)
6. [categorias_personal](#categorias_personal)
7. [categorias_recetas](#categorias_recetas)
8. [clientes](#clientes)
9. [comercial_ajustes](#comercial_ajustes)
10. [comercial_briefings](#comercial_briefings)

---

## Tablas

### activity_logs

**Propósito:** Registro de actividades y cambios en el sistema.

| Columna | Tipo | Nullable | Por Defecto | Descripción |
|---------|------|----------|-------------|-------------|
| id | UUID | NO | uuid_generate_v4() | Identificador único |
| user_id | UUID | YES | - | ID del usuario que realizó la acción |
| accion | TEXT | NO | - | Descripción de la acción realizada |
| entidad | TEXT | YES | - | Tipo de entidad afectada |
| entidad_id | UUID | YES | - | ID de la entidad afectada |
| detalles | JSONB | YES | '{}'::jsonb | Detalles adicionales en formato JSON |
| created_at | TIMESTAMP WITH TIME ZONE | YES | now() | Marca de tiempo de creación |

---

### articulo_packs

**Propósito:** Relación entre artículos y packs (agrupaciones de productos).

| Columna | Tipo | Max Len | Nullable | Por Defecto | Descripción |
|---------|------|---------|----------|-------------|-------------|
| id | UUID | - | NO | gen_random_uuid() | Identificador único |
| articulo_id | UUID | - | NO | - | ID del artículo asociado |
| erp_id | VARCHAR | 255 | NO | - | ID del ERP |
| cantidad | INTEGER | - | NO | 1 | Cantidad del artículo en el pack |
| created_at | TIMESTAMP WITHOUT TIME ZONE | - | YES | now() | Fecha de creación |
| updated_at | TIMESTAMP WITHOUT TIME ZONE | - | YES | now() | Fecha de última actualización |

---

### articulos

**Propósito:** Catálogo principal de artículos con información de precios, categorización y gestión.

| Columna | Tipo | Max Len | Nullable | Por Defecto | Descripción |
|---------|------|---------|----------|-------------|-------------|
| id | UUID | - | NO | gen_random_uuid() | Identificador único |
| erp_id | TEXT | - | YES | - | ID en sistema ERP externo |
| nombre | TEXT | - | NO | - | Nombre del artículo |
| categoria | TEXT | - | NO | - | Categoría principal |
| subcategoria | TEXT | - | YES | - | Subcategoría |
| es_habitual | BOOLEAN | - | YES | false | Indica si es artículo habitual |
| precio_venta | NUMERIC | - | YES | 0 | Precio de venta estándar |
| precio_alquiler | NUMERIC | - | YES | 0 | Precio de alquiler estándar |
| precio_reposicion | NUMERIC | - | YES | 0 | Precio de reposición |
| precio_coste | NUMERIC | - | YES | - | Precio de costo |
| precio_coste_alquiler | NUMERIC | - | YES | - | Precio de costo para alquiler |
| precio_venta_entregas | NUMERIC | - | YES | - | Precio de venta en módulo entregas |
| precio_venta_entregas_ifema | NUMERIC | - | YES | - | Precio de venta entregas en IFEMA |
| precio_alquiler_entregas | NUMERIC | - | YES | 0 | Precio de alquiler en entregas |
| precio_alquiler_ifema | NUMERIC | - | YES | - | Precio de alquiler en IFEMA |
| precio_venta_ifema | NUMERIC | - | YES | - | Precio de venta en IFEMA |
| unidad_venta | NUMERIC | - | YES | - | Unidad de venta |
| stock_seguridad | NUMERIC | - | YES | - | Stock de seguridad mínimo |
| tipo | TEXT | - | YES | - | Tipo de artículo |
| tipo_articulo | VARCHAR | 20 | NO | 'micecatering' | Clasificación del artículo |
| loc | TEXT | - | YES | - | Ubicación/localización |
| imagen | TEXT | - | YES | - | URL de imagen principal |
| imagenes | JSONB | - | YES | '[]'::jsonb | Array de URLs de imágenes |
| producido_por_partner | BOOLEAN | - | YES | false | Indica si es producido por partner |
| partner_id | TEXT | - | YES | - | ID del partner productor |
| receta_id | TEXT | - | YES | - | ID de la receta asociada |
| alergenos | JSONB | - | YES | '[]'::jsonb | Array de alergenos |
| pack | JSONB | - | YES | '[]'::jsonb | Información de packs |
| audit | JSONB | - | YES | '[]'::jsonb | Historial de auditoría |
| doc_drive_url | TEXT | - | YES | - | URL de documentación en Google Drive |
| iva | NUMERIC | - | YES | 10 | Porcentaje de IVA |
| dpt_entregas | TEXT | - | YES | - | Departamento de entregas |
| referencia_articulo_entregas | TEXT | - | YES | - | Referencia en módulo entregas |
| created_at | TIMESTAMP WITH TIME ZONE | - | YES | now() | Fecha de creación |

---

### articulos_erp

**Propósito:** Información de artículos sincronizada desde ERP externo, con detalles de proveedores, gestión de lotes y precios.

| Columna | Tipo | Nullable | Por Defecto | Descripción |
|---------|------|----------|-------------|-------------|
| id | UUID | NO | uuid_generate_v4() | Identificador único |
| erp_id | TEXT | YES | - | ID en ERP |
| nombre | TEXT | NO | - | Nombre del artículo |
| referencia_proveedor | TEXT | YES | - | Referencia del proveedor |
| proveedor_id | UUID | YES | - | ID del proveedor principal |
| proveedor_preferente_id | UUID | YES | - | ID del proveedor preferente |
| nombre_proveedor | TEXT | YES | - | Nombre del proveedor |
| familia_id | UUID | YES | - | ID de la familia/categoría |
| familia_categoria | TEXT | YES | - | Nombre de la familia/categoría |
| tipo | TEXT | YES | - | Tipo de artículo |
| categoria_mice | TEXT | YES | - | Categoría MICE |
| precio_compra | NUMERIC | YES | 0 | Precio de compra |
| precio | NUMERIC | YES | 0 | Precio estándar |
| precio_alquiler | NUMERIC | YES | 0 | Precio de alquiler |
| descuento | NUMERIC | YES | 0 | Descuento aplicado |
| unidad_medida | TEXT | YES | - | Unidad de medida |
| unidad_conversion | NUMERIC | YES | 1 | Factor de conversión de unidades |
| merma_defecto | NUMERIC | YES | 0 | Merma/pérdida por defecto |
| stock_minimo | NUMERIC | YES | 0 | Stock mínimo requerido |
| alergenos | ARRAY | YES | - | Array de alergenos |
| ubicaciones | ARRAY | YES | - | Array de ubicaciones |
| alquiler | BOOLEAN | YES | false | Puede ser alquilado |
| gestion_lote | BOOLEAN | YES | false | Requiere gestión de lotes |
| observaciones | TEXT | YES | - | Observaciones adicionales |
| created_at | TIMESTAMP WITH TIME ZONE | YES | now() | Fecha de creación |
| updated_at | TIMESTAMP WITH TIME ZONE | YES | now() | Fecha de última actualización |

---

### atipicos_catalogo

**Propósito:** Catálogo de artículos atípicos no incluidos en el catálogo estándar.

| Columna | Tipo | Nullable | Por Defecto | Descripción |
|---------|------|----------|-------------|-------------|
| id | UUID | NO | uuid_generate_v4() | Identificador único |
| nombre | TEXT | NO | - | Nombre del artículo atípico |
| proveedor_id | UUID | YES | - | ID del proveedor |
| precio_referencia | NUMERIC | YES | 0 | Precio de referencia |
| descripcion | TEXT | YES | - | Descripción del artículo |

---

### categorias_personal

**Propósito:** Categorías de personal con información de tarifas y departamento.

| Columna | Tipo | Nullable | Por Defecto | Descripción |
|---------|------|----------|-------------|-------------|
| id | UUID | NO | uuid_generate_v4() | Identificador único |
| nombre | TEXT | NO | - | Nombre de la categoría |
| precio_hora_base | NUMERIC | YES | 0 | Precio base por hora |
| departamento | TEXT | YES | - | Departamento asociado |

---

### categorias_recetas

**Propósito:** Categorización de recetas culinarias.

| Columna | Tipo | Nullable | Por Defecto | Descripción |
|---------|------|----------|-------------|-------------|
| id | TEXT | NO | - | Identificador único |
| nombre | TEXT | NO | - | Nombre de la categoría |
| snack | BOOLEAN | YES | false | Indica si es categoría de snacks |
| created_at | TIMESTAMP WITH TIME ZONE | YES | now() | Fecha de creación |

---

### clientes

**Propósito:** Base de datos de clientes con información de contacto.

| Columna | Tipo | Nullable | Por Defecto | Descripción |
|---------|------|----------|-------------|-------------|
| id | UUID | NO | uuid_generate_v4() | Identificador único |
| nombre | TEXT | NO | - | Nombre del cliente |
| email | TEXT | YES | - | Email de contacto |
| telefono | TEXT | YES | - | Teléfono de contacto |
| created_at | TIMESTAMP WITH TIME ZONE | YES | now() | Fecha de creación |

---

### comercial_ajustes

**Propósito:** Registro de ajustes comerciales y conceptos especiales en eventos.

| Columna | Tipo | Nullable | Por Defecto | Descripción |
|---------|------|----------|-------------|-------------|
| id | UUID | NO | uuid_generate_v4() | Identificador único |
| evento_id | UUID | YES | - | ID del evento asociado |
| concepto | TEXT | NO | - | Concepto del ajuste |
| importe | NUMERIC | NO | - | Importe del ajuste |
| tipo | TEXT | YES | - | Tipo de ajuste |
| created_at | TIMESTAMP WITH TIME ZONE | YES | now() | Fecha de creación |

---

### comercial_briefings

**Propósito:** Briefings comerciales con información estructurada para eventos.

| Columna | Tipo | Nullable | Por Defecto | Descripción |
|---------|------|----------|-------------|-------------|
| id | UUID | NO | uuid_generate_v4() | Identificador único |
| evento_id | UUID | YES | - | ID del evento asociado |
| contenido | JSONB | YES | '{}'::jsonb | Contenido del briefing en formato JSON |

---

## Notas Importantes

### Relaciones Clave Identificadas

- **articulos** ← **articulo_packs**: Un artículo puede tener múltiples packs
- **articulos_erp**: Tabla sincronizada con ERP, contiene información de proveedores y familias
- **activity_logs**: Registra cambios en entidades (user_id, entidad, entidad_id)
- **comercial_ajustes** / **comercial_briefings**: Asociadas a eventos (evento_id)

### Campos JSONB (Datos Semiestructurados)

Estas tablas usan JSONB para almacenar datos flexibles:

- **articulos**:
  - `pack`: Información de packs del artículo
  - `audit`: Historial de cambios
  - `alergenos`: Lista de alergenos
  - `imagenes`: Array de imágenes

- **activity_logs**:
  - `detalles`: Detalles adicionales de la actividad

- **comercial_briefings**:
  - `contenido`: Contenido estructurado del briefing

### Tipos de Datos Especiales

- **ARRAY**: Utilizado en `articulos_erp` para alergenos y ubicaciones
- **TIMESTAMP WITH TIME ZONE**: Para trazabilidad con zona horaria
- **TIMESTAMP WITHOUT TIME ZONE**: Para fechas locales

### Valores por Defecto Comunes

- Precios: Generalmente 0
- Booleanos: Generalmente false
- JSONB: '[]'::jsonb o '{}'::jsonb
- UUIDs: Generados automáticamente (uuid_generate_v4() o gen_random_uuid())
- Timestamps: now()

---

---

## Queries Comunes por Tabla

### activity_logs

**Obtener historial de cambios de una entidad:**
```sql
SELECT * FROM activity_logs 
WHERE entidad = 'articulos' 
  AND entidad_id = 'uuid-aqui'
ORDER BY created_at DESC;
```

**Obtener actividades de un usuario:**
```sql
SELECT * FROM activity_logs 
WHERE user_id = 'uuid-usuario'
ORDER BY created_at DESC
LIMIT 100;
```

**Auditoría de acciones específicas:**
```sql
SELECT user_id, accion, COUNT(*) as total 
FROM activity_logs 
WHERE accion = 'UPDATE'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY user_id, accion;
```

---

### articulos

**Buscar artículos habituales por categoría:**
```sql
SELECT id, nombre, categoria, precio_venta 
FROM articulos 
WHERE es_habitual = true 
  AND categoria = 'categoria-name'
ORDER BY nombre;
```

**Obtener artículos con stock bajo:**
```sql
SELECT * FROM articulos 
WHERE stock_seguridad IS NOT NULL
ORDER BY stock_seguridad DESC;
```

**Buscar artículos por alergenos:**
```sql
SELECT * FROM articulos 
WHERE alergenos @> '"gluten"'::jsonb;
```

**Precios de artículos con diferentes modalidades:**
```sql
SELECT 
  id, 
  nombre,
  precio_venta,
  precio_alquiler,
  precio_venta_ifema,
  CASE 
    WHEN precio_venta > 0 THEN 'Venta'
    WHEN precio_alquiler > 0 THEN 'Alquiler'
    ELSE 'No disponible'
  END as modalidades
FROM articulos;
```

**Obtener artículos producidos por partners:**
```sql
SELECT * FROM articulos 
WHERE producido_por_partner = true
ORDER BY partner_id, nombre;
```

**Búsqueda de imágenes incompletas:**
```sql
SELECT id, nombre, imagen, imagenes 
FROM articulos 
WHERE (imagen IS NULL OR imagen = '')
  AND (imagenes IS NULL OR jsonb_array_length(imagenes) = 0);
```

---

### articulos_erp

**Artículos con múltiples proveedores:**
```sql
SELECT 
  erp_id,
  nombre,
  proveedor_id,
  nombre_proveedor,
  precio_compra
FROM articulos_erp
WHERE proveedor_id IS NOT NULL
ORDER BY erp_id;
```

**Stock mínimo y gestión:**
```sql
SELECT 
  id,
  nombre,
  stock_minimo,
  gestion_lote,
  alquiler,
  unidad_medida
FROM articulos_erp
WHERE stock_minimo > 0
ORDER BY stock_minimo DESC;
```

**Artículos con allergen info:**
```sql
SELECT 
  id, 
  nombre,
  alergenos
FROM articulos_erp
WHERE alergenos IS NOT NULL 
  AND array_length(alergenos, 1) > 0;
```

**Actualización de precios con descuento:**
```sql
SELECT 
  id,
  nombre,
  precio_compra,
  descuento,
  ROUND(precio_compra * (1 - descuento/100), 2) as precio_final
FROM articulos_erp
WHERE descuento > 0;
```

---

### articulo_packs

**Obtener composición de un pack:**
```sql
SELECT 
  ap.id,
  ap.articulo_id,
  ap.cantidad,
  a.nombre as nombre_articulo,
  ap.erp_id
FROM articulo_packs ap
LEFT JOIN articulos a ON ap.articulo_id = a.id
WHERE ap.articulo_id = 'uuid-articulo'
ORDER BY ap.cantidad DESC;
```

**Packs creados en un período:**
```sql
SELECT 
  COUNT(*) as total_packs,
  DATE(created_at) as fecha
FROM articulo_packs
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY fecha DESC;
```

---

### categorias_personal

**Obtener tarifas por categoría y departamento:**
```sql
SELECT 
  nombre,
  departamento,
  precio_hora_base,
  ROUND(precio_hora_base * 8, 2) as tarifa_jornada
FROM categorias_personal
ORDER BY departamento, precio_hora_base DESC;
```

---

### comercial_ajustes

**Resumen de ajustes por evento:**
```sql
SELECT 
  evento_id,
  COUNT(*) as total_ajustes,
  SUM(CASE WHEN tipo = 'descuento' THEN importe ELSE 0 END) as total_descuentos,
  SUM(CASE WHEN tipo = 'incremento' THEN importe ELSE 0 END) as total_incrementos,
  SUM(importe) as total_neto
FROM comercial_ajustes
GROUP BY evento_id;
```

**Auditoría de ajustes:**
```sql
SELECT 
  id,
  concepto,
  importe,
  tipo,
  created_at
FROM comercial_ajustes
WHERE created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

---

## Estructura de Datos JSONB - Formatos

### articulos.alergenos
```json
[
  "gluten",
  "cacahuetes",
  "leche",
  "huevo",
  "pescado",
  "crustáceos",
  "apio",
  "mostaza",
  "sésamo",
  "sulfitos",
  "frutos secos"
]
```

### articulos.imagenes
```json
[
  {
    "url": "https://...",
    "principal": true,
    "alt": "Descripción de la imagen",
    "orden": 1
  },
  {
    "url": "https://...",
    "principal": false,
    "alt": "Vista lateral",
    "orden": 2
  }
]
```

### articulos.pack
```json
[
  {
    "pack_id": "uuid",
    "cantidad": 10,
    "unidad": "unidades"
  }
]
```

### articulos.audit
```json
[
  {
    "fecha": "2025-12-19T10:30:00Z",
    "usuario": "uuid-usuario",
    "accion": "precio_actualizado",
    "cambios": {
      "precio_venta": { "de": 10, "a": 12 }
    }
  }
]
```

### comercial_briefings.contenido
```json
{
  "cliente": "nombre-cliente",
  "fecha_evento": "2025-12-25",
  "ubicacion": "Hotel Madrid",
  "asistentes": 150,
  "presupuesto": 5000,
  "requirements": [
    "Menú especial vegetariano",
    "Bebidas premium",
    "Setup decorativo"
  ],
  "notas": "Cliente VIP - requiere atención especial"
}
```

### activity_logs.detalles
```json
{
  "tabla_afectada": "articulos",
  "operacion": "UPDATE",
  "campos_modificados": {
    "precio_venta": { "anterior": 100, "nuevo": 120 },
    "stock_seguridad": { "anterior": 50, "nuevo": 40 }
  },
  "ip_origen": "192.168.1.1",
  "user_agent": "Mozilla/5.0..."
}
```

---

## Estrategia de Indexación Recomendada

### Índices por Tabla

**articulos:**
```sql
-- Búsquedas por categoría
CREATE INDEX idx_articulos_categoria ON articulos(categoria);
CREATE INDEX idx_articulos_subcategoria ON articulos(subcategoria);

-- Búsquedas de artículos habituales
CREATE INDEX idx_articulos_es_habitual ON articulos(es_habitual);

-- Relaciones con ERP
CREATE INDEX idx_articulos_erp_id ON articulos(erp_id);

-- Búsqueda de artículos con partner
CREATE INDEX idx_articulos_partner ON articulos(partner_id) WHERE producido_por_partner = true;

-- Búsqueda JSONB
CREATE INDEX idx_articulos_alergenos ON articulos USING gin(alergenos);
CREATE INDEX idx_articulos_imagenes ON articulos USING gin(imagenes);

-- Búsqueda de recetas
CREATE INDEX idx_articulos_receta ON articulos(receta_id);
```

**activity_logs:**
```sql
-- Búsquedas de auditoría
CREATE INDEX idx_activity_user ON activity_logs(user_id);
CREATE INDEX idx_activity_entidad ON activity_logs(entidad, entidad_id);
CREATE INDEX idx_activity_fecha ON activity_logs(created_at DESC);
CREATE INDEX idx_activity_accion ON activity_logs(accion);
```

**articulos_erp:**
```sql
-- Relaciones con proveedores
CREATE INDEX idx_articulos_erp_proveedor ON articulos_erp(proveedor_id);
CREATE INDEX idx_articulos_erp_proveedor_pref ON articulos_erp(proveedor_preferente_id);
CREATE INDEX idx_articulos_erp_familia ON articulos_erp(familia_id);
CREATE INDEX idx_articulos_erp_erp_id ON articulos_erp(erp_id);
```

**comercial_ajustes:**
```sql
-- Búsquedas por evento
CREATE INDEX idx_comercial_ajustes_evento ON comercial_ajustes(evento_id);
CREATE INDEX idx_comercial_ajustes_fecha ON comercial_ajustes(created_at DESC);
```

**articulo_packs:**
```sql
-- Relación con artículos
CREATE INDEX idx_articulo_packs_articulo ON articulo_packs(articulo_id);
CREATE INDEX idx_articulo_packs_erp ON articulo_packs(erp_id);
```

---

## Patrones de Uso Comunes

### 1. Catálogo de Artículos
- **Tabla Principal:** `articulos`
- **Relación:** `articulo_packs` (composición)
- **Datos Adicionales:** `articulos_erp` (sincronización)
- **Caso de Uso:** Búsqueda de productos, visualización de packs, información de proveedores

### 2. Gestión de Precios
- **Múltiples columnas de precio en `articulos`:**
  - `precio_venta` (estándar)
  - `precio_venta_entregas` (módulo entregas)
  - `precio_venta_entregas_ifema` (entregas en IFEMA)
  - `precio_venta_ifema` (eventos IFEMA)
  - `precio_alquiler` (alquiler estándar)
  - `precio_alquiler_entregas` (alquiler entregas)
  - `precio_alquiler_ifema` (alquiler IFEMA)
  
**Nota:** Sistema multi-canal de precios integrado

### 3. Trazabilidad y Auditoría
- **Tabla Principal:** `activity_logs`
- **Rastreo de:** Quién hizo qué, cuándo y en qué entidad
- **Almacenamiento flexible:** `detalles` JSONB para info adicional

### 4. Gestión de Alergenos
- **Ubicación Principal:** `articulos.alergenos` (JSONB array)
- **Ubicación Secundaria:** `articulos_erp.alergenos` (ARRAY text)
- **Búsqueda:** Usar operadores JSONB (`@>`) o ARRAY (`&&`)

### 5. Gestión de Proveedores
- **Información en:** `articulos_erp` (tabla de sincronización)
- **Campos clave:**
  - `proveedor_id` (ID principal)
  - `proveedor_preferente_id` (alternativa)
  - `referencia_proveedor` (SKU del proveedor)
  - `precio_compra` (costo unitario)

### 6. Gestión de Eventos (Comercial)
- **Tablas Relacionadas:**
  - `comercial_ajustes` (descuentos/incrementos)
  - `comercial_briefings` (información del evento)
- **Patrón:** Ambas usan `evento_id` para relacionarse

### 7. Gestión de Personal
- **Tabla:** `categorias_personal`
- **Estructura:** Categorías con tarifa horaria
- **Uso:** Cálculo de costos de personal por evento

---

## Relaciones Entre Tablas (Diagrama Lógico)

```
articulos (catálogo principal)
├── articulo_packs (composición de artículos)
├── articulos_erp (sincronización ERP)
│   ├── familia_id → familias (tabla no listada)
│   ├── proveedor_id → proveedores (tabla no listada)
│   └── proveedor_preferente_id → proveedores (tabla no listada)
└── alergenos (JSONB)

categorias_personal
└── departamento (texto, no relación)

categorias_recetas
└── (tabla independiente)

clientes
└── (tabla base sin relaciones visibles)

comercial_ajustes
└── evento_id → eventos (tabla no listada en datos)

comercial_briefings
└── evento_id → eventos (tabla no listada en datos)

atipicos_catalogo
└── proveedor_id → proveedores (tabla no listada)

activity_logs
├── user_id → users (tabla no listada)
├── entidad (referencia flexible)
└── entidad_id (referencia flexible)
```

---

## Campos Críticos por Caso de Uso

### Para Búsqueda de Productos
- `articulos.nombre` (fulltext search)
- `articulos.categoria`
- `articulos.subcategoria`
- `articulos.es_habitual`
- `articulos.alergenos` (JSONB)

### Para Cálculo de Precios
- `articulos.precio_venta`
- `articulos.precio_coste`
- `articulos.iva`
- `articulos.precio_venta_entregas`
- `articulos.precio_venta_ifema`
- `articulos_erp.precio_compra`
- `comercial_ajustes.importe`

### Para Seguimiento de Inventario
- `articulos.stock_seguridad`
- `articulos_erp.stock_minimo`
- `articulos_erp.gestion_lote`
- `articulo_packs.cantidad`

### Para Auditoría y Compliance
- `activity_logs.id`
- `activity_logs.user_id`
- `activity_logs.accion`
- `activity_logs.created_at`
- `activity_logs.detalles` (JSONB)

---

## Consideraciones de Rendimiento

### Queries Pesadas
- **Búsquedas JSONB complejas:** Usar índices GIN en JSONB
- **JOINs múltiples:** Considerar desnormalización en casos específicos
- **Agregaciones grandes:** Usar índices en columnas GROUP BY

### Optimizaciones Recomendadas

1. **Paginación obligatoria** en consultas que retornan muchas filas
2. **Índices en columnas de filtrado** frecuente
3. **Seleccionar solo columnas necesarias** (evitar SELECT *)
4. **Usar prepared statements** para queries repetidas
5. **Partición de activity_logs por fecha** si crece mucho

### Limpieza de Datos

```sql
-- Eliminar logs antiguos (archivado)
DELETE FROM activity_logs 
WHERE created_at < NOW() - INTERVAL '365 days';

-- Verificar nulos en campos obligatorios
SELECT COUNT(*) FROM articulos 
WHERE nombre IS NULL OR categoria IS NULL;
```

---

## Validaciones Recomendadas

### Antes de INSERT/UPDATE

**articulos:**
- nombre NO puede estar vacío
- categoria NO puede estar vacío
- Si es artículo de alquiler: precio_alquiler > 0
- Si es artículo de venta: precio_venta > 0
- iva debe estar entre 0-100

**articulos_erp:**
- nombre NO puede estar vacío
- Si tiene familia: familia_id debe existir
- Si tiene proveedor: proveedor_id debe existir

**activity_logs:**
- accion NO puede estar vacío
- Si entidad_id existe: entidad debe especificarse

**comercial_ajustes:**
- concepto NO puede estar vacío
- importe NO puede ser cero o negativo
- evento_id debe existir

---

## Acceso a Esta Referencia

Este documento está disponible para consulta rápida. Úsalo para:

✅ **Validar tipos de datos** antes de hacer migraciones
✅ **Entender relaciones** entre tablas
✅ **Verificar campos obligatorios** (NOT NULL)
✅ **Consultar valores por defecto**
✅ **Identificar campos JSONB** para queries avanzadas
✅ **Encontrar queries comunes** para tu caso de uso
✅ **Optimizar consultas** con índices recomendados
✅ **Entender patrones de uso** del sistema
✅ **Validar datos** antes de inserciones
✅ **Auditoría y trazabilidad** de cambios

---

## Registro de Cambios en Este Documento

| Fecha | Cambio |
|-------|--------|
| 2025-12-19 | Creación inicial con análisis detallado de estructura |
| 2025-12-19 | Añadidos ejemplos de queries SQL |
| 2025-12-19 | Documentación de formatos JSONB |
| 2025-12-19 | Recomendaciones de indexación |
| 2025-12-19 | Patrones de uso y relaciones |
