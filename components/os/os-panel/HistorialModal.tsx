'use client';

import React, { useMemo, useState } from 'react';
import { X, Filter } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  formatChangeLogEntry,
  groupChangesByDate,
  getTabIcon,
  formatFieldName,
  formatFieldValue,
} from '@/hooks/useOsPanelHistory';
import type { OsPanelChangeLog } from '@/types/os-panel';

interface HistorialModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  cambios: OsPanelChangeLog[];
  isLoading?: boolean;
}

export function HistorialModal({
  isOpen,
  onOpenChange,
  cambios,
  isLoading = false,
}: HistorialModalProps) {
  // DEBUG LOG
  React.useEffect(() => {
    console.debug('[HistorialModal] Modal state changed:', {
      isOpen,
      cambiosCount: cambios.length,
      isLoading,
      timestamp: new Date().toISOString(),
    });
  }, [isOpen, cambios.length, isLoading]);

  const [selectedTab, setSelectedTab] = useState<string>('Todos');
  const [selectedUser, setSelectedUser] = useState<string>('Todos');

  // Filter by tab and user
  const filteredCambios = useMemo(() => {
    return cambios.filter((log) => {
      const tabMatch = selectedTab === 'Todos' || log.pestaña === selectedTab;
      const userMatch =
        selectedUser === 'Todos' ||
        log.usuario_email?.split('@')[0] === selectedUser ||
        log.usuario_id === selectedUser;
      return tabMatch && userMatch;
    });
  }, [cambios, selectedTab, selectedUser]);

  // Group by date
  const groupedByDate = useMemo(() => {
    return groupChangesByDate(filteredCambios);
  }, [filteredCambios]);

  // Get unique tabs and users for filters
  const tabs = useMemo(() => {
    const uniqueTabs = new Set(cambios.map((log) => log.pestaña));
    return Array.from(uniqueTabs).sort();
  }, [cambios]);

  const users = useMemo(() => {
    const uniqueUsers = new Set(
      cambios
        .map((log) => log.usuario_email?.split('@')[0] || log.usuario_id)
        .filter(Boolean)
    );
    return Array.from(uniqueUsers).sort();
  }, [cambios]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>🕐 Historial de Cambios</span>
            <Badge variant="outline">{filteredCambios.length}</Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <div className="flex-1 min-w-40">
            <Select value={selectedTab} onValueChange={setSelectedTab}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Filtrar por pestaña" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Todas las pestañas</SelectItem>
                {tabs.map((tab) => (
                  <SelectItem key={tab} value={tab}>
                    {getTabIcon(tab)} {tab}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {users.length > 0 && (
            <div className="flex-1 min-w-40">
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Filtrar por usuario" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">Todos los usuarios</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user} value={user || 'sistema'}>
                      {user || 'Sistema'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Changes List */}
        <ScrollArea className="flex-1 h-96 pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              Cargando historial...
            </div>
          ) : filteredCambios.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
              Sin cambios registrados
            </div>
          ) : (
            <div className="space-y-4">
              {Array.from(groupedByDate.entries()).map(([date, logs]) => (
                <div key={date}>
                  <div className="font-semibold text-sm text-muted-foreground sticky top-0 bg-background/80 backdrop-blur py-1 mb-2 border-b">
                    {date}
                  </div>

                  <div className="space-y-2">
                    {logs.map((log) => (
                      <div
                        key={log.id}
                        className="p-3 rounded-lg bg-muted/30 border border-muted hover:bg-muted/50 transition-colors"
                      >
                        {/* Header */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold">
                              {log.usuario_email?.split('@')[0] || 'Sistema'}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {getTabIcon(log.pestaña)} {log.pestaña}
                            </Badge>
                            {log.auto_guardado && (
                              <Badge variant="secondary" className="text-xs">
                                Auto
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(log.timestamp).toLocaleTimeString('es-ES', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        {/* Changes */}
                        {log.cambios.length > 0 ? (
                          <div className="space-y-1 text-xs">
                            {log.cambios.map((cambio: any, idx: number) => (
                              <div
                                key={idx}
                                className="pl-3 border-l border-muted-foreground/30 text-muted-foreground"
                              >
                                <span className="font-mono">
                                  {formatFieldName(cambio.campo)}:
                                </span>
                                <br />
                                <span className="text-red-600">
                                  - {formatFieldValue(cambio.valor_anterior)}
                                </span>
                                <br />
                                <span className="text-emerald-600">
                                  + {formatFieldValue(cambio.valor_nuevo)}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground italic">
                            Sin cambios específicos registrados
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
