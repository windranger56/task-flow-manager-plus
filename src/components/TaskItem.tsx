import React, { memo } from 'react';
import { Task, User } from '../types';
import { cn, getTaskStatusColor } from '@/lib/utils';
import { Calendar, AlertCircle, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface TaskItemProps {
  task: Task;
  assignee: User | null;
  creator: User | null;
  isSelected: boolean;
  hasNewMessages: boolean;
  onClick: (task: Task) => void;
}

const TaskItem = memo(({
  task,
  assignee,
  creator,
  isSelected,
  hasNewMessages,
  onClick
}: TaskItemProps) => {
  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'new': return 'Новое';
      case 'in_progress': return 'В работе';
      case 'on_verification': return 'На проверке';
      case 'completed': return 'Завершено';
      case 'overdue': return 'Просрочено';
      default: return status;
    }
  };

  const getPriorityIcon = (priority: string) => {
    const colors = {
      low: 'text-green-500',
      medium: 'text-yellow-500',
      high: 'text-red-500'
    };
    return colors[priority as keyof typeof colors] || 'text-gray-400';
  };

  return (
    <div
      className={cn(
        "p-4 border border-gray-200 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md",
        isSelected ? "bg-blue-50 border-blue-200" : "bg-white hover:bg-gray-50",
        hasNewMessages && "ring-2 ring-blue-300 ring-opacity-50"
      )}
      onClick={() => onClick(task)}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-900 truncate">
            {task.title}
          </h3>
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
            {task.description}
          </p>
        </div>
        
        <div className="flex items-center gap-1 ml-2 flex-shrink-0">
          {task.isProtocol === 'active' && (
            <FileText className="h-4 w-4 text-blue-500" />
          )}
          <AlertCircle className={cn("h-4 w-4", getPriorityIcon(task.priority))} />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={cn(
            "px-2 py-1 text-xs rounded-full font-medium",
            getTaskStatusColor(task.status),
            task.status === 'completed' ? "text-white" : "text-gray-700"
          )}>
            {getStatusLabel(task.status)}
          </span>
          
          {hasNewMessages && (
            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
              Новые сообщения
            </span>
          )}
        </div>

        <div className="flex items-center text-xs text-gray-500">
          <Calendar className="h-3 w-3 mr-1" />
          {format(task.deadline, 'dd.MM.yyyy', { locale: ru })}
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
        <span>
          Создатель: {creator?.fullname || 'Неизвестно'}
        </span>
        <span>
          Исполнитель: {assignee?.fullname || 'Не назначен'}
        </span>
      </div>
    </div>
  );
});

TaskItem.displayName = 'TaskItem';

export default TaskItem; 