

'use client';

import { useState, useEffect, useMemo } from 'react';
import { Users, User, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu"
import { useImpersonatedUser } from '@/hooks/use-impersonated-user';
import type { PortalUser, Personal } from '@/types';
import { Badge } from '@/components/ui/badge';
import { usePersonal, usePerfiles } from '@/hooks/use-data-queries';

export function UserSwitcher() {
    const { impersonatedUser, setImpersonatedUser } = useImpersonatedUser();
    const { data: personalData = [] } = usePersonal();
    const { data: perfilesData = [] } = usePerfiles();
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const internalUsers: PortalUser[] = useMemo(() => {
        return personalData.map((p: any) => ({
            id: p.id,
            nombre: p.nombre_completo || `${p.nombre} ${p.apellido1}`,
            email: p.email,
            roles: [p.departamento as any],
        }));
    }, [personalData]);

    const portalUsers: PortalUser[] = useMemo(() => {
        return perfilesData.map((p: any) => ({
            id: p.id,
            nombre: p.nombre_completo,
            email: p.email || '',
            roles: [p.rol as any],
            proveedorId: p.proveedor_id,
        }));
    }, [perfilesData]);

    const allUsers = [...internalUsers, ...portalUsers];
    const currentUser = allUsers.find(u => u.id === impersonatedUser?.id);

    if (!isMounted) {
        return <Button variant="ghost" className="text-white hover:text-white hover:bg-gray-800">Cargando...</Button>;
    }
    
    if (process.env.NODE_ENV !== 'development') {
        return null;
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="text-white hover:text-white hover:bg-gray-800">
                    {currentUser ? (
                        <>
                            {currentUser.nombre}
                            <div className="flex gap-1 ml-2">
                                {(currentUser.roles || []).map(role => (
                                    <Badge key={role} variant="destructive" className="text-xs">{role}</Badge>
                                ))}
                            </div>
                        </>
                    ) : "Simular Usuario"}
                    <Users className="ml-2" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>Simular Sesión Como</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                    <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">Usuarios Internos</DropdownMenuLabel>
                    {internalUsers.length > 0 ? internalUsers.map(user => (
                        <DropdownMenuItem key={user.id} onSelect={() => setImpersonatedUser(user)}>
                             <Check className={`mr-2 h-4 w-4 ${currentUser?.id === user.id ? 'opacity-100' : 'opacity-0'}`} />
                            {user.nombre} <span className="ml-auto text-xs text-muted-foreground">{user.roles?.join(', ')}</span>
                        </DropdownMenuItem>
                    )) : <DropdownMenuItem disabled>No hay usuarios internos</DropdownMenuItem>}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                 <DropdownMenuGroup>
                    <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">Usuarios Externos</DropdownMenuLabel>
                    {portalUsers.length > 0 ? portalUsers.map(user => (
                        <DropdownMenuItem key={user.id} onSelect={() => setImpersonatedUser(user)}>
                            <Check className={`mr-2 h-4 w-4 ${currentUser?.id === user.id ? 'opacity-100' : 'opacity-0'}`} />
                            {user.nombre} <span className="ml-auto text-xs text-muted-foreground">{(user.roles || []).join(', ')}</span>
                        </DropdownMenuItem>
                    )) : <DropdownMenuItem disabled>No hay usuarios externos</DropdownMenuItem>}
                </DropdownMenuGroup>
                 {currentUser && (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setImpersonatedUser(null)} className="text-destructive">
                           Cerrar Simulación
                        </DropdownMenuItem>
                    </>
                 )}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
