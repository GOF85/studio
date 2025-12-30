'use client';

import { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, X } from 'lucide-react';
import { FormTabs, TabId } from './FormTabs';
import { IdentificacionTab } from './tabs/IdentificacionTab';
import { CapacidadesTab } from './tabs/CapacidadesTab';
import { LogisticaTab } from './tabs/LogisticaTab';
import { EvaluacionTab } from './tabs/EvaluacionTab';
import { ExperienciaTab } from './tabs/ExperienciaTab';
import { EconomicoTab } from './tabs/EconomicoTab';
import { ContactosTab } from './tabs/ContactosTab';
import { CuadrosElectricosTab } from './tabs/CuadrosElectricosTab';
import { ImagenesTab } from './tabs/ImagenesTab';
import { espacioFormSchema, type EspacioFormValues } from '@/lib/validations/espacios';
import { createEspacio, updateEspacio } from '@/services/espacios-service';
import type { EspacioV2 } from '@/types/espacios';

interface EspacioFormProps {
    initialData?: EspacioV2;
    isEditing?: boolean;
    readOnly?: boolean;
}

export function EspacioForm({ initialData, isEditing = false, readOnly = false }: EspacioFormProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState<TabId>('identificacion');
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<EspacioFormValues>({
        resolver: zodResolver(espacioFormSchema),
        defaultValues: initialData ? {
            // Mapeo inverso si es necesario, o usar initialData directo si coincide
            ...initialData,
            // Asegurar arrays vacíos y strings no undefined
            tiposEspacio: initialData.tiposEspacio || [],
            estilos: initialData.estilos || [],
            tags: initialData.tags || [],
            dificultadMontaje: initialData.dificultadMontaje || 1,
            penalizacionPersonalMontaje: initialData.penalizacionPersonalMontaje || 0,
            idealPara: initialData.idealPara || [],
            salas: initialData.salas || [],
            contactos: initialData.contactos || [],
            cuadrosElectricos: initialData.cuadrosElectricos || [],
            carpetaDrive: initialData.carpetaDrive || '',
            imagenes: initialData.imagenes || [],
            puntosFuertes: initialData.puntosFuertes || [],
            puntosDebiles: initialData.puntosDebiles || [],
            descripcionCorta: initialData.descripcionCorta || '',
            descripcionLarga: initialData.descripcionLarga || '',
            calle: initialData.calle || '',
            zona: initialData.zona || '',
            codigoPostal: initialData.codigoPostal || '',
            aparcamiento: initialData.aparcamiento || '',
            transportePublico: initialData.transportePublico || '',
            accesibilidadAsistentes: initialData.accesibilidadAsistentes || '',
            conexionWifi: initialData.conexionWifi || '',
            accesoVehiculos: initialData.accesoVehiculos || '',
            horarioMontajeDesmontaje: initialData.horarioMontajeDesmontaje || '',
            potenciaTotal: initialData.potenciaTotal || '',
            perfilClienteIdeal: initialData.perfilClienteIdeal || '',
            proveedorId: initialData.proveedorId || '',
        } : {
            nombre: '',
            ciudad: '',
            provincia: '',
            calle: '',
            zona: '',
            codigoPostal: '',
            descripcionCorta: '',
            descripcionLarga: '',
            tiposEspacio: [],
            estilos: [],
            tags: [],
            idealPara: [],
            salas: [],
            contactos: [],
            cuadrosElectricos: [],
            carpetaDrive: '',
            imagenes: [],
            puntosFuertes: [],
            puntosDebiles: [],
            limitadorSonido: false,
            relacionComercial: 'Sin Relación',
            aparcamiento: '',
            transportePublico: '',
            accesibilidadAsistentes: '',
            conexionWifi: '',
            accesoVehiculos: '',
            horarioMontajeDesmontaje: '',
            potenciaTotal: '',
            perfilClienteIdeal: '',
            proveedorId: '',
            // Numeric fields can be undefined or 0 depending on requirement, but '' for inputs usually works better if type is text/number
            // However, zod schema expects numbers. Let's leave them undefined if they are optional numbers, 
            // OR initialize them if we want controlled inputs. 
            // For text inputs, empty string is best.
        },
    });

    async function onSubmit(data: EspacioFormValues) {
        if (readOnly) return;

        setIsLoading(true);
        try {
            if (isEditing && initialData?.id) {
                await updateEspacio(initialData.id, data as any);
                toast({ description: 'Espacio actualizado correctamente.' });
            } else {
                await createEspacio(data as any);
                toast({ description: 'Nuevo espacio creado correctamente.' });
            }
            router.push('/bd/espacios');
            router.refresh();
        } catch (error: any) {
            console.error('Error saving espacio:', error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'No se pudo guardar el espacio: ' + error.message,
            });
        } finally {
            setIsLoading(false);
        }
    }

    // Render content based on active tab
    const renderTabContent = () => {
        switch (activeTab) {
            case 'identificacion': return <IdentificacionTab />;
            case 'capacidades': return <CapacidadesTab />;
            case 'logistica': return <LogisticaTab />;
            case 'evaluacion': return <EvaluacionTab />;
            case 'experiencia': return <ExperienciaTab />;
            case 'economico': return <EconomicoTab />;
            case 'contactos': return <ContactosTab />;
            case 'tecnico': return <CuadrosElectricosTab />;
            case 'imagenes': return <ImagenesTab />;
            default: return null;
        }
    };

    return (
        <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit, (errors) => {
                toast({
                    variant: 'destructive',
                    title: 'Error de validación',
                    description: 'Por favor revisa los campos marcados en rojo en las diferentes pestañas.',
                });
            })} className="space-y-6">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-3xl font-headline font-bold">
                        {readOnly ? initialData?.nombre : (isEditing ? `Editar: ${initialData?.nombre}` : 'Nuevo Espacio')}
                    </h1>
                    <div className="flex gap-2">
                        <Button variant="outline" type="button" onClick={() => router.push('/bd/espacios')}>
                            {readOnly ? 'Volver' : <><X className="mr-2 w-4 h-4" /> Cancelar</>}
                        </Button>
                        {!readOnly && (
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                Guardar Espacio
                            </Button>
                        )}
                    </div>
                </div>

                <FormTabs
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                >
                    <div className="mt-6">
                        <fieldset disabled={readOnly} className="group">
                            {renderTabContent()}
                        </fieldset>
                    </div>
                </FormTabs>
            </form>
        </FormProvider>
    );
}
