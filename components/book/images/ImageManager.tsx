'use client';

import { ImageUploader } from './ImageUploader';
import { ImageGallery } from './ImageGallery';
import type { ImagenReceta } from '@/types/index';

interface ImageManagerProps {
    images: ImagenReceta[];
    onImagesChange?: (images: ImagenReceta[]) => void;
    onUpload?: (url: string, filename: string) => void;
    onReorder?: (newOrder: ImagenReceta[]) => void;
    onDelete?: (id: string) => void;
    onSetPrincipal?: (id: string) => void;
    folder?: string;
    bucket?: string;
    enableCamera?: boolean;
    className?: string;
    label?: string;
    maxImages?: number;
}

export function ImageManager({
    images,
    onImagesChange,
    onUpload,
    onReorder,
    onDelete,
    onSetPrincipal,
    folder = 'articulos',
    bucket = 'recetas',
    enableCamera = true,
    className,
    label,
    maxImages = 5
}: ImageManagerProps) {
    const handleUpload = (url: string, filename: string) => {
        if (onUpload) {
            onUpload(url, filename);
        }
        if (onImagesChange) {
            const newImage: ImagenReceta = {
                id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
                url,
                descripcion: filename,
                esPrincipal: images.length === 0,
                orden: images.length
            };
            onImagesChange([...images, newImage]);
        }
    };

    const handleReorder = (newOrder: ImagenReceta[]) => {
        if (onReorder) onReorder(newOrder);
        if (onImagesChange) onImagesChange(newOrder);
    };

    const handleDelete = (id: string) => {
        if (onDelete) onDelete(id);
        if (onImagesChange) onImagesChange(images.filter(img => img.id !== id));
    };

    const handleSetPrincipal = (id: string) => {
        if (onSetPrincipal) onSetPrincipal(id);
        if (onImagesChange) {
            onImagesChange(images.map(img => ({
                ...img,
                esPrincipal: img.id === id
            })));
        }
    };

    return (
        <ImageGallery
            imagenes={images}
            onReorder={handleReorder}
            onDelete={handleDelete}
            onSetPrincipal={handleSetPrincipal}
            className={className}
        >
            {images.length < maxImages && (
                <ImageUploader
                    folder={folder}
                    bucket={bucket}
                    onUploadComplete={handleUpload}
                    variant="compact"
                    enableCamera={enableCamera}
                    label={label}
                />
            )}
        </ImageGallery>
    );
}
