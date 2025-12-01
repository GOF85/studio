
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { PlusCircle, Search, Calendar as CalendarIcon, Users, Trash2, MessageSquare } from 'lucide-react';
import { format, isSameDay, isBefore, startOfToday } from 'date-fns';
import { es } from 'date-fns/locale';

import type { SolicitudPersonalCPR, Proveedor, CategoriaPersonal } from '@/types';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { calculateHours, formatNumber, formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const statusVariant: { [key in SolicitudPersonalCPR['estado']]: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' } = {
  'Solicitado': 'secondary',
  'Aprobada': 'outline',
  'Rechazada': 'destructive',
  'Asignada': 'default',
  'Confirmado': 'success',
  'Solicitada Cancelacion': 'destructive',
  'Cerrado': 'secondary'
};

const partidaColorClasses: Record<string, string> = {
    FRIO: 'bg-green-100 text-green-800 border-green-200',
    CALIENTE: 'bg-red-100 text-red-800 border-red-200',
    PASTELERIA: 'bg-blue-100 text-blue-800 border-blue-200',
    EXPEDICION: 'bg-yellow-100 text-yellow-800 border-yellow-200'
};

function CommentModal({ comment, trigger }: { comment: string, trigger: React.ReactNode }) {
    return (
        <Dialog>
            <DialogTrigger asChild onClick={(e) => e.stopPropagation()}>
                 {trigger}
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Comentario de la Asignación</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                    <p className="text-sm text-muted-foreground bg-secondary p-4 rounded-md">{comment}</p>
                </div>
            </DialogContent>
        </Dialog>
    )
}

export default function SolicitudesCprPage() {
  const [solicitudes, setSolicitudes] = useState<SolicitudPersonalCPR[]>([]);
  const [proveedoresMap, setProveedoresMap] = useState<Map<string, string>>(new Map());
  const [tiposPersonal, setTiposPersonal] = useState<CategoriaPersonal[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const [solicitudToManage, setSolicitudToManage] = useState<SolicitudPersonalCPR | null>(null);
  const [managementAction, setManagementAction] = useState<'delete' | 'cancel' | null>(null);
  const [isRejectionModalOpen, setIsRejectionModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const storedData = JSON.parse(localStorage.getItem('solicitudesPersonalCPR') || '[]') as SolicitudPersonalCPR[];
    setSolicitudes(storedData);
    
    const storedProveedores = JSON.parse(localStorage.getItem('proveedores') || '[]') as Proveedor[];
    setProveedoresMap(new Map(storedProveedores.map(p => [p.id, p.nombreComercial])));
    
    const storedTiposPersonal = JSON.parse(localStorage.getItem('tiposPersonal') || '[]') as CategoriaPersonal[];
    setTiposPersonal(storedTiposPersonal);

  }, []);

  const filteredSolicitudes = useMemo(() => {
    return solicitudes.filter(s => {
      const searchMatch = searchTerm === '' ||
        s.categoria.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.motivo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.partida.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.solicitadoPor.toLowerCase().includes(searchTerm.toLowerCase());

      const dateMatch = !dateFilter || isSameDay(new Date(s.fechaServicio), dateFilter);

      return searchMatch && dateMatch;
    }).sort((a,b) => new Date(b.fechaSolicitud).getTime() - new Date(a.fechaSolicitud).getTime());
  }, [solicitudes, searchTerm, dateFilter]);

  const handleOpenDialog = (solicitud: SolicitudPersonalCPR) => {
    setSolicitudToManage(solicitud);
  };
  
  const handleAction = (action: 'aprobar' | 'rechazar' | 'asignar' | 'delete' | 'cancel', data?: any) => {
    if(!solicitudToManage) return;

    let allRequests = JSON.parse(localStorage.getItem('solicitudesPersonalCPR') || '[]') as SolicitudPersonalCPR[];
    const index = allRequests.findIndex(r => r.id === solicitudToManage.id);

    if(index === -1) return;

    switch(action) {
        case 'aprobar':
            allRequests[index].estado = 'Aprobada';
            toast({ title: 'Solicitud Aprobada' });
            break;
        case 'rechazar':
            allRequests[index].estado = 'Rechazada';
            allRequests[index].observacionesRRHH = data.reason;
            toast({ title: 'Solicitud Rechazada' });
            break;
        case 'asignar':
            const tipoPersonal = tiposPersonal.find(tp => tp.id === data.proveedorId);
            const coste = calculateHours(solicitudToManage.horaInicio, solicitudToManage.horaFin) * (tipoPersonal?.precioHora || 0);
            allRequests[index].estado = 'Asignada';
            allRequests[index].proveedorId = data.proveedorId;
            allRequests[index].costeImputado = coste;
            toast({ title: 'Proveedor Asignado' });
            break;
        case 'delete':
            allRequests = allRequests.filter(r => r.id !== solicitudToManage.id);
            toast({ title: 'Solicitud Eliminada' });
            break;
        case 'cancel':
            allRequests[index].estado = 'Solicitada Cancelacion';
            toast({ title: 'Cancelación Solicitada' });
            break;
    }

    localStorage.setItem('solicitudesPersonalCPR', JSON.stringify(allRequests));
    setSolicitudes(allRequests);
    setSolicitudToManage(null);
    setManagementAction(null);
    setIsRejectionModalOpen(false);
    setRejectionReason('');
  };

