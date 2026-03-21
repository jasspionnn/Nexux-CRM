import React, { createContext, useContext, useState } from 'react';
import { User, UserRole } from '../types';

interface CRMContextType {
  currentUser: User | null;
  isLoading: boolean;
  login: (user: User) => void;
  logout: () => void;
}

const CRMContext = createContext<CRMContextType | undefined>(undefined);

export const CRMProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>({ id: '1', name: 'Demo User', email: 'user@nexus.com', role: UserRole.USER });
  const [isLoading, setIsLoading] = useState(false);

  const login = (user: User) => setCurrentUser(user);
  const logout = () => setCurrentUser(null);

  return (
    <CRMContext.Provider value={{ currentUser, isLoading, login, logout }}>
      {children}
    </CRMContext.Provider>
  );
};

export const useCRM = () => {
  const context = useContext(CRMContext);
  if (!context) throw new Error('useCRM must be used within CRMProvider');
  return context;
};
