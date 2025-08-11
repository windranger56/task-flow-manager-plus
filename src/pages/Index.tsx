
import React, { useState, useEffect } from 'react';
import LeftSidebar from '@/components/LeftSidebar';
import TaskList from '@/components/TaskList';
import TaskDetail from '@/components/TaskDetail';
import SearchBar from '@/components/SearchBar';
import ExportButton from '@/components/ExportButton';
import ArchiveButton from '@/components/ArchiveButton';
import MobileFooter from '@/components/MobileFooter';
import AddTaskMobile from '@/components/AddTaskMobile';
import CalendarMobile from '@/components/CalendarMobile';
import NotificationsMobile from '@/components/NotificationsMobile';
import AccountMobile from '@/components/AccountMobile';
import { TaskProvider, useTaskContext } from '@/contexts/TaskContext';
import { useIsMobile } from '@/hooks/use-mobile';

import { supabase } from '@/supabase/client';

// Внутренний компонент для доступа к TaskContext
function IndexContent() {
  const isMobile = useIsMobile();
  const [showArchive, setShowArchive] = useState(false);
  const [activeTab, setActiveTab] = useState<'account' | 'tasks' | 'add' | 'calendar' | 'notifications'>('tasks');
  const [notificationCount, setNotificationCount] = useState(0);
  const { user } = useTaskContext();

  // Получаем количество уведомлений
  useEffect(() => {
    const fetchNotificationCount = async () => {
      if (!user) return;
      
      try {
        // Получаем количество новых сообщений
        const { data: messagesData, error: messagesError } = await supabase
          .from('messages')
          .select('id', { count: 'exact' })
          .neq('sent_by', user.id)
          .eq('is_new', true);

        // Получаем количество задач с новым статусом
        const { data: statusData, error: statusError } = await supabase
          .from('tasks')
          .select('id', { count: 'exact' })
          .eq('is_new', true)
          .or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`);

        if (!messagesError && !statusError) {
          const totalCount = (messagesData?.length || 0) + (statusData?.length || 0);
          setNotificationCount(totalCount);
        }
      } catch (error) {
        console.error("Ошибка при получении количества уведомлений:", error);
      }
    };

    fetchNotificationCount();
    
    // Обновляем каждые 30 секунд
    const interval = setInterval(fetchNotificationCount, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const renderMobileContent = () => {
    switch (activeTab) {
      case 'account':
        return <AccountMobile />;
      case 'tasks':
        return (
          <div className="flex-1 overflow-auto pt-7 pb-20">
            <TaskList showArchive={showArchive} />
          </div>
        );
      case 'add':
        return <AddTaskMobile />;
      case 'calendar':
        return <CalendarMobile />;
      case 'notifications':
        return <NotificationsMobile />;
      default:
        return (
          <div className="flex-1 overflow-auto pt-7 pb-20">
            <TaskList showArchive={showArchive} />
          </div>
        );
    }
  };


  
  return (
    <div className='flex h-screen'>
      <div className="flex w-full bg-white relative">
        {/* Left Sidebar - только для десктопа */}
        {!isMobile && <LeftSidebar />}
        
        {/* Main Content */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Header Bar - показываем для всех вкладок на мобильных, но с разным содержимым */}
          {(!isMobile || isMobile) && (
            <div className="md:static sticky top-0 bg-white z-10 p-1 border-b border-gray-200 flex items-center h-12">
              {isMobile ? (
                // Мобильный заголовок
                activeTab === 'tasks' ? (
                  // Для вкладки задач показываем поиск
                  <div className="flex-1 flex items-center gap-2">
                    <div className="flex-1">
                      <SearchBar />
                    </div>
                    <ArchiveButton 
                      showArchive={showArchive}
                      onToggle={() => setShowArchive(!showArchive)}
                    />
                  </div>
                ) : (
                  // Для остальных вкладок показываем заголовок
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-lg font-semibold text-gray-900">
                      {activeTab === 'account' && 'Аккаунт'}
                      {activeTab === 'add' && 'Новое поручение'}
                      {activeTab === 'calendar' && 'Календарь'}
                      {activeTab === 'notifications' && 'Уведомления'}
                    </div>
                  </div>
                )
              ) : (
                // Десктопный заголовок
                <>
                  <div className="flex-1 flex items-center gap-4 justify-left">
                    <div className="w-1/3 min-w-0">
                      <SearchBar />
                    </div>
                    <div className="flex-1 flex justify-center">
                      <div className="text-sm font-medium text-gray-600 mr-2">
                        <p>Сегодня</p> 
                      </div>
                      <div className="text-sm font-medium text-black">
                        {new Date().toLocaleDateString('ru-RU', { 
                          weekday: 'long',
                          day: 'numeric', 
                          month: 'long', 
                          year: 'numeric' 
                        }).replace(/^./, str => str.toUpperCase())}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <ArchiveButton 
                        showArchive={showArchive}
                        onToggle={() => setShowArchive(!showArchive)}
                      />
                      <ExportButton />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
          
          {/* Content */}
          {isMobile ? (
            /* Mobile layout with tabs */
            <>
              {renderMobileContent()}
              <MobileFooter 
                activeTab={activeTab}
                onTabChange={setActiveTab}
                notificationCount={notificationCount}
              />
            </>
          ) : (
            /* Desktop layout */
            <div className="flex flex-1 overflow-hidden">
              <div className="w-1/3 min-w-0 border-r border-gray-200 overflow-auto">
                <TaskList showArchive={showArchive} />
              </div>
              <div className="flex-1 overflow-auto">
                <TaskDetail />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Index() {
  return (
    <TaskProvider>
      <IndexContent />
    </TaskProvider>
  );
}
