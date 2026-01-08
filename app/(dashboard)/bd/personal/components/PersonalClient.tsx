'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, Search, Download, Upload, UserPlus, 
  ChevronLeft, ChevronRight, Filter, Users, Archive, CheckCircle2
} from 'lucide-react';
import { usePersonalPaginated } from '@/hooks/use-data-queries';
import { Personal, DEPARTAMENTOS_PERSONAL } from '@/types';
import Papa from 'papaparse';
import { useDebounce } from '@/hooks/use-debounce';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

interface PersonalClientProps {
  initialData: {
    items: Personal[];
    totalCount: number;
    totalPages: number;
  };
}

export function PersonalClient({ initialData }: PersonalClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [activeTab, setActiveTab] = useState<'activos' | 'archivados'>('activos');

  const debouncedSearch = useDebounce(searchTerm, 300);

  const { data, isLoading } = usePersonalPaginated(
    page,
    20,
    debouncedSearch,
    departmentFilter,
    { 
      isActive: activeTab === 'activos',
      initialData: page === 1 && debouncedSearch === '' && departmentFilter === 'all' && activeTab === 'activos' ? initialData : undefined
    }
  );

  const items = data?.items || [];
  const totalPages = data?.totalPages || 1;
  const totalCount = data?.totalCount || 0;

  // CSV Export
  const handleExport = () => {
    const exportData = items.map(item => ({
      id: item.id,
      matricula: item.matricula || '',
      nombre: item.nombre,
      apellido1: item.apellido1,
      apellido2: item.apellido2 || '',
      email: item.email || '',
      telefono: item.telefono || '',
      departamento: item.departamento,
      categoria: item.categoria,
      precioHora: item.precioHora,
      activo: item.activo
    }));

    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', `personal_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CSV Import
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        console.log('Parsed CSV:', results.data);
        toast({ title: 'Importación iniciada', description: `Se han detectado ${results.data.length} registros.` });
      }
    });
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header section - Static */}
      <div className="bg-card border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-2xl text-primary shadow-sm border border-primary/20">
                <Users className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight text-foreground">Personal Interno</h1>
                <p className="text-base text-muted-foreground font-medium">Gestión centralizada de empleados y colaboradores</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" className="rounded-xl border-border/40 hover:bg-muted/50" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" /> Exportar
              </Button>
              <div className="relative">
                <input type="file" accept=".csv" onChange={handleImport} className="absolute inset-0 opacity-0 cursor-pointer" />
                <Button variant="outline" className="rounded-xl border-border/40 hover:bg-muted/50">
                  <Upload className="mr-2 h-4 w-4" /> Importar
                </Button>
              </div>
              <Button className="rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl transition-all" onClick={() => router.push('/bd/personal/nuevo')}>
                <UserPlus className="mr-2 h-4 w-4" /> Nuevo Empleado
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs & Search - Sticky */}
      <div className="sticky top-[88px] md:top-[96px] z-20 w-full border-b bg-background/95 backdrop-blur-sm shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <Tabs 
              value={activeTab} 
              onValueChange={(v) => { setActiveTab(v as any); setPage(1); }} 
              className="w-full sm:w-auto"
            >
              <TabsList className="grid w-full grid-cols-2 sm:w-[320px] rounded-xl bg-muted/50 p-1">
                <TabsTrigger value="activos" className="rounded-lg flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <CheckCircle2 className="h-4 w-4" /> Activos
                </TabsTrigger>
                <TabsTrigger value="archivados" className="rounded-lg flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <Archive className="h-4 w-4" /> Archivados
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar por DNI, nombre o matrícula..." 
                  className="pl-9 h-10 rounded-xl border-border/40 bg-muted/30 focus:bg-background transition-all"
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                />
              </div>
              <Select value={departmentFilter} onValueChange={(v) => { setDepartmentFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[160px] h-10 rounded-xl border-border/40 bg-muted/30 focus:bg-background">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Departamento" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">Todos</SelectItem>
                  {DEPARTAMENTOS_PERSONAL.map(dep => (
                    <SelectItem key={dep} value={dep}>{dep}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="flex-1 overflow-auto bg-muted/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="w-[60px]"></TableHead>
                  <TableHead>DNI</TableHead>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Categoría / Puesto</TableHead>
                  <TableHead className="text-right">Precio/Hora</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><div className="h-9 w-9 bg-muted animate-pulse rounded-full" /></TableCell>
                      <TableCell><div className="h-4 w-24 bg-muted animate-pulse rounded mb-1" /><div className="h-3 w-16 bg-muted animate-pulse rounded" /></TableCell>
                      <TableCell><div className="h-4 w-40 bg-muted animate-pulse rounded mb-1" /><div className="h-3 w-32 bg-muted animate-pulse rounded" /></TableCell>
                      <TableCell><div className="h-5 w-20 bg-muted animate-pulse rounded-full" /></TableCell>
                      <TableCell><div className="h-4 w-24 bg-muted animate-pulse rounded" /></TableCell>
                      <TableCell className="text-right"><div className="h-4 w-16 bg-muted animate-pulse rounded ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-[400px] text-center">
                      <div className="flex flex-col items-center justify-center max-w-[300px] mx-auto transition-all animate-in fade-in zoom-in slide-in-from-bottom-4 duration-500">
                        <div className="p-6 bg-muted/30 rounded-full mb-4 ring-8 ring-muted/10">
                          <Users className="h-12 w-12 text-muted-foreground/40" />
                        </div>
                        <h3 className="text-xl font-bold text-foreground mb-2">No se encontraron empleados</h3>
                        <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
                          {searchTerm || departmentFilter !== 'all' 
                            ? "Prueba a ajustar los filtros o el término de búsqueda para encontrar lo que buscas."
                            : activeTab === 'activos' 
                              ? "Todavía no hay empleados activos en la base de datos."
                              : "No hay empleados archivados en este momento."}
                        </p>
                        {(searchTerm || departmentFilter !== 'all') && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => { setSearchTerm(''); setDepartmentFilter('all'); }}
                            className="rounded-xl"
                          >
                            Limpiar Filtros
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => (
                    <TableRow 
                      key={item.id} 
                      className="group cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => router.push(`/bd/personal/${item.id}`)}
                    >
                      <TableCell>
                        <Avatar className="h-9 w-9 border border-background shadow-sm">
                          <AvatarImage src={item.fotoUrl || undefined} alt={item.nombre} className="object-cover" />
                          <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">
                            {item.iniciales || item.nombre?.[0] || '?'}
                          </AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-xs font-mono font-medium text-muted-foreground">{item.id}</span>
                          {item.matricula && (
                            <Badge variant="outline" className="w-fit text-[10px] mt-0.5 border-amber-200 bg-amber-50 text-amber-700">
                              {item.matricula}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
                            {item.nombre} {item.apellido1} {item.apellido2}
                          </span>
                          <span className="text-xs text-muted-foreground">{item.email || 'Sin email'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-normal bg-blue-50 text-blue-700 border-blue-100 italic">
                          {item.departamento}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {item.categoria}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        {item.precioHora?.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) || '0,00 €'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Footer */}
          {!isLoading && totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Página <span className="font-medium text-foreground">{page}</span> de <span className="font-medium text-foreground">{totalPages}</span> — {totalCount} registros
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                  Siguiente <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
