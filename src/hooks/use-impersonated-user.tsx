
'use client';

import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { PortalUser } from '@/types';

type ImpersonatedUserContextType = {
  impersonatedUser: PortalUser | null;
  setImpersonatedUser: (user: PortalUser | null) => void;
};

const ImpersonatedUserContext = createContext<ImpersonatedUserContextType | undefined>(undefined);

export function ImpersonatedUserProvider({ children }: { children: ReactNode }) {
  const [impersonatedUser, setImpersonatedUserState] = useState<PortalUser | null>(null);

  useEffect(() => {
    // On initial load, try to get the user from localStorage
    const storedUser = localStorage.getItem('impersonatedUser');
    if (storedUser) {
      setImpersonatedUserState(JSON.parse(storedUser));
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
