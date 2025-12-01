-- Script para promover un usuario a Super Admin
-- Instrucciones:
-- 1. Asegúrate de que el usuario 'guillermo.otero@micecatering.com' se haya registrado en la aplicación.
-- 2. Ejecuta este script en el Editor SQL de Supabase.

UPDATE public.perfiles
SET 
    rol = 'ADMIN', 
    estado = 'ACTIVO'
WHERE id = (
    SELECT id 
    FROM auth.users 
    WHERE email = 'guillermo.otero@micecatering.com'
);

-- Verificación (Opcional)
SELECT * FROM public.perfiles WHERE rol = 'ADMIN';
