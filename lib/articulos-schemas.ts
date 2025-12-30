import { z } from 'zod';

export interface ImagenArticulo {
    id: string;
    url: string;
    esPrincipal: boolean;
    orden: number;
    descripcion?: string;
}

// ============================================
// SCHEMA PARA ARTÍCULOS MICECATERING
// ============================================
export const articuloMicecateringSchema = z.object({
    id: z.string(),
    nombre: z.string().min(1, 'El nombre es requerido'),
    categoria: z.string().min(1, 'La categoría es requerida'),
    familia: z.string().optional(),
    precioVenta: z.coerce.number().min(0, 'El precio debe ser mayor o igual a 0'),
    precioAlquiler: z.coerce.number().min(0, 'El precio debe ser mayor o igual a 0'),
    precioReposicion: z.coerce.number().min(0, 'El precio debe ser mayor o igual a 0'),
    erpId: z.string().optional(),
    partnerId: z.string().optional(),
    producidoPorPartner: z.boolean(),
    stockSeguridad: z.coerce.number().min(0, 'El stock debe ser mayor o igual a 0'),
    unidadVenta: z.coerce.number().min(1, 'La unidad de venta debe ser al menos 1'),
    loc: z.string().optional(),
    subcategoria: z.string().optional(),
    alergenos: z.array(z.object({
        nombre: z.string(),
        tipo: z.enum(['presente', 'trazas'])
    })).default([]),
    docDriveUrl: z.string().url('URL debe ser válida').or(z.literal('')).optional(),
    iva: z.coerce.number().min(0).default(10),
    imagenes: z.array(z.object({
        id: z.string(),
        url: z.string(),
        esPrincipal: z.boolean(),
        orden: z.number(),
        descripcion: z.string().optional()
    })).default([]),
}).refine((data) => {
    if ((data.categoria === 'Almacén' || data.categoria === 'Alquiler') && (data.precioAlquiler === undefined || data.precioAlquiler <= 0)) {
        return false;
    }
    return true;
}, {
    message: "El precio de alquiler es obligatorio para Almacén o Alquiler",
    path: ["precioAlquiler"]
});

export type ArticuloMicecateringFormValues = z.infer<typeof articuloMicecateringSchema>;

// ============================================
// SCHEMA PARA ARTÍCULOS ENTREGAS
// ============================================
export const articuloEntregasSchema = z.object({
    id: z.string().optional(),
    nombre: z.string().min(1, 'El nombre es requerido'),
    categoria: z.string().min(1, 'La categoría es requerida'),
    referenciaArticuloEntregas: z.string().min(1, 'La referencia es obligatoria'),
    erpId: z.string().optional(),
    producidoPorPartner: z.boolean().default(false),
    partnerId: z.string().optional(),
    dptEntregas: z.enum(['ALMACEN', 'CPR', 'PARTNER', 'RRHH'], { required_error: 'El departamento es obligatorio' }),
    unidadVenta: z.coerce.number().min(1, 'La unidad de venta debe ser al menos 1').optional(),
    loc: z.string().optional(),
    stockSeguridad: z.coerce.number().min(0, 'El stock debe ser mayor o igual a 0').optional(),
    packs: z.array(z.object({
        erpId: z.string(),
        cantidad: z.coerce.number().min(1)
    })).default([]),
    precioCoste: z.coerce.number().min(0, 'El precio debe ser mayor o igual a 0').optional(),
    precioCosteAlquiler: z.coerce.number().min(0, 'El precio debe ser mayor o igual a 0').optional(),
    precioAlquilerEntregas: z.coerce.number().min(0, 'El precio debe ser mayor o igual a 0').optional(),
    iva: z.coerce.number().min(0).default(10),
    precioVentaEntregas: z.coerce.number().min(0, 'El precio debe ser mayor o igual a 0').optional(),
    precioVentaEntregasIfema: z.coerce.number().min(0, 'El precio debe ser mayor o igual a 0').optional(),
    precioAlquilerIfema: z.coerce.number().min(0, 'El precio debe ser mayor o igual a 0').optional(),
    docDriveUrl: z.string().url('URL debe ser válida').or(z.literal('')).optional(),
    imagenes: z.array(z.object({
        id: z.string(),
        url: z.string(),
        esPrincipal: z.boolean(),
        orden: z.number(),
        descripcion: z.string().optional()
    })).default([]),
});

export type ArticuloEntregasFormValues = z.infer<typeof articuloEntregasSchema>;
