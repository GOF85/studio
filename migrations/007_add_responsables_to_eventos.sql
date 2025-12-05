-- Add responsables column to eventos table
ALTER TABLE public.eventos
ADD COLUMN responsables JSONB NULL DEFAULT NULL;

-- Create index for better query performance
CREATE INDEX idx_eventos_responsables ON public.eventos USING GIN(responsables);

-- Add comment to explain the structure
COMMENT ON COLUMN public.eventos.responsables IS 'JSON object storing responsible persons data: {metre, metre_phone, metre_mail, cocina_cpr, cocina_cpr_phone, cocina_cpr_mail, pase, pase_phone, pase_mail, cocina_pase, cocina_pase_phone, cocina_pase_mail, project_manager, project_manager_phone, project_manager_mail, comercial, comercial_phone, comercial_mail, rrhh, rrhh_phone, rrhh_mail}';
