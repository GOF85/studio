'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserPlus, CheckCircle2, Clock } from 'lucide-react';
import type { Personal, Proveedor } from '@/types';

type UserStatus = 'PENDIENTE' | 'ACTIVO' | 'BLOQUEADO' | 'NO_SOLICITADO';

interface ExtendedPersonal extends Personal {
    accessStatus: UserStatus;
    profileId?: string;
}

interface ExtendedProveedor extends Proveedor {
    accessStatus: UserStatus;
    profileId?: string;
}

export default function RRHHUsuariosPage() {
    const { profile } = useAuth();
    const { toast } = useToast();
    const [personal, setPersonal] = useState<ExtendedPersonal[]>([]);
    const [proveedores, setProveedores] = useState<ExtendedProveedor[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            // 1. Fetch Personal
            // In a real app with Supabase, we would fetch from 'personal' table
            // For now, we might need to rely on localStorage if migration isn't fully done or if we want to show both
            // But the plan said we migrated tables. Let's try to fetch from Supabase 'personal'
            // If empty, maybe fallback to localStorage for demo purposes?
            // The user said "La base de datos de usuario está vacía".
            // So we assume we need to populate it or it's empty.
            // But 'personal' table should have data if we migrated.
            // Since I didn't write a migration script to move data from localStorage to Supabase, the tables are likely empty.
            // I should probably provide a way to "Import from LocalStorage" or just read from LocalStorage for now and save to Supabase when requesting access.
            // The user said "Genera un Bank Office que puedan utilizar recursos humanos para actualizar los datos directamente en la aplicación".
            // So maybe I should just read from Supabase and if empty, show empty.
            // But for the "Solicitar Acceso" to work, we need data.
            // I will implement a "Sync from LocalStorage" button for dev/migration purposes if needed, or just assume data is there.
            // Given the context, I'll try to fetch from Supabase. If error/empty, I'll try to load from localStorage to show something and allow "Import & Request".

            const { data: personalData, error: personalError } = await supabase.from('personal').select('*');
            const { data: proveedoresData, error: proveedoresError } = await supabase.from('proveedores').select('*');
            const { data: perfilesData, error: perfilesError } = await supabase.from('perfiles').select('personal_id, proveedor_id, estado, id');

            let finalPersonal: ExtendedPersonal[] = [];
            let finalProveedores: ExtendedProveedor[] = [];

            if (personalData) {
                finalPersonal = personalData.map((p: any) => {
                    const perfil = perfilesData?.find((per: any) => per.personal_id === p.id);
                    return {
                        ...p,
                        accessStatus: perfil?.estado || 'NO_SOLICITADO',
                        profileId: perfil?.id
                    };
                });
            }

            if (proveedoresData) {
                finalProveedores = proveedoresData.map((p: any) => {
                    const perfil = perfilesData?.find((per: any) => per.proveedor_id === p.id);
                    return {
                        ...p,
                        accessStatus: perfil?.estado || 'NO_SOLICITADO',
                        profileId: perfil?.id
                    };
                });
            }

            setPersonal(finalPersonal);
            setProveedores(finalProveedores);

        } catch (error) {
            console.error("Error fetching data:", error);
            toast({ title: "Error cargando datos", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    const handleRequestAccess = async (entity: ExtendedPersonal | ExtendedProveedor, type: 'PERSONAL' | 'PROVEEDOR') => {
        const email = type === 'PERSONAL' ? (entity as ExtendedPersonal).email : (entity as ExtendedProveedor).emailContacto;

        if (!email) {
            toast({ title: "Falta Email", description: "La ficha debe tener un email para solicitar acceso.", variant: "destructive" });
            return;
        }
        setProcessingId(entity.id);

        try {
            // 1. Check if profile exists (should be handled by fetchData logic, but double check)
            // If NO_SOLICITADO, we create a profile with PENDING status.
            // But wait, profile is linked to auth.users. We can't create a profile without a user ID usually.
            // The plan said: "RRHH solicita... Admin aprueba... crea usuario en auth.users".
            // So we need a place to store the request BEFORE the user exists in auth.users.
            // We can use the 'perfiles' table but 'id' is PK and FK to auth.users.
            // If user doesn't exist, we can't create a profile record linked to it.
            // We need a separate 'solicitudes_acceso' table OR we create the user in Supabase Auth as "invited" (which creates the ID) but don't send email yet?
            // Or we allow 'perfiles.id' to be auto-generated UUID and link to auth.users later?
            // The schema says: id UUID PRIMARY KEY REFERENCES auth.users(id). So we CANNOT create profile without auth user.

            // ALTERNATIVE: RRHH creates the Auth User (invite) directly?
            // The user said: "habilitar ese e-mail para que pueda entrar a la aplicación lo tiene que aprobar el súper Admin".
            // So RRHH shouldn't create the Auth User effectively.
            // Maybe we need a 'solicitudes' table.
            // OR we create the Auth User but with a metadata flag 'approved: false' and Middleware blocks them?
            // The plan said: "Backoffice RRHH... Botón Solicitar Acceso -> Crea/Actualiza perfil con estado PENDIENTE".
            // This implies the profile exists.

            // Let's create a 'solicitudes_acceso' table in the schema?
            // Or just use a JSONB column in 'personal'/'proveedores' to track 'solicitud_acceso_status'?
            // Using a separate table is cleaner.
            // 'solicitudes_acceso': id, email, tipo (PERSONAL/PROVEEDOR), entity_id, estado (PENDIENTE, APROBADO), created_at.

            // I will add this table to the schema in the next step or just use a temporary solution.
            // Wait, I can use the `personal` and `proveedores` tables themselves.
            // Add `solicitud_acceso` (BOOLEAN) or `estado_acceso` (TEXT) to `personal` and `proveedores`.
            // I'll add `estado_acceso` column to `personal` and `proveedores` tables via SQL.

            // For now, let's assume I'll add that column.

            const table = type === 'PERSONAL' ? 'personal' : 'proveedores';
            const { error } = await supabase
                .from(table)
                .update({ estado_acceso: 'PENDIENTE' }) // I need to add this column!
                .eq('id', entity.id);

            if (error) throw error;

            toast({ title: "Solicitud enviada", description: "El administrador revisará la solicitud." });
            fetchData();

        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setProcessingId(null);
        }
    };

    if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="container mx-auto py-8">
            <h1 className="text-2xl font-bold mb-6">Gestión de Usuarios y Accesos</h1>

            <Tabs defaultValue="personal">
                <TabsList>
                    <TabsTrigger value="personal">Personal Interno</TabsTrigger>
                    <TabsTrigger value="proveedores">Proveedores / Partners</TabsTrigger>
                </TabsList>

                <TabsContent value="personal">
                    <Card>
                        <CardHeader>
                            <CardTitle>Personal Interno</CardTitle>
                            <CardDescription>Gestiona el acceso del personal de la empresa.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nombre</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Departamento</TableHead>
                                        <TableHead>Estado Acceso</TableHead>
                                        <TableHead className="text-right">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {personal.map((p) => (
                                        <TableRow key={p.id}>
                                            <TableCell>{p.nombreCompleto || p.nombre}</TableCell>
                                            <TableCell>{p.email || '-'}</TableCell>
                                            <TableCell>{p.departamento}</TableCell>
                                            <TableCell>
                                                <StatusBadge status={p.accessStatus} />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {p.accessStatus === 'NO_SOLICITADO' && (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleRequestAccess(p, 'PERSONAL')}
                                                        disabled={!!processingId || !p.email}
                                                    >
                                                        {processingId === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4 mr-2" />}
                                                        Solicitar Acceso
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="proveedores">
                    <Card>
                        <CardHeader>
                            <CardTitle>Proveedores y Partners</CardTitle>
                            <CardDescription>Gestiona el acceso de colaboradores externos.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Empresa</TableHead>
                                        <TableHead>Email Contacto</TableHead>
                                        <TableHead>Estado Acceso</TableHead>
                                        <TableHead className="text-right">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {proveedores.map((p) => (
                                        <TableRow key={p.id}>
                                            <TableCell>{p.nombreComercial}</TableCell>
                                            <TableCell>{p.emailContacto || '-'}</TableCell>
                                            <TableCell>
                                                <StatusBadge status={p.accessStatus} />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {p.accessStatus === 'NO_SOLICITADO' && (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleRequestAccess(p, 'PROVEEDOR')}
                                                        disabled={!!processingId || !p.emailContacto}
                                                    >
                                                        {processingId === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4 mr-2" />}
                                                        Solicitar Acceso
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

function StatusBadge({ status }: { status: UserStatus }) {
    switch (status) {
        case 'ACTIVO':
            return <Badge className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" /> Activo</Badge>;
        case 'PENDIENTE':
            return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" /> Pendiente</Badge>;
        case 'BLOQUEADO':
            return <Badge variant="destructive">Bloqueado</Badge>;
        default:
            return <Badge variant="outline" className="text-slate-500">No Solicitado</Badge>;
    }
}
