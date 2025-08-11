import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Department, User } from '@/types';

interface DepartmentCardProps {
  department: Department;
  manager?: User;
  statistics: {
    overdue: number;
    in_progress: number;
    on_verification: number;
    new: number;
  };
  onClick: () => void;
}

export default function DepartmentCard({ department, manager, statistics, onClick }: DepartmentCardProps) {
  return (
    <div 
      className="bg-card border rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <div className="flex items-start gap-3 mb-3">
        <Avatar className="w-10 h-10">
          <AvatarImage src={manager?.image} />
          <AvatarFallback className="text-sm">
            {manager?.fullname?.charAt(0) || '?'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm text-foreground truncate">
            {department.name}
          </h3>
          <p className="text-xs text-muted-foreground truncate">
            {manager?.fullname || 'Менеджер не назначен'}
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Просрочено</span>
          <Badge variant="destructive" className="text-xs px-1 py-0 h-5">
            {statistics.overdue}
          </Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">В работе</span>
          <Badge variant="secondary" className="text-xs px-1 py-0 h-5">
            {statistics.in_progress}
          </Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">На проверке</span>
          <Badge variant="outline" className="text-xs px-1 py-0 h-5">
            {statistics.on_verification}
          </Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Новое</span>
          <Badge variant="default" className="text-xs px-1 py-0 h-5">
            {statistics.new}
          </Badge>
        </div>
      </div>
    </div>
  );
}