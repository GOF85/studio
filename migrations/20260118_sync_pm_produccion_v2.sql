-- Migration: Sync legacy JSON project_manager to new column and mirror with produccion_sala
-- Date: 2026-01-18

-- 1. Migrate existing data from JSON to new column if null
UPDATE eventos 
SET "respProjectManager" = (responsables::jsonb->>'project_manager')
WHERE "respProjectManager" IS NULL 
  AND responsables IS NOT NULL 
  AND responsables::text != ''
  AND responsables::jsonb->>'project_manager' IS NOT NULL;

-- 2. Update Sync Trigger to handle the new "respProjectManager" column
CREATE OR REPLACE FUNCTION sync_os_pm_produccion()
RETURNS TRIGGER AS $$
BEGIN
    -- 1. Sync respProjectManager (Name) -> produccion_sala (ID)
    -- We check both the new column and the old JSON path for maximum compatibility
    IF NEW."respProjectManager" IS DISTINCT FROM OLD."respProjectManager" AND NEW."respProjectManager" IS NOT NULL THEN
        SELECT id INTO NEW.produccion_sala
        FROM personal 
        WHERE (nombre || ' ' || apellido1) = NEW."respProjectManager"
           OR (nombre || ' ' || apellido1 || ' ' || apellido2) = NEW."respProjectManager"
        LIMIT 1;
    END IF;

    -- 2. Reverse Sync: produccion_sala (ID) -> respProjectManager (Name)
    IF NEW.produccion_sala IS DISTINCT FROM OLD.produccion_sala AND NEW.produccion_sala IS NOT NULL THEN
        SELECT (nombre || ' ' || apellido1) INTO NEW."respProjectManager"
        FROM personal WHERE id = NEW.produccion_sala;
        
        -- Also update the legacy JSON if it exists to keep /info page updated
        IF NEW.responsables IS NOT NULL AND NEW.responsables::text != '' THEN
           NEW.responsables = (NEW.responsables::jsonb || jsonb_build_object('project_manager', (SELECT nombre || ' ' || apellido1 FROM personal WHERE id = NEW.produccion_sala)))::text;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_sync_os_pm_produccion ON eventos;
CREATE TRIGGER trigger_sync_os_pm_produccion
    BEFORE INSERT OR UPDATE ON eventos
    FOR EACH ROW
    EXECUTE FUNCTION sync_os_pm_produccion();
