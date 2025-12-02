'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

// Define types for Profile based on our schema
export type UserRole = 'ADMIN' | 'COCINA' | 'ALMACEN' | 'COMERCIAL' | 'RRHH' | 'PARTNER_PERSONAL' | 'PARTNER_TRANSPORTE' | 'PARTNER_GASTRONOMIA';

export interface UserProfile {
    id: string;
    nombre_completo: string | null;
    rol: UserRole;
    personal_id: string | null;
    proveedor_id: string | null;
    estado: 'PENDIENTE' | 'ACTIVO' | 'BLOQUEADO';
    avatar_url: string | null;
}

interface AuthContextType {
    user: User | null;
    profile: UserProfile | null;
    session: Session | null;
    isLoading: boolean;
    effectiveRole: UserRole | null; // The role currently being used (can be simulated)
    setEffectiveRole: (role: UserRole) => void; // For Super Admin to switch views
    isAdmin: boolean;
    isProvider: boolean;
    hasRole: (role: UserRole | UserRole[]) => boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [effectiveRole, setEffectiveRoleState] = useState<UserRole | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        // 1. Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchProfile(session.user.id);
            } else {
                setIsLoading(false);
            }
        });

        // 2. Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchProfile(session.user.id);
            } else {
                setProfile(null);
                setEffectiveRoleState(null);
                setIsLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchProfile = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('perfiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) {
                console.error('Error fetching profile:', error);
                // Handle case where user exists in Auth but not in Perfiles (shouldn't happen with trigger, but good to be safe)
            } else {
                setProfile(data as UserProfile);
                // Set initial effective role
                if (!effectiveRole) {
                    setEffectiveRoleState(data.rol);
                }
            }
        } catch (error) {
            console.error('Unexpected error fetching profile:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const setEffectiveRole = (role: UserRole) => {
        // Only allow switching if actual user is ADMIN
        if (profile?.rol === 'ADMIN') {
            setEffectiveRoleState(role);
        }
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    const value = {
        user,
        session,
        profile,
        isLoading,
        effectiveRole,
        setEffectiveRole,
        isAdmin: effectiveRole === 'ADMIN',
        isProvider: !!(profile?.proveedor_id || effectiveRole?.startsWith('PARTNER_')),
        hasRole: (roleOrRoles: UserRole | UserRole[]) => {
            if (!effectiveRole) return false;
            const roles = Array.isArray(roleOrRoles) ? roleOrRoles : [roleOrRoles];
            return roles.includes(effectiveRole);
        },
        signOut,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
