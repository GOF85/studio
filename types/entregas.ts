import { z } from 'zod';

// Definición mínima local para osFormSchema
export const osFormSchema = z.object({
    serviceNumber: z.string().optional(),
    client: z.string().optional(),
    asistentes: z.number().min(0).default(1),
    contact: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
    finalClient: z.string().optional(),
    status: z.enum(['Borrador', 'Confirmado', 'Enviado', 'Entregado', 'Pendiente', 'Anulado']).optional(),
    tarifa: z.enum(['Empresa', 'IFEMA']).optional(),
    tipoCliente: z.enum(['Empresa', 'Agencia', 'Particular']).optional(),
    comercial: z.string().optional(),
    agencyPercentage: z.number().min(0).max(100).default(0),
    agencyCommissionValue: z.number().min(0).default(0),
    spacePercentage: z.number().min(0).max(100).default(0),
    spaceCommissionValue: z.number().min(0).default(0),
    comisionesAgencia: z.number().min(0).default(0),
    comisionesCanon: z.number().min(0).default(0),
    facturacion: z.number().min(0).default(0),
    plane: z.string().optional(),
    comments: z.string().optional(),
    deliveryLocations: z.array(z.string()).optional(),
    direccionPrincipal: z.string().optional(),
    startDate: z.date().optional(),
    endDate: z.date().optional(),
});

export const entregaFormSchema = osFormSchema.extend({
    // No new fields needed at this level for now
});

export type EntregaFormValues = z.infer<typeof entregaFormSchema>;
