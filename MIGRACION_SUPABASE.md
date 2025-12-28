# 🔧 Migración a Supabase - Briefings Comerciales y Gastronomía

## Estado Actual

Tu aplicación actualmente está usando **localStorage** para guardar datos. He actualizado el código para usar **Supabase** en lugar de localStorage.

## Cambios Realizados

### 1. **Archivos Modificados**
- ✅ `/app/(dashboard)/os/[numero_expediente]/comercial/page.tsx` - Ahora usa Supabase
- ✅ `/app/(dashboard)/os/[numero_expediente]/gastronomia/[briefingItemId]/page.tsx` - Ahora usa Supabase
- ✅ `/hooks/use-briefing-data.ts` - Nuevo hook para operaciones Supabase

### 2. **Tablas Necesarias en Supabase**

```sql
-- 1. Briefings Comerciales
CREATE TABLE IF NOT EXISTS comercial_briefings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    os_id VARCHAR(255) NOT NULL UNIQUE,
    items JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_os_id FOREIGN KEY (os_id) REFERENCES eventos(service_number) ON DELETE CASCADE
);

-- 2. Ajustes Comerciales
CREATE TABLE IF NOT EXISTS comercial_ajustes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    os_id VARCHAR(255) NOT NULL,
    concepto VARCHAR(255) NOT NULL,
    importe DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_os_id_ajustes FOREIGN KEY (os_id) REFERENCES eventos(service_number) ON DELETE CASCADE,
    CONSTRAINT unique_ajuste UNIQUE(os_id, concepto)
);

-- 3. Pedidos de Gastronomía
CREATE TABLE IF NOT EXISTS gastronomia_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    briefing_item_id VARCHAR(255) NOT NULL,
    os_id VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Pendiente',
    items JSONB NOT NULL DEFAULT '[]',
    total DECIMAL(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_os_id_gastro FOREIGN KEY (os_id) REFERENCES eventos(service_number) ON DELETE CASCADE,
    CONSTRAINT unique_gastro_order UNIQUE(os_id, briefing_item_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_comercial_briefings_os_id ON comercial_briefings(os_id);
CREATE INDEX IF NOT EXISTS idx_comercial_ajustes_os_id ON comercial_ajustes(os_id);
CREATE INDEX IF NOT EXISTS idx_gastronomia_orders_os_id ON gastronomia_orders(os_id);
CREATE INDEX IF NOT EXISTS idx_gastronomia_orders_briefing_item_id ON gastronomia_orders(briefing_item_id);
```

## 📋 Pasos para Migrar

### Paso 1: Ejecutar las Migraciones SQL

1. Ve a tu dashboard de Supabase: https://supabase.com/dashboard
2. Selecciona tu proyecto
3. Ve a **SQL Editor** → **New Query**
4. Copia y pega el SQL anterior
5. Haz click en **Run**

### Paso 2: Verificar en la App

Abre tu navegador en:
- http://localhost:3000/os/2025-12345/comercial
- http://localhost:3000/os/2025-12345/gastronomia/[briefingItemId]

Los datos ahora se guardarán en Supabase en lugar de localStorage.

## 🔄 Migración de Datos Antiguos (Opcional)

Si tienes datos en localStorage que quieras preservar, necesitarías:

1. Exportar datos de localStorage
2. Transformarlos al formato de Supabase
3. Importarlos a las nuevas tablas

**Comando para exportar datos desde navegador (DevTools Console):**

```javascript
// Briefings
JSON.stringify(JSON.parse(localStorage.getItem('comercialBriefings') || '[]'));

// Ajustes
JSON.stringify(JSON.parse(localStorage.getItem('comercialAjustes') || '{}'));

// Gastronomía
JSON.stringify(JSON.parse(localStorage.getItem('gastronomyOrders') || '[]'));
```

## ✅ Funcionalidades Implementadas

### Módulo Comercial
- ✅ Cargar briefings desde Supabase
- ✅ Guardar/actualizar briefings en Supabase
- ✅ Gestionar ajustes a la facturación
- ✅ Calcular facturación neta automáticamente

### Módulo Gastronomía
- ✅ Cargar pedidos de gastronomía desde Supabase
- ✅ Guardar/actualizar pedidos en Supabase
- ✅ Drag & drop para reordenar platos
- ✅ Toast notifications para feedback del usuario
- ✅ Recalcular precios desde Supabase

## 🐛 Troubleshooting

**Problema: "No ve datos en comercial"**
- ✅ Solución: Ejecuta las migraciones SQL primero

**Problema: "Errores al guardar"**
- ✅ Verifica que las tablas existan en Supabase
- ✅ Verifica que NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY estén configuradas

**Problema: "Toast notificaciones no aparecen"**
- ✅ Ya corregido: Agregué `<Toaster />` al layout raíz

## 📚 Archivos Relevantes

```
/migrations/create_briefing_tables.sql          # Script SQL de creación
/hooks/use-briefing-data.ts                     # Hooks de Supabase
/app/(dashboard)/os/[numero_expediente]/comercial/page.tsx
/app/(dashboard)/os/[numero_expediente]/gastronomia/[briefingItemId]/page.tsx
```

## 🚀 Próximos Pasos

1. **Ejecuta las migraciones SQL** en Supabase
2. **Recarga la aplicación** en el navegador
3. **Prueba guardar datos** y verifica que aparezcan en Supabase
4. **(Opcional) Migra datos antiguos** de localStorage si es necesario

¡Listo! Tu aplicación ahora usa Supabase como base de datos principal. 🎉
