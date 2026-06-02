import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';

interface CRMContextType {
  currentUser: User | null;
  isLoading: boolean;
  login: (user: User) => void;
  logout: () => void;
}

const CRMContext = createContext<CRMContextType | undefined>(undefined);

export const CRMProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('nexus_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error('Failed to parse user from localStorage', e);
      localStorage.removeItem('nexus_user');
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Perform database migration and seeding once per browser environment
    // Use a version identifier to allow forcing a migration if the schema changes in the future
    const db_version = 'v11';
    if (localStorage.getItem(`nexus_db_initialized_${db_version}`)) return;

    const initializeDB = async () => {
      try {
        await fetch('/api/migrate-db');
        await fetch('/api/seed-db');
        localStorage.setItem(`nexus_db_initialized_${db_version}`, 'true');
      } catch (err) {
        console.error('Database initialization error:', err);
      }
    };
    
    initializeDB();
  }, []);

  const login = (user: User) => {
    localStorage.setItem('nexus_user', JSON.stringify(user));
    setCurrentUser(user);
  };
  
  const logout = () => {
    localStorage.removeItem('nexus_user');
    setCurrentUser(null);
  };

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
