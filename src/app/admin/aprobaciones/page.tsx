'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"

export default function AdminAprobacionesPage() {
    const { profile, isAdmin } = useAuth();
    const { toast } = useToast();
    const [requests, setRequests] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [tempPassword, setTempPassword] = useState('');
    const [selectedRequest, setSelectedRequest] = useState<any>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    useEffect(() => {
        if (isAdmin) {
            fetchRequests();
        }
    }, [isAdmin]);

    const fetchRequests = async () => {
        setIsLoading(true);
        try {
            // Fetch pending requests from personal and proveedores
            const { data: personalData } = await supabase
                .from('personal')
                .select('*')
                .eq('estado_acceso', 'PENDIENTE');

            const { data: proveedoresData } = await supabase
                .from('proveedores')
                .select('*')
                .eq('estado_acceso', 'PENDIENTE');

            const combined = [
                ...(personalData || []).map((p: any) => ({ ...p, type: 'PERSONAL', displayEmail: p.email })),
                ...(proveedoresData || []).map((p: any) => ({ ...p, type: 'PROVEEDOR', displayEmail: p.emailContacto }))
            ];

            setRequests(combined);

        } catch (error) {
            console.error("Error fetching requests:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleApprove = async () => {
        if (!selectedRequest) return;
        setProcessingId(selectedRequest.id);

        try {
            const response = await fetch('/api/admin/approve-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: selectedRequest.displayEmail,
                    type: selectedRequest.type,
                    entityId: selectedRequest.id,
                    password: tempPassword
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error al aprobar');
            }

            toast({
                title: "Usuario Aprobado",
                description: `El usuario ha sido creado. Contraseña temporal: ${data.tempPassword}`,
                duration: 10000,
            });

            setIsDialogOpen(false);
            setTempPassword('');
            fetchRequests();

        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setProcessingId(null);
        }
    };

    if (!isAdmin) return <div className="p-8 text-center text-red-500">Acceso denegado. Solo administradores.</div>;
    if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="container mx-auto py-8">
            <h1 className="text-2xl font-bold mb-6">Aprobaciones Pendientes</h1>

            <Card>
                <CardHeader>
                    <CardTitle>Solicitudes de Acceso</CardTitle>
                    <CardDescription>Usuarios que han solicitado acceso al sistema.</CardDescription>
                </CardHeader>
                <CardContent>
                    {requests.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">No hay solicitudes pendientes.</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nombre / Empresa</TableHead>
                                    <TableHead>Tipo</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {requests.map((req) => (
                                    <TableRow key={`${req.type}-${req.id}`}>
                                        <TableCell>{req.nombreCompleto || req.nombre || req.nombreComercial}</TableCell>
                                        <TableCell>
                                            <Badge variant={req.type === 'PERSONAL' ? 'default' : 'secondary'}>
                                                {req.type}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{req.displayEmail}</TableCell>
                                        <TableCell className="text-right">
                                            <Dialog open={isDialogOpen && selectedRequest?.id === req.id} onOpenChange={(open) => {
                                                setIsDialogOpen(open);
                                                if (open) setSelectedRequest(req);
                                            }}>
                                                <DialogTrigger asChild>
                                                    <Button size="sm" className="bg-green-600 hover:bg-green-700">
                                                        <CheckCircle className="h-4 w-4 mr-2" />
                                                        Aprobar
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent>
                                                    <DialogHeader>
                                                        <DialogTitle>Aprobar Acceso</DialogTitle>
                                                        <DialogDescription>
                                                            Estás a punto de crear un usuario para <b>{req.displayEmail}</b>.
                                                            Puedes establecer una contraseña temporal o dejarla en blanco para generar una aleatoria.
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    <div className="grid gap-4 py-4">
                                                        <div className="grid grid-cols-4 items-center gap-4">
                                                            <Label htmlFor="password" className="text-right">
                                                                Contraseña
                                                            </Label>
                                                            <Input
                                                                id="password"
                                                                value={tempPassword}
                                                                onChange={(e) => setTempPassword(e.target.value)}
                                                                placeholder="Generar aleatoria"
                                                                className="col-span-3"
                                                            />
                                                        </div>
                                                    </div>
                                                    <DialogFooter>
                                                        <Button onClick={handleApprove} disabled={!!processingId}>
                                                            {processingId ? <Loader2 className="animate-spin mr-2" /> : null}
                                                            Confirmar Aprobación
                                                        </Button>
                                                    </DialogFooter>
                                                </DialogContent>
                                            </Dialog>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
