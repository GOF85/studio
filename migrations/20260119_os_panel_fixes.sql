-- Create table for OS Panel user preferences (like card order)
CREATE TABLE IF NOT EXISTS os_panel_user_preferences (
    user_id UUID NOT NULL,
    dashboard_order JSONB DEFAULT '["sala", "cocina", "logistica", "personal"]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (user_id)
);

-- Create table for field-level comments in OS Panel
CREATE TABLE IF NOT EXISTS os_panel_comentarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    os_id TEXT NOT NULL, -- UUID or numero_expediente
    field_name TEXT NOT NULL,
    comentario TEXT NOT NULL,
    autor_id UUID REFERENCES auth.users(id),
    autor_nombre TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE os_panel_user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE os_panel_comentarios ENABLE ROW LEVEL SECURITY;

-- Policies for preferences (user only sees their own)
CREATE POLICY "Users can manage their own preferences" 
ON os_panel_user_preferences 
FOR ALL 
USING (auth.uid() = user_id);

-- Policies for comments (anyone in OS can see/add)
CREATE POLICY "Public comments access" 
ON os_panel_comentarios 
FOR ALL 
USING (true);
