
'use client';

import { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { MoreHorizontal, Pencil, Trash2, PlusCircle, Menu, FileUp, FileDown, Check, X } from 'lucide-react';
import type { CategoriaReceta } from '@/types';
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
import { supabase } from '@/lib/supabase';

const CSV_HEADERS = ["id", "nombre", "snack"];

function CategoriasRecetasPageContent() {
  const [items, setItems] = useState<CategoriaReceta[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImportAlertOpen, setIsImportAlertOpen] = useState(false);

  useEffect(() => {
    fetchCategorias();
  }, []);

  const fetchCategorias = async () => {
    const { data, error } = await supabase
      .from('categorias_recetas')
      .select('*')
      .order('nombre', { ascending: true });

    if (error) {
      console.error('Error fetching categorias:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar las categorías.' });
    } else {
      setItems(data || []);
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter(item =>
      item.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [items, searchTerm]);

  const handleDelete = async () => {
    if (!itemToDelete) return;

    const { error } = await supabase
      .from('categorias_recetas')
      .delete()
      .eq('id', itemToDelete);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar la categoría.' });
    } else {
      setItems(items.filter(i => i.id !== itemToDelete));
      toast({ title: 'Categoría eliminada' });
    }
    setItemToDelete(null);
  };

  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>, delimiter: ',' | ';') => {
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
          toast({ variant: 'destructive', title: 'Error de formato', description: `El CSV debe contener las columnas: ${CSV_HEADERS.join(', ')}` });
          setIsImportAlertOpen(false);
          return;
        }

        const importedData = results.data.map((item: any) => ({
          id: item.id || crypto.randomUUID(),
          nombre: item.nombre,
          snack: item.snack === 'true' || item.snack === true
        }));

        const { error } = await supabase.from('categorias_recetas').upsert(importedData);

        if (error) {
          toast({ variant: 'destructive', title: 'Error de importación', description: error.message });
        } else {
          toast({ title: 'Importación completada', description: `Se han importado ${importedData.length} registros.` });
          fetchCategorias();
        }
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
    if (items.length === 0) {
      toast({ variant: 'destructive', title: 'No hay datos', description: 'No hay registros para exportar.' });
      return;
    }

    const csv = Papa.unparse(items, { columns: CSV_HEADERS });
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `categorias_recetas.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: 'Exportación completada' });
  };


export default function CategoriasRecetasPage() {
  return (
    <Suspense>
      <CategoriasRecetasPageContent />
    </Suspense>
  )
}
