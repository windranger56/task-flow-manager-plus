import { useState, useEffect, useCallback, useMemo } from 'react';
import { Task, TaskStatus } from '@/types';
import { supabase } from '@/supabase/client';

interface UseOptimizedTasksOptions {
  userId?: string | null;
  departmentId?: string | null;
  filter?: 'all' | 'author' | 'assignee';
  enablePolling?: boolean;
  pollingInterval?: number;
}

interface TasksByStatus {
  all: Task[];
  new: Task[];
  in_progress: Task[];
  on_verification: Task[];
  overdue: Task[];
  completed: Task[];
}

export const useOptimizedTasks = (options: UseOptimizedTasksOptions = {}) => {
  const {
    userId,
    departmentId,
    filter = 'all',
    enablePolling = true,
    pollingInterval = 60000, // Увеличен до 60 секунд
  } = options;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Кэш для задач
  const taskCache = useMemo(() => new Map<string, Task>(), []);

  // Мемоизированная фильтрация задач по статусам
  const tasksByStatus = useMemo((): TasksByStatus => {
    const filteredTasks = getFilteredTasks();
    
    return {
      all: filteredTasks,
      new: filteredTasks.filter(t => t.status === 'new'),
      in_progress: filteredTasks.filter(t => t.status === 'in_progress'),
      on_verification: filteredTasks.filter(t => t.status === 'on_verification'),
      overdue: filteredTasks.filter(t => t.status === 'overdue'),
      completed: filteredTasks.filter(t => t.status === 'completed'),
    };
  }, [tasks, userId, filter]);

  // Оптимизированная фильтрация задач
  const getFilteredTasks = useCallback((): Task[] => {
    if (!userId) return tasks;

    return tasks.filter(task => {
      switch (filter) {
        case 'author':
          return task.createdBy === userId;
        case 'assignee':
          return task.assignedTo === userId;
        case 'all':
        default:
          return task.createdBy === userId || task.assignedTo === userId;
      }
    });
  }, [tasks, userId, filter]);

  // Загрузка задач с оптимизацией
  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('tasks')
        .select(`
          *,
          author:users!tasks_author_id_fkey(id, fullname, email, image),
          assignee:users!tasks_assignee_id_fkey(id, fullname, email, image)
        `);

      // Фильтрация по департаменту если указан
      if (departmentId) {
        query = query.or(`author.department_id.eq.${departmentId},assignee.department_id.eq.${departmentId}`);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      const tasksData = data as Task[];
      
      // Обновление кэша
      tasksData.forEach(task => {
        taskCache.set(task.id, task);
      });

      setTasks(tasksData);
    } catch (err) {
      console.error('Error loading tasks:', err);
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [departmentId, taskCache]);

  // Создание задачи
  const createTask = useCallback(async (taskData: Partial<Task>): Promise<Task | null> => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert([taskData])
        .select()
        .single();

      if (error) throw error;

      const newTask = data as Task;
      
      // Обновляем локальное состояние и кэш
      setTasks(prev => [...prev, newTask]);
      taskCache.set(newTask.id, newTask);

      return newTask;
    } catch (err) {
      console.error('Error creating task:', err);
      return null;
    }
  }, [taskCache]);

  // Обновление задачи
  const updateTask = useCallback(async (taskId: string, updates: Partial<Task>): Promise<Task | null> => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;

      const updatedTask = data as Task;
      
      // Обновляем локальное состояние и кэш
      setTasks(prev => prev.map(task => 
        task.id === taskId ? updatedTask : task
      ));
      taskCache.set(taskId, updatedTask);

      return updatedTask;
    } catch (err) {
      console.error('Error updating task:', err);
      return null;
    }
  }, [taskCache]);

  // Удаление задачи
  const deleteTask = useCallback(async (taskId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      // Обновляем локальное состояние и кэш
      setTasks(prev => prev.filter(task => task.id !== taskId));
      taskCache.delete(taskId);

      return true;
    } catch (err) {
      console.error('Error deleting task:', err);
      return false;
    }
  }, [taskCache]);

  // Получение задачи по ID (с кэшированием)
  const getTaskById = useCallback((taskId: string): Task | undefined => {
    if (taskCache.has(taskId)) {
      return taskCache.get(taskId);
    }
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      taskCache.set(taskId, task);
    }
    return task;
  }, [tasks, taskCache]);

  // Начальная загрузка
  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Polling с увеличенным интервалом
  useEffect(() => {
    if (!enablePolling) return;

    const interval = setInterval(() => {
      loadTasks();
    }, pollingInterval);

    return () => clearInterval(interval);
  }, [loadTasks, enablePolling, pollingInterval]);

  return {
    tasks,
    tasksByStatus,
    loading,
    error,
    getFilteredTasks,
    getTaskById,
    createTask,
    updateTask,
    deleteTask,
    refreshTasks: loadTasks,
  };
};