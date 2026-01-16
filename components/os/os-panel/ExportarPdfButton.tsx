'use client';

import { useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { generateOsPanelPDF } from '@/lib/exports/os-panel-pdf';
import type { OsPanelFormValues } from '@/types/os-panel';

interface ExportarPdfButtonProps {
  osId: string;
  numeroExpediente: string;
  osData: any; // Complete OS data
  panelData: OsPanelFormValues;
  logoUrl?: string;
}

export function ExportarPdfButton({
  osId,
  numeroExpediente,
  osData,
  panelData,
  logoUrl,
}: ExportarPdfButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExport = async () => {
    try {
      setIsExporting(true);

      // Generate PDF
      const pdf = await generateOsPanelPDF(osData, panelData, {
        logoUrl,
        includeImages: true,
      });

      // Download
      const filename = `OS-${numeroExpediente}-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(filename);

      toast({
        title: '✓ PDF descargado',
        description: `${filename}`,
        variant: 'default',
      });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      const message =
        error instanceof Error ? error.message : 'Error al generar PDF';

      toast({
        title: '⚠️ Error al exportar',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={isExporting}
      size="sm"
      variant="outline"
      className="gap-2"
    >
      {isExporting ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Generando...
        </>
      ) : (
        <>
          <FileText className="h-4 w-4" />
          Compartir PDF
        </>
      )}
    </Button>
  );
}
