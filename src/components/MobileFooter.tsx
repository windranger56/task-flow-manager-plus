import React from 'react';
import { User, List, Plus, Calendar, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';

interface MobileFooterProps {
  activeTab: 'account' | 'tasks' | 'add' | 'calendar' | 'notifications';
  onTabChange: (tab: 'account' | 'tasks' | 'add' | 'calendar' | 'notifications') => void;
  notificationCount?: number;
}

const MobileFooter: React.FC<MobileFooterProps> = ({ 
  activeTab, 
  onTabChange, 
  notificationCount = 0 
}) => {
  const isMobile = useIsMobile();

  if (!isMobile) {
    return null;
  }

  const tabs = [
    {
      id: 'account' as const,
      label: '',
      icon: User,
    },
    {
      id: 'tasks' as const,
      label: '',
      icon: List,
    },
    {
      id: 'add' as const,
      label: '',
      icon: Plus,
    },
    {
      id: 'calendar' as const,
      label: '',
      icon: Calendar,
    },
    {
      id: 'notifications' as const,
      label: '',
      icon: Bell,
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-4 z-50 md:hidden">
      <div className="flex justify-around items-center">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <Button
              key={tab.id}
              variant="ghost"
              size="sm"
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center justify-center p-3 min-w-0 h-auto relative ${
                isActive && tab.id !== 'add'
                  ? 'text-blue-600 bg-blue-50 rounded-full' 
                  : tab.id !== 'add'
                    ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-full'
                    : ''
              }`}
            >
              <div className="relative flex items-center justify-center">
                <Icon className={`!h-5 !w-5 ${
                  tab.id === 'add' 
                    ? 'text-white z-10' 
                    : isActive 
                      ? 'text-blue-600' 
                      : 'text-gray-600'
                }`} />
                {tab.id === 'notifications' && notificationCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </span>
                )}
                {tab.id === 'add' && (
                  <div className={`absolute inset-0 rounded-full ${
                    isActive ? 'bg-blue-600' : 'bg-blue-500'
                  } -z-10 scale-[1.8] opacity-90 shadow-lg`} />
                )}
              </div>
            </Button>
          );
        })}
      </div>
    </div>
  );
};

export default MobileFooter;
