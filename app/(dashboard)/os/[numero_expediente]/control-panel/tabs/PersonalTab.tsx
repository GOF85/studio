'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight } from 'lucide-react';

interface PersonalTabProps {
  osId: string;
}

const DEPARTMENT_ICONS: Record<string, string> = {
  cocina: '👨‍🍳',
  sala: '🍽️',
  logistica: '📦',
};

const DEPARTMENT_LABELS: Record<string, string> = {
  cocina: 'Cocina',
  sala: 'Sala',
  logistica: 'Logística',
};

export function PersonalTab({ osId }: PersonalTabProps) {
  // Fetch personal mice asignaciones
  const { data: personalMice, isLoading: miceLoading } = useQuery({
    queryKey: ['personalMiceAsignaciones', osId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('personal_mice_asignaciones')
        .select('*, personal:personal_id(*)')
        .eq('os_id', osId);

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch personal externo
  const { data: personalExterno, isLoading: externoLoading } = useQuery({
    queryKey: ['personalExternoEventos', osId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('personal_externo_eventos')
        .select('*')
        .eq('os_id', osId);

      if (error) throw error;
      return data || [];
    },
  });

  // Count by departamento
  const miceByDept = {
    cocina: personalMice?.filter((p) => p.departamento === 'CPR').length || 0,
    sala: personalMice?.filter((p) => p.departamento === 'Sala').length || 0,
    logistica:
      personalMice?.filter((p) => p.departamento === 'Almacén').length || 0,
  };

  const externoByDept = {
    cocina: personalExterno?.filter((p) => p.departamento === 'CPR').length || 0,
    sala:
      personalExterno?.filter((p) => p.departamento === 'Sala').length || 0,
    logistica:
      personalExterno?.filter((p) => p.departamento === 'Almacén').length || 0,
  };

  if (miceLoading || externoLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="text-muted-foreground">Cargando personal...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Resumen cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(DEPARTMENT_LABELS).map(([key, label]) => (
          <Card key={key}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">
                {DEPARTMENT_ICONS[key]} {label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-emerald-600">
                    {miceByDept[key as keyof typeof miceByDept]}
                  </span>
                  <span className="text-xs text-muted-foreground">MICE</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-amber-600">
                    {externoByDept[key as keyof typeof externoByDept]}
                  </span>
                  <span className="text-xs text-muted-foreground">EXT</span>
                </div>
                <div className="border-t pt-2 mt-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-semibold">
                      {(miceByDept[key as keyof typeof miceByDept] || 0) +
                        (externoByDept[key as keyof typeof externoByDept] || 0)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      total
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Botón de acceso completo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">
            Gestión Completa de Personal
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Para gestionar el personal de forma completa, accede a:
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" size="sm" asChild className="flex-1">
              <a href={`/os/${osId}/personal-mice`}>
                👨‍💼 Personal MICE <ArrowRight className="h-4 w-4 ml-2" />
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild className="flex-1">
              <a href={`/os/${osId}/personal-externo`}>
                👔 Personal Externo <ArrowRight className="h-4 w-4 ml-2" />
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Detalles */}
      {personalMice && personalMice.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">
              Personal MICE ({personalMice.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {personalMice.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/30"
                >
                  <span className="text-sm">
                    {p.personal?.nombreCompleto || '—'}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {p.departamento}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {personalExterno && personalExterno.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">
              Personal Externo ({personalExterno.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {personalExterno.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/30"
                >
                  <span className="text-sm">{p.nombre || '—'}</span>
                  <Badge variant="secondary" className="text-xs">
                    {p.departamento}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {(!personalMice || personalMice.length === 0) &&
        (!personalExterno || personalExterno.length === 0) && (
          <Card>
            <CardContent className="flex items-center justify-center h-32">
              <div className="text-center text-muted-foreground">
                <p className="text-sm">Sin personal asignado</p>
                <p className="text-xs mt-1">
                  Accede a Personal MICE o Personal Externo para agregar
                </p>
              </div>
            </CardContent>
          </Card>
        )}
    </div>
  );
}
