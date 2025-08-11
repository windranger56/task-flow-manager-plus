import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTaskContext } from '@/contexts/TaskContext';
import { supabase } from '@/supabase/client';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

const NotificationsMobile: React.FC = () => {
  const { user, selectTask } = useTaskContext();
  const [tasksWithNewMessages, setTasksWithNewMessages] = useState([]);
  const [tasksWithNewStatus, setTasksWithNewStatus] = useState([]);
  const [notificationFilter, setNotificationFilter] = useState('all');

  // Function to fetch tasks with new messages
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
            created_by,
            status
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

  // Function to fetch tasks with new status
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

  // Function to mark notifications as read
  const markNotificationsAsRead = async (type: 'messages' | 'status') => {
    if (!user) return;
    
    try {
      if (type === 'messages') {
        // Mark messages as read
        const { error } = await supabase
          .from('messages')
          .update({ is_new: false })
          .neq('sent_by', user.id)
          .eq('is_new', true)
          .or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`, { foreignTable: 'tasks' });
          
        if (error) throw error;
        
        // Refresh messages
        fetchTasksWithNewMessages();
      } else if (type === 'status') {
        // Mark tasks as not new
        const taskIds = tasksWithNewStatus.map(task => task.id);
        if (taskIds.length > 0) {
          const { error } = await supabase
            .from('tasks')
            .update({ is_new: false })
            .in('id', taskIds);
            
          if (error) throw error;
          
          // Refresh status
          fetchTasksWithNewStatus();
        }
      }
    } catch (error) {
      console.error("Ошибка при обновлении уведомлений:", error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchTasksWithNewMessages();
      fetchTasksWithNewStatus();
      
      // Refresh every 30 seconds
      const interval = setInterval(() => {
        fetchTasksWithNewMessages();
        fetchTasksWithNewStatus();
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [user]);

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'overdue':
        return 'просрочено';
      case 'in_progress':
        return 'в работе';
      case 'new':
        return 'новое';
      case 'completed':
        return 'завершена';
      case 'canceled':
        return 'отменена';
      case 'on_verification':
        return 'на проверке';
      default:
        return status;
    }
  };

  const totalNotifications = tasksWithNewMessages.length + tasksWithNewStatus.length;

  return (
    <div className="p-4 pb-20">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Уведомления
            {totalNotifications > 0 && (
              <Badge variant="destructive">
                {totalNotifications}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs 
            value={notificationFilter} 
            onValueChange={setNotificationFilter}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">Все</TabsTrigger>
              <TabsTrigger value="messages">
                Сообщения
                {tasksWithNewMessages.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {tasksWithNewMessages.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="status">
                Статусы
                {tasksWithNewStatus.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {tasksWithNewStatus.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="space-y-3 mt-4">
              {totalNotifications === 0 ? (
                <p className="text-gray-500 text-center py-8">Нет новых уведомлений</p>
              ) : (
                <div className="space-y-4">
                  {tasksWithNewMessages.length > 0 && (
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="font-medium text-sm">Новые сообщения ({tasksWithNewMessages.length})</h3>
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
                          onClick={() => selectTask(task)}
                        >
                          <p className="font-medium text-sm">{task.title}</p>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{task.description}</p>
                          <div className="flex justify-between items-center mt-2">
                            <span className="text-xs text-gray-500">
                              Срок: {format(new Date(task.deadline), "d MMM yyyy", { locale: ru })}
                            </span>
                            {task.priority === 'high' && (
                              <Badge variant="destructive" className="text-xs">
                                Высокий
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {tasksWithNewStatus.length > 0 && (
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="font-medium text-sm">Новые статусы ({tasksWithNewStatus.length})</h3>
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
                          onClick={() => selectTask(task)}
                        >
                          <p className="font-medium text-sm">{task.title}</p>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{task.description}</p>
                          <div className="flex justify-between items-center mt-2">
                            <span className="text-xs text-gray-500">
                              Срок: {format(new Date(task.deadline), "d MMM yyyy", { locale: ru })}
                            </span>
                            <Badge variant="secondary" className="text-xs">
                              {getStatusLabel(task.status)}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="messages" className="space-y-3 mt-4">
              {tasksWithNewMessages.length > 0 ? (
                <div>
                  <div className="flex justify-end mb-3">
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
                      onClick={() => selectTask(task)}
                    >
                      <p className="font-medium text-sm">{task.title}</p>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{task.description}</p>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-xs text-gray-500">
                          Срок: {format(new Date(task.deadline), "d MMM yyyy", { locale: ru })}
                        </span>
                        {task.priority === 'high' && (
                          <Badge variant="destructive" className="text-xs">
                            Высокий
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">Нет новых сообщений</p>
              )}
            </TabsContent>
            
            <TabsContent value="status" className="space-y-3 mt-4">
              {tasksWithNewStatus.length > 0 ? (
                <div>
                  <div className="flex justify-end mb-3">
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
                      onClick={() => selectTask(task)}
                    >
                      <p className="font-medium text-sm">{task.title}</p>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{task.description}</p>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-xs text-gray-500">
                          Срок: {format(new Date(task.deadline), "d MMM yyyy", { locale: ru })}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {getStatusLabel(task.status)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">Нет обновлений статуса</p>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationsMobile;
