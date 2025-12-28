
'use client';

import { useState, useMemo, useRef, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { MoreHorizontal, Pencil, Trash2, PlusCircle, Menu, FileUp, FileDown, Search, Users, Plus } from 'lucide-react';
import type { Personal } from '@/types';
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
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import Papa from 'papaparse';
import { downloadCSVTemplate, cn } from '@/lib/utils';
import { usePersonal, useUpsertPersonal, useDeletePersonal, useDeletePersonalBulk } from '@/hooks/use-data-queries';

const CSV_HEADERS = ["id", "nombre", "apellido1", "apellido2", "departamento", "categoria", "telefono", "email", "precioHora"];


function PersonalPageContent() {
  const { data: items = [], isLoading } = usePersonal();
  const upsertPersonal = useUpsertPersonal();
  const deletePersonal = useDeletePersonal();
  const bulkDeleteMutation = useDeletePersonalBulk();

  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImportAlertOpen, setIsImportAlertOpen] = useState(false);

  const departments = useMemo(() => {
    const allDepartments = new Set(items.map(item => item.departamento));
    return ['all', ...Array.from(allDepartments).sort()];
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const searchMatch =
        (item.nombreCompleto || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.categoria || '').toLowerCase().includes(searchTerm.toLowerCase());
      const departmentMatch = departmentFilter === 'all' || item.departamento === departmentFilter;
      return searchMatch && departmentMatch;
    });
  }, [items, searchTerm, departmentFilter]);

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map(item => item.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkDelete = async () => {
    try {
      await bulkDeleteMutation.mutateAsync(Array.from(selectedIds));
      toast({ title: 'Empleados eliminados', description: `Se han eliminado ${selectedIds.size} empleados.` });
      setSelectedIds(new Set());
      setIsBulkDeleteConfirmOpen(false);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;

    try {
      await deletePersonal.mutateAsync(itemToDelete);
      toast({ title: 'Empleado eliminado' });
    } catch (error: any) {
      console.error('Error deleting personal:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar el empleado.' });
    } finally {
      setItemToDelete(null);
    }
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
          toast({ variant: 'destructive', title: 'Error de formato', description: `El CSV debe contener las columnas correctas.` });
          return;
        }

        try {
          setIsSyncing(true);
          let successCount = 0;
          let errorCount = 0;

          for (const item of results.data) {
            try {
              const nombre = item.nombre || '';
              const apellido1 = item.apellido1 || '';
              const apellido2 = item.apellido2 || '';
              const nombreCompleto = `${nombre} ${apellido1} ${apellido2}`.trim();
              const nombreCompacto = `${nombre} ${apellido1}`.trim();
              const iniciales = `${nombre[0] || ''}${apellido1[0] || ''}`.toUpperCase();

              const personalData: Partial<Personal> = {
                id: item.id || undefined,
                nombre,
                apellido1,
                apellido2,
                nombreCompleto,
                nombreCompacto,
                iniciales,
                departamento: item.departamento,
                categoria: item.categoria,
                telefono: item.telefono,
                email: item.email,
                precioHora: parseFloat(item.precioHora) || 0,
                activo: true
              };

              await upsertPersonal.mutateAsync(personalData);
              successCount++;
            } catch (err) {
              console.error('Error importing row:', err, item);
              errorCount++;
            }
          }

          toast({ title: 'Importación finalizada', description: `Se importaron ${successCount} empleados. Errores: ${errorCount}` });
        } catch (error: any) {
          console.error('Error importing CSV:', error);
          toast({ variant: 'destructive', title: 'Error de importación', description: error.message });
        } finally {
          setIsSyncing(false);
          setIsImportAlertOpen(false);
        }
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

    const dataToExport = items.map(item => ({
      id: item.id,
      nombre: item.nombre,
      apellido1: item.apellido1,
      apellido2: item.apellido2,
      departamento: item.departamento,
      categoria: item.categoria,
      telefono: item.telefono,
      email: item.email,
      precioHora: item.precioHora
    }));

    const csv = Papa.unparse(dataToExport, { columns: CSV_HEADERS });
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `personal.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: 'Exportación completada' });
  };

  if (isLoading) {
    return <LoadingSkeleton title="Cargando Personal..." />;
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Premium Header Section */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-card/40 backdrop-blur-md border border-border/40 p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-24 -mr-24 w-96 h-96 bg-primary/10 rounded-full blur-[100px]" />
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="p-4 rounded-[2rem] bg-primary/10 text-primary shadow-inner">
              <Users className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tighter text-foreground">Personal</h1>
              <p className="text-sm font-medium text-muted-foreground/70">Gestión de equipo, departamentos y categorías profesionales</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button 
              onClick={() => router.push('/bd/personal/nuevo')}
              className="rounded-2xl font-black px-6 h-12 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-95"
            >
              <PlusCircle className="mr-2 h-5 w-5" />
              Nuevo Empleado
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="rounded-2xl h-12 w-12 border-border/40 bg-background/40 hover:bg-primary/5 transition-all">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-2xl border-border/40 p-2 shadow-2xl">
                <DropdownMenuItem onSelect={() => setIsImportAlertOpen(true)} className="rounded-xl p-3 font-bold">
                  <FileUp size={18} className="mr-3 text-primary" />Importar CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => downloadCSVTemplate(CSV_HEADERS, 'plantilla_personal.csv')} className="rounded-xl p-3 font-bold">
                  <FileDown size={18} className="mr-3 text-primary" />Descargar Plantilla
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportCSV} className="rounded-xl p-3 font-bold">
                  <FileDown size={18} className="mr-3 text-primary" />Exportar CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="mt-8 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Buscar por nombre, apellido o categoría..."
              className="pl-12 h-12 bg-background/40 border-border/40 rounded-2xl focus:ring-primary/20 transition-all font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-full md:w-[240px] h-12 bg-background/40 border-border/40 rounded-2xl font-bold">
                <SelectValue placeholder="Departamento" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-border/40 shadow-2xl">
                {departments.map(d => (
                  <SelectItem key={d} value={d} className="font-medium">
                    {d === 'all' ? 'Todos los Departamentos' : d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Vista Escritorio: Tabla Premium */}
      <div className="rounded-[2rem] border border-border/40 bg-card/40 backdrop-blur-md overflow-hidden shadow-2xl">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow className="hover:bg-transparent border-border/40 h-16">
              <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 pl-8">Nombre Completo</TableHead>
              <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50">Departamento</TableHead>
              <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50">Categoría</TableHead>
              <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50">Contacto</TableHead>
              <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 text-right">Precio/h</TableHead>
              <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 text-right pr-8">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.length > 0 ? (
              filteredItems.map(item => (
                <TableRow
                  key={item.id}
                  className="group cursor-pointer transition-all duration-300 border-border/40 h-20 hover:bg-primary/[0.03]"
                  onClick={() => router.push(`/bd/personal/${item.id}`)}
                >
                  <TableCell className="pl-8">
                    <div className="flex flex-col">
                      <span className="font-black text-sm tracking-tight group-hover:text-primary transition-colors">{item.nombreCompleto}</span>
                      <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest mt-0.5">ID: {item.id.slice(0, 8)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="rounded-xl bg-background/50 border-border/40 font-black text-[9px] uppercase tracking-widest px-3 py-1">
                      {item.departamento}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-bold text-xs text-muted-foreground/60">
                    {item.categoria}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-muted-foreground/70">{item.email || '-'}</span>
                      <span className="text-[10px] font-mono text-muted-foreground/40">{item.telefono || '-'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-black text-sm tracking-tight">
                    {item.precioHora?.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) || '-'}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-10 w-10 rounded-xl hover:bg-primary/10 hover:text-primary transition-all" onClick={(e) => e.stopPropagation()}>
                          <MoreHorizontal className="h-5 w-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-2xl border-border/40 p-2 shadow-2xl">
                        <DropdownMenuItem onClick={() => router.push(`/bd/personal/${item.id}`)} className="rounded-xl p-3 font-bold">
                          <Pencil className="mr-3 h-4 w-4 text-primary" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem className="rounded-xl p-3 font-bold text-destructive focus:text-destructive focus:bg-destructive/10" onClick={(e) => { e.stopPropagation(); setItemToDelete(item.id) }}>
                          <Trash2 className="mr-3 h-4 w-4" /> Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-64 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground/30">
                    <Users className="h-16 w-16 mb-4 opacity-10" />
                    <p className="text-lg font-black uppercase tracking-widest">No se encontraron empleados</p>
                    <p className="text-sm font-medium mt-1">Prueba a cambiar los filtros de búsqueda</p>
                  </div>
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
              Esta acción no se puede deshacer. Se eliminará permanentemente el registro del empleado.
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

      <AlertDialog open={isImportAlertOpen} onOpenChange={setIsImportAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Importar Archivo CSV</AlertDialogTitle>
            <AlertDialogDescription>
              Selecciona el tipo de delimitador que utiliza tu archivo CSV. El fichero debe tener cabeceras que coincidan con el modelo de datos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="!justify-center gap-4">
            <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={(e) => handleImportCSV(e, fileInputRef.current?.getAttribute('data-delimiter') as ',' | ';')} />
            <Button onClick={() => { fileInputRef.current?.setAttribute('data-delimiter', ','); fileInputRef.current?.click(); }}>Delimitado por Comas (,)</Button>
            <Button onClick={() => { fileInputRef.current?.setAttribute('data-delimiter', ';'); fileInputRef.current?.click(); }}>Delimitado por Punto y Coma (;)</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function PersonalPage() {
  return (
    <Suspense fallback={<LoadingSkeleton title="Cargando Personal..." />}>
      <PersonalPageContent />
    </Suspense>
  )
}
