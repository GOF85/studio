'use client';

import { useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2, PlusCircle, Menu, FileUp, FileDown, UserCog, Search } from 'lucide-react';
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
import Papa from 'papaparse';
import { formatCurrency, downloadCSVTemplate } from '@/lib/utils';
import { useTiposPersonal, useUpsertTipoPersonal, useDeleteTipoPersonal } from '@/hooks/use-data-queries';
import { TipoPersonal } from '@/services/tipos-personal-service';

const CSV_HEADERS = ["id", "proveedorId", "nombreProveedor", "categoria", "precioHora"];

interface TiposPersonalClientProps {
  initialData: TipoPersonal[];
}

export function TiposPersonalClient({ initialData }: TiposPersonalClientProps) {
  const { data: items = initialData } = useTiposPersonal(initialData);
  const upsertMutation = useUpsertTipoPersonal();
  const deleteMutation = useDeleteTipoPersonal();

  const [searchTerm, setSearchTerm] = useState('');
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>, delimiter: ',' | ';') => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse<any>(file, {
      header: true,
      skipEmptyLines: true,
      delimiter,
      complete: async (results) => {
        const headers = results.meta.fields || [];
        if (!CSV_HEADERS.every(field => headers.includes(field))) {
          toast({ variant: 'destructive', title: 'Error de formato', description: `El CSV debe contener las columnas correctas.` });
          return;
        }

        const importedData = results.data.map((item: any) => ({
          id: item.id,
          proveedorId: item.proveedorId,
          categoria: item.categoria,
          precioHora: parseFloat(item.precioHora) || 0,
        }));

        try {
          for (const item of importedData) {
            await upsertMutation.mutateAsync(item);
          }
          toast({ title: 'Importación completada', description: `Se han importado ${importedData.length} registros.` });
        } catch (error: any) {
          toast({ variant: 'destructive', title: 'Error de importación', description: error.message });
        }
      },
      error: (error) => toast({ variant: 'destructive', title: 'Error de importación', description: error.message }),
    });
    if (event.target) event.target.value = '';
  };

  const handleExportCSV = () => {
    if (items.length === 0) {
      toast({ variant: 'destructive', title: 'No hay datos' });
      return;
    }
    const exportItems = items.map((i: TipoPersonal) => ({
      id: i.id,
      proveedorId: i.proveedorId,
      nombreProveedor: i.nombreProveedor || '',
      categoria: i.categoria,
      precioHora: i.precioHora,
    }));
    const csv = Papa.unparse(exportItems, { columns: CSV_HEADERS });
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'catalogo_personal_externo.csv';
    link.click();
    toast({ title: 'Exportación completada' });
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      await deleteMutation.mutateAsync(itemToDelete);
      setItemToDelete(null);
    } catch (error) {}
  };

  const filteredItems = useMemo(() => {
    return items.filter((item: TipoPersonal) => {
      const term = searchTerm.toLowerCase();
      return (
        (item.nombreProveedor || '').toLowerCase().includes(term) ||
        item.categoria.toLowerCase().includes(term)
      );
    });
  }, [items, searchTerm]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Premium Header Section */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-card/40 backdrop-blur-md border border-border/40 p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-24 -mr-24 w-96 h-96 bg-primary/10 rounded-full blur-[100px]" />
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="p-4 rounded-[2rem] bg-primary/10 text-primary shadow-inner">
              <UserCog className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tighter text-foreground">Catálogo de Personal Externo</h1>
              <p className="text-sm font-medium text-muted-foreground/70">Gestión de categorías y precios por hora de proveedores ETT</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Buscar por proveedor o categoría..."
                className="pl-11 pr-4 h-12 w-64 rounded-2xl bg-background/40 border-border/40 focus:border-primary/50 focus:ring-primary/20 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <Button 
              onClick={() => router.push('/bd/tipos-personal/nuevo')}
              className="rounded-2xl font-black px-6 h-12 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-95"
            >
              <PlusCircle className="mr-2 h-5 w-5" />
              Nueva Categoría
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-12 w-12 rounded-2xl border-border/40 bg-background/40 backdrop-blur-md hover:bg-primary/10 hover:text-primary transition-all">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-2xl border-border/40 shadow-2xl p-2">
                <DropdownMenuItem onSelect={() => fileInputRef.current?.click()} className="rounded-xl gap-2 py-3">
                  <FileUp size={16} className="text-primary" />
                  <span className="font-bold">Importar CSV</span>
                  <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={(e) => handleImportCSV(e, ';')} />
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => downloadCSVTemplate(CSV_HEADERS, 'plantilla_tipos_personal.csv')} className="rounded-xl gap-2 py-3">
                  <FileDown size={16} className="text-primary" />
                  <span className="font-bold">Descargar Plantilla</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportCSV} className="rounded-xl gap-2 py-3">
                  <FileDown size={16} className="text-primary" />
                  <span className="font-bold">Exportar CSV</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Vista Escritorio: Tabla Premium */}
      <div className="rounded-[2rem] border border-border/40 bg-card/40 backdrop-blur-md overflow-hidden shadow-2xl">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow className="hover:bg-transparent border-border/40 h-16">
              <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 pl-8">Proveedor (ETT)</TableHead>
              <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50">Categoría Profesional</TableHead>
              <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50">Precio/Hora</TableHead>
              <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 text-right pr-8">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.length > 0 ? (
              filteredItems.map((item: TipoPersonal) => (
                <TableRow
                  key={item.id}
                  className="group transition-all duration-300 border-border/40 h-20 hover:bg-primary/[0.03] cursor-pointer"
                  onClick={() => router.push(`/bd/tipos-personal/${item.id}`)}
                >
                  <TableCell className="pl-8">
                    <span className="font-black text-sm tracking-tight group-hover:text-primary transition-colors">{item.nombreProveedor}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-primary bg-primary/10 w-fit px-3 py-1 rounded-full">
                      <span className="text-[10px] font-black uppercase tracking-wider">{item.categoria}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-black text-sm text-foreground">{formatCurrency(item.precioHora)}</span>
                  </TableCell>
                  <TableCell className="text-right pr-8">
                    <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary transition-all"
                        onClick={() => router.push(`/bd/tipos-personal/${item.id}`)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-all"
                        onClick={() => setItemToDelete(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-64 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground/30">
                    <UserCog className="h-16 w-16 mb-4 opacity-10" />
                    <p className="text-lg font-black uppercase tracking-widest">No se encontraron registros</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent className="rounded-[2rem] border-border/40 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black tracking-tighter">¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription className="font-medium">
              Esta acción no se puede deshacer. Se eliminará permanentemente la categoría de personal.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel onClick={() => setItemToDelete(null)} className="rounded-xl h-12 font-bold">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl h-12 font-black bg-destructive hover:bg-destructive/90 text-white px-8"
              onClick={handleDelete}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
