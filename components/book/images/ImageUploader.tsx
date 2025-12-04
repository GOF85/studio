'use client';

import { useCallback, useState, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Loader2, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import imageCompression from 'browser-image-compression';
import { Button } from '@/components/ui/button';
import { CameraModal } from './CameraModal';

interface ImageUploaderProps {
    bucket?: string;
    folder: string;
    onUploadComplete: (url: string, filename: string) => void;
    className?: string;
    label?: string;
    variant?: 'default' | 'compact';
    enableCamera?: boolean;
}

export function ImageUploader({
    bucket = 'recetas',
    folder,
    onUploadComplete,
    className,
    label = "imagen",
    variant = 'default',
    enableCamera = false
}: ImageUploaderProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const processFile = async (file: File): Promise<File> => {
        let processedFile = file;

        // Handle HEIC/HEIF
        if (file.type === 'image/heic' || file.type === 'image/heif' || file.name.toLowerCase().endsWith('.heic')) {
            try {
                // Dynamic import to avoid SSR issues
                const heic2any = (await import('heic2any')).default;

                const convertedBlob = await heic2any({
                    blob: file,
                    toType: 'image/jpeg',
                    quality: 0.8
                });

                const blobToUse = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
                processedFile = new File([blobToUse], file.name.replace(/\.heic$/i, '.jpg'), {
                    type: 'image/jpeg'
                });
            } catch (error) {
                console.error('Error converting HEIC:', error);
                throw new Error('Error al procesar imagen HEIC');
            }
        }

        // Compress image
        try {
            const options = {
                maxSizeMB: 1,
                maxWidthOrHeight: 1920,
                useWebWorker: true,
                fileType: 'image/jpeg'
            };
            processedFile = await imageCompression(processedFile, options);
        } catch (error) {
            console.error('Error compressing image:', error);
            // Continue with original file if compression fails, or throw? 
            // Let's log and continue, maybe it's already small enough or not supported
        }

        return processedFile;
    };

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        if (acceptedFiles.length === 0) return;

        setIsUploading(true);
        const originalFile = acceptedFiles[0];

        try {
            const file = await processFile(originalFile);

            // Validar tamaño (max 5MB after compression)
            if (file.size > 5 * 1024 * 1024) {
                throw new Error('La imagen no puede superar los 5MB');
            }

            const fileExt = file.name.split('.').pop();
            // Sanitize filename
            const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
            const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from(bucket)
                .upload(fileName, file);

            if (uploadError) {
                throw uploadError;
            }

            const { data: { publicUrl } } = supabase.storage
                .from(bucket)
                .getPublicUrl(fileName);

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
    }, [bucket, folder, onUploadComplete, toast]);

    const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
        onDrop,
        accept: {
            'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.heic', '.heif']
        },
        maxFiles: 1,
        disabled: isUploading,
        noClick: true,
        noKeyboard: true
    });

    const handleInputCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            onDrop([files[0]]);
        }
    };

    const handleModalCapture = (file: File) => {
        onDrop([file]);
    };

    if (variant === 'compact') {
        return (
            <>
                <div
                    {...getRootProps()}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (!isUploading) open();
                    }}
                    className={cn(
                        "relative aspect-video border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-muted/30 hover:bg-muted/50",
                        isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50",
                        isUploading && "opacity-50 cursor-not-allowed",
                        className
                    )}
                >
                    <input {...getInputProps()} />

                    {/* Hidden camera input */}
                    <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleInputCapture}
                    />

                    {isUploading ? (
                        <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
                    ) : (
                        <div className="flex flex-col items-center gap-2 p-2">
                            <Upload className="w-8 h-8 text-muted-foreground/50" />
                            <span className="text-xs text-muted-foreground font-medium">
                                {isDragActive ? "Soltar" : "Añadir foto"}
                            </span>
                            {enableCamera && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 absolute top-1 right-1 z-10 hover:bg-background/80"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsCameraOpen(true);
                                    }}
                                >
                                    <Camera className="w-4 h-4" />
                                </Button>
                            )}
                        </div>
                    )}
                </div>
                {enableCamera && (
                    <CameraModal
                        isOpen={isCameraOpen}
                        onClose={() => setIsCameraOpen(false)}
                        onCapture={handleModalCapture}
                    />
                )}
            </>
        );
    }

    return (
        <>
            <div
                {...getRootProps()}
                onClick={(e) => {
                    e.stopPropagation();
                    if (!isUploading) {
                        open();
                    }
                }}
                className={cn(
                    "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                    isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50",
                    isUploading && "opacity-50 cursor-not-allowed",
                    className
                )}
            >
                <input {...getInputProps()} />

                {/* Hidden camera input */}
                <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleInputCapture}
                />

                <div className="flex flex-col items-center gap-2 pointer-events-none">
                    {isUploading ? (
                        <>
                            <Loader2 className="w-10 h-10 text-muted-foreground animate-spin" />
                            <p className="text-sm text-muted-foreground">Subiendo imagen...</p>
                        </>
                    ) : (
                        <>
                            <div className="p-4 bg-muted rounded-full relative group">
                                <Upload className="w-6 h-6 text-muted-foreground" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-medium">
                                    {isDragActive ? "Suelta la imagen aquí" : `Haz clic o arrastra una ${label}`}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    PNG, JPG, WebP o HEIC hasta 5MB
                                </p>
                            </div>
                        </>
                    )}
                </div>

                {enableCamera && !isUploading && (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-4 pointer-events-auto"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsCameraOpen(true);
                        }}
                    >
                        <Camera className="w-4 h-4 mr-2" />
                        Usar cámara
                    </Button>
                )}
            </div>
            {enableCamera && (
                <CameraModal
                    isOpen={isCameraOpen}
                    onClose={() => setIsCameraOpen(false)}
                    onCapture={handleModalCapture}
                />
            )}
        </>
    );
}
