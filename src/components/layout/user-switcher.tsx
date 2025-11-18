
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
import { Skeleton } from '../ui/skeleton';

export function UserSwitcher() {
    const { impersonatedUser, setImpersonatedUser } = useImpersonatedUser();
    const [isMounted, setIsMounted] = useState(false);

    const allUsers = useMemo(() => {
        if (typeof window === 'undefined') {
            return { internalUsers: [], portalUsers: [] };
        }
        
        let internalUsers: PortalUser[] = [];
        try {
            const storedPersonal = localStorage.getItem('personal');
            if (storedPersonal) {
                const personalData = JSON.parse(storedPersonal) as Personal[];
                internalUsers = personalData.map(p => ({
                    id: p.id,
                    nombre: p.nombreCompleto,
                    email: p.email,
                    roles: [p.departamento as PortalUser['roles'][0]],
                }));
            }
        } catch (e) {
            console.error("Failed to load internal users", e);
        }

        let portalUsers: PortalUser[] = [];
        try {
            const storedPortalUsers = localStorage.getItem('portalUsers');
            if (storedPortalUsers) {
                portalUsers = JSON.parse(storedPortalUsers);
            }
        } catch(e) {
            console.error("Failed to load portal users", e);
        }
        
        return { internalUsers, portalUsers };
    }, []);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const currentUser = useMemo(() => 
        [...allUsers.internalUsers, ...allUsers.portalUsers].find(u => u.id === impersonatedUser?.id),
        [impersonatedUser, allUsers]
    );

    if (!isMounted) {
        return <Skeleton className="h-9 w-48" />;
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
                    {allUsers.internalUsers.length > 0 ? allUsers.internalUsers.map(user => (
                        <DropdownMenuItem key={user.id} onSelect={() => setImpersonatedUser(user)}>
                             <Check className={`mr-2 h-4 w-4 ${currentUser?.id === user.id ? 'opacity-100' : 'opacity-0'}`} />
                            {user.nombre} <span className="ml-auto text-xs text-muted-foreground">{user.roles?.join(', ')}</span>
                        </DropdownMenuItem>
                    )) : <DropdownMenuItem disabled>No hay usuarios internos</DropdownMenuItem>}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                 <DropdownMenuGroup>
                    <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">Usuarios Externos</DropdownMenuLabel>
                    {allUsers.portalUsers.length > 0 ? allUsers.portalUsers.map(user => (
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
