-- Migration: Ensure all OS Panel columns are TEXT to support legacy IDs
-- This fixes the 400 Bad Request error caused by UUID type mismatch

DO $$ 
BEGIN
    -- 1. Helper to safely convert column to TEXT
    -- If it's already TEXT, nothing happens. If it's UUID, it becomes TEXT.
    
    -- metre_responsable
    BEGIN
        ALTER TABLE eventos ALTER COLUMN metre_responsable TYPE TEXT USING metre_responsable::TEXT;
    EXCEPTION WHEN OTHERS THEN 
        RAISE NOTICE 'Could not convert metre_responsable';
    END;

    -- jefe_cocina
    BEGIN
        ALTER TABLE eventos ALTER COLUMN jefe_cocina TYPE TEXT USING jefe_cocina::TEXT;
    EXCEPTION WHEN OTHERS THEN 
        RAISE NOTICE 'Could not convert jefe_cocina';
    END;

    -- mozo
    BEGIN
        ALTER TABLE eventos ALTER COLUMN mozo TYPE TEXT USING mozo::TEXT;
    EXCEPTION WHEN OTHERS THEN 
        RAISE NOTICE 'Could not convert mozo';
    END;

    -- metres (Array)
    BEGIN
        ALTER TABLE eventos ALTER COLUMN metres TYPE TEXT[] USING metres::TEXT[];
    EXCEPTION WHEN OTHERS THEN 
        RAISE NOTICE 'Could not convert metres array';
    END;

    -- cocina (Array)
    BEGIN
        ALTER TABLE eventos ALTER COLUMN cocina TYPE TEXT[] USING cocina::TEXT[];
    EXCEPTION WHEN OTHERS THEN 
        RAISE NOTICE 'Could not convert cocina array';
    END;

    -- Other potential UUID columns from legacy
    BEGIN
        ALTER TABLE eventos ALTER COLUMN produccion_sala TYPE TEXT USING produccion_sala::TEXT;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    BEGIN
        ALTER TABLE eventos ALTER COLUMN produccion_cocina_cpr TYPE TEXT USING produccion_cocina_cpr::TEXT;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

END $$;
