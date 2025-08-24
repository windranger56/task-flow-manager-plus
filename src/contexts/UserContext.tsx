import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo } from 'react';
import { User } from '../types';
import { supabase } from '@/supabase/client';

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  users: User[];
  setUsers: (users: User[]) => void;
  getUserById: (id: string) => Promise<User | null>;
  userCache: Map<string, User>;
  clearUserCache: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  
  // Кэш пользователей для оптимизации
  const userCache = useMemo(() => new Map<string, User>(), []);
  
  // Оптимизированная функция получения пользователя
  const getUserById = useCallback(async (id: string): Promise<User | null> => {
    if (!id) return null;
    
    // Проверяем кэш
    if (userCache.has(id)) {
      return userCache.get(id) || null;
    }
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();
        
      if (error) {
        console.error('Error fetching user:', error);
        return null;
      }
      
      // Кэшируем результат
      if (data) {
        userCache.set(id, data);
        return data;
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching user:', error);
      return null;
    }
  }, [userCache]);
  
  // Очистка кэша
  const clearUserCache = useCallback(() => {
    userCache.clear();
  }, [userCache]);
  
  const value = useMemo(() => ({
    user,
    setUser,
    users,
    setUsers,
    getUserById,
    userCache,
    clearUserCache
  }), [user, users, getUserById, userCache, clearUserCache]);
  
  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

export function useUserContext() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUserContext must be used within a UserProvider');
  }
  return context;
} 