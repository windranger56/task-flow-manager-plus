import { useMemo } from 'react';
import { Task, User } from '../types';

interface UseMemoizedTasksProps {
  tasks: Task[];
  user: User | null;
  taskFilter: 'all' | 'author' | 'assignee';
  selectedUserId: string | null;
  showArchive: boolean;
}

export function useMemoizedTasks({
  tasks,
  user,
  taskFilter,
  selectedUserId,
  showArchive
}: UseMemoizedTasksProps) {
  
  const filteredTasks = useMemo(() => {
    if (!user) return [];
    
    let filtered = tasks;
    
    // Apply user filter
    if (selectedUserId) {
      filtered = filtered.filter(task => 
        task.createdBy === selectedUserId || task.assignedTo === selectedUserId
      );
    } else {
      switch(taskFilter) {
        case 'author':
          filtered = filtered.filter(task => task.createdBy === user.id);
          break;
        case 'assignee':
          filtered = filtered.filter(task => task.assignedTo === user.id);
          break;
        case 'all':
        default:
          filtered = filtered.filter(task => 
            task.createdBy === user.id || task.assignedTo === user.id
          );
      }
    }
    
    // Apply archive filter
    filtered = filtered.filter(task => {
      return showArchive 
        ? task.status === 'completed'
        : task.status !== 'completed';
    });
    
    return filtered;
  }, [tasks, user, taskFilter, selectedUserId, showArchive]);

  const tasksByStatus = useMemo(() => {
    return {
      new: filteredTasks.filter(task => task.status === 'new'),
      inProgress: filteredTasks.filter(task => task.status === 'in_progress'),
      onVerification: filteredTasks.filter(task => task.status === 'on_verification'),
      completed: filteredTasks.filter(task => task.status === 'completed'),
      overdue: filteredTasks.filter(task => task.status === 'overdue')
    };
  }, [filteredTasks]);

  const sortedTasks = useMemo(() => {
    return [...filteredTasks].sort((a, b) => {
      return a.deadline.getTime() - b.deadline.getTime();
    });
  }, [filteredTasks]);

  return {
    filteredTasks,
    tasksByStatus,
    sortedTasks
  };
} 