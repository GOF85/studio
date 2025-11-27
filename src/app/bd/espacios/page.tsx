
'use client';

import { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MoreHorizontal, Pencil, Trash2, PlusCircle, Menu, FileUp, FileDown, Building } from 'lucide-react';
import type { Espacio, RelacionComercial } from '@/types';
import { Button } from '@/components/ui/button';
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
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Papa from 'papaparse';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { downloadCSVTemplate } from '@/lib/utils';


const CSV_HEADERS = ["id", "nombreEspacio", "ciudad", "provincia", "aforoMaximoCocktail", "aforoMaximoBanquete", "relacionComercial"];


function EspaciosPageContent() {
  const [items, setItems] = useState<Espacio[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let storedData = localStorage.getItem('espacios');
    setItems(storedData ? JSON.parse(storedData) : []);
    setIsMounted(true);
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter(item =>
      (item.identificacion.nombreEspacio || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.identificacion.ciudad || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [items, searchTerm]);

  const handleDelete = () => {
    if (!itemToDelete) return;
    const updatedData = items.filter(i => i.id !== itemToDelete);
    localStorage.setItem('espacios', JSON.stringify(updatedData));
    setItems(updatedData);
    toast({ title: 'Espacio eliminado' });
    setItemToDelete(null);
  };

  const handleExportCSV = () => {
    if (items.length === 0) {
      toast({ variant: 'destructive', title: 'No hay datos', description: 'No hay espacios para exportar.' });
      return;
    }

    const dataToExport = items.map(item => ({
      id: item.id,
      nombreEspacio: item.identificacion.nombreEspacio,
      ciudad: item.identificacion.ciudad,
      provincia: item.identificacion.provincia,
      aforoMaximoCocktail: item.capacidades.aforoMaximoCocktail,
      aforoMaximoBanquete: item.capacidades.aforoMaximoBanquete,
      relacionComercial: item.evaluacionMICE.relacionComercial,
    }));

    const csv = Papa.unparse(dataToExport);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'espacios.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: 'Exportación completada' });
  };

  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // This is a simplified import logic. For a real app, you'd need a more robust parser
    // that reconstructs the full nested 'Espacio' object.
    toast({
      variant: 'destructive',
      title: 'Función no implementada',
      description: 'La importación de espacios es compleja y debe implementarse con cuidado.',
    });

    if (event.target) {
      event.target.value = '';
    }
  };


  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Espacios..." />;
  }

  const statusVariant: { [key in RelacionComercial]: 'default' | 'secondary' | 'outline' | 'success' } = {
    'Exclusividad': 'success',
    'Homologado Preferente': 'default',
    'Homologado': 'secondary',
    'Puntual': 'outline',
    'Sin Relación': 'outline',
  };


  return (
    <>
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <Input
          placeholder="Buscar por nombre o ciudad..."
          className="flex-grow max-w-lg"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <div className="flex-grow flex justify-end gap-2">
          <Button onClick={() => router.push('/bd/espacios/nuevo')}>
            <PlusCircle className="mr-2" />
            Nuevo Espacio
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon"><Menu /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => fileInputRef.current?.click()}>
                <FileUp size={16} className="mr-2" />Importar CSV
                <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleImportCSV} />
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => downloadCSVTemplate(CSV_HEADERS, 'plantilla_espacios.csv')}>
                <FileDown size={16} className="mr-2" />Descargar Plantilla
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportCSV}>
                <FileDown size={16} className="mr-2" />Exportar CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre del Espacio</TableHead>
              <TableHead>Ciudad</TableHead>
              <TableHead>Aforo Cocktail</TableHead>
              <TableHead>Aforo Banquete</TableHead>
              <TableHead>Relación Comercial</TableHead>
              <TableHead className="text-right w-24">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.length > 0 ? (
              filteredItems.map(item => (
                <TableRow key={item.id} className="cursor-pointer" onClick={() => router.push(`/bd/espacios/${item.id}`)}>
                  <TableCell className="font-medium">{item.identificacion.nombreEspacio}</TableCell>
                  <TableCell>{item.identificacion.ciudad}</TableCell>
                  <TableCell>{item.capacidades.aforoMaximoCocktail}</TableCell>
                  <TableCell>{item.capacidades.aforoMaximoBanquete}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[item.evaluacionMICE.relacionComercial] || 'secondary'}>
                      {item.evaluacionMICE.relacionComercial}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                          <span className="sr-only">Abrir menú</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(`/bd/espacios/${item.id}`)}>
                          <Pencil className="mr-2 h-4 w-4" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); setItemToDelete(item.id) }}>
                          <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No se encontraron espacios.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el espacio.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function EspaciosPage() {
  return (
    <Suspense fallback={<LoadingSkeleton title="Cargando Espacios..." />}>
      <EspaciosPageContent />
    </Suspense>
  )
}
