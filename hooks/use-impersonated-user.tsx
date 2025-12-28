
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

  // Eliminado: persistencia en localStorage. El usuario suplantado solo vive en memoria/contexto.

  const setImpersonatedUser = (user: PortalUser | null) => {
    setImpersonatedUserState(user);
    // Ya no se persiste en localStorage
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
