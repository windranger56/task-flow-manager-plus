import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, ChevronDown, ChevronUp, Plus, X } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useTaskContext } from '@/contexts/TaskContext';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  Drawer, 
  DrawerContent,
  DrawerClose,
} from '@/components/ui/drawer';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import TaskDetail from './TaskDetail';
import { supabase } from '@/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { ProtocolStatus, TaskStatus } from '@/types';

export default function TaskList() {
  const { 
    tasks, 
    departments, 
    selectedDepartment,
    selectTask,
    users,
    selectedTask,
    addTask,
    completeTask
  } = useTaskContext();
  
  const [showNewTask, setShowNewTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskDepartment, setTaskDepartment] = useState("");
  const [taskAssignee, setTaskAssignee] = useState("");
  const [taskPriority, setTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [taskProtocol, setTaskProtocol] = useState<ProtocolStatus>('inactive');
  const [taskDeadline, setTaskDeadline] = useState<Date>(new Date());
  
  // Состояние для хранения списка пользователей из БД
  const [dbUsers, setDbUsers] = useState<{id: string, fullname: string}[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  
  // Загрузка пользователей при открытии диалога и автоматический выбор подразделения
  useEffect(() => {
    if (showNewTask) {
      fetchUsers();
      
      // Если у пользователя только одно подразделение, выбираем его автоматически
      if (departments.length === 1) {
        setTaskDepartment(departments[0].id);
        // После выбора подразделения, fetchDepartmentUsers будет вызван через другой useEffect
      }
    } else {
      // Сбрасываем выбранное подразделение при закрытии формы
      setTaskDepartment("");
      setTaskAssignee("");
    }
  }, [showNewTask, departments.length]);
  
  // Загрузка руководителя при выборе подразделения
  useEffect(() => {
    if (selectedDepartment) {
      fetchDepartmentManager(selectedDepartment.id);
    }
  }, [selectedDepartment]);
  
  // Загрузка пользователей при выборе подразделения для задачи
  useEffect(() => {
    if (taskDepartment) {
      fetchDepartmentUsers(taskDepartment);
    }
  }, [taskDepartment]);
  
  // Функция для загрузки всех пользователей из базы данных
  const fetchUsers = async () => {
    try {
      setIsLoadingUsers(true);
      
      const { data, error } = await supabase
        .from('users')
        .select('id, fullname')
        .order('fullname');
        
      if (error) {
        console.error("Ошибка при загрузке пользователей:", error);
        toast({ 
          title: "Ошибка", 
          description: "Не удалось загрузить список пользователей",
          variant: "destructive" 
        });
        return;
      }
      
      if (data) {
        setDbUsers(data);
      }
    } catch (error) {
      console.error("Ошибка при загрузке пользователей:", error);
    } finally {
      setIsLoadingUsers(false);
    }
  };
  
  // Функция для загрузки пользователей выбранного подразделения
  const fetchDepartmentUsers = async (departmentId: string) => {
    try {
      setIsLoadingUsers(true);
      
      // Сначала получаем данные департамента, чтобы узнать ID руководителя
      const { data: deptData, error: deptError } = await supabase
        .from('departments')
        .select('managerId, name')
        .eq('id', departmentId)
        .single();
        
      if (deptError) {
        console.error("Ошибка при загрузке данных подразделения:", deptError);
        toast({ 
          title: "Ошибка", 
          description: "Не удалось загрузить данные подразделения",
          variant: "destructive" 
        });
        return;
      }
      
      // Получаем всех пользователей этого подразделения
      const { data: departmentUsers, error: usersError } = await supabase
        .from('users')
        .select('id, fullname')
        .eq('departmentId', departmentId)
        .order('fullname');
        
      if (usersError) {
        console.error("Ошибка при загрузке пользователей подразделения:", usersError);
        toast({ 
          title: "Ошибка", 
          description: "Не удалось загрузить пользователей подразделения",
          variant: "destructive" 
        });
        return;
      }
      
      // Если у департамента есть руководитель, получаем его данные
      let allUsers = [...departmentUsers];
      
      if (deptData && deptData.managerId) {
        const { data: managerData, error: managerError } = await supabase
          .from('users')
          .select('id, fullname')
          .eq('id', deptData.managerId)
          .single();
          
        if (managerError) {
          console.error("Ошибка при загрузке данных руководителя:", managerError);
        } else if (managerData) {
          // Проверяем, есть ли руководитель уже в списке сотрудников
          const managerIndex = allUsers.findIndex(user => user.id === managerData.id);
          
          if (managerIndex !== -1) {
            // Если руководитель уже в списке, изменяем его имя
            allUsers[managerIndex] = {
              ...allUsers[managerIndex],
              fullname: `${allUsers[managerIndex].fullname} (Руководитель)`
            };
          } else {
            // Если руководителя нет в списке, добавляем его в начало
            allUsers = [
              { ...managerData, fullname: `${managerData.fullname} (Руководитель)` },
              ...allUsers
            ];
          }
        }
      }
      
      setDbUsers(allUsers);
      setTaskAssignee(""); // Сбрасываем выбранного исполнителя при смене подразделения
      
      if (allUsers.length === 0) {
        toast({
          title: "Внимание",
          description: `В выбранном подразделении нет пользователей`,
          variant: "default"
        });
      }
    } catch (error) {
      console.error("Ошибка при загрузке пользователей подразделения:", error);
    } finally {
      setIsLoadingUsers(false);
    }
  };
  
  // Функция для загрузки руководителя выбранного подразделения
  const fetchDepartmentManager = async (departmentId: string) => {
    try {
      setIsLoadingUsers(true);
      
      // Сначала получаем данные департамента, чтобы узнать ID руководителя
      const { data: deptData, error: deptError } = await supabase
        .from('departments')
        .select('managerId')
        .eq('id', departmentId)
        .single();
        
      if (deptError) {
        console.error("Ошибка при загрузке данных подразделения:", deptError);
        return;
      }
      
      if (!deptData || !deptData.managerId) {
        setDbUsers([]);
        return;
      }
      
      // Затем получаем данные руководителя
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, fullname')
        .eq('id', deptData.managerId)
        .single();
        
      if (userError) {
        console.error("Ошибка при загрузке данных руководителя:", userError);
        return;
      }
      
      // Устанавливаем руководителя как единственного доступного исполнителя
      if (userData) {
        setDbUsers([userData]);
      }
    } catch (error) {
      console.error("Ошибка при загрузке руководителя:", error);
    } finally {
      setIsLoadingUsers(false);
    }
  };
  
  const isMobile = useIsMobile();
  const [showTaskDetail, setShowTaskDetail] = useState(false);
  
  const handleTaskClick = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      selectTask(task);
      if (isMobile) {
        setShowTaskDetail(true);
      }
    }
  };
  
  // Обработчик нажатия на чекбокс задачи
  const handleTaskStatusToggle = (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation(); // Prevent task selection
    const task = tasks.find(t => t.id === taskId);
    if (task && task.status !== 'completed') {
      completeTask(taskId);
    }
  };
  
  const handleCreateTask = () => {
    if (taskTitle && taskDescription && taskDepartment && taskDeadline && taskAssignee) {
      addTask(
        taskTitle, 
        taskDescription, 
        taskPriority,
        taskProtocol, 
        taskDeadline,
        taskDepartment,
        taskAssignee
      );
      
      // Reset form
      setTaskTitle("");
      setTaskDescription("");
      setTaskDepartment("");
      setTaskAssignee("");
      setTaskPriority('medium');
      setTaskProtocol('inactive');
      setTaskDeadline(new Date());
      setShowNewTask(false);
    } else {
      toast({ 
        title: "Ошибка", 
        description: "Заполните все обязательные поля",
        variant: "destructive" 
      });
    }
  };
  
  // Группируем задачи по подразделениям
  const tasksByDepartment = departments.map(department => {
    return {
      department,
      tasks: tasks.filter(task => task.departmentId === department.id)
    };
  });
  
  // Форматируем дату для отображения
  const formatTaskDate = (date: Date) => {
    try {
      return format(date, 'd MMM, yyyy', { locale: ru });
    } catch (error) {
      console.error("Ошибка форматирования даты:", error);
      return "Дата не указана";
    }
  };
  
  return (
    <div className="h-full flex flex-col relative">
      
      {/* Task List by Departments */}
      <div className="flex-1 overflow-auto">
        <Accordion type="multiple" className="w-full">
          {tasksByDepartment.map(({ department, tasks }) => (
            <AccordionItem key={department.id} value={department.id} className='relative'>
              <AccordionTrigger className="px-[25px] py-[20px] bg-[#f9f9fb] hover:bg-white hover:no-underline">
                <div className="flex items-center">
                  <div 
                    className="w-[4px] h-full absolute left-0 bottom-0"
                    style={{ backgroundColor: department.color }}
                  />
                  <span className='font-semibold text-[16px]'>{department.name}</span>
                  {/* Показываем количество задач в этом департаменте */}
                  <span className="ml-2 text-sm text-gray-500">({tasks.length})</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                {tasks.length > 0 ? (
                  <ul className="divide-y divide-gray-200">
                    {tasks.map((task) => (
                      <li 
                        key={task.id}
                        className={cn(
                          "p-[20px] cursor-pointer hover:bg-gray-50",
                          selectedTask?.id === task.id && "bg-gray-50"
                        )}
                        onClick={() => handleTaskClick(task.id)}
                      >
                        <div className="flex justify-between">
                          <div className="flex items-center gap-[10px]">
                            {task.status === 'completed' ? (
                              <div className="flex justify-center items-center bg-taskBlue text-white rounded-full h-[24px] w-[24px]">
                                <Check className="h-3 w-3" />
                              </div>
                            ) : (
                              <div 
                                className="rounded-full h-[24px] w-[24px] border-[#7a7e9d] border-[2px] cursor-pointer hover:bg-gray-100"
                                onClick={(e) => handleTaskStatusToggle(e, task.id)}
                              />
                            )}
                            <div>
                              <h3 className="text-sm font-medium mb-1">{task.title}</h3>
                              <p className='text-[#a1a4b9]'>{formatTaskDate(task.deadline)}</p>
                            </div>
                          </div>
                          <div className='bg-gray-200 rounded-full w-[32px] h-[32px]' />
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="p-4 text-center text-gray-500">
                    Нет задач в этом подразделении
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
      
      {/* Mobile Task Detail Drawer */}
      {isMobile && selectedTask && (
        <Drawer open={showTaskDetail} onOpenChange={setShowTaskDetail}>
          <DrawerContent className="h-[100vh] max-h-[100vh]">
            <div className="relative h-full">
              <DrawerClose className="absolute right-4 top-4 z-50">
                <X className="h-6 w-6" />
              </DrawerClose>
              <div className="px-4 py-2 h-full overflow-auto">
                <TaskDetail />
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      )}

			{/* Add task */}
			<div className='h-[57px] bg-[#f9f9fb] border-[#e5e4e9] border-t flex justify-center items-center'>
				<Dialog open={showNewTask} onOpenChange={setShowNewTask}>
          <DialogTrigger asChild>
            <Button className='rounded-full bg-[#4d76fd] hover:bg-[#4264d5] text-[14px] text-white font-semibold py-[8px] px-[26px]'>
              <span>Добавить задачу</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Создать новую задачу</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="task-title">Заголовок</Label>
                <Input 
                  id="task-title" 
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="task-description">Описание</Label>
                <Textarea 
                  id="task-description" 
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="task-department">Подразделение</Label>
                <Select value={taskDepartment} onValueChange={setTaskDepartment}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите подразделение" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.length > 0 ? (
                      departments.map((department) => (
                        <SelectItem key={department.id} value={department.id}>
                          {department.name}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-2 text-center text-gray-500">
                        У вас нет доступных подразделений
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="task-assignee">Исполнитель</Label>
                <Select 
                  value={taskAssignee} 
                  onValueChange={setTaskAssignee}
                  disabled={!taskDepartment || isLoadingUsers}
                >
                  <SelectTrigger>
                    {isLoadingUsers ? (
                      <span className="text-gray-500">Загрузка пользователей...</span>
                    ) : (
                      <SelectValue placeholder={!taskDepartment ? "Сначала выберите подразделение" : "Выберите исполнителя"} />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {dbUsers.length > 0 ? (
                      <>
                        {/* Сначала показываем руководителя, если он есть */}
                        {dbUsers.some(user => user.fullname.includes('(Руководитель)')) && (
                          <div className="px-2 py-1.5 text-sm font-semibold text-gray-500 bg-gray-50">
                            Руководитель
                          </div>
                        )}
                        
                        {/* Выводим руководителя */}
                        {dbUsers
                          .filter(user => user.fullname.includes('(Руководитель)'))
                          .map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.fullname.replace(' (Руководитель)', '')}
                            </SelectItem>
                          ))
                        }
                        
                        {/* Если есть обычные сотрудники, добавляем разделитель */}
                        {dbUsers.some(user => !user.fullname.includes('(Руководитель)')) && 
                         dbUsers.some(user => user.fullname.includes('(Руководитель)')) && (
                          <div className="px-2 py-1.5 text-sm font-semibold text-gray-500 bg-gray-50">
                            Сотрудники
                          </div>
                        )}
                        
                        {/* Выводим остальных сотрудников */}
                        {dbUsers
                          .filter(user => !user.fullname.includes('(Руководитель)'))
                          .map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.fullname}
                            </SelectItem>
                          ))
                        }
                      </>
                    ) : (
                      <div className="p-2 text-center text-gray-500">
                        {!taskDepartment 
                          ? "Сначала выберите подразделение" 
                          : "В этом подразделении нет пользователей"}
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="task-priority">Приоритет</Label>
                <Select 
                  value={taskPriority} 
                  onValueChange={(value) => setTaskPriority(value as 'low' | 'medium' | 'high')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Низкий</SelectItem>
                    <SelectItem value="medium">Средний</SelectItem>
                    <SelectItem value="high">Высокий</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="task-protocol" 
                  checked={taskProtocol === 'active'}
                  onCheckedChange={(checked) => setTaskProtocol(checked ? 'active' : 'inactive')}
                />
                <Label htmlFor="task-protocol">Добавить в протокол</Label>
              </div>
              
              <div className="space-y-2">
                <Label>Дедлайн</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left">
                      {taskDeadline ? (
                        format(taskDeadline, 'PPP', { locale: ru })
                      ) : (
                        <span>Выберите дату</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={taskDeadline}
                      onSelect={(date) => setTaskDeadline(date || new Date())}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <Button onClick={handleCreateTask} className="w-full">
                Создать задачу
              </Button>
            </div>
          </DialogContent>
        </Dialog>
			</div>
    </div>
  );
}
