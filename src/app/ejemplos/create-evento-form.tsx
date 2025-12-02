/**
 * Example: Form with Toast Notifications
 * Demonstrates how to use mutation hooks with automatic toast feedback
 */

'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useCreateEventoWithToast } from '@/hooks/use-toast-mutations';
import type { ServiceOrder } from '@/types';

export default function CreateEventoFormExample() {
    const createEvento = useCreateEventoWithToast();
    const [formData, setFormData] = useState({
        serviceNumber: '',
        client: '',
        startDate: '',
        endDate: '',
        asistentes: 0,
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        await createEvento.mutateAsync({
            ...formData,
            status: 'Borrador' as const,
        });

        // Reset form on success
        if (createEvento.isSuccess) {
            setFormData({
                serviceNumber: '',
                client: '',
                startDate: '',
                endDate: '',
                asistentes: 0,
            });
        }
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-2xl">
            <Card>
                <CardHeader>
                    <CardTitle>Crear Nuevo Evento</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <Label htmlFor="serviceNumber">Número de Expediente</Label>
                            <Input
                                id="serviceNumber"
                                value={formData.serviceNumber}
                                onChange={(e) => setFormData({ ...formData, serviceNumber: e.target.value })}
                                required
                            />
                        </div>

                        <div>
                            <Label htmlFor="client">Cliente</Label>
                            <Input
                                id="client"
                                value={formData.client}
                                onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="startDate">Fecha Inicio</Label>
                                <Input
                                    id="startDate"
                                    type="date"
                                    value={formData.startDate}
                                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                    required
                                />
                            </div>

                            <div>
                                <Label htmlFor="endDate">Fecha Fin</Label>
                                <Input
                                    id="endDate"
                                    type="date"
                                    value={formData.endDate}
                                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="asistentes">Asistentes</Label>
                            <Input
                                id="asistentes"
                                type="number"
                                value={formData.asistentes}
                                onChange={(e) => setFormData({ ...formData, asistentes: parseInt(e.target.value) })}
                                required
                                min="0"
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full"
                            disabled={createEvento.isPending}
                        >
                            {createEvento.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creando...
                                </>
                            ) : (
                                'Crear Evento'
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
