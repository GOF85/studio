import { z } from 'zod';
import { TIPO_ESPACIO, ESTILOS_ESPACIO, TAGS_ESPACIO, IDEAL_PARA } from '@/types';

export const espacioFormSchema = z.object({
    // Identificación
    nombre: z.string().min(1, "El nombre es obligatorio"),
    ciudad: z.string().min(1, "La ciudad es obligatoria"),
    provincia: z.string().min(1, "La provincia es obligatoria"),
    calle: z.string().optional(),
    codigoPostal: z.string().optional(),
    zona: z.string().optional(),
    descripcionCorta: z.string().max(200, "Máximo 200 caracteres").optional(),
    descripcionLarga: z.string().optional(),
    tiposEspacio: z.array(z.string()).min(1, "Selecciona al menos un tipo"),
    estilos: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    idealPara: z.array(z.string()).default([]),

    // Capacidades
    aforoMaxCocktail: z.preprocess((val) => (val === '' ? undefined : val), z.coerce.number().min(0).optional()),
    aforoMaxBanquete: z.preprocess((val) => (val === '' ? undefined : val), z.coerce.number().min(0).optional()),
    salas: z.array(z.any()).default([]),

    // Logística
    accesoVehiculos: z.string().optional(),
    horarioMontajeDesmontaje: z.string().optional(),
    potenciaTotal: z.string().optional(),
    tipoCocina: z.enum(['Cocina completa', 'Office de regeneración', 'Sin cocina']).optional(),
    limitadorSonido: z.boolean().default(false),
    dificultadMontaje: z.preprocess((val) => (val === '' ? undefined : val), z.coerce.number().min(1).max(5).optional()),
    penalizacionPersonalMontaje: z.preprocess((val) => (val === '' ? undefined : val), z.coerce.number().min(0).optional()),

    // Evaluación MICE
    proveedorId: z.string().optional(),
    relacionComercial: z.enum(['Exclusividad', 'Homologado Preferente', 'Homologado', 'Puntual', 'Sin Relación']).default('Sin Relación'),
    valoracionComercial: z.preprocess((val) => (val === '' ? undefined : val), z.coerce.number().min(1).max(5).optional()),
    valoracionOperaciones: z.preprocess((val) => (val === '' ? undefined : val), z.coerce.number().min(1).max(5).optional()),
    perfilClienteIdeal: z.string().optional(),
    puntosFuertes: z.array(z.string()).default([]),
    puntosDebiles: z.array(z.string()).default([]),

    // Experiencia
    aparcamiento: z.string().optional(),
    transportePublico: z.string().optional(),
    accesibilidadAsistentes: z.string().optional(),
    conexionWifi: z.string().optional(),

    // Contactos
    contactos: z.array(z.any()).default([]),

    // Económico
    precioOrientativoAlquiler: z.preprocess((val) => (val === '' ? undefined : val), z.coerce.number().min(0).optional()),
    canonEspacioPorcentaje: z.preprocess((val) => (val === '' ? undefined : val), z.coerce.number().min(0).max(100).optional()),
    canonEspacioFijo: z.preprocess((val) => (val === '' ? undefined : val), z.coerce.number().min(0).optional()),
});

export type EspacioFormValues = z.infer<typeof espacioFormSchema>;
