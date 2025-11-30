import { supabase } from '@/lib/supabase';
import type { EspacioV2, Sala, ContactoEspacio } from '@/types/espacios';

// CRUD Espacios
export async function getEspacios() {
    const { data, error } = await supabase
        .from('espacios_v2')
        .select(`
      *,
      salas:espacios_salas(*),
      contactos:espacios_contactos(*),
      cuadros_electricos:espacios_cuadros_electricos(*),
      imagenes:espacios_imagenes(*)
    `)
        .order('nombre');

    if (error) throw error;
    return data.map(mapEspacioFromDB);
}

export async function getEspacioById(id: string) {
    const { data, error } = await supabase
        .from('espacios_v2')
        .select(`
      *,
      salas:espacios_salas(*),
      contactos:espacios_contactos(*),
      cuadros_electricos:espacios_cuadros_electricos(*),
      imagenes:espacios_imagenes(*)
    `)
        .eq('id', id)
        .single();

    if (error) throw error;
    return mapEspacioFromDB(data);
}

export async function createEspacio(espacio: Partial<EspacioV2>) {
    const { salas, contactos, cuadrosElectricos, imagenes, ...espacioData } = espacio;

    // 1. Crear espacio principal
    const { data: newEspacio, error: espacioError } = await supabase
        .from('espacios_v2')
        .insert(mapEspacioToDB(espacioData))
        .select()
        .single();

    if (espacioError) throw espacioError;

    // 2. Crear salas
    if (salas && salas.length > 0) {
        const { error: salasError } = await supabase
            .from('espacios_salas')
            .insert(salas.map(s => ({ ...s, espacio_id: newEspacio.id })));
        if (salasError) throw salasError;
    }

    // 3. Crear contactos
    if (contactos && contactos.length > 0) {
        const { error: contactosError } = await supabase
            .from('espacios_contactos')
            .insert(contactos.map(c => ({ ...c, espacio_id: newEspacio.id })));
        if (contactosError) throw contactosError;
    }

    // 4. Crear cuadros eléctricos
    if (cuadrosElectricos && cuadrosElectricos.length > 0) {
        const { error: cuadrosError } = await supabase
            .from('espacios_cuadros_electricos')
            .insert(cuadrosElectricos.map(ce => ({ ...ce, espacio_id: newEspacio.id })));
        if (cuadrosError) throw cuadrosError;
    }

    // 5. Crear imágenes
    if (imagenes && imagenes.length > 0) {
        const { error: imagenesError } = await supabase
            .from('espacios_imagenes')
            .insert(imagenes.map(img => ({
                id: img.id,
                espacio_id: newEspacio.id,
                url: img.url,
                es_principal: img.esPrincipal || false,
                descripcion: img.descripcion,
                orden: img.orden,
                categoria: img.categoria || 'foto'
            })));
        if (imagenesError) throw imagenesError;
    }

    return getEspacioById(newEspacio.id);
}

export async function updateEspacio(id: string, updates: Partial<EspacioV2>) {
    const { salas, contactos, cuadrosElectricos, imagenes, ...espacioData } = updates;

    // 1. Actualizar espacio principal
    const { error } = await supabase
        .from('espacios_v2')
        .update(mapEspacioToDB(espacioData))
        .eq('id', id);

    if (error) throw error;

    // 2. Actualizar imágenes si se proporcionan
    if (imagenes !== undefined) {
        // Eliminar imágenes existentes
        await supabase
            .from('espacios_imagenes')
            .delete()
            .eq('espacio_id', id);

        // Insertar nuevas imágenes
        if (imagenes.length > 0) {
            const { error: imagenesError } = await supabase
                .from('espacios_imagenes')
                .insert(imagenes.map(img => ({
                    id: img.id,
                    espacio_id: id,
                    url: img.url,
                    es_principal: img.esPrincipal || false,
                    descripcion: img.descripcion,
                    orden: img.orden,
                    categoria: img.categoria || 'foto'
                })));
            if (imagenesError) throw imagenesError;
        }
    }

    return getEspacioById(id);
}

export async function deleteEspacio(id: string) {
    const { error } = await supabase
        .from('espacios_v2')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

// Mappers
function mapEspacioFromDB(row: any): EspacioV2 {
    return {
        id: row.id,
        nombre: row.nombre,
        ciudad: row.ciudad,
        provincia: row.provincia,
        calle: row.calle,
        codigoPostal: row.codigo_postal,
        zona: row.zona,
        descripcionCorta: row.descripcion_corta,
        descripcionLarga: row.descripcion_larga,
        tiposEspacio: row.tipos_espacio || [],
        estilos: row.estilos || [],
        tags: row.tags || [],
        idealPara: row.ideal_para || [],
        aforoMaxCocktail: row.aforo_max_cocktail,
        aforoMaxBanquete: row.aforo_max_banquete,
        relacionComercial: row.relacion_comercial,
        valoracionComercial: row.valoracion_comercial,
        valoracionOperaciones: row.valoracion_operaciones,
        perfilClienteIdeal: row.perfil_cliente_ideal,
        puntosFuertes: row.puntos_fuertes || [],
        puntosDebiles: row.puntos_debiles || [],
        limitadorSonido: row.limitador_sonido,
        dificultadMontaje: row.dificultad_montaje,
        penalizacionPersonalMontaje: row.penalizacion_personal_montaje,
        accesoVehiculos: row.acceso_vehiculos,
        horarioMontajeDesmontaje: row.horario_montaje_desmontaje,
        potenciaTotal: row.potencia_total,
        tipoCocina: row.tipo_cocina,
        aparcamiento: row.aparcamiento,
        transportePublico: row.transporte_publico,
        accesibilidadAsistentes: row.accesibilidad_asistentes,
        conexionWifi: row.conexion_wifi,
        precioOrientativoAlquiler: row.precio_orientativo_alquiler,
        canonEspacioPorcentaje: row.canon_espacio_porcentaje,
        canonEspacioFijo: row.canon_espacio_fijo,
        dataExtendida: row.data_extendida,
        imagenPrincipalUrl: row.imagen_principal_url,
        carpetaDrive: row.carpeta_drive,
        visitaVirtualUrl: row.visita_virtual_url,
        resumenEjecutivoIA: row.resumen_ejecutivo_ia,
        ultimaGeneracionIA: row.ultima_generacion_ia,
        salas: row.salas || [],
        contactos: row.contactos || [],
        cuadrosElectricos: row.cuadros_electricos || [],
        imagenes: (row.imagenes || []).map((img: any) => ({
            id: img.id,
            espacioId: img.espacio_id,
            url: img.url,
            esPrincipal: img.es_principal,
            descripcion: img.descripcion,
            orden: img.orden,
            categoria: img.categoria || 'foto'
        })),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        createdBy: row.created_by,
        updatedBy: row.updated_by,
    };
}

function mapEspacioToDB(espacio: Partial<EspacioV2>): any {
    const dbObj: any = {};
    if (espacio.nombre !== undefined) dbObj.nombre = espacio.nombre;
    if (espacio.ciudad !== undefined) dbObj.ciudad = espacio.ciudad;
    if (espacio.provincia !== undefined) dbObj.provincia = espacio.provincia;
    if (espacio.calle !== undefined) dbObj.calle = espacio.calle;
    if (espacio.codigoPostal !== undefined) dbObj.codigo_postal = espacio.codigoPostal;
    if (espacio.zona !== undefined) dbObj.zona = espacio.zona;
    if (espacio.descripcionCorta !== undefined) dbObj.descripcion_corta = espacio.descripcionCorta;
    if (espacio.descripcionLarga !== undefined) dbObj.descripcion_larga = espacio.descripcionLarga;
    if (espacio.tiposEspacio !== undefined) dbObj.tipos_espacio = espacio.tiposEspacio;
    if (espacio.estilos !== undefined) dbObj.estilos = espacio.estilos;
    if (espacio.tags !== undefined) dbObj.tags = espacio.tags;
    if (espacio.idealPara !== undefined) dbObj.ideal_para = espacio.idealPara;
    if (espacio.aforoMaxCocktail !== undefined) dbObj.aforo_max_cocktail = espacio.aforoMaxCocktail;
    if (espacio.aforoMaxBanquete !== undefined) dbObj.aforo_max_banquete = espacio.aforoMaxBanquete;
    if (espacio.relacionComercial !== undefined) dbObj.relacion_comercial = espacio.relacionComercial;
    if (espacio.valoracionComercial !== undefined) dbObj.valoracion_comercial = espacio.valoracionComercial;
    if (espacio.valoracionOperaciones !== undefined) dbObj.valoracion_operaciones = espacio.valoracionOperaciones;
    if (espacio.perfilClienteIdeal !== undefined) dbObj.perfil_cliente_ideal = espacio.perfilClienteIdeal;
    if (espacio.puntosFuertes !== undefined) dbObj.puntos_fuertes = espacio.puntosFuertes;
    if (espacio.puntosDebiles !== undefined) dbObj.puntos_debiles = espacio.puntosDebiles;
    if (espacio.limitadorSonido !== undefined) dbObj.limitador_sonido = espacio.limitadorSonido;
    if (espacio.dificultadMontaje !== undefined) dbObj.dificultad_montaje = espacio.dificultadMontaje;
    if (espacio.penalizacionPersonalMontaje !== undefined) dbObj.penalizacion_personal_montaje = espacio.penalizacionPersonalMontaje;
    if (espacio.accesoVehiculos !== undefined) dbObj.acceso_vehiculos = espacio.accesoVehiculos;
    if (espacio.horarioMontajeDesmontaje !== undefined) dbObj.horario_montaje_desmontaje = espacio.horarioMontajeDesmontaje;
    if (espacio.potenciaTotal !== undefined) dbObj.potencia_total = espacio.potenciaTotal;
    if (espacio.tipoCocina !== undefined) dbObj.tipo_cocina = espacio.tipoCocina;
    if (espacio.aparcamiento !== undefined) dbObj.aparcamiento = espacio.aparcamiento;
    if (espacio.transportePublico !== undefined) dbObj.transporte_publico = espacio.transportePublico;
    if (espacio.accesibilidadAsistentes !== undefined) dbObj.accesibilidad_asistentes = espacio.accesibilidadAsistentes;
    if (espacio.conexionWifi !== undefined) dbObj.conexion_wifi = espacio.conexionWifi;
    if (espacio.precioOrientativoAlquiler !== undefined) dbObj.precio_orientativo_alquiler = espacio.precioOrientativoAlquiler;
    if (espacio.canonEspacioPorcentaje !== undefined) dbObj.canon_espacio_porcentaje = espacio.canonEspacioPorcentaje;
    if (espacio.canonEspacioFijo !== undefined) dbObj.canon_espacio_fijo = espacio.canonEspacioFijo;
    if (espacio.dataExtendida !== undefined) dbObj.data_extendida = espacio.dataExtendida;
    if (espacio.imagenPrincipalUrl !== undefined) dbObj.imagen_principal_url = espacio.imagenPrincipalUrl;
    if (espacio.carpetaDrive !== undefined) dbObj.carpeta_drive = espacio.carpetaDrive;
    if (espacio.visitaVirtualUrl !== undefined) dbObj.visita_virtual_url = espacio.visitaVirtualUrl;
    if (espacio.resumenEjecutivoIA !== undefined) dbObj.resumen_ejecutivo_ia = espacio.resumenEjecutivoIA;

    return dbObj;
}
