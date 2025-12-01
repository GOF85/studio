'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import { Upload, X, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { createEspacio } from '@/services/espacios-service';
import type { EspacioV2, TipoCocina, RelacionComercial, DificultadMontaje } from '@/types/espacios';
import { cn } from '@/lib/utils';

const TIPO_COCINA_OPCIONES: TipoCocina[] = ['Cocina completa', 'Office de regeneración', 'Sin cocina'];
const RELACION_COMERCIAL_OPCIONES: RelacionComercial[] = ['Exclusividad', 'Homologado Preferente', 'Homologado', 'Puntual', 'Sin Relación'];
const DIFICULTAD_MONTAJE_OPCIONES: DificultadMontaje[] = [1, 2, 3, 4, 5];

interface CSVImporterProps {
    onClose: () => void;
    onSuccess: () => void;
}

interface CSVRow {
    [key: string]: string;
}

interface ValidationResult {
    row: number;
    data: Partial<EspacioV2>;
    errors: string[];
    isValid: boolean;
}

const validateAndAssignEnum = <T extends string | number>(
    rowValue: string,
    allowedValues: readonly T[],
    errors: string[],
    errorMsg: string
): T | undefined => {
    if (!rowValue) return undefined;

    const foundValue = allowedValues.find(v => String(v).toLowerCase() === rowValue.toLowerCase());
    if (foundValue !== undefined) {
        return foundValue;
    }

    // Try parsing as number if T is number
    if (typeof allowedValues[0] === 'number') {
        const numValue = Number(rowValue);
        if (allowedValues.includes(numValue as T)) {
            return numValue as T;
        }
    }
    
    errors.push(`${errorMsg}: '${rowValue}'`);
    return undefined;
};

export function CSVImporter({ onClose, onSuccess }: CSVImporterProps) {
    const [file, setFile] = useState<File | null>(null);
    const [previewData, setPreviewData] = useState<ValidationResult[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const { toast } = useToast();

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            setFile(acceptedFiles[0]);
            analyzeCSV(acceptedFiles[0]);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'text/csv': ['.csv'],
            'application/vnd.ms-excel': ['.csv']
        },
        maxFiles: 1,
        multiple: false
    });

    const analyzeCSV = (file: File) => {
        setIsAnalyzing(true);
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const rows = results.data as CSVRow[];
                const validated = rows.map((row, index) => validateRow(row, index));
                setPreviewData(validated);
                setIsAnalyzing(false);
            },
            error: (error) => {
                toast({
                    variant: 'destructive',
                    title: 'Error al leer CSV',
                    description: error.message
                });
                setIsAnalyzing(false);
            }
        });
    };

    const validateRow = (row: CSVRow, index: number): ValidationResult => {
        const errors: string[] = [];
        const data: Partial<EspacioV2> = {};

        // Mapeo y Validación básica

        // Identificación
        if (!row['Nombre']) errors.push('Falta Nombre');
        else data.nombre = row['Nombre'];

        if (!row['Ciudad']) errors.push('Falta Ciudad');
        else data.ciudad = row['Ciudad'];

        if (!row['Provincia']) errors.push('Falta Provincia');
        else data.provincia = row['Provincia'];

        // Campos opcionales pero mapeados
        data.calle = row['Calle'];
        data.codigoPostal = row['Código Postal'];
        data.zona = row['Zona'];
        data.descripcionCorta = row['Descripción Corta'];
        data.descripcionLarga = row['Descripción Larga'];

        // Arrays (separados por ;)
        data.tiposEspacio = row['Tipos de Espacio'] ? row['Tipos de Espacio'].split(';').map(s => s.trim()) : [];
        if (data.tiposEspacio.length === 0) errors.push('Falta al menos un Tipo de Espacio');

        data.estilos = row['Estilos'] ? row['Estilos'].split(';').map(s => s.trim()) : [];
        data.tags = row['Tags'] ? row['Tags'].split(';').map(s => s.trim()) : [];
        data.idealPara = row['Ideal Para'] ? row['Ideal Para'].split(';').map(s => s.trim()) : [];

        // Capacidades (Numéricos)
        if (row['Aforo Máx Cocktail']) data.aforoMaxCocktail = Number(row['Aforo Máx Cocktail']) || undefined;
        if (row['Aforo Máx Banquete']) data.aforoMaxBanquete = Number(row['Aforo Máx Banquete']) || undefined;

        // Logística
        data.accesoVehiculos = row['Acceso Vehículos'];
        data.horarioMontajeDesmontaje = row['Horario Montaje/Desmontaje'];
        data.potenciaTotal = row['Potencia Total'];
        data.tipoCocina = validateAndAssignEnum(row['Tipo Cocina'], TIPO_COCINA_OPCIONES, errors, 'Valor inválido para Tipo Cocina');
        data.limitadorSonido = row['Limitador Sonido'] === 'Sí';
        data.dificultadMontaje = validateAndAssignEnum(row['Dificultad Montaje'], DIFICULTAD_MONTAJE_OPCIONES, errors, 'Valor inválido para Dificultad Montaje');
        if (row['Penalización Personal (%)']) data.penalizacionPersonalMontaje = Number(row['Penalización Personal (%)']);

        // Evaluación
        data.relacionComercial = validateAndAssignEnum(row['Relación Comercial'], RELACION_COMERCIAL_OPCIONES, errors, 'Valor inválido para Relación Comercial') || 'Sin Relación';
        if (row['Valoración Comercial']) data.valoracionComercial = Number(row['Valoración Comercial']);
        if (row['Valoración Operaciones']) data.valoracionOperaciones = Number(row['Valoración Operaciones']);
        data.perfilClienteIdeal = row['Perfil Cliente Ideal'];
        data.puntosFuertes = row['Puntos Fuertes'] ? row['Puntos Fuertes'].split(';').map(s => s.trim()) : [];
        data.puntosDebiles = row['Puntos Débiles'] ? row['Puntos Débiles'].split(';').map(s => s.trim()) : [];

        // Experiencia
        data.aparcamiento = row['Aparcamiento'];
        data.transportePublico = row['Transporte Público'];
        data.accesibilidadAsistentes = row['Accesibilidad Asistentes'];
        data.conexionWifi = row['Conexión WiFi'];

        // Económico
        if (row['Precio Orientativo Alquiler (€)']) data.precioOrientativoAlquiler = Number(row['Precio Orientativo Alquiler (€)']);
        if (row['Canon Espacio (%)']) data.canonEspacioPorcentaje = Number(row['Canon Espacio (%)']);
        if (row['Canon Espacio Fijo (€)']) data.canonEspacioFijo = Number(row['Canon Espacio Fijo (€)']);

        // Otros
        data.carpetaDrive = row['Carpeta Drive'];

        // Valores por defecto para arrays obligatorios en DB pero vacíos aquí
        data.salas = [];
        data.contactos = [];
        data.cuadrosElectricos = [];
        data.imagenes = [];

        return {
            row: index + 1,
            data,
            errors,
            isValid: errors.length === 0
        };
    };

    const handleImport = async () => {
        const validRows = previewData.filter(r => r.isValid);
        if (validRows.length === 0) return;

        setIsImporting(true);
        let successCount = 0;
        let errorCount = 0;

        try {
            for (const item of validRows) {
                try {
                    await createEspacio(item.data as EspacioV2);
                    successCount++;
                } catch (error) {
                    console.error('Error importing row:', item.row, error);
                    errorCount++;
                }
            }

            toast({
                title: 'Importación completada',
                description: `Se importaron ${successCount} espacios correctamente. ${errorCount > 0 ? `${errorCount} fallos.` : ''}`,
                variant: errorCount > 0 ? 'default' : 'default', // TODO: Success variant?
            });

            onSuccess();
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Error en la importación',
                description: 'Ocurrió un error general durante el proceso.'
            });
        } finally {
            setIsImporting(false);
        }
    };

    const validCount = previewData.filter(r => r.isValid).length;
    const invalidCount = previewData.filter(r => !r.isValid).length;

    return (
        <div className="space-y-6">
            {!file ? (
                <div
                    {...getRootProps()}
                    className={cn(
                        "border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors",
                        isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
                    )}
                >
                    <input {...getInputProps()} />
                    <div className="flex flex-col items-center gap-4">
                        <div className="p-4 bg-muted rounded-full">
                            <FileSpreadsheet className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-lg font-medium">
                                {isDragActive ? "Suelta el archivo aquí" : "Arrastra tu CSV o haz clic para seleccionar"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                Usa la plantilla descargable para asegurar el formato correcto
                            </p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-full">
                                <FileSpreadsheet className="w-5 h-5 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                                <p className="font-medium">{file.name}</p>
                                <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => { setFile(null); setPreviewData([]); }}>
                            <X className="w-4 h-4" />
                        </Button>
                    </div>

                    {isAnalyzing ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            <span className="ml-2">Analizando archivo...</span>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <Alert variant={invalidCount > 0 ? "destructive" : "default"} className={invalidCount === 0 ? "border-green-500 text-green-600" : ""}>
                                    <div className="flex items-center gap-2">
                                        {invalidCount > 0 ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                                        <AlertTitle>Resumen de Validación</AlertTitle>
                                    </div>
                                    <AlertDescription>
                                        {validCount} filas válidas listas para importar.
                                        {invalidCount > 0 && <span className="block font-bold">{invalidCount} filas con errores.</span>}
                                    </AlertDescription>
                                </Alert>
                            </div>

                            <div className="border rounded-md">
                                <ScrollArea className="h-[300px]">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-[50px]">Fila</TableHead>
                                                <TableHead>Nombre</TableHead>
                                                <TableHead>Estado</TableHead>
                                                <TableHead>Detalles</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {previewData.map((row, i) => (
                                                <TableRow key={i} className={!row.isValid ? "bg-destructive/5" : ""}>
                                                    <TableCell>{row.row}</TableCell>
                                                    <TableCell className="font-medium">{row.data.nombre || 'Sin nombre'}</TableCell>
                                                    <TableCell>
                                                        {row.isValid ? (
                                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                                                Válido
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                                                Error
                                                            </span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-sm text-muted-foreground">
                                                        {row.isValid ? (
                                                            `${row.data.ciudad}, ${row.data.tiposEspacio?.length} tipos`
                                                        ) : (
                                                            <span className="text-destructive">{row.errors.join(', ')}</span>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </ScrollArea>
                            </div>

                            <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={onClose}>Cancelar</Button>
                                <Button
                                    onClick={handleImport}
                                    disabled={validCount === 0 || isImporting}
                                >
                                    {isImporting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    Importar {validCount} Espacios
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
