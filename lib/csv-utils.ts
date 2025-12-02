import Papa from 'papaparse';
import type { EspacioV2 } from '@/types/espacios';

export function exportEspaciosToCSV(espacios: EspacioV2[], filename: string = 'espacios.csv') {
    // Preparar datos para CSV
    const rows = espacios.map(e => ({
        // Identificación
        'Nombre': e.nombre,
        'Ciudad': e.ciudad,
        'Provincia': e.provincia,
        'Calle': e.calle || '',
        'Código Postal': e.codigoPostal || '',
        'Zona': e.zona || '',
        'Descripción Corta': e.descripcionCorta || '',
        'Descripción Larga': e.descripcionLarga || '',
        'Tipos de Espacio': e.tiposEspacio.join('; '),
        'Estilos': e.estilos?.join('; ') || '',
        'Tags': e.tags?.join('; ') || '',
        'Ideal Para': e.idealPara?.join('; ') || '',

        // Capacidades
        'Aforo Máx Cocktail': e.aforoMaxCocktail || '',
        'Aforo Máx Banquete': e.aforoMaxBanquete || '',
        'Número de Salas': e.salas?.length || 0,

        // Logística
        'Acceso Vehículos': e.accesoVehiculos || '',
        'Horario Montaje/Desmontaje': e.horarioMontajeDesmontaje || '',
        'Potencia Total': e.potenciaTotal || '',
        'Tipo Cocina': e.tipoCocina || '',
        'Limitador Sonido': e.limitadorSonido ? 'Sí' : 'No',
        'Dificultad Montaje': e.dificultadMontaje || '',
        'Penalización Personal (%)': e.penalizacionPersonalMontaje || '',

        // Evaluación
        'Relación Comercial': e.relacionComercial,
        'Valoración Comercial': e.valoracionComercial || '',
        'Valoración Operaciones': e.valoracionOperaciones || '',
        'Perfil Cliente Ideal': e.perfilClienteIdeal || '',
        'Puntos Fuertes': e.puntosFuertes?.join('; ') || '',
        'Puntos Débiles': e.puntosDebiles?.join('; ') || '',

        // Experiencia
        'Aparcamiento': e.aparcamiento || '',
        'Transporte Público': e.transportePublico || '',
        'Accesibilidad Asistentes': e.accesibilidadAsistentes || '',
        'Conexión WiFi': e.conexionWifi || '',

        // Económico
        'Precio Orientativo Alquiler (€)': e.precioOrientativoAlquiler || '',
        'Canon Espacio (%)': e.canonEspacioPorcentaje || '',
        'Canon Espacio Fijo (€)': e.canonEspacioFijo || '',

        // Contactos
        'Número de Contactos': e.contactos?.length || 0,

        // Técnico
        'Número de Cuadros Eléctricos': e.cuadrosElectricos?.length || 0,

        // Otros
        'Carpeta Drive': e.carpetaDrive || '',
        'Fecha Creación': e.createdAt ? new Date(e.createdAt).toLocaleDateString('es-ES') : '',
        'Última Actualización': e.updatedAt ? new Date(e.updatedAt).toLocaleDateString('es-ES') : '',
    }));

    // Generar CSV
    const csv = Papa.unparse(rows, {
        quotes: true,
        delimiter: ',',
        header: true,
    });

    // Descargar archivo
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

export function downloadCSVTemplate() {
    const template = [
        {
            'Nombre': 'Hotel Gran Meliá',
            'Ciudad': 'Madrid',
            'Provincia': 'Madrid',
            'Calle': 'Calle Principal 123',
            'Código Postal': '28001',
            'Zona': 'Centro',
            'Descripción Corta': 'Hotel de lujo en el centro de Madrid',
            'Descripción Larga': 'Hotel 5 estrellas con amplios salones para eventos',
            'Tipos de Espacio': 'Hotel; Palacio de Congresos',
            'Estilos': 'Moderno; Elegante',
            'Tags': 'Lujo; Centro Ciudad',
            'Ideal Para': 'Congresos; Bodas; Eventos Corporativos',
            'Aforo Máx Cocktail': '500',
            'Aforo Máx Banquete': '300',
            'Relación Comercial': 'Homologado Preferente',
        }
    ];

    const csv = Papa.unparse(template, {
        quotes: true,
        delimiter: ',',
        header: true,
    });

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', 'plantilla_espacios.csv');
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
