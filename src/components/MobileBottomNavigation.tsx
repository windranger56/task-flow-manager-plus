import React, { useEffect, useState } from 'react';
import { Menu, List, Plus, Bell, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTaskContext } from '@/contexts/TaskContext';
import { supabase } from '@/supabase/client';
import { toast } from "@/components/ui/use-toast";

interface MobileBottomNavigationProps {
  activeTab: 'menu' | 'tasks' | 'add' | 'settings' | 'notifications';
  onMenuClick: () => void;
  onTasksClick: () => void;
  onAddClick: () => void;
  onNotificationsClick: () => void;
  notificationCount?: number;
  user: any; // Добавляем пропс user из контекста
}

export default function MobileBottomNavigation({ 
  activeTab, 
  onMenuClick, 
  onTasksClick, 
  onAddClick, 
  onNotificationsClick,
  notificationCount = 0,
  user
}: MobileBottomNavigationProps) {
  const [showNotificationsDialog, setShowNotificationsDialog] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState('all');
  const [tasksWithNewMessages, setTasksWithNewMessages] = useState([]);
  const [tasksWithNewStatus, setTasksWithNewStatus] = useState([]);
  
  // Функция для загрузки задач с новыми сообщениями
  const fetchTasksWithNewMessages = async () => {
    if (!user) return;
    
    try {
      const { data: messagesData, error } = await supabase
        .from('messages')
        .select(`
          task_id,
          tasks!inner(
            id,
            title,
            description,
            deadline,
            priority,
            assigned_to,
            created_by
          )
        `)
        .neq('sent_by', user.id)
        .eq('is_new', true)
        .or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`, { foreignTable: 'tasks' });

      if (error) throw error;

      const tasksMap = new Map();
      messagesData?.forEach(msg => {
        if (msg.tasks && !tasksMap.has(msg.task_id)) {
          tasksMap.set(msg.task_id, msg.tasks);
        }
      });

      setTasksWithNewMessages(Array.from(tasksMap.values()));
    } catch (error) {
      console.error("Ошибка при загрузке задач с новыми сообщениями:", error);
    }
  };

  // Функция для загрузки задач с новым статусом
  const fetchTasksWithNewStatus = async () => {
    if (!user) return;
    
    try {
      const { data: tasksData, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('is_new', true)
        .or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`);

      if (error) throw error;

      setTasksWithNewStatus(tasksData || []);
    } catch (error) {
      console.error("Ошибка при загрузке задач с новым статусом:", error);
    }
  };

  // Функция для пометки уведомлений как прочитанных
  const markNotificationsAsRead = async (type: 'messages' | 'status') => {
    if (!user) return;
    
    try {
      if (type === 'messages') {
        // Пометить сообщения как прочитанные
        const { error } = await supabase
          .from('messages')
          .update({ is_new: false })
          .neq('sent_by', user.id)
          .eq('is_new', true)
          .or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`, { foreignTable: 'tasks' });
          
        if (error) throw error;
        
        // Обновить список сообщений
        fetchTasksWithNewMessages();
      } else if (type === 'status') {
        // Пометить задачи как не новые
        const taskIds = tasksWithNewStatus.map(task => task.id);
        if (taskIds.length > 0) {
          const { error } = await supabase
            .from('tasks')
            .update({ is_new: false })
            .in('id', taskIds);
            
          if (error) throw error;
          
          // Обновить список статусов
          fetchTasksWithNewStatus();
        }
      }
    } catch (error) {
      console.error("Ошибка при обновлении уведомлений:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось обновить уведомления",
        variant: "destructive"
      });
    }
  };

  // Загрузка уведомлений при монтировании и при изменении пользователя
  useEffect(() => {
    if (user) {
      fetchTasksWithNewMessages();
      fetchTasksWithNewStatus();
      
      // Периодическое обновление уведомлений
      const interval = setInterval(() => {
        fetchTasksWithNewMessages();
        fetchTasksWithNewStatus();
      }, 30000); // Каждые 30 секунд
      
      return () => clearInterval(interval);
    }
  }, [user]);

  // Общее количество уведомлений
  const totalNotifications = tasksWithNewMessages.length + tasksWithNewStatus.length;

  return (
    <>
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
            onClick={() => setShowNotificationsDialog(true)}
          >
            <Bell size={20} />
            {totalNotifications > 0 && (
              <div className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs">
                {totalNotifications > 9 ? '9+' : totalNotifications}
              </div>
            )}
            <span className="text-xs">Уведомления</span>
          </Button>
        </div>
      </div>

      {/* Диалог уведомлений */}
      <Dialog open={showNotificationsDialog} onOpenChange={setShowNotificationsDialog}>
        <DialogContent className="max-w-sm rounded ">
          <DialogHeader>
            <DialogTitle>Уведомления</DialogTitle>
          </DialogHeader>
          
          <Tabs 
            value={notificationFilter} 
            onValueChange={setNotificationFilter}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">Все</TabsTrigger>
              <TabsTrigger value="messages">Сообщения</TabsTrigger>
              <TabsTrigger value="status">Статусы</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="space-y-2 max-h-[400px] overflow-y-auto">
              {tasksWithNewMessages.length === 0 && tasksWithNewStatus.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Нет новых уведомлений</p>
              ) : (
                <>
                  {tasksWithNewMessages.length > 0 && (
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-medium">Новые сообщения ({tasksWithNewMessages.length})</h3>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => markNotificationsAsRead('messages')}
                          className="text-xs"
                        >
                          Прочитано
                        </Button>
                      </div>
                      {tasksWithNewMessages.map(task => (
                        <div 
                          key={`msg-${task.id}`} 
                          className="p-3 border rounded-md cursor-pointer hover:bg-gray-50 mb-2"
                          onClick={() => {
                            onTasksClick(); // Переход к задачам
                            setShowNotificationsDialog(false);
                          }}
                        >
                          <p className="font-medium">{task.title}</p>
                          <p className="text-sm text-gray-500">{task.description}</p>
                          <div className="flex justify-between mt-2">
                            <span className="text-xs text-gray-500">
                              Срок: {new Date(task.deadline).toLocaleDateString()}
                            </span>
                            {task.priority === 'high' && (
                              <span className="text-xs text-gray-500">
                                Приоритет: Высокий
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {tasksWithNewStatus.length > 0 && (
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-medium">Новые статусы ({tasksWithNewStatus.length})</h3>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => markNotificationsAsRead('status')}
                          className="text-xs"
                        >
                          Прочитано
                        </Button>
                      </div>
                      {tasksWithNewStatus.map(task => (
                        <div 
                          key={`status-${task.id}`} 
                          className="p-3 border rounded-md cursor-pointer hover:bg-gray-50 mb-2"
                          onClick={() => {
                            onTasksClick(); // Переход к задачам
                            setShowNotificationsDialog(false);
                          }}
                        >
                          <p className="font-medium">{task.title}</p>
                          <p className="text-sm text-gray-500">{task.description}</p>
                          <div className="flex justify-between mt-2">
                            <span className="text-xs text-gray-500">
                              Срок: {new Date(task.deadline).toLocaleDateString()}
                            </span>
                            <span className="text-xs text-blue-500">
                              Статус: {
                                task.status === 'overdue' ? 'просрочено' :
                                task.status === 'in_progress' ? 'в работе' :
                                task.status === 'new' ? 'новое' :
                                task.status === 'completed' ? 'завершена' :
                                task.status === 'canceled' ? 'отменена' :
                                task.status === 'on_verification' ? 'на проверке' :
                                task.status
                              }
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </TabsContent>
            
            <TabsContent value="messages" className="space-y-2 max-h-[400px] overflow-y-auto">
              {tasksWithNewMessages.length > 0 ? (
                <>
                  <div className="flex justify-end mb-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => markNotificationsAsRead('messages')}
                      className="text-xs"
                    >
                      Пометить все как прочитанные
                    </Button>
                  </div>
                  {tasksWithNewMessages.map(task => (
                    <div 
                      key={`msg-${task.id}`} 
                      className="p-3 border rounded-md cursor-pointer hover:bg-gray-50 mb-2"
                      onClick={() => {
                        onTasksClick(); // Переход к задачам
                        setShowNotificationsDialog(false);
                      }}
                    >
                      <p className="font-medium">{task.title}</p>
                      <p className="text-sm text-gray-500">{task.description}</p>
                      <div className="flex justify-between mt-2">
                        <span className="text-xs text-gray-500">
                          Срок: {new Date(task.deadline).toLocaleDateString()}
                        </span>
                        {task.priority === 'high' && (
                          <span className="text-xs text-gray-500">
                            Приоритет: Высокий
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <p className="text-gray-500 text-center py-4">Нет новых сообщений</p>
              )}
            </TabsContent>
            
            <TabsContent value="status" className="space-y-2 max-h-[400px] overflow-y-auto">
              {tasksWithNewStatus.length > 0 ? (
                <>
                  <div className="flex justify-end mb-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => markNotificationsAsRead('status')}
                      className="text-xs"
                    >
                      Пометить все как прочитанные
                    </Button>
                  </div>
                  {tasksWithNewStatus.map(task => (
                    <div 
                      key={`status-${task.id}`} 
                      className="p-3 border rounded-md cursor-pointer hover:bg-gray-50 mb-2"
                      onClick={() => {
                        onTasksClick(); // Переход к задачам
                        setShowNotificationsDialog(false);
                      }}
                    >
                      <p className="font-medium">{task.title}</p>
                      <p className="text-sm text-gray-500">{task.description}</p>
                      <div className="flex justify-between mt-2">
                        <span className="text-xs text-gray-500">
                          Срок: {new Date(task.deadline).toLocaleDateString()}
                        </span>
                        <span className="text-xs text-blue-500">
                          Статус: {
                            task.status === 'overdue' ? 'просрочено' :
                            task.status === 'in_progress' ? 'в работе' :
                            task.status === 'new' ? 'новое' :
                            task.status === 'completed' ? 'завершена' :
                            task.status === 'canceled' ? 'отменена' :
                            task.status === 'on_verification' ? 'на проверке' :
                            task.status
                          }
                        </span>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <p className="text-gray-500 text-center py-4">Нет обновлений статуса</p>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}