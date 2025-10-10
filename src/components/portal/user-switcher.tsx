

'use client';

import { useState, useEffect } from 'react';
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
import type { PortalUser } from '@/types';
import { Badge } from '@/components/ui/badge';

const INTERNAL_USERS: Partial<PortalUser>[] = [
    { id: 'internal-admin', nombre: 'Admin', roles: ['Admin'] },
    { id: 'internal-comercial', nombre: 'Comercial', roles: ['Comercial'] },
    { id: 'internal-cpr', nombre: 'CPR', roles: ['CPR'] },
    { id: 'internal-pase', nombre: 'Pase', roles: ['Pase'] },
    { id: 'internal-direccion', nombre: 'Dirección', roles: ['Dirección'] },
    { id: 'internal-almacen', nombre: 'Almacen', roles: ['Almacen'] },
    { id: 'internal-operaciones', nombre: 'Operaciones', roles: ['Operaciones'] },
    { id: 'internal-pm', nombre: 'Project Manager', roles: ['Project Manager'] },
];

export function UserSwitcher() {
    const { impersonatedUser, setImpersonatedUser } = useImpersonatedUser();
    const [portalUsers, setPortalUsers] = useState<PortalUser[]>([]);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        const storedUsers = localStorage.getItem('portalUsers');
        if (storedUsers) {
            setPortalUsers(JSON.parse(storedUsers));
        }
    }, []);

    const allUsers = [...INTERNAL_USERS, ...portalUsers];
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
                    {INTERNAL_USERS.map(user => (
                        <DropdownMenuItem key={user.id} onSelect={() => setImpersonatedUser(user as PortalUser)}>
                             <Check className={`mr-2 h-4 w-4 ${currentUser?.id === user.id ? 'opacity-100' : 'opacity-0'}`} />
                            {user.nombre} <span className="ml-auto text-xs text-muted-foreground">{user.roles?.join(', ')}</span>
                        </DropdownMenuItem>
                    ))}
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
