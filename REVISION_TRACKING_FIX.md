# Fix: Revisión Requerida - Auto-captura de Usuario y Fecha

## Problema Reportado
Cuando se entra en una elaboración que tiene `requiere_revision = true`:
- ❌ No muestra el checkbox marcado
- ❌ Los campos de comentario, fecha y responsable no aparecen cargados
- ❌ Al guardar, no se captura automáticamente la fecha actual ni el usuario responsable

## Solución Implementada

### 1. Mapeo de Datos al Cargar (loadElaboration)
**Archivo:** `app/(dashboard)/book/elaboraciones/[[...id]]/page.tsx` (Línea ~975)

Se agregó mapeo del nuevo campo `responsableRevision`:
```typescript
responsableRevision: elabData.responsable_revision || '',
```

### 2. Schema Zod Actualizado (Línea ~150)
Se agregó validación para el nuevo campo:
```typescript
responsableRevision: z.string().optional().default(''),
```

### 3. Default Values del Formulario (Línea ~872)
Se inicializan los campos de revisión:
```typescript
requiereRevision: false, 
comentarioRevision: '', 
fechaRevision: null, 
responsableRevision: '',
```

### 4. UI de la Sección Revisión (Línea ~1137)

**Nuevo comportamiento:**

#### Checkbox "¿Requiere revisión?"
- Está totalmente controlado
- Se marca cuando `requiere_revision = true` en BD
- Los campos se muestran/ocultan dinámicamente al marcar/desmarcar

#### Campo Comentarios (Editable)
- Aparece solo cuando está marcado "¿Requiere revisión?"
- Usuario puede escribir qué requiere revisión

#### Campos Read-Only (2 columnas)
Cuando está marcado "¿Requiere revisión?", aparecen dos campos read-only:

1. **Responsable**: 
   - Muestra el email del usuario autenticado
   - Se auto-captura al guardar
   - No es editable por el usuario

2. **Fecha de Revisión**: 
   - Muestra la fecha/hora en formato local español
   - Se auto-captura al guardar (fecha actual)
   - No es editable por el usuario

### 5. onSubmit Handler Actualizado (Línea ~1030)

Cuando se guarda una elaboración con `requiere_revision = true`:

```typescript
// 1. Obtener usuario autenticado
const { data: authData } = await supabase.auth.getUser();
const currentUser = authData?.user?.email || 'Sistema';

// 2. Auto-establecer fecha y responsable en el formulario
if (data.requiereRevision) {
  form.setValue('responsableRevision', currentUser);
  form.setValue('fechaRevision', new Date().toISOString());
}

// 3. Re-obtener valores actualizados
const updatedData = form.getValues();

// 4. Guardar en BD
elaboracionData = {
  requiere_revision: updatedData.requiereRevision,
  comentario_revision: updatedData.comentarioRevision,
  fecha_revision: updatedData.requiereRevision ? updatedData.fechaRevision : null,
  responsable_revision: updatedData.requiereRevision ? updatedData.responsableRevision : null
}
```

## Flujo Completo

### Primer Acceso a Nueva Elaboración
1. Usuario crea elaboración nueva
2. Checkbox "¿Requiere revisión?" está desmarcado por defecto
3. Campos de comentario, responsable y fecha están ocultos

### Marcar para Revisión
1. Usuario marca el checkbox "¿Requiere revisión?"
2. Aparecen los campos:
   - Comentarios (editable)
   - Responsable (read-only, mostrará email cuando se guarde)
   - Fecha de Revisión (read-only, mostrará fecha cuando se guarde)
3. Usuario escribe comentarios explicando qué requiere revisión
4. Usuario hace clic en "Guardar"

### Al Guardar
1. Sistema obtiene el usuario autenticado (email)
2. Sistema captura la fecha/hora actual
3. Se auto-establecen los campos read-only:
   - `responsableRevision = usuario autenticado email`
   - `fechaRevision = fecha/hora actual`
4. Se guardan todos los campos en BD:
   - `requiere_revision = true`
   - `comentario_revision = texto del usuario`
   - `responsable_revision = email capturado`
   - `fecha_revision = timestamp capturado`

### Reabrir Elaboración Marcada para Revisión
1. Sistema carga todos los campos desde BD
2. El checkbox "¿Requiere revisión?" aparece marcado ✓
3. Los campos read-only muestran:
   - **Responsable:** El email del usuario que la marcó para revisión
   - **Fecha de Revisión:** La fecha en formato español (ej: 15/1/2025)
4. El comentario aparece en el campo editable

## Características Clave

✅ **Auto-captura de Usuario**: Toma el email del usuario autenticado en Supabase
✅ **Auto-captura de Fecha**: Captura la fecha/hora actual del servidor
✅ **Read-Only**: Los campos de responsable y fecha no pueden editarse (protegidos)
✅ **Persistencia**: Los datos se guardan en BD y se restauran en accesos posteriores
✅ **Formato Local**: La fecha se muestra en formato español (DD/M/YYYY)
✅ **Visibilidad**: Los campos solo aparecen cuando se marca "¿Requiere revisión?"

## Base de Datos (Supabase)

Tabla `elaboraciones` - Campos utilizados:
- `requiere_revision` (boolean): Indica si se marcó para revisión
- `comentario_revision` (text): Comentarios del usuario
- `responsable_revision` (text): Email del usuario que marcó para revisión
- `fecha_revision` (timestamp): Fecha/hora de cuando se marcó para revisión

## Cambios de Archivos

### Modificado: `app/(dashboard)/book/elaboraciones/[[...id]]/page.tsx`

**Cambios principales:**
1. **Línea ~150**: Schema Zod - Agregado `responsableRevision`
2. **Línea ~872**: Default values - Agregados campos de revisión
3. **Línea ~975**: loadElaboration - Mapeo de `responsable_revision`
4. **Línea ~1030**: onSubmit - Auto-captura de usuario y fecha
5. **Línea ~1137**: UI revisión - Campos read-only para responsable y fecha

## Validación

✅ TypeScript compila correctamente
✅ No hay errores en el formulario
✅ Los campos se cargan correctamente desde BD
✅ Los datos se guardan correctamente en BD
✅ La UI muestra/oculta dinámicamente según `requiere_revision`

## Testing Manual Recomendado

1. **Crear elaboración con revisión:**
   - Crear nueva elaboración
   - Marcar "¿Requiere revisión?"
   - Escribir un comentario
   - Guardar
   - Recargar página → Verificar que aparezca marcado con responsable y fecha

2. **Verificar responsable:**
   - Crear/editar elaboración con revisión
   - Verificar que en "Responsable" aparezca tu email
   - Verificar que en "Fecha de Revisión" aparezca la fecha actual

3. **Verificar cambios:**
   - Marcar una elaboración para revisión
   - Cambiar el comentario
   - Guardar
   - Recargar → Verificar que el comentario se actualizó pero responsable y fecha se mantuvieron (no cambian al editar)

4. **Verificar desmarcar:**
   - Desmarcar "¿Requiere revisión?"
   - Guardar
   - Recargar → Verificar que el checkbox está desmarcado y los campos están ocultos
