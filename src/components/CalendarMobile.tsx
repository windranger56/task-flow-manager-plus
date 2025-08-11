import React, { useState, useMemo } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTaskContext } from '@/contexts/TaskContext';
import { format, isSameDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Task } from '@/types';

const CalendarMobile: React.FC = () => {
  const { tasks, selectTask } = useTaskContext();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Группируем задачи по датам
  const tasksByDate = useMemo(() => {
    const grouped: { [key: string]: Task[] } = {};
    
    tasks.forEach(task => {
      const dateKey = format(new Date(task.deadline), 'yyyy-MM-dd');
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(task);
    });
    
    return grouped;
  }, [tasks]);

  // Получаем задачи для выбранной даты
  const selectedDateTasks = useMemo(() => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    return tasksByDate[dateKey] || [];
  }, [selectedDate, tasksByDate]);

  // Функция для определения, есть ли задачи на конкретную дату
  const hasTasksOnDate = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return tasksByDate[dateKey] && tasksByDate[dateKey].length > 0;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'on_verification':
        return 'bg-yellow-100 text-yellow-800';
      case 'new':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Завершена';
      case 'in_progress':
        return 'В работе';
      case 'overdue':
        return 'Просрочена';
      case 'on_verification':
        return 'На проверке';
      case 'new':
        return 'Новая';
      default:
        return status;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="p-4 pb-20">
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Календарь поручений</CardTitle>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && setSelectedDate(date)}
            className="rounded-md border"
            modifiers={{
              hasTasks: (date) => hasTasksOnDate(date)
            }}
            modifiersStyles={{
              hasTasks: {
                backgroundColor: '#dbeafe',
                color: '#1e40af',
                fontWeight: 'bold'
              }
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Поручения на {format(selectedDate, "d MMMM yyyy", { locale: ru })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedDateTasks.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              На эту дату нет поручений
            </p>
          ) : (
            <div className="space-y-3">
              {selectedDateTasks.map((task) => (
                <div
                  key={task.id}
                  className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => selectTask(task)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-sm">{task.title}</h3>
                    <div className="flex items-center gap-2">
                      <div 
                        className={`w-2 h-2 rounded-full ${getPriorityColor(task.priority)}`}
                        title={`Приоритет: ${task.priority}`}
                      />
                    </div>
                  </div>
                  
                  <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                    {task.description}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <Badge 
                      variant="secondary" 
                      className={`text-xs ${getStatusColor(task.status)}`}
                    >
                      {getStatusLabel(task.status)}
                    </Badge>
                    
                    <span className="text-xs text-gray-500">
                      {format(new Date(task.deadline), "HH:mm")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CalendarMobile;
