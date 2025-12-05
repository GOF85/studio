# Instrucciones para ejecutar la migración de responsables

## Para agregar la columna `responsables` a la tabla `eventos`:

1. Ve a tu proyecto en [Supabase](https://supabase.com)
2. Selecciona tu base de datos (studio)
3. Ve a la sección **SQL Editor**
4. Copia y pega el siguiente SQL:

```sql
-- Add responsables column to eventos table
ALTER TABLE public.eventos
ADD COLUMN responsables JSONB NULL DEFAULT NULL;

-- Create index for better query performance
CREATE INDEX idx_eventos_responsables ON public.eventos USING GIN(responsables);

-- Add comment to explain the structure
COMMENT ON COLUMN public.eventos.responsables IS 'JSON object storing responsible persons data: {metre, metre_phone, metre_mail, cocina_cpr, cocina_cpr_phone, cocina_cpr_mail, pase, pase_phone, pase_mail, cocina_pase, cocina_pase_phone, cocina_pase_mail, project_manager, project_manager_phone, project_manager_mail, comercial, comercial_phone, comercial_mail, rrhh, rrhh_phone, rrhh_mail}';
```

5. Haz clic en **Run** para ejecutar la migración

## Estructura de datos almacenados

La columna `responsables` almacenará un objeto JSON con la siguiente estructura:

```json
{
  "metre": "Nombre del metre",
  "metre_phone": "+34 123 456 789",
  "metre_mail": "metre@example.com",
  "cocina_cpr": "Nombre del cocinero CPR",
  "cocina_cpr_phone": "+34 123 456 789",
  "cocina_cpr_mail": "cocina@example.com",
  "pase": "Nombre del responsable de pase",
  "pase_phone": "+34 123 456 789",
  "pase_mail": "pase@example.com",
  "cocina_pase": "Nombre del cocinero de pase",
  "cocina_pase_phone": "+34 123 456 789",
  "cocina_pase_mail": "cocina_pase@example.com",
  "project_manager": "Nombre del project manager",
  "project_manager_phone": "+34 123 456 789",
  "project_manager_mail": "pm@example.com",
  "comercial": "Nombre del comercial",
  "comercial_phone": "+34 123 456 789",
  "comercial_mail": "comercial@example.com",
  "rrhh": "Nombre del responsable RRHH",
  "rrhh_phone": "+34 123 456 789",
  "rrhh_mail": "rrhh@example.com"
}
```

Una vez ejecutada la migración, los formularios de OS guardarán automáticamente todos los responsables en Supabase.
