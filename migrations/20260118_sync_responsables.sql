-- Migration: Sync legacy Name fields with new UUID fields
-- Date: 2026-01-18

CREATE OR REPLACE FUNCTION sync_os_responsables()
RETURNS TRIGGER AS $$
BEGIN
    -- Sync metre_responsable (UUID) -> respMetre (Name)
    IF NEW.metre_responsable IS DISTINCT FROM OLD.metre_responsable AND NEW.metre_responsable IS NOT NULL THEN
        SELECT (nombre || ' ' || apellido1) INTO NEW."respMetre"
        FROM personal WHERE id = NEW.metre_responsable;
    END IF;

    -- Sync jefe_cocina (UUID) -> respCocinaPase (Name)
    IF NEW.jefe_cocina IS DISTINCT FROM OLD.jefe_cocina AND NEW.jefe_cocina IS NOT NULL THEN
        SELECT (nombre || ' ' || apellido1) INTO NEW."respCocinaPase"
        FROM personal WHERE id = NEW.jefe_cocina;
    END IF;

    -- Sync respMetre (Name) -> metre_responsable (UUID) - Reverse sync
    IF NEW."respMetre" IS DISTINCT FROM OLD."respMetre" AND NEW."respMetre" IS NOT NULL THEN
        SELECT id INTO NEW.metre_responsable
        FROM personal WHERE (nombre || ' ' || apellido1) = NEW."respMetre"
        LIMIT 1;
    END IF;

    -- Sync respCocinaPase (Name) -> jefe_cocina (UUID) - Reverse sync
    IF NEW."respCocinaPase" IS DISTINCT FROM OLD."respCocinaPase" AND NEW."respCocinaPase" IS NOT NULL THEN
        SELECT id INTO NEW.jefe_cocina
        FROM personal WHERE (nombre || ' ' || apellido1) = NEW."respCocinaPase"
        LIMIT 1;
    END IF;

    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_sync_os_responsables ON eventos;
CREATE TRIGGER trigger_sync_os_responsables
    BEFORE INSERT OR UPDATE ON eventos
    FOR EACH ROW
    EXECUTE FUNCTION sync_os_responsables();

COMMENT ON FUNCTION sync_os_responsables() IS 'Mantiene sincronizados los campos de responsables entre el Panel de Control (UUID) y la ficha Info (Nombre)';
