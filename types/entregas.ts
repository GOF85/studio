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
    id: z.string().optional(),
    // Additional fields used by the OS info form
    space: z.string().optional(),
    spaceAddress: z.string().optional(),
    spaceContact: z.string().optional(),
    spacePhone: z.string().optional(),
    spaceMail: z.string().optional(),
    respMetre: z.string().optional(),
    respMetrePhone: z.string().optional(),
    respMetreMail: z.string().optional(),
    respPase: z.string().optional(),
    respPasePhone: z.string().optional(),
    respPaseMail: z.string().optional(),
    respCocinaPase: z.string().optional(),
    respCocinaPasePhone: z.string().optional(),
    respCocinaPaseMail: z.string().optional(),
    respCocinaCPR: z.string().optional(),
    respCocinaCPRPhone: z.string().optional(),
    respCocinaCPRMail: z.string().optional(),
    respProjectManager: z.string().optional(),
    respProjectManagerPhone: z.string().optional(),
    respProjectManagerMail: z.string().optional(),
    respLogistica: z.string().optional(),
    respLogisticaPhone: z.string().optional(),
    respLogisticaMail: z.string().optional(),
    comercialAsiste: z.boolean().optional(),
    comercialPhone: z.string().optional(),
    comercialMail: z.string().optional(),
    rrhhAsiste: z.boolean().optional(),
    respRRHH: z.string().optional(),
    respRRHHPhone: z.string().optional(),
    respRRHHMail: z.string().optional(),
    isVip: z.boolean().optional(),
    cateringVertical: z.enum(['Recurrente', 'Grandes Eventos', 'Gran Cuenta']).optional(),
    anulacionMotivo: z.string().optional(),
});

export const entregaFormSchema = osFormSchema.extend({
    // No new fields needed at this level for now
});

export type EntregaFormValues = z.infer<typeof entregaFormSchema>;

// Alias expected by some pages/components
export type OsFormValues = z.infer<typeof osFormSchema>;
