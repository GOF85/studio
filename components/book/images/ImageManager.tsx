'use client';

import { ImageUploader } from './ImageUploader';
import { ImageGallery } from './ImageGallery';
import type { ImagenReceta } from '@/types/index';

interface ImageManagerProps {
    images: ImagenReceta[];
    onUpload: (url: string, filename: string) => void;
    onReorder: (newOrder: ImagenReceta[]) => void;
    onDelete: (id: string) => void;
    onSetPrincipal: (id: string) => void;
    folder: string;
    bucket?: string;
    enableCamera?: boolean;
    className?: string;
    label?: string;
}

export function ImageManager({
    images,
    onUpload,
    onReorder,
    onDelete,
    onSetPrincipal,
    folder,
    bucket = 'recetas',
    enableCamera = true,
    className,
    label
}: ImageManagerProps) {
    return (
        <ImageGallery
            imagenes={images}
            onReorder={onReorder}
            onDelete={onDelete}
            onSetPrincipal={onSetPrincipal}
            className={className}
        >
            <ImageUploader
                folder={folder}
                bucket={bucket}
                onUploadComplete={onUpload}
                variant="compact"
                enableCamera={enableCamera}
                label={label}
            />
        </ImageGallery>
    );
}
