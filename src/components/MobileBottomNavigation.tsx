import React from 'react';
import { Menu, List, Plus, Bell, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MobileBottomNavigationProps {
  activeTab: 'menu' | 'tasks' | 'add' | 'settings' | 'notifications';
  onMenuClick: () => void;
  onTasksClick: () => void;
  onAddClick: () => void;
  onNotificationsClick: () => void;
  notificationCount?: number;
}

export default function MobileBottomNavigation({ 
  activeTab, 
  onMenuClick, 
  onTasksClick, 
  onAddClick, 
  onNotificationsClick,
  notificationCount = 0
}: MobileBottomNavigationProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50">
      <div className="flex items-center justify-around py-2 px-4">
        <Button
          variant="ghost"
          size="sm"
          className={`flex flex-col items-center gap-1 h-auto py-2 ${
            activeTab === 'menu' ? 'text-primary' : 'text-muted-foreground'
          }`}
          onClick={onMenuClick}
        >
          <Menu size={20} />
          <span className="text-xs">Меню</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className={`flex flex-col items-center gap-1 h-auto py-2 ${
            activeTab === 'tasks' ? 'text-primary' : 'text-muted-foreground'
          }`}
          onClick={onTasksClick}
        >
          <List size={20} />
          <span className="text-xs">Поручения</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className={`flex flex-col items-center gap-1 h-auto py-2 ${
            activeTab === 'add' ? 'text-primary' : 'text-muted-foreground'
          }`}
          onClick={onAddClick}
        >
          <Plus size={20} />
          <span className="text-xs">Добавить</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className={`flex flex-col items-center gap-1 h-auto py-2 ${
            activeTab === 'settings' ? 'text-primary' : 'text-muted-foreground'
          }`}
          onClick={() => {}}
        >
          <Settings size={20} />
          <span className="text-xs">Настройки</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className={`flex flex-col items-center gap-1 h-auto py-2 relative ${
            activeTab === 'notifications' ? 'text-primary' : 'text-muted-foreground'
          }`}
          onClick={onNotificationsClick}
        >
          <Bell size={20} />
          {notificationCount > 0 && (
            <div className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs">
              {notificationCount > 9 ? '9+' : notificationCount}
            </div>
          )}
          <span className="text-xs">Уведомления</span>
        </Button>
      </div>
    </div>
  );
}