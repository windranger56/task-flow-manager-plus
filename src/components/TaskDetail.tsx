import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Ticket, Check, Send } from "lucide-react";
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
    messages,
    getMessagesByTask,
    addMessage,
    users,
		currentUser
  } = useTaskContext();
  
  const [messageText, setMessageText] = useState('');
  const [showReassign, setShowReassign] = useState(false);
  const [reassignTo, setReassignTo] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newDeadline, setNewDeadline] = useState<Date | undefined>(undefined);
	const [creator, setCreator] = useState<any>(null)
	const [assignee, setAssignee] = useState<any>(null)
  const [isStatusConfirmOpen, setIsStatusConfirmOpen] = useState(false);
  
  // Состояние для чата
  const [chatMessage, setChatMessage] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
	useEffect(() => {
		(async () => {
			if(!selectedTask) return
			supabase
				.channel(`task-${selectedTask.id}-messages`)
				.on(
					'postgres_changes',
					{
						event: '*', // or 'INSERT', 'UPDATE', 'DELETE'
						schema: 'public',
						table: 'messages',
						filter: `task_id=eq.${selectedTask.id}`,
					},
					(payload) => {
						console.log(payload)
						if(payload.eventType == 'INSERT') setChatMessages(p => [...p, payload.new])
						else if (payload.eventType == 'UPDATE') setChatMessages(p => {
							const n = [...p]
							n[n.findIndex(m => m.id == payload.old.id)] = payload.new
							return n
						})
						else setChatMessages(p => p.filter(m => m.id != payload.old.id))
					}
				)
				.subscribe()
			
			
			setChatMessages([])
			setCreator(null)
			setAssignee(null)
			const {data, error} = await supabase
				.from('messages')
				.select()
				.eq('task_id', selectedTask.id)
			
			if(error) {
				alert("Can't get task messages")
				return
			}

			setChatMessages(data)
			setCreator(user.id == selectedTask.createdBy ? user : await getUserById(selectedTask.createdBy));
			setAssignee(user.id == selectedTask.assignedTo ? user : await getUserById(selectedTask.assignedTo));
		})()
	}, [selectedTask])

	useEffect(() => {console.log("creator:", creator, "\nassignee:", assignee)}, [assignee])
  
  if (!selectedTask) {
    return (
      <div className="w-full h-screen flex items-center justify-center text-gray-500">
        <p>Выберите поручение для просмотра деталей</p>
      </div>
    );
  }

  const taskMessages = getMessagesByTask(selectedTask.id);
  
  const handleSendMessage = () => {
    if (messageText.trim()) {
      addMessage(selectedTask.id, messageText);
      setMessageText('');
    }
  };
  
  // Изменение для использования нативного датапикера
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value ? new Date(e.target.value) : undefined;
    setNewDeadline(date);
  };
  
  const handleReassign = () => {
    if (reassignTo) {
      reassignTask(
        selectedTask.id, 
        reassignTo, 
        newTitle || undefined,
        newDescription || undefined,
        newDeadline
      );
      setShowReassign(false);
    }
  };

  // Функция для генерации случайного русского сообщения
  const generateRandomMessage = () => {
    const characters = 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдеёжзийклмнопрстуфхцчшщъыьэюя';
    let result = '';
    const words = Math.floor(Math.random() * 5) + 1;
    
    for (let w = 0; w < words; w++) {
      const length = Math.floor(Math.random() * 8) + 3;
      for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      result += ' ';
    }
    
    return result.trim();
  };

  
  function calculateDeadlineDays(deadlineDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(deadlineDate);
    deadline.setHours(0, 0, 0, 0);
    
    const diffTime = deadline - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return "Срок истекает сегодня!";
    } else if (diffDays < 0) {
      return `Срок истек ${Math.abs(diffDays)} ${getDayWord(Math.abs(diffDays))} назад!`;
    } else {
      return `Срок истекает через ${diffDays} ${getDayWord(diffDays)}!`;
    }
  }
  
  function getDayWord(days) {
    if (days % 10 === 1 && days % 100 !== 11) {
      return 'день';
    } else if ([2, 3, 4].includes(days % 10) && ![12, 13, 14].includes(days % 100)) {
      return 'дня';
    } else {
      return 'дней';
    }
  }

  // Функция отправки сообщения в чат
  const handleSendChatMessage = async () => {
    if (chatMessage.trim()) {
      // Добавляем сообщение пользователя
			await supabase
				.from('messages')
				.insert([{
					content: chatMessage,
					task_id: selectedTask.id,
					sent_by: user.id
				}])
      
      setChatMessage('');
    }
  };

  return (
    <div className="w-full h-full flex flex-col relative">
      {/* Task Header */}
      <div className="py-[16px] pl-[20px] pr-[30px] border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center">
					{creator && assignee && (
						<>
							<Avatar className="h-10 w-10 mr-3">
								<AvatarImage src={creator.id == user.id ? assignee.image : creator.image} alt={creator.id == user.id ? assignee.name : creator.name} />
							</Avatar>
							<span className="font-medium">{creator.id == user.id ? assignee.fullname : creator.fullname}</span>
						</>
					)}
        </div>
        <div className="flex items-center space-x-2">
        <Dialog open={isStatusConfirmOpen} onOpenChange={setIsStatusConfirmOpen}>
            <DialogTrigger asChild>
            <Button 
              className={`rounded-full h-[36px] px-4 ${
                selectedTask?.status === 'completed' ? 'bg-green-500' : 
                selectedTask?.status === 'new' ? 'bg-gray-400' :
                selectedTask?.status === 'in_progress' ? 'bg-blue-400' :
                selectedTask?.status === 'on_verification' ? 'bg-yellow-400':
              'bg-red-400'}`}
            >
              {selectedTask?.status === 'completed' ? 'Завершена' : 
              selectedTask?.status === 'new' ? 'Новое' :
              selectedTask?.status === 'on_verification' ? 'На проверке' :
              selectedTask?.status === 'in_progress' ? 'В работе' :
              'Просрочена'}
            </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Подтверждение</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <p>Вы действительно хотите изменить статус поручения?</p>
              </div>
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setIsStatusConfirmOpen(false)}
                >
                  Отмена
                </Button>
                <Button 
                  onClick={() => {
                    completeTask(selectedTask);
                    setIsStatusConfirmOpen(false);
                  }}
                >
                  Подтвердить
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          
          
          <Dialog open={showReassign} onOpenChange={setShowReassign}>
            <DialogTrigger asChild>
              <Button className='bg-[#f1f4fd] rounded-full h-[36px] w-[36px]'>
								<svg className='text-[#7a7e9d] h-[36px] w-[36px] font-bold' xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
                            {user.name}
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
                  {/* Заменяем кастомный календарь на нативный датапикер */}
                  <Input 
                    type="date"
                    value={newDeadline ? format(newDeadline, 'yyyy-MM-dd') : ''}
                    onChange={handleDateChange}
                    className="w-full"
                  />
                </div>
                
                <Button onClick={handleReassign} className="w-full">
                  Переназначить поручение
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          
          <Button 
            onClick={() => toggleProtocol(selectedTask.id)}
						className='bg-[#f1f4fd] rounded-full h-[36px] w-[36px]'
          >
						<svg className='text-[#7a7e9d] h-[36px] w-[36px] font-bold' xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      			 <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82zM7 7h.01"></path>
						</svg>
          </Button>
          
          {selectedTask.createdBy === user.id && selectedTask.status == 'completed' && (
            <Button 
              className='bg-[#f1f4fd] rounded-full h-[36px] w-[36px]'
              onClick={() => deleteTask(selectedTask.id)}
            >
              <svg className='text-[#7a7e9d] h-[36px] w-[36px]' xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"></path>
              </svg>
            </Button>
          )}
          
        </div>
      </div>
      
      {/* Task Content */}
      <div className="flex flex-col flex-1 overflow-auto p-[30px]">
        {/* Task Title & Status */}
        <div className="flex items-center gap-[15px] mb-6">
          <div className={cn(
            "h-[46px] w-[46px] rounded-full flex items-center justify-center",
                selectedTask?.status === 'completed' ? 'bg-green-500' : 
                selectedTask?.status === 'new' ? 'bg-gray-400' :
                selectedTask?.status === 'in_progress' ? 'bg-blue-400' :
                selectedTask?.status === 'on_verification' ? 'bg-yellow-400':
                'bg-red-400'

          )}>
            {selectedTask.status === "completed" ? (
              <Check className="h-6 w-6 text-white" />
            ) : (
              <Check className="h-6 w-6 text-transparent" />
            )}
          </div>
          <h1 className="text-2xl font-bold">{selectedTask.title}</h1>
        </div>

        {/* Divider */}
        <hr className="border-t border-gray-500 mb-8 ml-[65px]" />
        
        {/* Date */}
        <div className="mb-6 ml-[65px] flex items-center gap-4">
          <span className="inline-block px-3 py-1 text-sm text-blue-800 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-full shadow-sm">
            {format(selectedTask.createdAt, 'dd MMM, yyyy', { locale: ru })}
          </span>
          
          {/* Приоритет */}
          <span className={`inline-block px-3 py-1 text-sm rounded-full shadow-sm ${
            selectedTask.priority === 'high' 
              ? 'text-red-800 bg-gradient-to-r from-red-50 to-red-100 border border-red-200' 
              : selectedTask.priority === 'medium' 
                ? 'text-yellow-800 bg-gradient-to-r from-yellow-50 to-yellow-100 border border-yellow-200'
                : 'text-green-800 bg-gradient-to-r from-green-50 to-green-100 border border-green-200'
          }`}>
            Приоритет: {selectedTask.priority === 'high' ? 'высокий' : selectedTask.priority === 'medium' ? 'средний' : 'низкий'}
          </span>
          
          {/* Дедлайн */}
          {selectedTask.deadline && (
            <span className="inline-block px-3 py-1 text-sm text-purple-800 bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 rounded-full shadow-sm">
              {calculateDeadlineDays(selectedTask.deadline)}
            </span>
          )}
        </div>
        
        
        {/* Task Description */}
        <div className="mb-8  ml-[65px]">
          <p className="text-gray-700">{selectedTask.description}</p>
        </div>
        
        {/* Divider */}
        <hr className="border-t border-gray-500 mb-8 ml-[65px] mt-8" />
        
        {/* Чат интерфейс */}
        <div className="flex-1 mt-8 pt-4 pb-16 ml-[65px]">
          <div className="h-full overflow-y-auto mb-4 rounded-md">
            {chatMessages.map(msg => (
              <div 
                key={msg.id} 
                className={`mb-2 p-2 rounded-md relative pr-12 ${
                  msg.sent_by === user.id 
                    ? 'ml-auto bg-blue-100 max-w-[80%]' 
                    : 'bg-gray-100 max-w-[80%]'
                }`}
              >
                <div className="break-all whitespace-pre-wrap">
                  {msg.content}
                </div>
                <span className={`text-xs text-gray-500 absolute bottom-1 right-2 ${
                  msg.sent_by === user.id ? 'text-blue-600' : 'text-gray-600'
                }`}>
                  {format(new Date(msg.created_at), 'dd.MM HH:mm')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Сообщения и чат сообщения в нижней части с абсолютным позиционированием */}
      <div className="absolute bottom-0 left-0 right-0 flex">
        <div className="w-full h-[57px] border-t border-gray-200 bg-white flex">
          <Input 
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            placeholder="Чат сообщение..."
            className="flex-1 py-[20px] pl-[16px] pr-[30px] outline-none h-full text-[15px] rounded-none bg-[#f6f7fb]"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSendChatMessage();
              }
            }}
          />
          <Button onClick={handleSendChatMessage} className='w-[55px] h-full bg-[#4d76fd] rounded-none'>
            <Send size={30} />
          </Button>
        </div>
      </div>
    </div>
  );
}
