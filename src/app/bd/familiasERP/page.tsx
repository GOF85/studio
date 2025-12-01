
'use client';

import { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { MoreHorizontal, Pencil, Trash2, PlusCircle, Menu, FileUp, FileDown, Layers } from 'lucide-react';
import type { FamiliaERP } from '@/types';
import { Button } from '@/components/ui/button';
import { downloadCSVTemplate } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import Papa from 'papaparse';
import { useDataStore } from '@/hooks/use-data-store';
import { supabase } from '@/lib/supabase';

const CSV_HEADERS = ["id", "familiaCategoria", "Familia", "Categoria"];

function FamiliasERPPageContent() {
  const { data, loadAllData } = useDataStore();
  const familiasERP = data.familiasERP;

  const [searchTerm, setSearchTerm] = useState('');
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImportAlertOpen, setIsImportAlertOpen] = useState(false);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const filteredItems = useMemo(() => {
    return familiasERP.filter(item => {
      const term = searchTerm.toLowerCase();
      const searchMatch =
        (item.familiaCategoria || '').toLowerCase().includes(term) ||
        (item.Familia || '').toLowerCase().includes(term) ||
        (item.Categoria || '').toLowerCase().includes(term);
      return searchMatch;
    });
  }, [familiasERP, searchTerm]);

  const handleDelete = async () => {
    if (!itemToDelete) return;

    const { error } = await supabase
      .from('familias')
      .delete()
      .eq('id', itemToDelete);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar el registro.' });
      return;
    }

    await loadAllData();
    toast({ title: 'Registro eliminado' });
    setItemToDelete(null);
  };

  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>, delimiter: ',' | ';') => {
    const file = event.target.files?.[0];
    if (!file) {
      setIsImportAlertOpen(false);
      return;
    }

    Papa.parse<any>(file, {
      header: true,
      skipEmptyLines: true,
      delimiter,
      complete: async (results) => {
        if (!results.meta.fields || !CSV_HEADERS.every(field => results.meta.fields?.includes(field))) {
          toast({ variant: 'destructive', title: 'Error de formato', description: `El CSV debe contener las columnas correctas.` });
          return;
        }

        const importedData = results.data.map((item: any) => ({
          id: item.id || crypto.randomUUID(),
          codigo: item.familiaCategoria,
          nombre: item.Familia,
          categoria_padre: item.Categoria,
        }));

        const { error } = await supabase
          .from('familias')
          .upsert(importedData, { onConflict: 'id' });

        if (error) {
          toast({ variant: 'destructive', title: 'Error de importación', description: error.message });
          setIsImportAlertOpen(false);
          return;
        }

        await loadAllData();
        toast({ title: 'Importación completada', description: `Se han importado ${importedData.length} registros.` });
        setIsImportAlertOpen(false);
      },
      error: (error) => {
        toast({ variant: 'destructive', title: 'Error de importación', description: error.message });
        setIsImportAlertOpen(false);
      }
    });
    if (event.target) event.target.value = '';
  };

  const handleExportCSV = () => {
    if (familiasERP.length === 0) {
      toast({ variant: 'destructive', title: 'No hay datos', description: 'No hay registros para exportar.' });
      return;
    }

    const csv = Papa.unparse(familiasERP, { columns: CSV_HEADERS });
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `familias_erp.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: 'Exportación completada' });
  };


export default function FamiliasERPPage() {
  return (
    <Suspense>
      <FamiliasERPPageContent />
    </Suspense>
  )
}
