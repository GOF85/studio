
'use client';

import { useState, useRef } from 'react';
import { Camera, Loader2, X, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useUploadPersonalPhoto } from '@/hooks/use-data-queries';

interface PersonalPhotoUploadProps {
  value: string;
  onChange: (url: string) => void;
  dni: string;
}

export function PersonalPhotoUpload({ value, onChange, dni }: PersonalPhotoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const uploadPhoto = useUploadPersonalPhoto();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!dni) {
      toast({ 
        variant: 'destructive', 
        title: 'Error', 
        description: 'Debe introducir un DNI antes de subir la foto para identificar el archivo.' 
      });
      return;
    }

    try {
      setIsUploading(true);
      
      const publicUrl = await uploadPhoto.mutateAsync({ personalId: dni, file });
      onChange(publicUrl);
      
      toast({ description: 'Foto actualizada y optimizada correctamente.' });
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo subir la imagen: ' + error.message });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removePhoto = () => {
    onChange('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative group">
        <Avatar className="h-32 w-32 border-2 border-muted shadow-sm">
          <AvatarImage src={value} className="object-cover" key={value} />
          <AvatarFallback className="bg-muted">
            <User className="h-12 w-12 text-muted-foreground/30" />
          </AvatarFallback>
        </Avatar>
        
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-full backdrop-blur-[1px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {value && !isUploading && (
          <button
            onClick={removePhoto}
            className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-1 shadow-md hover:scale-110 active:scale-95 transition-all"
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading || !dni}
          className="rounded-xl shadow-sm h-9"
        >
          <Camera className="h-4 w-4 mr-2" />
          {value ? 'Cambiar Foto' : 'Subir Foto'}
        </Button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />
      </div>
    </div>
  );
}
