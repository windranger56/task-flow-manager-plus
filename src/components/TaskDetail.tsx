import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar, Clock, User, Building, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useTaskContext } from '@/contexts/TaskContext';
import { cn } from '@/lib/utils';
import { supabase } from '@/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { TaskStatus } from '@/types';

export default function TaskDetail() {
  const { selectedTask, updateTaskStatus, getUserById, user, departments } = useTaskContext();
  const [assignee, setAssignee] = useState<any>(null);
  const [creator, setCreator] = useState<any>(null);
  const [department, setDepartment] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadTaskDetails = async () => {
      if (!selectedTask) return;
      
      setIsLoading(true);
      try {
        const [assigneeData, creatorData] = await Promise.all([
          getUserById(selectedTask.assignedTo),
          getUserById(selectedTask.createdBy)
        ]);
        
        setAssignee(assigneeData);
        setCreator(creatorData);
        
        const dept = departments.find(d => d.id === selectedTask.departmentId);
        setDepartment(dept);
      } catch (error) {
        console.error('Error loading task details:', error);
        toast({
          title: "Ошибка",
          description: "Не удалось загрузить детали поручения",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadTaskDetails();
  }, [selectedTask, getUserById, departments]);

  const handleStatusChange = async (newStatus: TaskStatus) => {
    if (!selectedTask) return;
    
    try {
      await updateTaskStatus(selectedTask.id, newStatus);
    } catch (error) {
      console.error('Error updating task status:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось обновить статус поручения",
        variant: "destructive"
      });
    }
  };

  if (!selectedTask) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <div className="text-center">
          <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <p className="text-lg">Выберите поручение для просмотра</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
        <div className="h-32 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  const formatDate = (date: Date) => {
    try {
      return format(date, 'dd MMMM yyyy, HH:mm', { locale: ru });
    } catch (error) {
      return 'Дата не указана';
    }
  };

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'on_verification': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: TaskStatus) => {
    switch (status) {
      case 'completed': return 'Завершено';
      case 'in_progress': return 'В работе';
      case 'overdue': return 'Просрочено';
      case 'on_verification': return 'На проверке';
      case 'new': return 'Новое';
      default: return 'Неизвестно';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'high': return 'Высокий';
      case 'medium': return 'Средний';
      case 'low': return 'Низкий';
      default: return 'Неизвестно';
    }
  };

  const isAssignee = user?.id === selectedTask.assignedTo;
  const isAuthor = user?.id === selectedTask.createdBy;

  return (
    <div className="h-full overflow-auto">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <h1 className="text-2xl font-semibold text-gray-900 pr-4">
              {selectedTask.title}
            </h1>
            <div className="flex flex-col gap-2">
              <Badge className={cn("text-xs", getStatusColor(selectedTask.status))}>
                {getStatusText(selectedTask.status)}
              </Badge>
              <Badge className={cn("text-xs", getPriorityColor(selectedTask.priority))}>
                {getPriorityText(selectedTask.priority)}
              </Badge>
            </div>
          </div>
          
          {selectedTask.isProtocol === 'active' && (
            <Badge variant="outline" className="text-xs">
              Протокольное поручение
            </Badge>
          )}
        </div>

        <Separator />

        {/* Task Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">Дедлайн:</span>
              <span className="text-sm font-medium">
                {formatDate(selectedTask.deadline)}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">Создано:</span>
              <span className="text-sm font-medium">
                {formatDate(selectedTask.createdAt)}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">Подразделение:</span>
              <span className="text-sm font-medium">
                {department?.name || 'Не указано'}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">Автор:</span>
              <span className="text-sm font-medium">
                {creator?.fullname || 'Не указан'}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">Исполнитель:</span>
              <span className="text-sm font-medium">
                {assignee?.fullname || 'Не указан'}
              </span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Description */}
        <div>
          <h3 className="text-lg font-medium mb-3">Описание</h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {selectedTask.description || 'Описание не указано'}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        {isAssignee && selectedTask.status !== 'completed' && (
          <div className="flex gap-2 pt-4">
            <Button
              onClick={() => handleStatusChange('in_progress')}
              disabled={selectedTask.status === 'in_progress'}
              variant={selectedTask.status === 'in_progress' ? 'secondary' : 'default'}
            >
              Взять в работу
            </Button>
            <Button
              onClick={() => handleStatusChange('on_verification')}
              disabled={selectedTask.status === 'on_verification'}
              variant={selectedTask.status === 'on_verification' ? 'secondary' : 'outline'}
            >
              Отправить на проверку
            </Button>
            <Button
              onClick={() => handleStatusChange('completed')}
              variant="outline"
              className="text-green-600 border-green-300 hover:bg-green-50"
            >
              Завершить
            </Button>
          </div>
        )}

        {isAuthor && selectedTask.status === 'on_verification' && (
          <div className="flex gap-2 pt-4">
            <Button
              onClick={() => handleStatusChange('completed')}
              className="bg-green-600 hover:bg-green-700"
            >
              Принять работу
            </Button>
            <Button
              onClick={() => handleStatusChange('in_progress')}
              variant="outline"
              className="text-orange-600 border-orange-300 hover:bg-orange-50"
            >
              Вернуть на доработку
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
