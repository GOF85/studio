'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Users, Utensils, Package, Info, Calendar, MapPin, Star, AlertTriangle
} from 'lucide-react';

export default function SharedOsPage() {
  const params = useParams();
  const token = params?.token as string;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchShared() {
      try {
        const res = await fetch(`/api/os/shared/${token}`);
        if (!res.ok) throw new Error('Enlace no válido o expirado');
        const json = await res.json();
        setData(json.data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchShared();
  }, [token]);

  if (loading) return <div className="flex h-screen items-center justify-center p-4">Cargando información...</div>;
  if (error) return <div className="flex h-screen items-center justify-center p-4 text-destructive">{error}</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Simple Header */}
        <div className="bg-white rounded-xl shadow-sm border p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {data.is_vip && <Star className="h-5 w-5 text-amber-500 fill-amber-500" />}
              <h1 className="text-2xl font-black">OS {data.numero_expediente}</h1>
            </div>
            <p className="text-slate-500 font-medium">{data.client}</p>
          </div>
          <div className="flex flex-col md:items-end gap-1">
            <Badge variant="outline" className="w-fit">{data.space}</Badge>
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <Calendar className="h-3 w-3" />
              {new Date(data.start_date).toLocaleDateString('es-ES')}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Section: Personal Key */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500" /> Responsables
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
               <div>
                 <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Metre</p>
                 <p className="font-semibold text-slate-800">{data.respMetre || 'No asignado'}</p>
               </div>
               <div>
                 <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Jefe Cocina</p>
                 <p className="font-semibold text-slate-800">{data.respCocinaPase || 'No asignado'}</p>
               </div>
            </CardContent>
          </Card>

          {/* Section: Logística */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Package className="h-4 w-4 text-emerald-500" /> Logística
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span>Almacén:</span>
                <Badge variant={data.edo_almacen === 'Ok' ? 'default' : 'outline'}>{data.edo_almacen}</Badge>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span>Estado:</span>
                <span className="font-medium">{data.estado_logistica}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 flex items-start gap-3">
           <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
           <p className="text-xs text-amber-800 font-medium">
             Este es un enlace de gestión temporal. Los cambios realizados por coordinadores se verán reflejados aquí automáticamente al recargar.
           </p>
        </div>
      </div>
    </div>
  );
}
