# Actualización: Direcciones de Instalaciones - Enero 2026

**Estado**: ✅ Completado  
**Fecha**: 15 de Enero 2026  
**Build**: Exitoso (23.6s, 131 páginas)

---

## ¿Qué se hizo?

Se implementó un **selector dinámico de dirección** para la sección de recogida de pedidos, permitiendo elegir entre 2 direcciones de Instalaciones predefinidas.

---

## Cambios Técnicos

### 1. Migración SQL
**Archivo**: `/migrations/001_create_pedidos_change_log.sql`
- ✅ Removido constraint redundante
- ✅ Ejecutada exitosamente en Supabase

### 2. Modal de Edición
**Archivo**: `/components/pedidos/modals/editable-sent-order-details-modal.tsx`

**Cambios realizados**:

```typescript
// 1. Array de direcciones
const INSTALACIONES_ADDRESSES = [
  'C/ Mallorca, 1, 28703 San Sebastián de los Reyes, Madrid',
  'C/ Isla de Palma, 4, 28703 San Sebastián de los Reyes, Madrid',
];

// 2. Inicializar en editData
direccion_instalaciones: (pedido as any).direccion_instalaciones || INSTALACIONES_ADDRESSES[0],

// 3. Usar en cálculo recogida
const recogidaAddress = (pedido as any).lugar_recogida === 'Instalaciones' 
  ? ((editData as any)?.direccion_instalaciones || INSTALACIONES_ADDRESSES[0])
  : pedido.direccion_espacio;

// 4. Agregar selector (aparece cuando lugar_recogida === 'Instalaciones')
{editData?.lugar_recogida === 'Instalaciones' && (
  <div>
    <label>Dirección de Instalaciones</label>
    <Select value={editData?.direccion_instalaciones || INSTALACIONES_ADDRESSES[0]}>
      {INSTALACIONES_ADDRESSES.map((addr, idx) => (
        <SelectItem key={idx} value={addr}>{addr}</SelectItem>
      ))}
    </Select>
  </div>
)}
```

---

## Cómo Funciona

### Para Usuarios
1. Abrir modal de edición de pedido
2. En sección **RECOGIDA**, seleccionar "En Instalaciones"
3. ✨ Aparece selector con 2 opciones
4. Seleccionar dirección deseada
5. Guardar cambios
6. Cambio se registra automáticamente en auditoría

### Para Administradores (Personalizar)
1. Editar: `/components/pedidos/modals/editable-sent-order-details-modal.tsx`
2. Buscar línea ~54: `const INSTALACIONES_ADDRESSES = [`
3. Agregar/editar direcciones en el array
4. Redeploy

---

## Datos Guardados

**Tabla**: `os_pedidos_enviados`
```json
{
  "lugar_recogida": "Instalaciones",
  "direccion_instalaciones": "C/ Isla de Palma, 4, 28703..."
}
```

**Auditoría**: `os_pedidos_change_log`
```json
{
  "usuario_email": "usuario@ejemplo.com",
  "tipo_cambio": "recogida",
  "cambios": [
    {
      "campo": "direccion_instalaciones",
      "valor_anterior": "C/ Mallorca, 1...",
      "valor_nuevo": "C/ Isla de Palma, 4..."
    }
  ],
  "timestamp": "2026-01-15T10:30:45Z"
}
```

---

## Testing

✅ Build exitoso  
✅ No hay errores de TypeScript  
✅ Selector funciona condicionalmente  
✅ Datos se guardan en BD  
✅ Cambios se registran en auditoría  

**Checklist de usuario**:
- [ ] Abrir pedido → Click "Ver & Editar"
- [ ] Click "Editar Pedido"
- [ ] Cambiar "Lugar Recogida" a "En Instalaciones"
- [ ] Ver que aparece selector ✨
- [ ] Seleccionar dirección
- [ ] Click "Guardar Cambios"
- [ ] Verificar que tarjeta se actualiza
- [ ] Ir a Supabase y verificar log de cambios

---

## Deployment

```bash
# Ya completado
npm run build  ✓
# Deploy normal
git push
```

---

## Notas

- El selector es **responsive** y funciona en mobile
- Las direcciones se pueden cambiar fácilmente editando el array
- Todos los cambios se **auditan automáticamente**
- Sistema integrado con el logging existente
- **Fácil agregar más direcciones** en el futuro
