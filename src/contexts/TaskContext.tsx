
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Task, Department, User, Priority, TaskStatus, ProtocolStatus, DuplicationData } from '@/types';
import { supabase } from '@/supabase/client';
import { toast } from '@/components/ui/use-toast';

interface TaskContextType {
  tasks: Task[];
  departments: Department[];
  users: User[];
  selectedDepartment: Department | null;
  selectedTask: Task | null;
  user: User | null;
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  setDepartments: React.Dispatch<React.SetStateAction<Department[]>>;
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  selectDepartment: (department: Department | null) => void;
  selectTask: (task: Task | null) => void;
  addTask: (
    title: string,
    description: string,
    priority: Priority,
    isProtocol: ProtocolStatus,
    deadline: Date,
    departmentId: string,
    assignedTo: string
  ) => void;
  addTaskWithDuplication: (
    title: string,
    description: string,
    priority: Priority,
    isProtocol: ProtocolStatus,
    deadline: Date,
    duplicationData: DuplicationData
  ) => void;
  updateTaskStatus: (taskId: string, status: TaskStatus) => void;
  getUserById: (userId: string) => Promise<User | null>;
  getUsersByDepartments: (departmentIds: string[]) => Promise<User[]>;
  searchTasks: (query: string) => Task[];
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export const useTaskContext = () => {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTaskContext must be used within a TaskProvider');
  }
  return context;
};

interface TaskProviderProps {
  children: ReactNode;
}

export const TaskProvider: React.FC<TaskProviderProps> = ({ children }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [user, setUser] = useState<User | null>(null);

  // Load current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (userData) {
          setUser({
            id: userData.id,
            fullname: userData.fullname,
            email: userData.email,
            image: userData.image,
            role: userData.role
          });
        }
      }
    };
    getCurrentUser();
  }, []);

  // Load user departments
  useEffect(() => {
    const loadUserDepartments = async () => {
      if (!user?.id) return;
      
      try {
         const { data: userDepartments, error } = await supabase
           .from('users')
           .select(`
             departmentId,
             departments!inner (
               id,
               name,
               managerId,
               color,
               created_by
             )
           `)
           .eq('id', user.id);

        if (error) throw error;

        const managedDepartments = await supabase
          .from('departments')
          .select('*')
          .eq('managerId', user.id);

        const allDepartments = new Map();
        
        // Add user's own department
        if (userDepartments?.[0]?.departments) {
          const dept: any = userDepartments[0].departments;
          if (Array.isArray(dept) && dept.length > 0) {
            allDepartments.set(dept[0].id, dept[0]);
          } else if (dept && dept.id) {
            allDepartments.set(dept.id, dept);
          }
        }
        
        // Add managed departments
        if (managedDepartments.data) {
          managedDepartments.data.forEach(dept => {
            allDepartments.set(dept.id, dept);
          });
        }
        
        setDepartments(Array.from(allDepartments.values()));
      } catch (error) {
        console.error('Error loading departments:', error);
      }
    };

    loadUserDepartments();
  }, [user?.id]);

  // Load tasks
  useEffect(() => {
    const loadTasks = async () => {
      if (!user?.id || departments.length === 0) return;
      
      try {
        const departmentIds = departments.map(d => d.id);
        const { data: tasksData, error } = await supabase
          .from('tasks')
          .select('*')
          .or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const formattedTasks = tasksData?.map(task => ({
          id: task.id,
          title: task.title,
          description: task.description,
          assignedTo: task.assigned_to,
          createdBy: task.created_by,
          departmentId: task.departmentId,
          parentId: task.parentId,
          priority: task.priority,
          isProtocol: task.is_protocol,
          createdAt: new Date(task.created_at),
          deadline: new Date(task.deadline),
          status: task.status
        })) || [];

        setTasks(formattedTasks);
      } catch (error) {
        console.error('Error loading tasks:', error);
      }
    };

    loadTasks();
  }, [user?.id, departments]);

  // Load users
  useEffect(() => {
    const loadUsers = async () => {
      if (departments.length === 0) return;
      
      try {
        const departmentIds = departments.map(d => d.id);
        const { data: usersData, error } = await supabase
          .from('users')
          .select('*')
          .in('departmentId', departmentIds);

        if (error) throw error;

        const formattedUsers = usersData?.map(user => ({
          id: user.id,
          fullname: user.fullname,
          email: user.email,
          image: user.image,
          role: user.role
        })) || [];

        setUsers(formattedUsers);
      } catch (error) {
        console.error('Error loading users:', error);
      }
    };

    loadUsers();
  }, [departments]);

  const selectDepartment = (department: Department | null) => {
    setSelectedDepartment(department);
  };

  const selectTask = (task: Task | null) => {
    setSelectedTask(task);
  };

  const addTask = async (
    title: string,
    description: string,
    priority: Priority,
    isProtocol: ProtocolStatus,
    deadline: Date,
    departmentId: string,
    assignedTo: string
  ) => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert([
          {
            title,
            description,
            assigned_to: assignedTo,
            created_by: user.id,
            departmentId,
            priority,
            is_protocol: isProtocol,
            deadline: deadline.toISOString(),
            status: 'new',
            parentId: null
          }
        ])
        .select()
        .single();

      if (error) throw error;

      const newTask: Task = {
        id: data.id,
        title: data.title,
        description: data.description,
        assignedTo: data.assigned_to,
        createdBy: data.created_by,
        departmentId: data.departmentId,
        parentId: data.parentId,
        priority: data.priority,
        isProtocol: data.is_protocol,
        createdAt: new Date(data.created_at),
        deadline: new Date(data.deadline),
        status: data.status
      };

      setTasks(prev => [newTask, ...prev]);
      
      toast({
        title: "Поручение создано",
        description: `Поручение "${title}" успешно создано`,
      });
    } catch (error) {
      console.error('Error creating task:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось создать поручение",
        variant: "destructive"
      });
    }
  };

  const addTaskWithDuplication = async (
    title: string,
    description: string,
    priority: Priority,
    isProtocol: ProtocolStatus,
    deadline: Date,
    duplicationData: DuplicationData
  ) => {
    if (!user?.id) return;

    try {
      const tasksToCreate = duplicationData.selectedExecutors.map(executorId => ({
        title,
        description,
        assigned_to: executorId,
        created_by: user.id,
        departmentId: users.find(u => u.id === executorId)?.role || duplicationData.selectedDepartments[0],
        priority,
        is_protocol: isProtocol,
        deadline: deadline.toISOString(),
        status: 'new',
        parentId: null
      }));

      const { data, error } = await supabase
        .from('tasks')
        .insert(tasksToCreate)
        .select();

      if (error) throw error;

      const newTasks: Task[] = data.map(task => ({
        id: task.id,
        title: task.title,
        description: task.description,
        assignedTo: task.assigned_to,
        createdBy: task.created_by,
        departmentId: task.departmentId,
        parentId: task.parentId,
        priority: task.priority,
        isProtocol: task.is_protocol,
        createdAt: new Date(task.created_at),
        deadline: new Date(task.deadline),
        status: task.status
      }));

      setTasks(prev => [...newTasks, ...prev]);
      
      toast({
        title: "Поручения созданы",
        description: `Создано ${newTasks.length} дублированных поручений`,
      });
    } catch (error) {
      console.error('Error creating duplicated tasks:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось создать дублированные поручения",
        variant: "destructive"
      });
    }
  };

  const updateTaskStatus = async (taskId: string, status: TaskStatus) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status })
        .eq('id', taskId);

      if (error) throw error;

      setTasks(prev => 
        prev.map(task => 
          task.id === taskId ? { ...task, status } : task
        )
      );

      toast({
        title: "Статус обновлен",
        description: "Статус поручения успешно обновлен",
      });
    } catch (error) {
      console.error('Error updating task status:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось обновить статус поручения",
        variant: "destructive"
      });
    }
  };

  const getUserById = async (userId: string): Promise<User | null> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      return {
        id: data.id,
        fullname: data.fullname,
        email: data.email,
        image: data.image,
        role: data.role
      };
    } catch (error) {
      console.error('Error fetching user:', error);
      return null;
    }
  };

  const getUsersByDepartments = async (departmentIds: string[]): Promise<User[]> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .in('departmentId', departmentIds);

      if (error) throw error;

      return data?.map(user => ({
        id: user.id,
        fullname: user.fullname,
        email: user.email,
        image: user.image,
        role: user.role
      })) || [];
    } catch (error) {
      console.error('Error fetching users by departments:', error);
      return [];
    }
  };

  const searchTasks = (query: string): Task[] => {
    if (!query.trim()) return [];
    
    const searchTerm = query.toLowerCase();
    return tasks.filter(task => 
      task.title.toLowerCase().includes(searchTerm) ||
      task.description.toLowerCase().includes(searchTerm) ||
      task.status.toLowerCase().includes(searchTerm)
    );
  };

  const value: TaskContextType = {
    tasks,
    departments,
    users,
    selectedDepartment,
    selectedTask,
    user,
    setTasks,
    setDepartments,
    setUsers,
    selectDepartment,
    selectTask,
    addTask,
    addTaskWithDuplication,
    updateTaskStatus,
    getUserById,
    getUsersByDepartments,
    searchTasks,
  };

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
};
