'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface ImageUploaderProps {
    espacioId?: string;
    onUploadComplete: (url: string, filename: string) => void;
    className?: string;
    label?: string;
}

export function ImageUploader({ espacioId, onUploadComplete, className, label = "imagen" }: ImageUploaderProps) {
    const [isUploading, setIsUploading] = useState(false);
    const { toast } = useToast();

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        if (acceptedFiles.length === 0) return;

        setIsUploading(true);
        const file = acceptedFiles[0];

        try {
            // Validar tamaño (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                throw new Error('La imagen no puede superar los 5MB');
            }

            // Validar tipo
            if (!file.type.startsWith('image/')) {
                throw new Error('Solo se permiten archivos de imagen');
            }

            const fileExt = file.name.split('.').pop();
            const fileName = `${espacioId || 'temp'}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('espacios-images')
                .upload(filePath, file);

            if (uploadError) {
                throw uploadError;
            }

            const { data: { publicUrl } } = supabase.storage
                .from('espacios-images')
                .getPublicUrl(filePath);

            onUploadComplete(publicUrl, file.name);

            toast({
                title: 'Imagen subida correctamente',
                description: file.name,
            });

        } catch (error: any) {
            console.error('Error uploading image:', error);
            toast({
                variant: 'destructive',
                title: 'Error al subir imagen',
                description: error.message || 'Ha ocurrido un error inesperado',
            });
        } finally {
            setIsUploading(false);
        }
    }, [espacioId, onUploadComplete, supabase, toast]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/*': ['.png', '.jpg', '.jpeg', '.webp']
        },
        maxFiles: 1,
        disabled: isUploading
    });

    return (
        <div
            {...getRootProps()}
            className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50",
                isUploading && "opacity-50 cursor-not-allowed",
                className
            )}
        >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-2">
                {isUploading ? (
                    <>
                        <Loader2 className="w-10 h-10 text-muted-foreground animate-spin" />
                        <p className="text-sm text-muted-foreground">Subiendo imagen...</p>
                    </>
                ) : (
                    <>
                        <div className="p-4 bg-muted rounded-full">
                            <Upload className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-medium">
                                {isDragActive ? "Suelta la imagen aquí" : "Haz clic o arrastra una imagen"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                PNG, JPG o WebP hasta 5MB
                            </p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
