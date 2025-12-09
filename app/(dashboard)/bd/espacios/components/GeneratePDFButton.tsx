'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { EspacioV2 } from '@/types/espacios';

// Lazy load PDF renderer
const FichaCiegaPDF = dynamic(() => import('./pdf/FichaCiegaPDF').then(mod => ({ default: mod.FichaCiegaPDF })), { ssr: false });

interface GeneratePDFButtonProps {
    espacio: EspacioV2;
    variant?: 'default' | 'outline' | 'ghost';
    size?: 'default' | 'sm' | 'lg' | 'icon';
    className?: string;
}

export function GeneratePDFButton({
    espacio,
    variant = 'default',
    size = 'default',
    className
}: GeneratePDFButtonProps) {
    const [isGenerating, setIsGenerating] = useState(false);
    const { toast } = useToast();

    const handleGeneratePDF = async () => {
        setIsGenerating(true);
        try {
            // Lazy load PDF renderer
            const { pdf } = await import('@react-pdf/renderer');
            const { FichaCiegaPDF: PDFComponent } = await import('./pdf/FichaCiegaPDF');
            // Generate PDF blob
            const blob = await pdf(<PDFComponent espacio={espacio} />).toBlob();

            // Create download link
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Ficha_${espacio.nombre.replace(/\s+/g, '_')}.pdf`;

            // Trigger download
            document.body.appendChild(link);
            link.click();

            // Cleanup
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            toast({
                title: 'PDF Generado',
                description: `Ficha de "${espacio.nombre}" descargada correctamente`,
            });
        } catch (error: any) {
            console.error('Error generating PDF:', error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'No se pudo generar el PDF. Inténtalo de nuevo.',
            });
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <Button
            variant={variant}
            size={size}
            onClick={handleGeneratePDF}
            disabled={isGenerating}
            className={className}
        >
            {isGenerating ? (
                <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generando...
                </>
            ) : (
                <>
                    <FileDown className="w-4 h-4 mr-2" />
                    Descargar Ficha PDF
                </>
            )}
        </Button>
    );
}
