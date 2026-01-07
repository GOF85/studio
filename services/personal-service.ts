import { SupabaseClient } from '@supabase/supabase-js';
import type { Personal } from '@/types';

export function mapPersonalFromDB(item: any): Personal {
    const nombre = item.nombre || '';
    const apellido1 = item.apellido1 || '';
    const apellido2 = item.apellido2 || '';
    const nombreCompleto = `${nombre} ${apellido1} ${apellido2}`.trim();
    const nombreCompacto = `${nombre} ${apellido1}`.trim();
    const iniciales = `${nombre.charAt(0)}${apellido1.charAt(0)}`.toUpperCase();

    return {
        id: item.id,
        matricula: item.matricula || '',
        nombre,
        apellido1,
        apellido2,
        nombreCompleto,
        nombreCompacto,
        iniciales,
        departamento: item.departamento || '',
        categoria: item.categoria || '',
        telefono: item.telefono || '',
        email: item.email || '',
        precioHora: Number(item.precio_hora) || 0,
        activo: item.activo ?? true,
        fotoUrl: item.foto_url || ''
    };
}

export async function getPersonalPaginated(
    supabase: SupabaseClient,
    options: {
        page: number;
        pageSize: number;
        searchTerm?: string;
        departmentFilter?: string;
        categoryFilter?: string;
        isActive?: boolean;
    }
) {
    const { page, pageSize, searchTerm, departmentFilter, categoryFilter, isActive = true } = options;

    let query = supabase
        .from('personal')
        .select('*', { count: 'exact' });

    // Filter by Active status
    query = query.eq('activo', isActive);

    if (searchTerm) {
        query = query.or(`id.ilike.%${searchTerm}%,nombre.ilike.%${searchTerm}%,apellido1.ilike.%${searchTerm}%,apellido2.ilike.%${searchTerm}%,matricula.ilike.%${searchTerm}%,categoria.ilike.%${searchTerm}%`);
    }

    if (departmentFilter && departmentFilter !== 'all') {
        query = query.eq('departamento', departmentFilter);
    }

    if (categoryFilter && categoryFilter !== 'all') {
        query = query.eq('categoria', categoryFilter);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await query
        .order('nombre', { ascending: true })
        .range(from, to);

    if (error) throw error;

    return {
        items: (data || []).map(mapPersonalFromDB),
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize)
    };
}

/**
 * Convierte una imagen a WebP y la redimensiona para optimizar el almacenamiento.
 */
export async function compressImage(file: File, maxWidth = 800, quality = 0.8): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = (maxWidth / width) * height;
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);

                canvas.toBlob(
                    (blob) => {
                        if (blob) resolve(blob);
                        else reject(new Error('Error al comprimir la imagen'));
                    },
                    'image/webp',
                    quality
                );
            };
            img.onerror = () => reject(new Error('Error al cargar la imagen'));
        };
        reader.onerror = () => reject(new Error('Error al leer el archivo'));
    });
}

export async function uploadPersonalPhoto(supabase: SupabaseClient, personalId: string, file: File) {
    const compressedBlob = await compressImage(file);
    const fileName = `${personalId.trim().toUpperCase()}.webp`;

    const { error: uploadError } = await supabase.storage
        .from('foto_empleado')
        .upload(fileName, compressedBlob, {
            upsert: true,
            contentType: 'image/webp'
        });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
        .from('foto_empleado')
        .getPublicUrl(fileName);

    const { error: updateError } = await supabase
        .from('personal')
        .update({ foto_url: publicUrl })
        .eq('id', personalId);

    if (updateError) throw updateError;

    return publicUrl;
}

export async function upsertPersonal(supabase: SupabaseClient, personal: Partial<Personal>) {
    const nombre = personal.nombre || '';
    const apellido1 = personal.apellido1 || '';
    const apellido2 = personal.apellido2 || '';
    
    // Normalización para SSOT
    const cleanId = personal.id?.trim().toUpperCase();
    const cleanNombre = nombre.trim();
    const cleanApellido1 = apellido1.trim();
    const cleanApellido2 = apellido2?.trim() || '';

    const nombreCompleto = `${cleanNombre} ${cleanApellido1} ${cleanApellido2}`.trim();
    const nombreCompacto = `${cleanNombre} ${cleanApellido1}`.trim();
    const iniciales = `${cleanNombre.charAt(0)}${cleanApellido1.charAt(0)}`.toUpperCase();

    const dbData: any = {
        id: cleanId,
        nombre: cleanNombre,
        apellido1: cleanApellido1,
        apellido2: cleanApellido2,
        nombre_completo: nombreCompleto,
        nombre_compacto: nombreCompacto,
        iniciales: iniciales,
        departamento: personal.departamento,
        categoria: personal.categoria,
        telefono: personal.telefono,
        email: personal.email,
        precio_hora: personal.precioHora,
        activo: personal.activo ?? true,
        matricula: personal.matricula?.trim() || null,
        foto_url: personal.fotoUrl || null
    };

    const { data, error } = await supabase
        .from('personal')
        .upsert(dbData, { onConflict: 'id' })
        .select()
        .single();

    if (error) throw error;
    return mapPersonalFromDB(data);
}
