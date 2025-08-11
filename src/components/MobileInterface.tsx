import React, { useState } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Archive, FileDown, List } from 'lucide-react';
import SearchBar from '@/components/SearchBar';
import DepartmentCard from '@/components/DepartmentCard';
import MobileBottomNavigation from '@/components/MobileBottomNavigation';
import { useTaskContext } from '@/contexts/TaskContext';
import { TaskStatus } from '@/types';

interface MobileInterfaceProps {
  showArchive: boolean;
  onToggleArchive: () => void;
  onShowMobileDrawer: () => void;
  onShowTaskList: () => void;
}

export default function MobileInterface({ 
  showArchive, 
  onToggleArchive, 
  onShowMobileDrawer,
  onShowTaskList 
}: MobileInterfaceProps) {
  const { 
    departments, 
    tasks,
    taskFilter, 
    setTaskFilter, 
    selectDepartment,
    getUserById 
  } = useTaskContext();

  const [activeBottomTab, setActiveBottomTab] = useState<'menu' | 'tasks' | 'add' | 'settings' | 'notifications'>('tasks');

  const today = new Date();
  const dayOfWeek = format(today, 'EEEE', { locale: ru });
  const dateString = format(today, 'dd MMMM yyyy', { locale: ru });

  const getDepartmentStatistics = (departmentId: string) => {
    const departmentTasks = tasks.filter(task => task.departmentId === departmentId);
    
    return {
      overdue: departmentTasks.filter(task => task.status === 'overdue').length,
      in_progress: departmentTasks.filter(task => task.status === 'in_progress').length,
      on_verification: departmentTasks.filter(task => task.status === 'on_verification').length,
      new: departmentTasks.filter(task => task.status === 'new').length,
    };
  };

  const handleDepartmentClick = (departmentId: string) => {
    const department = departments.find(d => d.id === departmentId);
    if (department) {
      selectDepartment(department);
      onShowTaskList();
    }
  };

  const handleFilterClick = (filter: 'all' | 'author' | 'assignee') => {
    setTaskFilter(filter);
  };

  const handleAddTask = () => {
    // TODO: Implement add task functionality
    console.log('Add task clicked');
  };

  const handleNotifications = () => {
    // TODO: Implement notifications functionality
    console.log('Notifications clicked');
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header with date and buttons */}
      <div className="bg-card border-b p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground capitalize">
              {dayOfWeek}
            </h1>
            <p className="text-sm text-muted-foreground">
              {dateString}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleArchive}
              className="flex items-center gap-2"
            >
              {showArchive ? <List size={16} /> : <Archive size={16} />}
              <span className="hidden sm:inline">
                {showArchive ? 'Активные' : 'Архив'}
              </span>
            </Button>
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <FileDown size={16} />
              <span className="hidden sm:inline">Экспорт</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div className="p-4">
        <SearchBar />
      </div>

      {/* Filter buttons */}
      <div className="px-4 pb-4">
        <div className="flex gap-2">
          <Button
            variant={taskFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleFilterClick('all')}
          >
            Все
          </Button>
          <Button
            variant={taskFilter === 'author' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleFilterClick('author')}
          >
            я Автор
          </Button>
          <Button
            variant={taskFilter === 'assignee' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleFilterClick('assignee')}
          >
            я Исполнитель
          </Button>
        </div>
      </div>

      {/* Department cards grid */}
      <div className="px-4 pb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {departments.map(department => {
            const statistics = getDepartmentStatistics(department.id);
            
            return (
              <DepartmentCard
                key={department.id}
                department={department}
                manager={undefined} // Will be loaded asynchronously if needed
                statistics={statistics}
                onClick={() => handleDepartmentClick(department.id)}
              />
            );
          })}
        </div>
      </div>

      {/* Bottom Navigation */}
      <MobileBottomNavigation
        activeTab={activeBottomTab}
        onMenuClick={() => {
          setActiveBottomTab('menu');
          onShowMobileDrawer();
        }}
        onTasksClick={() => {
          setActiveBottomTab('tasks');
        }}
        onAddClick={() => {
          setActiveBottomTab('add');
          handleAddTask();
        }}
        onNotificationsClick={() => {
          setActiveBottomTab('notifications');
          handleNotifications();
        }}
        notificationCount={0}
      />
    </div>
  );
}