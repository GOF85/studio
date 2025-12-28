'use client';

import { useState, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Papa from 'papaparse';
import { 
  PlusCircle, Search, Trash2, Eye, Archive, 
  ChevronRight, Download, Upload, Menu, AlertCircle, RefreshCw
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Progress } from '@/components/ui/progress';
import { AllergenBadge } from '@/components/icons/allergen-badge';
import { formatCurrency, cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

import type { Receta, CategoriaReceta, Alergeno } from '@/types';

interface RecetasListProps {
  recetas: Receta[];
  categorias: CategoriaReceta[];
  onDeleteBulk: (ids: string[]) => Promise<void>;
  onRecalculateAll: () => Promise<void>;
  isRecalculating: boolean;
  recalcProgress: number;
  recalcStatus: string;
}

const AllergenList = ({ alergenos }: { alergenos: Alergeno[] | null | undefined }) => {
  const safeAlergenos = Array.isArray(alergenos) ? alergenos : [];
  if (safeAlergenos.length === 0) return <span className="text-[10px] text-muted-foreground italic">Sin alérgenos</span>;
  const visible = safeAlergenos.slice(0, 4);
  const remaining = safeAlergenos.length - 4;
  return (
    <div className="flex flex-wrap gap-1 items-center">
      {visible.map(a => <div key={a} className="transform scale-90 origin-left"><AllergenBadge allergen={a} /></div>)}
      {remaining > 0 && <span className="text-[10px] text-muted-foreground font-medium">+{remaining}</span>}
    </div>
  );
};

export function RecetasList({
  recetas,
  categorias,
  onDeleteBulk,
  onRecalculateAll,
  isRecalculating,
  recalcProgress,
  recalcStatus
}: RecetasListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const filterParam = (searchParams?.get('filter') as 'active' | 'archived' | 'all') || 'active';
  const [activeTab, setActiveTab] = useState<'active' | 'archived' | 'all'>(filterParam);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  const filtered = useMemo(() => {
    return recetas.filter(r => {
      const matchSearch = r.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (r.numeroReceta || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchCategory = categoryFilter === 'all' || r.categoria === categoryFilter;
      const matchTab = activeTab === 'all' ? true : 
                      activeTab === 'archived' ? r.isArchived : !r.isArchived;
      return matchSearch && matchCategory && matchTab;
    });
  }, [recetas, searchTerm, categoryFilter, activeTab]);

  const isAllSelected = filtered.length > 0 && filtered.every(r => selectedIds.includes(r.id));
  const isIndeterminate = selectedIds.length > 0 && !isAllSelected;

  const handleSelectAll = () => {
    if (isAllSelected) setSelectedIds([]);
    else setSelectedIds(filtered.map(r => r.id));
  };

  const handleSelectOne = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleExportCSV = () => {
    const data = filtered.map(r => ({
      ID: r.id,
      Numero: r.numeroReceta,
      Nombre: r.nombre,
      Categoria: categorias.find(c => c.id === r.categoria)?.nombre || r.categoria,
      CosteMP: r.costeMateriaPrima,
      PVP: r.precioVenta,
      Archivada: r.isArchived ? 'SI' : 'NO'
    }));
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `recetas_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleTabChange = (val: string) => {
    setActiveTab(val as any);
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set('filter', val);
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Recetas</h1>
          <p className="text-muted-foreground text-sm">Gestión del catálogo de recetas y escandallos.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={onRecalculateAll} disabled={isRecalculating}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isRecalculating && "animate-spin")} />
            Recalcular Costes
          </Button>
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button onClick={() => router.push('/book/recetas/nueva')} className="bg-green-600 hover:bg-green-700 text-white">
            <PlusCircle className="h-4 w-4 mr-2" />
            Nueva Receta
          </Button>
        </div>
      </div>

      {isRecalculating && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between text-sm font-medium text-blue-700">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                {recalcStatus}
              </div>
              <span>{recalcProgress}%</span>
            </div>
            <Progress value={recalcProgress} className="h-2 bg-blue-100" />
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between bg-card p-4 rounded-lg border shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por nombre o código..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {categorias.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full md:w-auto">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="active">Activas</TabsTrigger>
            <TabsTrigger value="archived">Archivadas</TabsTrigger>
            <TabsTrigger value="all">Todas</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {selectedIds.length > 0 && (
        <div className="bg-muted/50 p-3 rounded-lg border flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <span className="text-sm font-medium">{selectedIds.length} recetas seleccionadas</span>
          <div className="flex gap-2">
            <Button variant="destructive" size="sm" onClick={() => setShowBulkDeleteConfirm(true)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-10">
                <input 
                  type="checkbox" 
                  className="rounded border-gray-300" 
                  checked={isAllSelected}
                  ref={el => { if (el) el.indeterminate = isIndeterminate; }}
                  onChange={handleSelectAll}
                />
              </TableHead>
              <TableHead className="w-24">Código</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Alérgenos</TableHead>
              <TableHead className="text-right">Coste MP</TableHead>
              <TableHead className="text-right">PVP</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length > 0 ? (
              filtered.map((r) => (
                <TableRow key={r.id} className="group hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => router.push(`/book/recetas/${r.id}`)}>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300" 
                      checked={selectedIds.includes(r.id)}
                      onChange={() => handleSelectOne(r.id)}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{r.numeroReceta}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-bold text-sm group-hover:text-primary transition-colors">{r.nombre}</span>
                      {r.isArchived && <Badge variant="secondary" className="w-fit text-[10px] h-4 mt-1">Archivada</Badge>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-normal">
                      {categorias.find(c => c.id === r.categoria)?.nombre || r.categoria}
                    </Badge>
                  </TableCell>
                  <TableCell><AllergenList alergenos={r.alergenos as any} /></TableCell>
                  <TableCell className="text-right font-mono text-sm">{formatCurrency(r.costeMateriaPrima)}</TableCell>
                  <TableCell className="text-right font-mono font-bold text-green-700">{formatCurrency(r.precioVenta)}</TableCell>
                  <TableCell>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-all group-hover:translate-x-1" />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-muted-foreground italic">
                  No se encontraron recetas con los filtros aplicados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás completamente seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente {selectedIds.length} recetas. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              await onDeleteBulk(selectedIds);
              setSelectedIds([]);
              setShowBulkDeleteConfirm(false);
            }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
