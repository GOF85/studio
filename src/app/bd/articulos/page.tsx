
'use client';

import { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import type { ArticuloCatering } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import Papa from 'papaparse';
import { ARTICULO_CATERING_CATEGORIAS } from '@/types';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Pencil, Trash2, PlusCircle, Menu, FileUp, FileDown } from 'lucide-react';
import { downloadCSVTemplate } from '@/lib/utils';

import { useDataStore } from '@/hooks/use-data-store';
import { supabase } from '@/lib/supabase';

const CSV_HEADERS = ["id", "nombre", "categoria", "precioVenta", "precioAlquiler", "producidoPorPartner", "partnerId", "recetaId"];

function ArticulosPageContent() {
  const { data, loadAllData } = useDataStore();
  const items = data.articulos || [];
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isPartnerFilter, setIsPartnerFilter] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImportAlertOpen, setIsImportAlertOpen] = useState(false);

  useEffect(() => {
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const term = searchTerm.toLowerCase();
      const searchMatch =
        (item.nombre || '').toLowerCase().includes(term) ||
        (item.id || '').toLowerCase().includes(term);
      const categoryMatch = categoryFilter === 'all' || item.categoria === categoryFilter;
      const partnerMatch = !isPartnerFilter || item.producidoPorPartner;
      return searchMatch && categoryMatch && partnerMatch;
    });
  }, [items, searchTerm, categoryFilter, isPartnerFilter]);

  const handleDelete = async () => {
    if (!itemToDelete) return;

    const { error } = await supabase
      .from('articulos')
      .delete()
      .eq('id', itemToDelete);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar el artículo.' });
      return;
    }

    await loadAllData();
    toast({ title: 'Artículo eliminado' });
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
          nombre: item.nombre,
          categoria: item.categoria,
          precio_venta: parseFloat(item.precioVenta) || 0,
          precio_alquiler: parseFloat(item.precioAlquiler) || 0,
          producido_por_partner: item.producidoPorPartner === 'true',
          partner_id: item.partnerId || null,
          receta_id: item.recetaId || null
        }));

        const { error } = await supabase
          .from('articulos')
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
    if (event.target) {
      event.target.value = '';
    }
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
    link.setAttribute('download', `articulos.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: 'Exportación completada' });
  };


export default function ArticulosPage() {
  return (
    <Suspense>
      <ArticulosPageContent />
    </Suspense>
  )
}
