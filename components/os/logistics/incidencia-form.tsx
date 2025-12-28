'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useIncidenciasMaterial } from '@/hooks/use-os-logistics';
import { Loader2, Camera, X, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface IncidenciaFormProps {
    osId: string;
    articuloId: string;
    articuloNombre: string;
    onSuccess?: () => void;
}

export function IncidenciaForm({ osId, articuloId, articuloNombre, onSuccess }: IncidenciaFormProps) {
    const { toast } = useToast();
    const { saveIncidencia } = useIncidenciasMaterial();
    const [descripcion, setDescripcion] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [fotos, setFotos] = useState<string[]>([]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setIsUploading(true);
        try {
            const newFotos = [...fotos];
            for (const file of Array.from(files)) {
                const fileExt = file.name.split('.').pop();
                const fileName = `${osId}/${articuloId}/${Math.random()}.${fileExt}`;
                const filePath = `incidencias/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('material-incidencias')
                    .upload(filePath, file);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('material-incidencias')
                    .getPublicUrl(filePath);

                newFotos.push(publicUrl);
            }
            setFotos(newFotos);
            toast({ title: 'Fotos subidas correctamente' });
        } catch (error: any) {
            toast({
                title: 'Error al subir fotos',
                description: error.message,
                variant: 'destructive'
            });
        } finally {
            setIsUploading(false);
        }
    };

    const removeFoto = (index: number) => {
        setFotos(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (!descripcion.trim()) {
            toast({ title: 'La descripción es obligatoria', variant: 'destructive' });
            return;
        }

        setIsSaving(true);
        try {
            await saveIncidencia({
                os_id: osId,
                articulo_id: articuloId,
                descripcion,
                fotos
            });
            toast({ title: 'Incidencia registrada' });
            setDescripcion('');
            setFotos([]);
            if (onSuccess) onSuccess();
        } catch (error) {
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">Registrar Incidencia</CardTitle>
                <CardDescription>Artículo: {articuloNombre}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label>Descripción de la incidencia</Label>
                    <Textarea 
                        placeholder="Explica qué ha pasado con el material..."
                        value={descripcion}
                        onChange={(e) => setDescripcion(e.target.value)}
                        rows={4}
                    />
                </div>

                <div className="space-y-2">
                    <Label>Evidencias fotográficas</Label>
                    <div className="grid grid-cols-3 gap-2">
                        {fotos.map((url, i) => (
                            <div key={i} className="relative aspect-square rounded-md overflow-hidden border">
                                <img src={url} alt="Evidencia" className="object-cover w-full h-full" />
                                <button 
                                    onClick={() => removeFoto(i)}
                                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                        <label className="flex flex-col items-center justify-center aspect-square rounded-md border border-dashed cursor-pointer hover:bg-muted transition-colors">
                            {isUploading ? (
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            ) : (
                                <>
                                    <Camera className="h-6 w-6 text-muted-foreground" />
                                    <span className="text-[10px] mt-1 text-muted-foreground">Subir foto</span>
                                </>
                            )}
                            <input 
                                type="file" 
                                accept="image/*" 
                                multiple 
                                className="hidden" 
                                onChange={handleFileUpload}
                                disabled={isUploading}
                            />
                        </label>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setDescripcion(''); setFotos([]); }}>Limpiar</Button>
                <Button onClick={handleSubmit} disabled={isSaving || !descripcion.trim()}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Guardar Incidencia
                </Button>
            </CardFooter>
        </Card>
    );
}
