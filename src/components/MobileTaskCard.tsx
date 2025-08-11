import React from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Task, User } from '@/types';
import { cn, getTaskStatusColor } from '@/lib/utils';

interface MobileTaskCardProps {
  task: Task & { assignee?: User; creator?: User };
  onClick: () => void;
  hasNewMessages?: boolean;
}

const getStatusText = (status: string) => {
  switch (status) {
    case 'new': return 'Новое';
    case 'in_progress': return 'В работе';
    case 'on_verification': return 'На проверке';
    case 'overdue': return 'Просрочено';
    case 'completed': return 'Выполнено';
    default: return status;
  }
};

const getPriorityText = (priority: string) => {
  switch (priority) {
    case 'high': return 'Высокий';
    case 'medium': return 'Средний';
    case 'low': return 'Низкий';
    default: return priority;
  }
};

export default function MobileTaskCard({ task, onClick, hasNewMessages = false }: MobileTaskCardProps) {
  const isOverdue = new Date(task.deadline) < new Date() && task.status !== 'completed';
  
  return (
    <div 
      className={cn(
        "bg-card border rounded-lg p-3 cursor-pointer transition-all",
        "hover:shadow-md active:scale-[0.98]",
        hasNewMessages && "ring-2 ring-primary ring-opacity-50"
      )}
      onClick={onClick}
    >
      {/* Header with title and status */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm text-foreground truncate">
            {task.title}
          </h4>
          {hasNewMessages && (
            <div className="flex items-center gap-1 mt-1">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <span className="text-xs text-primary font-medium">Новые сообщения</span>
            </div>
          )}
        </div>
        <Badge 
          variant="outline" 
          className={cn(
            "text-xs px-1.5 py-0 h-5",
            getTaskStatusColor(task.status)
          )}
        >
          {getStatusText(task.status)}
        </Badge>
      </div>

      {/* Description */}
      {task.description && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
          {task.description}
        </p>
      )}

      {/* Assignee and deadline */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Avatar className="w-6 h-6">
            <AvatarImage src={task.assignee?.image} />
            <AvatarFallback className="text-xs">
              {task.assignee?.fullname?.charAt(0) || '?'}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs text-muted-foreground truncate max-w-20">
            {task.assignee?.fullname || 'Не назначен'}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {task.priority === 'high' && (
            <Badge
              variant="destructive"
              className="text-xs px-1 py-0 h-4"
            >
              {getPriorityText(task.priority)}
            </Badge>
          )}
          <span className={cn(
            "text-xs",
            isOverdue ? "text-destructive font-medium" : "text-muted-foreground"
          )}>
            {format(new Date(task.deadline), 'dd.MM', { locale: ru })}
          </span>
        </div>
      </div>
    </div>
  );
}