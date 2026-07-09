import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, UserRole } from '../types';

export interface CRMNotification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  related_id: string | null;
  read: number;
  created_at: string;
}

export interface TaskToday {
  id: string;
  title: string;
  due_date: string;
  type: string | null;
  lead_title: string | null;
  lead_id: string | null;
}

interface CRMContextType {
  currentUser: User | null;
  isLoading: boolean;
  login: (user: User) => void;
  logout: () => void;
  notifications: CRMNotification[];
  tasksToday: TaskToday[];
  unreadCount: number;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
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
  const [notifications, setNotifications] = useState<CRMNotification[]>([]);
  const [tasksToday, setTasksToday] = useState<TaskToday[]>([]);

  const unreadCount = notifications.filter(n => !n.read).length + tasksToday.length;

  useEffect(() => {
    const db_version = 'v12';
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

  const fetchNotifications = useCallback(async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/notifications?account_id=${currentUser.account_id}`);
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications || []);
      setTasksToday(data.tasks_today || []);
    } catch (e) {
      // non-critical
    }
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      setTasksToday([]);
      return;
    }
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60_000);
    return () => clearInterval(interval);
  }, [currentUser, fetchNotifications]);

  const markAsRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: 1 } : n));
    await fetch(`/api/notifications/${id}/read`, { method: 'PUT' });
  };

  const markAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: 1 })));
    if (currentUser) {
      await fetch(`/api/notifications/read-all?account_id=${currentUser.account_id}`, { method: 'PUT' });
    }
  };

  const login = (user: User) => {
    localStorage.setItem('nexus_user', JSON.stringify(user));
    setCurrentUser(user);
  };

  const logout = () => {
    localStorage.removeItem('nexus_user');
    setCurrentUser(null);
    fetch('/api/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
  };

  return (
    <CRMContext.Provider value={{
      currentUser, isLoading, login, logout,
      notifications, tasksToday, unreadCount,
      fetchNotifications, markAsRead, markAllAsRead,
    }}>
      {children}
    </CRMContext.Provider>
  );
};

export const useCRM = () => {
  const context = useContext(CRMContext);
  if (!context) throw new Error('useCRM must be used within CRMProvider');
  return context;
};
