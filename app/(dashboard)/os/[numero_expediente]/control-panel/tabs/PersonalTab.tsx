'use client';

import { useQuery } from '@tanstack/react-query';
import { resolveOsId, supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ChefHat, UtensilsCrossed, Package } from 'lucide-react';

interface PersonalTabProps {
  osId: string;
}

interface DepartmentPersonel {
  mice: Array<{ id: string; nombreCompleto: string }>;
  externo: Array<{ id: string; nombre: string }>;
}

// Department configuration with gradient styles
const DEPARTMENTS = {
  cocina: {
    label: 'Cocina',
    icon: ChefHat,
    deptCode: 'CPR',
    gradient: 'from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900',
    borderColor: 'border-orange-300 dark:border-orange-700',
    badgeColor: 'bg-orange-100 dark:bg-orange-900 text-orange-900 dark:text-orange-100',
  },
  sala: {
    label: 'Sala',
    icon: UtensilsCrossed,
    deptCode: 'Sala',
    gradient: 'from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900',
    borderColor: 'border-purple-300 dark:border-purple-700',
    badgeColor: 'bg-purple-100 dark:bg-purple-900 text-purple-900 dark:text-purple-100',
  },
  logistica: {
    label: 'Logística',
    icon: Package,
    deptCode: 'Almacén',
    gradient: 'from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900',
    borderColor: 'border-blue-300 dark:border-blue-700',
    badgeColor: 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100',
  },
};

// Skeleton loading component
function DepartmentCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-24" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="space-y-1">
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-3/4" />
        </div>
      </CardContent>
    </Card>
  );
}

// Empty state component
function EmptyState() {
  return (
    <div className="col-span-full">
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">
              Sin personal asignado
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Agrega personal MICE o externo para este evento
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function PersonalTab({ osId }: PersonalTabProps) {
  // Fetch personal mice asignaciones
  const { data: personalMice, isLoading: miceLoading } = useQuery({
    queryKey: ['personalMiceAsignaciones', osId],
    queryFn: async () => {
      const targetId = await resolveOsId(osId);
      if (!targetId) return [];
      const { data, error } = await supabase
        .from('personal_mice_asignaciones')
        .select('*, personal:personal_id(*)')
        .eq('evento_id', targetId);

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch personal externo
  const { data: personalExterno, isLoading: externoLoading } = useQuery({
    queryKey: ['personalExternoEventos', osId],
    queryFn: async () => {
      const targetId = await resolveOsId(osId);
      if (!targetId) return [];
      const { data, error } = await supabase
        .from('personal_externo_eventos')
        .select('*')
        .eq('evento_id', targetId);

      if (error) throw error;
      return data || [];
    },
  });

  const isLoading = miceLoading || externoLoading;

  // Group personnel by department
  const getDepartmentPersonal = (
    deptCode: string
  ): DepartmentPersonel => ({
    mice:
      personalMice
        ?.filter((p) => p.departamento === deptCode)
        .map((p) => ({
          id: p.id,
          nombreCompleto: p.personal?.nombreCompleto || '—',
        })) || [],
    externo:
      personalExterno
        ?.filter((p) => p.departamento === deptCode)
        .map((p) => ({
          id: p.id,
          nombre: p.nombre || '—',
        })) || [],
  });

  const totalPersonal =
    (personalMice?.length || 0) + (personalExterno?.length || 0);
  const hasPersonal = totalPersonal > 0;

  return (
    <div className="space-y-4">
      {/* Grid of department cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {isLoading ? (
          <>
            <DepartmentCardSkeleton />
            <DepartmentCardSkeleton />
            <DepartmentCardSkeleton />
          </>
        ) : !hasPersonal ? (
          <EmptyState />
        ) : (
          Object.entries(DEPARTMENTS).map(([key, dept]) => {
            const Icon = dept.icon;
            const deptPersonal = getDepartmentPersonal(dept.deptCode);
            const totalDeptPersonal = deptPersonal.mice.length + deptPersonal.externo.length;

            return (
              <Card
                key={key}
                className={`border-2 ${dept.borderColor} bg-gradient-to-br ${dept.gradient}`}
              >
                {/* Header */}
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <CardTitle className="text-sm font-semibold">
                      {dept.label}
                    </CardTitle>
                  </div>
                </CardHeader>

                {/* Content */}
                <CardContent className="space-y-3">
                  {/* Counts */}
                  <div className="space-y-2">
                    {deptPersonal.mice.length > 0 && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">MICE:</span>
                        <Badge variant="secondary" className="text-xs">
                          {deptPersonal.mice.length}
                        </Badge>
                      </div>
                    )}
                    {deptPersonal.externo.length > 0 && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Externo:</span>
                        <Badge variant="outline" className="text-xs">
                          {deptPersonal.externo.length}
                        </Badge>
                      </div>
                    )}
                    {totalDeptPersonal === 0 && (
                      <div className="text-xs text-muted-foreground italic">
                        Sin asignaciones
                      </div>
                    )}
                  </div>

                  {/* Personnel list */}
                  {totalDeptPersonal > 0 && (
                    <div className="space-y-2 pt-2 border-t">
                      {/* MICE personnel */}
                      {deptPersonal.mice.length > 0 && (
                        <div className="space-y-1">
                          {deptPersonal.mice.slice(0, 2).map((p) => (
                            <div
                              key={p.id}
                              className={`text-xs px-2 py-1 rounded inline-block ${dept.badgeColor} mr-1 mb-1`}
                            >
                              {p.nombreCompleto.split(' ')[0]}
                            </div>
                          ))}
                          {deptPersonal.mice.length > 2 && (
                            <div className="text-xs text-muted-foreground italic">
                              +{deptPersonal.mice.length - 2} más
                            </div>
                          )}
                        </div>
                      )}

                      {/* External personnel */}
                      {deptPersonal.externo.length > 0 && (
                        <div className="space-y-1">
                          {deptPersonal.externo.slice(0, 2).map((p) => (
                            <div
                              key={p.id}
                              className={`text-xs px-2 py-1 rounded inline-block opacity-70 ${dept.badgeColor} mr-1 mb-1`}
                            >
                              {p.nombre.split(' ')[0]}
                            </div>
                          ))}
                          {deptPersonal.externo.length > 2 && (
                            <div className="text-xs text-muted-foreground italic">
                              +{deptPersonal.externo.length - 2} más
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
