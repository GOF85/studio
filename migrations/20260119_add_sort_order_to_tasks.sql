-- Add sort_order column to os_panel_tareas for DND support
ALTER TABLE os_panel_tareas ADD COLUMN IF NOT EXISTS sort_order INTEGER;
ALTER TABLE os_panel_tareas ADD COLUMN IF NOT EXISTS autor_nombre TEXT;

-- Initial value for existing tasks
UPDATE os_panel_tareas SET sort_order = 0 WHERE sort_order IS NULL;
