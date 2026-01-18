-- Migration: Sync respProjectManager (Name) with produccion_sala (ID)
-- Date: 2026-01-18

CREATE OR REPLACE FUNCTION sync_os_pm_produccion()
RETURNS TRIGGER AS $$
BEGIN
    -- 1. Sync respProjectManager (Name) -> produccion_sala (ID)
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
    END IF;

    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_sync_os_pm_produccion ON eventos;
CREATE TRIGGER trigger_sync_os_pm_produccion
    BEFORE INSERT OR UPDATE ON eventos
    FOR EACH ROW
    EXECUTE FUNCTION sync_os_pm_produccion();

COMMENT ON FUNCTION sync_os_pm_produccion() IS 'Mantiene sincronizado el Responsable PM de Info con Producción Sala del Panel';
