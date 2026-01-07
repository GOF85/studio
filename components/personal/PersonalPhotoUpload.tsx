'use client';

import { useState, useRef } from 'react';
import { Camera, Upload, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useUploadPersonalPhoto } from '@/hooks/use-data-queries';
import { useToast } from '@/hooks/use-toast';

interface PersonalPhotoUploadProps {
  personalId: string;
  currentFotoUrl?: string;
  onUploadSuccess?: (url: string) => void;
}

export function PersonalPhotoUpload({ personalId, currentFotoUrl, onUploadSuccess }: PersonalPhotoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const uploadPhoto = useUploadPersonalPhoto();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!personalId) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Debes guardar el empleado antes de subir una foto.'
      });
      return;
    }

    setIsUploading(true);
    try {
      const publicUrl = await uploadPhoto.mutateAsync({ personalId, file });
      toast({ title: 'Foto actualizada' });
      if (onUploadSuccess) onUploadSuccess(publicUrl);
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      toast({
        variant: 'destructive',
        title: 'Error al subir foto',
        description: error.message
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative group">
        <Avatar className="h-24 w-24 border-2 border-primary/20 shadow-md">
          <AvatarImage src={currentFotoUrl} className="object-cover" />
          <AvatarFallback className="bg-primary/5 text-primary text-xl font-bold">
            <Camera className="h-8 w-8 opacity-20" />
          </AvatarFallback>
        </Avatar>
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-full">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="absolute bottom-0 right-0 p-1.5 bg-primary text-primary-foreground rounded-full shadow-lg hover:scale-110 transition-transform disabled:opacity-50"
          disabled={isUploading || !personalId}
          title="Subir foto"
        >
          <Upload className="h-4 w-4" />
        </button>
      </div>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
        Foto del Empleado (WebP)
      </p>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*"
      />
    </div>
  );
}
