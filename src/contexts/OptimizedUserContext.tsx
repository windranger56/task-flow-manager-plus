import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useMemo } from 'react';
import { User, Department } from '../types';
import { supabase } from '@/supabase/client';

interface UserContextType {
  // State
  user: User | null;
  users: User[];
  departments: Department[];
  userDepartments: {userId: string, departmentId: string}[];
  
  // Actions
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  getUserById: (id: string) => User | undefined;
  getDepartmentByUserId: (userId: string) => Promise<Department | null>;
  getUserDepartmentId: (userId: string) => Promise<string | null>;
  getSubordinates: () => Promise<User[]>;
  
  // Cached data
  userCache: Map<string, User>;
  departmentCache: Map<string, Department>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
}

export const OptimizedUserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [userDepartments, setUserDepartments] = useState<{userId: string, departmentId: string}[]>([]);
  
  // Кэширование для оптимизации
  const userCache = useMemo(() => new Map<string, User>(), []);
  const departmentCache = useMemo(() => new Map<string, Department>(), []);

  // Мемоизированная функция поиска пользователя
  const getUserById = useCallback((id: string): User | undefined => {
    if (userCache.has(id)) {
      return userCache.get(id);
    }
    const foundUser = users.find(u => u.id === id);
    if (foundUser) {
      userCache.set(id, foundUser);
    }
    return foundUser;
  }, [users, userCache]);

  // Оптимизированная загрузка департамента пользователя
  const getDepartmentByUserId = useCallback(async (userId: string): Promise<Department | null> => {
    try {
      const userDept = userDepartments.find(ud => ud.userId === userId);
      if (!userDept) return null;
      
      if (departmentCache.has(userDept.departmentId)) {
        return departmentCache.get(userDept.departmentId)!;
      }
      
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('id', userDept.departmentId)
        .single();
      
      if (error || !data) return null;
      
      const department = data as Department;
      departmentCache.set(department.id, department);
      return department;
    } catch (error) {
      console.error('Error fetching department:', error);
      return null;
    }
  }, [userDepartments, departmentCache]);

  // Получение ID департамента пользователя
  const getUserDepartmentId = useCallback(async (userId: string): Promise<string | null> => {
    const userDept = userDepartments.find(ud => ud.userId === userId);
    return userDept?.departmentId || null;
  }, [userDepartments]);

  // Получение подчиненных
  const getSubordinates = useCallback(async (): Promise<User[]> => {
    if (!user) return [];
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .neq('id', user.id)
        .eq('role', 'user');
      
      if (error) {
        console.error('Error fetching subordinates:', error);
        return [];
      }
      
      return data as User[];
    } catch (error) {
      console.error('Error fetching subordinates:', error);
      return [];
    }
  }, [user]);

  // Загрузка пользователей (оптимизированная)
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*');
        
        if (error) {
          console.error('Error loading users:', error);
          return;
        }
        
        setUsers(data as User[]);
        
        // Предварительное заполнение кэша
        data.forEach((user: User) => {
          userCache.set(user.id, user);
        });
      } catch (error) {
        console.error('Error loading users:', error);
      }
    };
    
    loadUsers();
  }, [userCache]);

  // Загрузка департаментов
  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const { data, error } = await supabase
          .from('departments')
          .select('*');
        
        if (error) {
          console.error('Error loading departments:', error);
          return;
        }
        
        setDepartments(data as Department[]);
        
        // Предварительное заполнение кэша
        data.forEach((dept: Department) => {
          departmentCache.set(dept.id, dept);
        });
      } catch (error) {
        console.error('Error loading departments:', error);
      }
    };
    
    loadDepartments();
  }, [departmentCache]);

  // Загрузка связей пользователь-департамент
  useEffect(() => {
    const loadUserDepartments = async () => {
      try {
        const { data, error } = await supabase
          .from('user_departments')
          .select('*');
        
        if (error) {
          console.error('Error loading user departments:', error);
          return;
        }
        
        setUserDepartments(data || []);
      } catch (error) {
        console.error('Error loading user departments:', error);
      }
    };
    
    loadUserDepartments();
  }, []);

  const value = useMemo(() => ({
    user,
    users,
    departments,
    userDepartments,
    setUser,
    getUserById,
    getDepartmentByUserId,
    getUserDepartmentId,
    getSubordinates,
    userCache,
    departmentCache,
  }), [
    user,
    users,
    departments,
    userDepartments,
    getUserById,
    getDepartmentByUserId,
    getUserDepartmentId,
    getSubordinates,
    userCache,
    departmentCache,
  ]);

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

export const useOptimizedUserContext = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useOptimizedUserContext must be used within a OptimizedUserProvider');
  }
  return context;
};
