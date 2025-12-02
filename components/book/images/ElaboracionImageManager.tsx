'use client';

import { useState } from 'react';
import { ImageUploader } from './ImageUploader';
import { ImageGallery } from './ImageGallery';
import type { ImagenReceta } from '@/types/index';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface ElaboracionImageManagerProps {
    elaboracionId: string;
    imagenes: ImagenReceta[];
    onImagesChange: (imagenes: ImagenReceta[]) => void;
}

export function ElaboracionImageManager({
    elaboracionId,
    imagenes,
    onImagesChange
}: ElaboracionImageManagerProps) {
    const { toast } = useToast();

    const handleUploadComplete = (url: string, filename: string) => {
        const newImage: ImagenReceta = {
            id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
            url,
            descripcion: filename,
            esPrincipal: imagenes.length === 0, // First image is principal by default
            orden: imagenes.length
        };

        const updatedImages = [...imagenes, newImage];
        onImagesChange(updatedImages);
    };

    const handleReorder = (newOrder: ImagenReceta[]) => {
        const reorderedImages = newOrder.map((img, index) => ({
            ...img,
            orden: index
        }));
        onImagesChange(reorderedImages);
    };

    const handleDelete = async (id: string) => {
        const imageToDelete = imagenes.find(img => img.id === id);
        if (!imageToDelete) return;

        try {
            // Extract the file path from the URL
            const urlParts = imageToDelete.url.split('/');
            const bucketIndex = urlParts.findIndex(part => part === 'elaboraciones');
            if (bucketIndex !== -1) {
                const filePath = urlParts.slice(bucketIndex + 1).join('/');

                // Delete from storage
                const { error } = await supabase.storage
                    .from('elaboraciones')
                    .remove([filePath]);

                if (error) {
                    console.error('Error deleting from storage:', error);
                }
            }

            // Remove from state
            const updatedImages = imagenes
                .filter(img => img.id !== id)
                .map((img, index) => ({
                    ...img,
                    orden: index,
                    // If we deleted the principal image, make the first one principal
                    esPrincipal: imageToDelete.esPrincipal && index === 0 ? true : img.esPrincipal
                }));

            onImagesChange(updatedImages);

            toast({
                title: 'Imagen eliminada',
                description: 'La imagen se ha eliminado correctamente'
            });
        } catch (error: any) {
            console.error('Error deleting image:', error);
            toast({
                variant: 'destructive',
                title: 'Error al eliminar',
                description: error.message || 'No se pudo eliminar la imagen'
            });
        }
    };

    const handleSetPrincipal = (id: string) => {
        const updatedImages = imagenes.map(img => ({
            ...img,
            esPrincipal: img.id === id
        }));
        onImagesChange(updatedImages);
    };

    return (
        <div className="space-y-4">
            <ImageUploader
                bucket="elaboraciones"
                folder={elaboracionId}
                onUploadComplete={handleUploadComplete}
                label="foto de producción"
            />
            <ImageGallery
                imagenes={imagenes}
                onReorder={handleReorder}
                onDelete={handleDelete}
                onSetPrincipal={handleSetPrincipal}
            />
        </div>
    );
}
