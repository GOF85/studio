import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import type { EspacioV2 } from '@/types/espacios';

const styles = StyleSheet.create({
    page: {
        padding: 30,
        fontFamily: 'Helvetica',
        backgroundColor: '#ffffff',
    },
    header: {
        marginBottom: 20,
        borderBottom: '2 solid #e5e7eb',
        paddingBottom: 15,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 12,
        color: '#6b7280',
        marginBottom: 4,
    },
    section: {
        marginBottom: 15,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#374151',
        marginBottom: 8,
        borderBottom: '1 solid #e5e7eb',
        paddingBottom: 4,
    },
    row: {
        flexDirection: 'row',
        marginBottom: 6,
    },
    label: {
        fontSize: 10,
        color: '#6b7280',
        width: '40%',
        fontWeight: 'bold',
    },
    value: {
        fontSize: 10,
        color: '#1f2937',
        width: '60%',
    },
    tags: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 4,
        marginTop: 4,
    },
    tag: {
        fontSize: 8,
        backgroundColor: '#f3f4f6',
        color: '#374151',
        padding: '4 8',
        borderRadius: 4,
        marginRight: 4,
        marginBottom: 4,
    },
    imageGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 8,
    },
    image: {
        width: '48%',
        height: 120,
        objectFit: 'cover',
        borderRadius: 4,
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 30,
        right: 30,
        textAlign: 'center',
        fontSize: 8,
        color: '#9ca3af',
        borderTop: '1 solid #e5e7eb',
        paddingTop: 10,
    },
});

interface FichaCiegaPDFProps {
    espacio: EspacioV2;
}

// Helper to fix image URLs for react-pdf
const fixImageUrl = (url: string) => {
    if (!url) return '';
    // react-pdf is picky about extensions. If the URL doesn't end in a known extension,
    // we append a dummy one as a query parameter.
    const path = url.split('?')[0];
    const hasExtension = /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(path);
    if (!hasExtension) {
        return `${url}${url.includes('?') ? '&' : '?'}format=.jpg`;
    }
    return url;
};

export function FichaCiegaPDF({ espacio }: FichaCiegaPDFProps) {
    // Get only commercial photos (not blueprints)
    const fotosComerciales = espacio.imagenes?.filter(img => img.categoria !== 'plano').slice(0, 4) || [];

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>{espacio.nombre}</Text>
                    <Text style={styles.subtitle}>
                        {espacio.calle && `${espacio.calle}, `}
                        {espacio.ciudad}, {espacio.provincia}
                        {espacio.codigoPostal && ` - ${espacio.codigoPostal}`}
                    </Text>
                    {espacio.zona && (
                        <Text style={styles.subtitle}>Zona: {espacio.zona}</Text>
                    )}
                </View>

                {/* Description */}
                {espacio.descripcionCorta && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Descripción</Text>
                        <Text style={styles.value}>{espacio.descripcionCorta}</Text>
                    </View>
                )}

                {/* Space Types */}
                {espacio.tiposEspacio && espacio.tiposEspacio.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Tipo de Espacio</Text>
                        <View style={styles.tags}>
                            {espacio.tiposEspacio.map((tipo, idx) => (
                                <Text key={idx} style={styles.tag}>{tipo}</Text>
                            ))}
                        </View>
                    </View>
                )}

                {/* Capacities */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Capacidades</Text>
                    {espacio.aforoMaxCocktail && (
                        <View style={styles.row}>
                            <Text style={styles.label}>Aforo Cocktail:</Text>
                            <Text style={styles.value}>{espacio.aforoMaxCocktail} personas</Text>
                        </View>
                    )}
                    {espacio.aforoMaxBanquete && (
                        <View style={styles.row}>
                            <Text style={styles.label}>Aforo Banquete:</Text>
                            <Text style={styles.value}>{espacio.aforoMaxBanquete} personas</Text>
                        </View>
                    )}
                </View>

                {/* Styles & Tags */}
                {espacio.estilos && espacio.estilos.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Estilos</Text>
                        <View style={styles.tags}>
                            {espacio.estilos.map((estilo, idx) => (
                                <Text key={idx} style={styles.tag}>{estilo}</Text>
                            ))}
                        </View>
                    </View>
                )}

                {/* Ideal For */}
                {espacio.idealPara && espacio.idealPara.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Ideal Para</Text>
                        <View style={styles.tags}>
                            {espacio.idealPara.map((ideal, idx) => (
                                <Text key={idx} style={styles.tag}>{ideal}</Text>
                            ))}
                        </View>
                    </View>
                )}

                {/* Experience */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Acceso y Experiencia</Text>
                    {espacio.aparcamiento && (
                        <View style={styles.row}>
                            <Text style={styles.label}>Aparcamiento:</Text>
                            <Text style={styles.value}>{espacio.aparcamiento}</Text>
                        </View>
                    )}
                    {espacio.transportePublico && (
                        <View style={styles.row}>
                            <Text style={styles.label}>Transporte Público:</Text>
                            <Text style={styles.value}>{espacio.transportePublico}</Text>
                        </View>
                    )}
                    {espacio.conexionWifi && (
                        <View style={styles.row}>
                            <Text style={styles.label}>WiFi:</Text>
                            <Text style={styles.value}>{espacio.conexionWifi}</Text>
                        </View>
                    )}
                </View>

                {/* Images */}
                {fotosComerciales.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Galería</Text>
                        <View style={styles.imageGrid}>
                            {fotosComerciales.map((imagen, idx) => (
                                <Image
                                    key={idx}
                                    src={fixImageUrl(imagen.url)}
                                    style={styles.image}
                                />
                            ))}
                        </View>
                    </View>
                )}

                {/* Footer */}
                <View style={styles.footer}>
                    <Text>Este documento es informativo y no constituye una oferta vinculante.</Text>
                    <Text>Para más información y detalles comerciales, por favor contacte con nosotros.</Text>
                </View>
            </Page>
        </Document>
    );
}
