
import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Mail, Bell, ChevronDown, ChevronUp } from "lucide-react";
import { useTaskContext } from '@/contexts/TaskContext';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent
} from '@/components/ui/collapsible';

// Add the props interface for LeftSidebar
interface LeftSidebarProps {
  onItemClick?: () => void;
}

export default function LeftSidebar({ onItemClick }: LeftSidebarProps) {
  const { 
    currentUser, 
    departments, 
    selectDepartment, 
    getUserById, 
    users,
    addDepartment,
    getSubordinates,
    getDepartmentByUserId
  } = useTaskContext();
  
  const [showNewDepartment, setShowNewDepartment] = useState(false);
  const [newDeptName, setNewDeptName] = useState("");
  const [newDeptManager, setNewDeptManager] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  
  const [showNewNotifications, setShowNewNotifications] = useState(false);
  const [showOverdueNotifications, setShowOverdueNotifications] = useState(false);
  const [expandedDepartments, setExpandedDepartments] = useState<string[]>([]);
  
  const subordinates = getSubordinates();
  
  const handleCreateDepartment = () => {
    if (newDeptName && newDeptManager) {
      addDepartment(newDeptName, newDeptManager, selectedUsers);
      setNewDeptName("");
      setNewDeptManager("");
      setSelectedUsers([]);
      setShowNewDepartment(false);
    }
  };

  const toggleDepartment = (departmentId: string) => {
    setExpandedDepartments(prev => 
      prev.includes(departmentId) 
        ? prev.filter(id => id !== departmentId) 
        : [...prev, departmentId]
    );
  };

  const handleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId) 
        : [...prev, userId]
    );
  };

  return (
    <div className="w-64 flex flex-col h-screen bg-white border-r border-gray-200">
      {/* User Info */}
      <div className="flex flex-col items-center py-6 border-b border-gray-200">
        <Avatar className="h-20 w-20 mb-2">
          <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
          <AvatarFallback>{currentUser.name.slice(0, 2)}</AvatarFallback>
        </Avatar>
        <h3 className="text-lg font-medium">{currentUser.name}</h3>
        <p className="text-sm text-gray-500">{currentUser.email}</p>
      </div>
      
      {/* Action Buttons */}
      <div className="flex justify-center py-4 border-b border-gray-200">
        <Dialog open={showNewDepartment} onOpenChange={setShowNewDepartment}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Settings className="h-5 w-5" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Создать новое подразделение</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="department-name">Название подразделения</Label>
                <Input 
                  id="department-name" 
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  placeholder="Введите название подразделения"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department-manager">Руководитель подразделения</Label>
                <Select value={newDeptManager} onValueChange={setNewDeptManager}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите руководителя" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Сотрудники подразделения</Label>
                <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
                  {users
                    .filter(user => user.id !== currentUser.id && user.id !== newDeptManager)
                    .map((user) => {
                      const userDepartment = getDepartmentByUserId(user.id);
                      return (
                        <div key={user.id} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`user-${user.id}`} 
                            checked={selectedUsers.includes(user.id)}
                            onCheckedChange={() => handleUserSelection(user.id)}
                          />
                          <Label htmlFor={`user-${user.id}`} className="flex items-center">
                            <Avatar className="h-6 w-6 mr-2">
                              <AvatarImage src={user.avatar} alt={user.name} />
                              <AvatarFallback>{user.name.slice(0, 2)}</AvatarFallback>
                            </Avatar>
                            <span>{user.name}</span>
                            {userDepartment && (
                              <span className="text-xs text-gray-500 ml-1">
                                ({userDepartment.name})
                              </span>
                            )}
                          </Label>
                        </div>
                      );
                    })
                  }
                </div>
              </div>
              <Button onClick={handleCreateDepartment} className="w-full">
                Создать подразделение
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showNewNotifications} onOpenChange={setShowNewNotifications}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="relative ml-2">
              <Mail className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                2
              </span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Новые задачи</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <div className="p-3 border rounded-md">
                <p className="font-medium">Новая задача: Обзор дизайна</p>
                <p className="text-sm text-gray-500">Назначил: Иванов Иван</p>
              </div>
              <div className="p-3 border rounded-md">
                <p className="font-medium">Новая задача: Обновление сайта</p>
                <p className="text-sm text-gray-500">Назначил: Петрова Мария</p>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showOverdueNotifications} onOpenChange={setShowOverdueNotifications}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="relative ml-2">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                3
              </span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Просроченные задачи</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <div className="p-3 border rounded-md">
                <p className="font-medium">Просрочено: Маркетинговый отчет</p>
                <p className="text-sm text-red-500">Просрочено на 3 дня</p>
              </div>
              <div className="p-3 border rounded-md">
                <p className="font-medium">Просрочено: Презентация для клиента</p>
                <p className="text-sm text-red-500">Просрочено на 1 день</p>
              </div>
              <div className="p-3 border rounded-md">
                <p className="font-medium">Просрочено: Планирование бюджета</p>
                <p className="text-sm text-red-500">Просрочено на 5 дней</p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Stats */}
      <div className="flex justify-between p-4 border-b border-gray-200">
        <div className="text-center">
          <p className="text-2xl font-bold">12</p>
          <p className="text-xs text-gray-500">Завершено</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold">22</p>
          <p className="text-xs text-gray-500">Нужно сделать</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold">243</p>
          <p className="text-xs text-gray-500">Всего завершено</p>
        </div>
      </div>
      
      {/* Departments */}
      <div className="p-4 border-b border-gray-200">
        <h4 className="text-sm font-medium uppercase tracking-wider mb-4">ПОДРАЗДЕЛЕНИЯ</h4>
        <ul className="space-y-2">
          {departments.map((department) => (
            <Collapsible 
              key={department.id}
              className="border border-gray-100 rounded-sm"
              open={expandedDepartments.includes(department.id)}
            >
              <CollapsibleTrigger asChild>
                <div 
                  className="flex items-center justify-between cursor-pointer hover:bg-gray-100 p-2 rounded"
                  onClick={() => toggleDepartment(department.id)}
                >
                  <div className="flex items-center">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: department.color }} />
                    <span className="ml-2 text-sm">{department.name.toLowerCase()}</span>
                  </div>
                  {expandedDepartments.includes(department.id) 
                    ? <ChevronUp className="h-4 w-4" /> 
                    : <ChevronDown className="h-4 w-4" />
                  }
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="p-2 bg-gray-50 text-sm">
                <p>Руководитель: {getUserById(department.managerId)?.name}</p>
                <p>Количество сотрудников: {
                  users.filter(user => 
                    getDepartmentByUserId(user.id)?.id === department.id
                  ).length
                }</p>
                <p>Задачи: активные/завершенные</p>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </ul>
      </div>
      
      {/* Subordinates */}
      <div className="p-4">
        <h4 className="text-sm font-medium uppercase tracking-wider mb-4">СОТРУДНИКИ</h4>
        <div className="flex flex-wrap gap-2">
          {subordinates.map((user) => (
            <Avatar key={user.id} className="h-10 w-10">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback>{user.name.slice(0, 2)}</AvatarFallback>
            </Avatar>
          ))}
        </div>
      </div>

      {/* Simple Chat Component */}
      <DepartmentChat />
    </div>
  );
}

// Simple chat component
function DepartmentChat() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([
    { id: '1', content: 'Привет, как дела?', sender: 'system' },
    { id: '2', content: 'Добрый день! Как продвигается проект?', sender: 'system' }
  ]);

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

  const handleSendMessage = () => {
    if (message.trim()) {
      // Add user message
      const newUserMessage = {
        id: `user-${Date.now()}`,
        content: message,
        sender: 'user'
      };
      
      // Generate random response
      const responseMessage = {
        id: `system-${Date.now()}`,
        content: generateRandomMessage(),
        sender: 'system'
      };
      
      setMessages([...messages, newUserMessage, responseMessage]);
      setMessage('');
    }
  };

  return (
    <div className="mt-auto border-t border-gray-200 p-4">
      <h4 className="text-sm font-medium uppercase tracking-wider mb-4">ЧАТ</h4>
      <div className="h-48 overflow-y-auto mb-4 p-2 border border-gray-200 rounded-md">
        {messages.map(msg => (
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
      <div className="flex">
        <Input 
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Сообщение..."
          className="mr-2"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSendMessage();
            }
          }}
        />
        <Button onClick={handleSendMessage} size="sm">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
