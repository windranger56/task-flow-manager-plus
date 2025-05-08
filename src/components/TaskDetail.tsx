
import React, { useState } from 'react';
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
import { Trash2, User, Ticket, Check, Send } from "lucide-react";
import { useTaskContext } from '@/contexts/TaskContext';
import { cn } from '@/lib/utils';
import { ru } from 'date-fns/locale';

export default function TaskDetail() {
  const { 
    selectedTask, 
    getUserById, 
    deleteTask, 
    reassignTask, 
    toggleProtocol, 
    completeTask,
    messages,
    getMessagesByTask,
    addMessage,
    users
  } = useTaskContext();
  
  const [messageText, setMessageText] = useState('');
  const [showReassign, setShowReassign] = useState(false);
  const [reassignTo, setReassignTo] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newDeadline, setNewDeadline] = useState<Date | undefined>(undefined);
  
  // Состояние для чата
  const [chatMessage, setChatMessage] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { id: '1', content: 'Привет, как дела?', sender: 'system' },
    { id: '2', content: 'Добрый день! Как продвигается проект?', sender: 'system' }
  ]);
  
  if (!selectedTask) {
    return (
      <div className="w-full h-screen flex items-center justify-center text-gray-500">
        <p>Выберите задачу для просмотра деталей</p>
      </div>
    );
  }
  
  const creator = getUserById(selectedTask.createdBy);
  const assignee = getUserById(selectedTask.assignedTo);
  const taskMessages = getMessagesByTask(selectedTask.id);
  
  const handleSendMessage = () => {
    if (messageText.trim()) {
      addMessage(selectedTask.id, messageText);
      setMessageText('');
    }
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

  // Функция отправки сообщения в чат
  const handleSendChatMessage = () => {
    if (chatMessage.trim()) {
      // Добавляем сообщение пользователя
      const newUserMessage = {
        id: `user-${Date.now()}`,
        content: chatMessage,
        sender: 'user'
      };
      
      // Генерируем случайный ответ
      const responseMessage = {
        id: `system-${Date.now()}`,
        content: generateRandomMessage(),
        sender: 'system'
      };
      
      setChatMessages([...chatMessages, newUserMessage, responseMessage]);
      setChatMessage('');
    }
  };

  return (
    <div className="w-full h-screen flex flex-col relative">
      {/* Task Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center">
          {creator && (
            <>
              <Avatar className="h-10 w-10 mr-3">
                <AvatarImage src={creator.avatar} alt={creator.name} />
                <AvatarFallback>{creator.name.slice(0, 2)}</AvatarFallback>
              </Avatar>
              <span className="font-medium">{creator.name}</span>
            </>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => deleteTask(selectedTask.id)}
          >
            <Trash2 className="h-5 w-5 text-gray-600" />
          </Button>
          
          <Dialog open={showReassign} onOpenChange={setShowReassign}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon">
                <User className="h-5 w-5 text-gray-600" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Переназначить задачу</DialogTitle>
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
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left">
                        {newDeadline ? (
                          format(newDeadline, 'PPP', { locale: ru })
                        ) : (
                          <span>Текущий: {format(selectedTask.deadline, 'PPP', { locale: ru })}</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 pointer-events-auto">
                      <Calendar
                        mode="single"
                        selected={newDeadline}
                        onSelect={(date) => setNewDeadline(date || undefined)}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <Button onClick={handleReassign} className="w-full">
                  Переназначить задачу
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => toggleProtocol(selectedTask.id)}
            className={cn(
              selectedTask.isProtocol ? "bg-blue-100" : ""
            )}
          >
            <Ticket className={cn(
              "h-5 w-5",
              selectedTask.isProtocol ? "text-taskBlue" : "text-gray-600"
            )} />
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => completeTask(selectedTask.id)}
            disabled={selectedTask.completed}
          >
            <Check className="h-5 w-5 text-gray-600" />
          </Button>
        </div>
      </div>
      
      {/* Task Content */}
      <div className="flex-1 overflow-auto p-4 pb-20">
        {/* Task Title & Status */}
        <div className="flex items-center space-x-3 mb-6">
          <div className={cn(
            "h-10 w-10 rounded-full flex items-center justify-center",
            selectedTask.completed ? "bg-taskBlue" : "bg-gray-200"
          )}>
            {selectedTask.completed && <Check className="h-6 w-6 text-white" />}
          </div>
          <h1 className="text-2xl font-bold">{selectedTask.title}</h1>
        </div>
        
        {/* Date */}
        <p className="text-sm text-gray-500 mb-6">
          {format(selectedTask.createdAt, 'dd MMM, yyyy', { locale: ru })}
        </p>
        
        {/* Task Description */}
        <div className="mb-8">
          <p className="text-gray-700">{selectedTask.description}</p>
        </div>
        
        {/* Task Messages */}
        <div className="space-y-4">
          {taskMessages.map((message) => {
            const messageUser = getUserById(message.userId);
            return (
              <div key={message.id} className="flex">
                {messageUser && (
                  <Avatar className="h-8 w-8 mr-3 mt-1">
                    <AvatarImage src={messageUser.avatar} alt={messageUser.name} />
                    <AvatarFallback>{messageUser.name.slice(0, 2)}</AvatarFallback>
                  </Avatar>
                )}
                <div>
                  <div className="flex items-center">
                    <span className="font-medium">{messageUser?.name}</span>
                    <span className="text-xs text-gray-500 ml-2">
                      {format(message.timestamp, 'dd MMM, yyyy', { locale: ru })}
                    </span>
                  </div>
                  <p className="text-gray-700">{message.content}</p>
                </div>
              </div>
            );
          })}
          
          {/* Task Actions */}
          {selectedTask.assignedTo === assignee?.id && (
            <div className="mt-4">
              <div className="flex items-center mb-2">
                <span className="text-sm text-gray-500">Задача назначена {assignee.name}</span>
                <span className="text-xs text-gray-500 ml-4">
                  {format(selectedTask.createdAt, 'dd MMM, yyyy', { locale: ru })}
                </span>
              </div>
              <div className="flex items-center mb-2">
                <span className="text-sm text-gray-500">Добавлено в подразделение</span>
                <span className="text-xs text-gray-500 ml-4">
                  {format(selectedTask.createdAt, 'dd MMM, yyyy', { locale: ru })}
                </span>
              </div>
              <div className="flex items-center mb-2">
                <span className="text-sm text-gray-500">Задача создана</span>
                <span className="text-xs text-gray-500 ml-4">
                  {format(selectedTask.createdAt, 'dd MMM, yyyy', { locale: ru })}
                </span>
              </div>
              {selectedTask.completed && (
                <div className="flex items-center">
                  <span className="text-sm text-green-500">Задача завершена</span>
                  <span className="text-xs text-gray-500 ml-4">
                    {format(new Date(), 'dd MMM, yyyy', { locale: ru })}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Чат интерфейс */}
        <div className="mt-8 border-t pt-4 pb-16">
          <h3 className="text-sm font-medium uppercase tracking-wider mb-4">ЧАТ</h3>
          <div className="h-48 overflow-y-auto mb-4 p-2 border border-gray-200 rounded-md">
            {chatMessages.map(msg => (
              <div 
                key={msg.id} 
                className={`mb-2 p-2 rounded-md ${
                  msg.sender === 'user' 
                    ? 'ml-auto bg-blue-100 max-w-[80%]' 
                    : 'bg-gray-100 max-w-[80%]'
                }`}
              >
                {msg.content}
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Сообщения и чат сообщения в нижней части с абсолютным позиционированием */}
      <div className="absolute bottom-0 left-0 right-0 flex">
        <div className="w-1/2 p-4 border-t border-r border-gray-200 bg-white flex">
          <Input 
            className="flex-1 mr-2"
            placeholder="Написать комментарий..."
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSendMessage();
              }
            }}
          />
          <Button size="icon" onClick={handleSendMessage}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <div className="w-1/2 p-4 border-t border-gray-200 bg-white flex">
          <Input 
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            placeholder="Чат сообщение..."
            className="flex-1 mr-2"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSendChatMessage();
              }
            }}
          />
          <Button onClick={handleSendChatMessage} size="sm">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

