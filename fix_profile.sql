-- Script para reparar el perfil del usuario administrador
-- Este script inserta manualmente el perfil si no existe.

DO $$
DECLARE
    target_email TEXT := 'guillermo.otero@micecatering.com';
    user_id UUID;
BEGIN
    -- 1. Obtener el ID del usuario de auth.users
    SELECT id INTO user_id FROM auth.users WHERE email = target_email;

    IF user_id IS NULL THEN
        RAISE NOTICE 'El usuario % no existe en auth.users. Por favor, regístrate primero.', target_email;
    ELSE
        -- 2. Insertar en perfiles si no existe
        IF NOT EXISTS (SELECT 1 FROM public.perfiles WHERE id = user_id) THEN
            INSERT INTO public.perfiles (id, nombre_completo, rol, estado)
            VALUES (
                user_id, 
                'Guillermo Otero', -- Nombre por defecto
                'ADMIN', 
                'ACTIVO'
            );
            RAISE NOTICE 'Perfil creado exitosamente para %', target_email;
        ELSE
            -- 3. Si ya existe, asegurar que es ADMIN y está ACTIVO
            UPDATE public.perfiles
            SET rol = 'ADMIN', estado = 'ACTIVO'
            WHERE id = user_id;
            RAISE NOTICE 'Perfil actualizado a ADMIN para %', target_email;
        END IF;
    END IF;
END $$;
