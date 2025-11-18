
'use client';

import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { PortalUser, Personal } from '@/types';
import { usePathname } from 'next/navigation';

type ImpersonatedUserContextType = {
  impersonatedUser: PortalUser | null;
  setImpersonatedUser: (user: PortalUser | null) => void;
};

const ImpersonatedUserContext = createContext<ImpersonatedUserContextType | undefined>(undefined);

export function ImpersonatedUserProvider({ children }: { children: ReactNode }) {
  const [impersonatedUser, setImpersonatedUserState] = useState<PortalUser | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    // On initial load, try to get the user from localStorage
    const storedUser = localStorage.getItem('impersonatedUser');
    if (storedUser) {
      try {
        setImpersonatedUserState(JSON.parse(storedUser));
      } catch (e) {
        console.error("Failed to parse impersonated user from localStorage", e);
        localStorage.removeItem('impersonatedUser');
      }
    }
  }, []);

  const setImpersonatedUser = (user: PortalUser | null) => {
    setImpersonatedUserState(user);
    if (user) {
      localStorage.setItem('impersonatedUser', JSON.stringify(user));
    } else {
      localStorage.removeItem('impersonatedUser');
    }
  };
  
  useEffect(() => {
    // If user navigates away from portal, clear impersonation
    if (impersonatedUser && !pathname.startsWith('/portal') && !pathname.startsWith('/rrhh')) {
        const isAdminOrComercial = impersonatedUser.roles.includes('Admin') || impersonatedUser.roles.includes('Comercial');
        if (!isAdminOrComercial) {
            // setImpersonatedUser(null);
        }
    }
  }, [pathname, impersonatedUser]);

  return (
    <ImpersonatedUserContext.Provider value={{ impersonatedUser, setImpersonatedUser }}>
      {children}
    </ImpersonatedUserContext.Provider>
  );
}

export function useImpersonatedUser() {
  const context = useContext(ImpersonatedUserContext);
  if (context === undefined) {
    throw new Error('useImpersonatedUser must be used within a ImpersonatedUserProvider');
  }
  return context;
}
