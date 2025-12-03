'use client';

import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Image as ImageIcon } from 'lucide-react';
import { ImageUploader } from '../images/ImageUploader';
import { ImageGallery } from '../images/ImageGallery';
import type { EspacioFormValues } from '@/lib/validations/espacios';
import type { ImagenEspacio } from '@/types/espacios';
import { v4 as uuidv4 } from 'uuid';

export function ImagenesTab() {
    const form = useFormContext<EspacioFormValues>();
    const imagenes = form.watch('imagenes') || [];
    const espacioId = form.watch('id');
    const [activeTab, setActiveTab] = useState('fotos');

    const handleUploadComplete = (url: string, filename: string, categoria: 'foto' | 'plano' = 'foto') => {
        const newImage: ImagenEspacio = {
            id: uuidv4(),
            espacioId: espacioId || '',
            url,
            esPrincipal: imagenes.length === 0 && categoria === 'foto', // Only photos can be principal by default
            descripcion: filename,
            orden: imagenes.length,
            categoria
        };

        const newImages = [...imagenes, newImage];
        form.setValue('imagenes', newImages, { shouldDirty: true });
    };

    const handleReorder = (newOrder: ImagenEspacio[]) => {
        // newOrder contains only images of the current category, in the new order
        // We need to merge this with images from other categories

        const currentCategory = activeTab === 'planos' ? 'plano' : 'foto';
        const otherImages = imagenes.filter(img => (img.categoria || 'foto') !== currentCategory);

        // Get the 'orden' values used by the current category images
        const currentCategoryImages = imagenes.filter(img => (img.categoria || 'foto') === currentCategory);
        const availableOrders = currentCategoryImages.map(img => img.orden).sort((a, b) => a - b);

        // Assign these orders to the new order
        const updatedNewOrder = newOrder.map((img, index) => ({
            ...img,
            orden: availableOrders[index] !== undefined ? availableOrders[index] : (otherImages.length + index) // Fallback
        }));

        // Merge and sort by orden to keep consistent global state
        const allImages = [...otherImages, ...updatedNewOrder].sort((a, b) => a.orden - b.orden);

        form.setValue('imagenes', allImages, { shouldDirty: true });
    };

    const handleDelete = (id: string) => {
        if (confirm('¿Estás seguro de eliminar esta imagen?')) {
            const newImages = imagenes.filter(img => img.id !== id);
            if (newImages.length > 0 && !newImages.some(img => img.esPrincipal)) {
                // If we deleted principal, try to find another photo to be principal
                const firstPhoto = newImages.find(img => (img.categoria || 'foto') === 'foto');
                if (firstPhoto) firstPhoto.esPrincipal = true;
            }
            form.setValue('imagenes', newImages, { shouldDirty: true });
        }
    };

    const handleSetPrincipal = (id: string) => {
        const newImages = imagenes.map(img => ({
            ...img,
            esPrincipal: img.id === id
        }));
        form.setValue('imagenes', newImages, { shouldDirty: true });
    };

    const fotos = imagenes.filter(img => (img.categoria || 'foto') === 'foto');
    const planos = imagenes.filter(img => img.categoria === 'plano');

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ImageIcon className="w-5 h-5" />
                        Galería y Documentación
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mb-6">
                            <TabsTrigger value="fotos">Fotos Comerciales ({fotos.length})</TabsTrigger>
                            <TabsTrigger value="planos">Planos Técnicos ({planos.length})</TabsTrigger>
                        </TabsList>

                        <TabsContent value="fotos" className="space-y-6">
                            <ImageUploader
                                espacioId={espacioId}
                                onUploadComplete={(url, name) => handleUploadComplete(url, name, 'foto')}
                                label="foto"
                            />
                            <div className="text-sm text-muted-foreground">
                                {fotos.length === 0
                                    ? "No hay fotos subidas."
                                    : `${fotos.length} fotos subidas. Arrastra para reordenar.`
                                }
                            </div>
                            <ImageGallery
                                imagenes={fotos}
                                onReorder={handleReorder}
                                onDelete={handleDelete}
                                onSetPrincipal={handleSetPrincipal}
                            />
                        </TabsContent>

                        <TabsContent value="planos" className="space-y-6">
                            <ImageUploader
                                espacioId={espacioId}
                                onUploadComplete={(url, name) => handleUploadComplete(url, name, 'plano')}
                                label="plano"
                            />
                            <div className="text-sm text-muted-foreground">
                                {planos.length === 0
                                    ? "No hay planos subidos."
                                    : `${planos.length} planos subidos. Arrastra para reordenar.`
                                }
                            </div>
                            <ImageGallery
                                imagenes={planos}
                                onReorder={handleReorder}
                                onDelete={handleDelete}
                                onSetPrincipal={handleSetPrincipal}
                            />
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}
