'use client';

import { Check, ChevronsUpDown, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { useAuth, UserRole } from '@/providers/auth-provider';
import { useState } from 'react';

const roles: { value: UserRole; label: string }[] = [
    { value: 'ADMIN', label: 'Administrador' },
    { value: 'COCINA', label: 'Cocina' },
    { value: 'ALMACEN', label: 'Almacén' },
    { value: 'COMERCIAL', label: 'Comercial' },
    { value: 'RRHH', label: 'RRHH' },
    { value: 'PARTNER_PERSONAL', label: 'Partner Personal' },
    { value: 'PARTNER_TRANSPORTE', label: 'Partner Transporte' },
    { value: 'PARTNER_GASTRONOMIA', label: 'Partner Gastronomía' },
];

export function RoleSwitcher() {
    const { effectiveRole, setEffectiveRole, profile } = useAuth();
    const [open, setOpen] = useState(false);

    // Only show for real admins
    if (profile?.rol !== 'ADMIN') {
        return null;
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-[200px] justify-between bg-slate-900 text-white border-slate-700 hover:bg-slate-800 hover:text-white"
                >
                    <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-emerald-400" />
                        {effectiveRole ? roles.find((role) => role.value === effectiveRole)?.label : 'Seleccionar Rol'}
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0">
                <Command>
                    <CommandInput placeholder="Buscar rol..." />
                    <CommandList>
                        <CommandEmpty>No se encontró el rol.</CommandEmpty>
                        <CommandGroup>
                            {roles.map((role) => (
                                <CommandItem
                                    key={role.value}
                                    value={role.value}
                                    onSelect={(currentValue) => {
                                        // We need to map the label back to the value or just use the value if CommandItem supports it correctly
                                        // CommandItem value is usually lowercase. Let's be careful.
                                        // Actually, we can just use the role object from the map.
                                        setEffectiveRole(role.value);
                                        setOpen(false);
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            'mr-2 h-4 w-4',
                                            effectiveRole === role.value ? 'opacity-100' : 'opacity-0'
                                        )}
                                    />
                                    {role.label}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
