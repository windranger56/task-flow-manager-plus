import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Check, Send } from "lucide-react";
import { useTaskContext } from '@/contexts/TaskContext';
import { cn } from '@/lib/utils';
import { ru } from 'date-fns/locale';
import { supabase } from '@/supabase/client';

export default function TaskDetail() {
  const { 
    user,
    selectedTask, 
    getUserById, 
    deleteTask, 
    reassignTask, 
    toggleProtocol, 
    completeTask,
    users,
    selectTask
  } = useTaskContext();
  
  const [showReassign, setShowReassign] = useState(false);
  const [reassignTo, setReassignTo] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newDeadline, setNewDeadline] = useState<Date | undefined>(undefined);
  const [creator, setCreator] = useState<any>(null);
  const [assignee, setAssignee] = useState<any>(null);
  const [isStatusConfirmOpen, setIsStatusConfirmOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [nextStatus, setNextStatus] = useState<string | null>(null);
  const [statusComment, setStatusComment] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if(!selectedTask) return;
      
      // Подписка на изменения сообщений
      const channel = supabase
        .channel(`task-${selectedTask.id}-messages`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'messages',
            filter: `task_id=eq.${selectedTask.id}`,
          },
          (payload) => {
            if(payload.eventType === 'INSERT') {
              setChatMessages(prev => [...prev, payload.new]);
            } else if (payload.eventType === 'UPDATE') {
              setChatMessages(prev => prev.map(m => 
                m.id === payload.old.id ? payload.new : m
              ));
            } else if (payload.eventType === 'DELETE') {
              setChatMessages(prev => prev.filter(m => m.id !== payload.old.id));
            }
          }
        )
        .subscribe();

      // Загрузка начальных данных
      const loadData = async () => {
        const { data: messagesData, error: messagesError } = await supabase
          .from('messages')
          .select()
          .eq('task_id', selectedTask.id)
          .order('created_at', { ascending: true });

        if(messagesError) {
          console.error("Ошибка загрузки сообщений:", messagesError);
          return;
        }

        setChatMessages(messagesData || []);

        const creatorData = user.id === selectedTask.createdBy 
          ? user 
          : await getUserById(selectedTask.createdBy);
        
        const assigneeData = user.id === selectedTask.assignedTo 
          ? user 
          : await getUserById(selectedTask.assignedTo);

        setCreator(creatorData);
        setAssignee(assigneeData);
      };

      await loadData();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    fetchData();
  }, [selectedTask]);

  const handleSendChatMessage = async () => {
    if (!chatMessage.trim() || !selectedTask) return;

    try {
      const { error } = await supabase
        .from('messages')
        .insert([{
          content: chatMessage,
          task_id: selectedTask.id,
          sent_by: user.id
        }]);

      if (error) throw error;

      setChatMessage('');
    } catch (error) {
      console.error("Ошибка отправки сообщения:", error);
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: string, reason?: string) => {
    try {
      // Обновляем статус поручения
      const { error: taskError } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', taskId);

      if (taskError) throw taskError;

      // Если задача отклонена, добавляем сообщение с причиной
      if (newStatus === 'canceled' && reason) {
        await supabase
          .from('messages')
          .insert([{
            content: `Поручение отклонено. Причина: ${reason}`,
            task_id: taskId,
            sent_by: user.id,
            is_system: true
          }]);
      }

      // Добавляем системное сообщение о смене статуса
      const statusLabels = {
        'new': 'Новое',
        'in_progress': 'В работе',
        'on_verification': 'На проверке',
        'completed': 'Завершено',
        'overdue': 'Просрочено',
      };
      await supabase
        .from('messages')
        .insert([{
          content: `Статус изменён на: ${statusLabels[newStatus] || newStatus}`,
          task_id: taskId,
          sent_by: user.id,
        }]);

      // Получаем обновлённую задачу и обновляем selectedTask
      const { data: updatedTask, error: fetchError } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single();
      if (!fetchError && updatedTask) {
        selectTask({
          ...selectedTask,
          ...updatedTask,
        });
      }

      // Обновляем локальное состояние через контекст
      if (newStatus === 'completed') {
        completeTask(selectedTask);
      }

    } catch (error) {
      console.error('Ошибка при обновлении статуса:', error);
      throw error;
    }
  };

  const handleRejectTask = async () => {
    if (!rejectReason.trim()) {
      alert('Пожалуйста, укажите причину отклонения');
      return;
    }
    
    try {
      await updateTaskStatus(selectedTask.id, 'canceled', rejectReason);
      
      // Добавляем сообщение в локальное состояние
      const newSystemMessage = {
        id: Date.now().toString(), // временный ID
        content: `Поручение отклонено. Причина: ${rejectReason}`,
        task_id: selectedTask.id,
        sent_by: user.id,
        is_system: true,
        created_at: new Date().toISOString()
      };
      
      setChatMessages(prev => [...prev, newSystemMessage]);
      
      setRejectReason('');
      setShowRejectDialog(false);
      setIsStatusConfirmOpen(false);
    } catch (error) {
      alert('Не удалось отклонить поручение');
    }
  };

  const handleReassign = async () => {
    if (!reassignTo) return;

    try {
      await reassignTask(
        selectedTask.id, 
        reassignTo, 
        newTitle || undefined,
        newDescription || undefined,
        newDeadline
      );
      // Добавить системное сообщение о смене исполнителя
      const newAssignee = users.find(u => u.id === reassignTo);
      if (newAssignee) {
        await supabase
          .from('messages')
          .insert([{
            content: `Исполнитель изменён на: ${newAssignee.fullname}`,
            task_id: selectedTask.id,
            sent_by: user.id,
          }]);
      }
      setShowReassign(false);
    } catch (error) {
      console.error("Ошибка переназначения:", error);
    }
  };

  const calculateDeadlineDays = (deadlineDate: Date | string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(deadlineDate);
    deadline.setHours(0, 0, 0, 0);
    
    const diffTime = deadline.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return "Срок истекает сегодня!";
    } else if (diffDays < 0) {
      return `Срок истек ${Math.abs(diffDays)} ${getDayWord(Math.abs(diffDays))} назад!`;
    } else {
      return `Срок истекает через ${diffDays} ${getDayWord(diffDays)}!`;
    }
  };

  const getDayWord = (days: number) => {
    if (days % 10 === 1 && days % 100 !== 11) {
      return 'день';
    } else if ([2, 3, 4].includes(days % 10) && ![12, 13, 14].includes(days % 100)) {
      return 'дня';
    } else {
      return 'дней';
    }
  };

  // Функция для определения доступных статусов
  function getAvailableStatuses() {
    if (!selectedTask || !user) return [];
    const isExecutor = user.id === selectedTask.assignedTo;
    const isCreator = user.id === selectedTask.createdBy;
    const status = selectedTask.status;
    if (status === 'new' && isExecutor) {
      return [{ value: 'in_progress', label: 'В работе' }];
    }
    if (status === 'in_progress' && isExecutor) {
      return [{ value: 'on_verification', label: 'На проверке' }];
    }
    if (status === 'on_verification' && isCreator) {
      return [
        { value: 'completed', label: 'Завершено' },
        { value: 'in_progress', label: 'В работе (вернуть на доработку)' },
      ];
    }
    return [];
  }

  if (!selectedTask) {
    return (
      <div className="w-full h-screen flex items-center justify-center text-gray-500">
        <p>Выберите поручение для просмотра деталей</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col relative">
      {/* Шапка с информацией о задаче */}
      <div className="py-[16px] pl-[20px] pr-[30px] border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center">
          {creator && assignee && (
            <>
              <Avatar className="h-10 w-10 mr-3">
                <AvatarImage src={creator.id === user.id ? assignee.image : creator.image} 
                  alt={creator.id === user.id ? assignee.name : creator.name} />
              </Avatar>
              <span className="font-medium">
                {creator.id === user.id ? assignee.fullname : creator.fullname}
              </span>
            </>
          )}
        </div>
        
        {/* Кнопки управления задачей */}
        <div className="flex items-center space-x-2">
          {/* Кнопка для открытия модального окна смены статуса */}
          <Button
            className={`rounded-full h-[36px] px-4 ${
              selectedTask.status === 'completed' ? 'bg-green-500' :
              selectedTask.status === 'new' ? 'bg-gray-400' :
              selectedTask.status === 'in_progress' ? 'bg-blue-400' :
              selectedTask.status === 'on_verification' ? 'bg-yellow-400' :
              selectedTask.status === 'overdue' ? 'bg-red-700' :
              'bg-red-400'
            }`}
            onClick={() => {
              setIsStatusConfirmOpen(true);
              setNextStatus(null);
              setStatusComment('');
            }}
          >
            {selectedTask.status === 'completed' ? 'Завершена' :
              selectedTask.status === 'new' ? 'Новое' :
              selectedTask.status === 'on_verification' ? 'На проверке' :
              selectedTask.status === 'in_progress' ? 'В работе' :
              selectedTask.status === 'overdue' ? 'Просрочена' :
              selectedTask.status}
          </Button>
          <Dialog open={isStatusConfirmOpen} onOpenChange={setIsStatusConfirmOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Смена статуса поручения</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <div className="mb-4">
                  <Label>Доступные статусы:</Label>
                  <div className="flex flex-col gap-2 mt-2">
                    {getAvailableStatuses().map(opt => (
                      <label key={opt.value} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="status"
                          value={opt.value}
                          checked={nextStatus === opt.value}
                          onChange={() => setNextStatus(opt.value)}
                        />
                        {opt.label}
                      </label>
                    ))}
                    {getAvailableStatuses().length === 0 && (
                      <span className="text-gray-500 text-sm">Нет доступных статусов для смены</span>
                    )}
                  </div>
                </div>
                {/* Комментарий обязателен, если постановщик возвращает задачу на доработку */}
                {selectedTask.status === 'on_verification' && user.id === selectedTask.createdBy && nextStatus === 'in_progress' && (
                  <div className="mb-2">
                    <Label>Комментарий для исполнителя <span className="text-red-500">*</span></Label>
                    <Textarea
                      value={statusComment}
                      onChange={e => setStatusComment(e.target.value)}
                      placeholder="Опишите, что нужно доработать..."
                      className="min-h-[80px]"
                    />
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsStatusConfirmOpen(false)}>
                  Отмена
                </Button>
                <Button
                  onClick={async () => {
                    if (!nextStatus) return;
                    if (selectedTask.status === 'on_verification' && user.id === selectedTask.createdBy && nextStatus === 'in_progress' && !statusComment.trim()) {
                      return;
                    }
                    // Если возвращаем на доработку, добавить комментарий
                    if (selectedTask.status === 'on_verification' && user.id === selectedTask.createdBy && nextStatus === 'in_progress') {
                      await updateTaskStatus(selectedTask.id, nextStatus, statusComment);
                    } else {
                      await updateTaskStatus(selectedTask.id, nextStatus);
                    }
                    setIsStatusConfirmOpen(false);
                  }}
                  disabled={
                    !nextStatus ||
                    (selectedTask.status === 'on_verification' && user.id === selectedTask.createdBy && nextStatus === 'in_progress' && !statusComment.trim())
                  }
                >
                  Подтвердить
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Диалог указания причины отклонения */}
          <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Причина отклонения</DialogTitle>
                <DialogDescription>
                  Пожалуйста, укажите причину отклонения этого поручения
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Введите причину отклонения..."
                  className="min-h-[100px]"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowRejectDialog(false)}
                >
                  Отмена
                </Button>
                <Button 
                  onClick={handleRejectTask}
                  disabled={!rejectReason.trim()}
                >
                  Подтвердить отклонение
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Кнопка переназначения */}
          <Dialog open={showReassign} onOpenChange={setShowReassign}>
            <DialogTrigger asChild>
              <Button className='bg-[#f1f4fd] rounded-full h-[36px] w-[36px]'>
                <svg className='text-[#7a7e9d] h-[36px] w-[36px] font-bold' xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Переназначить поручение</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="reassign-to">Переназначить</Label>
                  <Select value={reassignTo} onValueChange={setReassignTo}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите сотрудника" />
                    </SelectTrigger>
                    <SelectContent>
                      {users
                        .filter(user => user.id !== selectedTask.assignedTo)
                        .map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.fullname}
                          </SelectItem>
                        ))
                      }
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="new-title">Новый заголовок (Опционально)</Label>
                  <Input 
                    id="new-title" 
                    placeholder={selectedTask.title}
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="new-description">Новое описание (Опционально)</Label>
                  <Textarea 
                    id="new-description" 
                    placeholder={selectedTask.description}
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Новый дедлайн (Опционально)</Label>
                  <Input 
                    type="date"
                    value={newDeadline ? format(newDeadline, 'yyyy-MM-dd') : ''}
                    onChange={(e) => setNewDeadline(e.target.value ? new Date(e.target.value) : undefined)}
                    className="w-full"
                  />
                </div>
                
                <Button onClick={handleReassign} className="w-full">
                  Переназначить поручение
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Кнопка протокола */}
          <div className="relative group">
            <Button 
              onClick={() => toggleProtocol(selectedTask.id)}
              className={`rounded-full h-[36px] w-[36px] ${
                selectedTask.isProtocol === 'active' ? 'bg-blue-500' : 'bg-[#f1f4fd]'
              }`}
            >
              <svg 
                className={`h-[36px] w-[36px] font-bold ${
                  selectedTask.isProtocol === 'active' ? 'text-white' : 'text-[#7a7e9d]'
                }`} 
                xmlns="http://www.w3.org/2000/svg" 
                width="24" 
                height="24" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82zM7 7h.01"></path>
              </svg>
            </Button>
            <div className="absolute z-10 top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 text-xs font-medium text-white bg-gray-800 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
              {selectedTask.isProtocol === 'active' ? 'Протокол активен' : 'Протокол неактивен'}
            </div>
          </div>
          
          {/* Кнопка удаления (только для создателя и завершенных задач) */}
          {selectedTask.createdBy === user.id && selectedTask.status === 'completed' && (
            <>
              <Button 
                className='bg-[#f1f4fd] rounded-full h-[36px] w-[36px]'
                onClick={() => setShowDeleteDialog(true)}
              >
                <svg className='text-[#7a7e9d] h-[36px] w-[36px]' xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"></path>
                </svg>
              </Button>
              <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Удалить поручение?</DialogTitle>
                    <DialogDescription>Вы уверены, что хотите удалить это поручение? Это действие необратимо.</DialogDescription>
                  </DialogHeader>
                  <div className="flex justify-end gap-2 mt-4">
                    <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                      Отмена
                    </Button>
                    <Button variant="destructive" onClick={() => { deleteTask(selectedTask.id); setShowDeleteDialog(false); }}>
                      Удалить
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>
      
              {/* Основное содержимое поручения */}
      <div className="flex flex-col flex-1 overflow-auto p-[30px]">
        {/* Заголовок и статус */}
        <div className="flex items-center gap-[15px] mb-6">
          <div className={cn(
            "h-[46px] w-[46px] rounded-full flex items-center justify-center",
            selectedTask.status === 'completed' ? 'bg-green-500' : 
            selectedTask.status === 'new' ? 'bg-gray-400' :
            selectedTask.status === 'in_progress' ? 'bg-blue-400' :
            selectedTask.status === 'on_verification' ? 'bg-yellow-400':
            selectedTask.status === 'overdue' ? 'bg-red-700':
            'bg-red-400'
          )}>
            {selectedTask.status === "completed" ? (
              <Check className="h-6 w-6 text-white" />
            ) : (
              <Check className="h-6 w-6 text-transparent" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{selectedTask.title}</h1>
            {/* Исполнитель поручения */}
            {assignee && (
              <div className="flex items-center mt-1 text-sm text-gray-600">
                <Avatar className="h-6 w-6 mr-2">
                  <AvatarImage src={assignee.image} alt={assignee.fullname} />
                  <AvatarFallback>{assignee.fullname?.slice(0,2)}</AvatarFallback>
                </Avatar>
                <span>Исполнитель: {assignee.fullname}</span>
              </div>
            )}
          </div>
        </div>

        {/* Разделитель */}
        <hr className="border-t border-gray-500 mb-8 ml-[65px]" />
        
        {/* Дата и метки */}
        <div className="mb-6 ml-[65px] flex items-center gap-4">
          <span className="inline-block px-3 py-1 text-sm text-blue-800 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-full shadow-sm">
            {format(new Date(selectedTask.createdAt), 'dd MMM, yyyy', { locale: ru })}
          </span>
          
          {/* Приоритет */}
          {selectedTask.priority === 'high' && (
            <span className={`inline-block px-3 py-1 text-sm rounded-full shadow-sm 
              text-red-800 bg-gradient-to-r from-red-50 to-red-100 border border-red-200`}>
              Приоритет: высокий
            </span>
          )}
          
          {/* Дедлайн */}
          {selectedTask.deadline && (
            <span className="inline-block px-3 py-1 text-sm text-purple-800 bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 rounded-full shadow-sm">
              {calculateDeadlineDays(selectedTask.deadline)}
            </span>
          )}
        </div>
        
        {/* Описание поручения */}
        <div className="mb-8 ml-[65px]">
          <p className="text-gray-700">{selectedTask.description}</p>
        </div>
        
        {/* Разделитель */}
        <hr className="border-t border-gray-500 mb-8 ml-[65px] mt-8" />
        
        {/* Чат поручения */}
        <div className="flex-1 mt-8 pt-4 pb-16 ml-[65px]">
          <div className="h-full overflow-y-auto mb-4 rounded-md">
            {chatMessages.map(msg => (
              <div 
                key={msg.id} 
                className={`mb-2 p-2 rounded-md relative pr-12 ${
                  msg.is_system 
                    ? 'bg-gray-100 mx-auto text-center italic max-w-[80%]' 
                    : msg.sent_by === user.id 
                      ? 'ml-auto bg-blue-100 max-w-[80%]' 
                      : 'bg-gray-100 max-w-[80%]'
                }`}
              >
                <div className="break-all whitespace-pre-wrap">
                  {msg.content}
                </div>
                <span className={`text-xs absolute bottom-1 right-2 ${
                  msg.sent_by === user.id ? 'text-blue-600' : 'text-gray-600'
                }`}>
                  {format(new Date(msg.created_at), 'dd.MM HH:mm')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Поле ввода сообщения */}
      <div className="absolute bottom-0 left-0 right-0 flex">
        <div className="w-full h-[57px] border-t border-gray-200 bg-white flex">
          <Input 
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            placeholder="Напишите сообщение..."
            className="flex-1 py-[20px] pl-[16px] pr-[30px] outline-none h-full text-[15px] rounded-none bg-[#f6f7fb]"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSendChatMessage();
              }
            }}
          />
          <Button 
            onClick={handleSendChatMessage} 
            className='w-[55px] h-full bg-[#4d76fd] rounded-none'
            disabled={!chatMessage.trim()}
          >
            <Send size={30} />
          </Button>
        </div>
      </div>
    </div>
  );
}