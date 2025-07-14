import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, ChevronDown, ChevronRight, ChevronUp, Plus, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useTaskContext } from '@/contexts/TaskContext';
import { cn, getTaskStatusColor } from '@/lib/utils';
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
import { Avatar, AvatarFallback, AvatarImage } from '@radix-ui/react-avatar';

interface TaskListProps {
  showArchive?: boolean;
}

export default function TaskList({ showArchive = false }: TaskListProps) {
  const { 
    tasks, 
    departments, 
    selectedDepartment,
    selectTask,
    users,
    selectedTask,
    addTask,
		getUserById,
    user
  } = useTaskContext();
  
  const [showNewTask, setShowNewTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskDepartment, setTaskDepartment] = useState("");
  const [taskAssignee, setTaskAssignee] = useState("");
  const [taskPriority, setTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [taskProtocol, setTaskProtocol] = useState<ProtocolStatus>('inactive');
  const [taskDeadline, setTaskDeadline] = useState<Date>(new Date());
	const [tasksByDepartment, setTasksByDepartment] = useState<any>([]);
  
  // Состояние для хранения списка пользователей из БД
  const [dbUsers, setDbUsers] = useState<{id: string, fullname: string}[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  // В начале компонента TaskList, после других состояний
  const [tasksWithNewMessages, setTasksWithNewMessages] = useState<Set<string>>(new Set());
  
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

	useEffect(() => {
    (async () => {
      const tasksWithUsers = await Promise.all(tasks.map(async t => ({
        ...t, 
        assignee: await getUserById(t.assignedTo),
        creator: await getUserById(t.createdBy)
      })));
      
      // Фильтруем задачи в зависимости от состояния архива И роли пользователя
      const filteredTasks = tasksWithUsers.filter(task => {
        // Проверяем, является ли пользователь автором или исполнителем
        const isAuthorOrAssignee = user?.id === task.createdBy || user?.id === task.assignedTo;
        
        // В зависимости от showArchive применяем дополнительный фильтр
        return showArchive 
          ? isAuthorOrAssignee && task.status === 'completed'
          : isAuthorOrAssignee && task.status !== 'completed';
      });
      
      setTasksByDepartment(departments.map(department => {
        return {
          department,
          tasks: filteredTasks.filter(task => task.departmentId === department.id)
        };
      }));
    })();
  }, [tasks, showArchive, user?.id]);
  
  
  useEffect(() => {
    fetchTasksWithNewMessages();
  
    const channel = supabase
      .channel('new-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `sent_by=neq.${user?.id}`
        },
        (payload) => {
          const newMessage = payload.new;
          if (!newMessage.is_system) {
            setTasksWithNewMessages(prev => new Set(prev).add(newMessage.task_id));
          }
        }
      )
      .subscribe();
  
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Загрузка руководителя при выборе подразделения
  useEffect(() => {
    if (selectedDepartment) {
      fetchDepartmentManager(selectedDepartment.id);
    }
  }, [selectedDepartment]);
  
          // Загрузка пользователей при выборе подразделения для поручения
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
  
  // Внутри компонента TaskList
  const checkForNewMessages = async (taskId: string) => {
    if (!user?.id) return false;
  
    const { data: messages, error } = await supabase
      .from('messages')
      .select('id, created_at')
      .eq('task_id', taskId)
      .neq('sent_by', user.id) // Только сообщения от других
      .order('created_at', { ascending: false })
      .limit(1);
  
    if (error || !messages || messages.length === 0) return false;
  
    const lastMessage = messages[0];
    const lastChecked = lastMessageCheck[taskId];
  
    // Если нет записи о проверке или есть новое сообщение
    return !lastChecked || new Date(lastMessage.created_at) > new Date(lastChecked);
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
  
  const fetchTasksWithNewMessages = async () => {
    if (!user?.id) return;
  
    const { data, error } = await supabase
      .from('messages')
      .select('task_id')
      .eq('is_new', true)
      .neq('sent_by', user.id) // Сообщения не от текущего пользователя
      .neq('is_system', true); // Исключаем системные сообщения
  
    if (!error && data) {
      const taskIds = new Set(data.map(msg => msg.task_id));
      setTasksWithNewMessages(taskIds);
    }
  };

  const handleTaskClick = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      // 1. Помечаем сообщения как прочитанные в Supabase
      const { error } = await supabase
        .from('messages')
        .update({ is_new: false })
        .eq('task_id', taskId)
        .eq('is_new', true);
  
      if (error) {
        console.error('Ошибка при обновлении статуса сообщений:', error);
        // Можно добавить уведомление для пользователя
        toast({
          title: "Ошибка",
          description: "Не удалось обновить статус сообщений",
          variant: "destructive"
        });
      }
  
      // 2. Убираем индикатор из локального состояния
      setTasksWithNewMessages(prev => {
        const newSet = new Set(prev);
        newSet.delete(taskId);
        return newSet;
      });
  
      // 3. Выбираем задачу и открываем детали (существующая логика)
      selectTask(task);
      if (isMobile) {
        setShowTaskDetail(true);
      }
    }
  };
  
          // Обработчик нажатия на чекбокс поручения
  const handleTaskStatusToggle = (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation(); // Prevent task selection
    const task = tasks.find(t => t.id === taskId);
		console.log(task)
  };
  
  // Обработчик изменения даты с использованием нативного датапикера
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value ? new Date(e.target.value) : new Date();
    setTaskDeadline(date);
  };
  
  const handleCreateTask = () => {
    // Проверяем каждое обязательное поле отдельно
    const errors = [];
    if (!taskTitle) errors.push("Заголовок");
    if (!taskDescription) errors.push("Описание");
    if (!taskDepartment) errors.push("Подразделение");
    if (!taskAssignee) errors.push("Исполнитель");
    if (!taskDeadline) errors.push("Дедлайн");

    if (errors.length === 0) {
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
        description: `Заполните обязательные поля: ${errors.join(", ")}`,
        variant: "destructive" 
      });
    }
  };
  
  // Форматируем дату для отображения
  const formatTaskDate = (date: Date) => {
    try {
      return format(date, 'd MMM, yyyy', { locale: ru });
    } catch (error) {
      console.error("Ошибка форматирования даты:", error);
      return "Дата не указана";
    }
  };
  
  // Добавить функцию для обновления задач из базы
  async function refreshTasksFromDb(departments, setTasks) {
    if (!departments || departments.length === 0) return;
    const departmentIds = departments.map(dept => dept.id);
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .in('departmentId', departmentIds)
      .order('created_at', { ascending: false });
    if (!error && data) {
      setTasks(data.map(task => ({
        id: task.id,
        title: task.title,
        description: task.description,
        assignedTo: task.assigned_to,
        createdBy: task.created_by,
        departmentId: task.departmentId,
        priority: task.priority,
        isProtocol: task.is_protocol,
        createdAt: new Date(task.created_at),
        deadline: new Date(task.deadline),
        status: task.status
      })));
    }
  }
  
  return (
    <div className="h-full flex flex-col relative">
      
      {/* Task List by Departments */}
      <div className="flex-1 overflow-auto">
        <Accordion type="multiple" className="w-full">
          {tasksByDepartment.map(({ department, tasks }) => (
            <AccordionItem key={department.id} value={department.id}>
              <AccordionTrigger className="px-[25px] py-[20px] bg-[#f9f9fb] hover:bg-white hover:no-underline relative">
                <div className="flex items-center">
                  <div className="w-[4px] h-full rounded-sm absolute left-0" style={{ backgroundColor: department.color }} />
                  <span className='font-semibold text-[16px]'>{department.name}</span>
                  {/* Показываем количество задач в этом департаменте */}
                  <span className="ml-2 text-sm text-gray-500">({tasks.length})</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                {tasks.length > 0 ? (
                  <ul className="divide-y divide-gray-200">
                    {tasks.map((task) => {
                      // Проверяем, является ли текущий пользователь автором или исполнителем
                      const isAuthor = user?.id === task.createdBy;
                      const isAssignee = user?.id === task.assignedTo;
                      
                      return (
                        <li 
                          key={task.id}
                          className={cn(
                            "p-[20px] cursor-pointer hover:bg-gray-50",
                            selectedTask?.id === task.id && "bg-gray-50",
                            isAuthor && "border-l-4 border-l-blue-500", // Подсветка для автора
                            isAssignee && "bg-blue-50" // Подсветка для исполнителя
                          )}
                          onClick={() => {
                            handleTaskClick(task.id);
                            // При открытии задачи убираем индикатор новых сообщений
                            setTasksWithNewMessages(prev => {
                              const newSet = new Set(prev);
                              newSet.delete(task.id);
                              return newSet;
                            });
                          }}
                        >
                          <div className="flex justify-between">
                            <div className="flex items-center gap-[10px]">
                              <div 
                                className={`flex justify-center items-center ${getTaskStatusColor(task.status)} rounded-full h-[24px] w-[24px] cursor-pointer`}
                              >
                                <Check className={`h-3 w-3 ${task.status === 'completed' ? 'text-white' : 'text-transparent'}`} />
                              </div>
                              <div>
                                <div className="flex items-center">
                                  <h3 className="text-sm font-medium mb-1">{task.title}</h3>
                                  {tasksWithNewMessages.has(task.id) && (
                                    <span className="ml-2 h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                                  )}
                                </div>
                                {/* <h3 className="text-sm font-medium mb-1">{task.title}</h3> */}
                                <p className={task.status === 'overdue' ? 'text-red-500' : 'text-[#a1a4b9]'}>
                                  {formatTaskDate(task.deadline)}
                                </p>
                                {/* Добавляем информацию о роли */}
                                <div className="flex gap-2 mt-1">
                                  {isAuthor && (
                                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                                      Автор
                                    </span>
                                  )}
                                  {isAssignee && (
                                    <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
                                      Исполнитель
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center mr-3 ">
                              {/* Аватар автора */}
                              <div className="relative h-[32px] w-[32px]">
                                <Avatar className="h-full w-full">
                                  <AvatarImage 
                                    className='rounded-full' 
                                    src={task?.creator?.image} 
                                    alt={task?.creator?.name} 
                                  />
                                  <AvatarFallback>
                                    {task?.creator?.name?.charAt(0) || 'A'}
                                  </AvatarFallback>
                                </Avatar>
                              </div>
                              
                              <svg 
                                xmlns="http://www.w3.org/2000/svg" 
                                width="24" 
                                height="24" 
                                viewBox="0 0 24 24" 
                                fill="none" 
                                stroke="currentColor" 
                                strokeWidth="2" 
                                strokeLinecap="round" 
                                strokeLinejoin="round"
                                className="text-gray-400 mx-2"
                              >
                                <path d="M5 12h14M12 5l7 7-7 7"></path>
                              </svg>
                              
                              {/* Аватар исполнителя */}
                              <div className="relative h-[32px] w-[32px]">
                                <Avatar className="h-full w-full">
                                  <AvatarImage 
                                    className='rounded-full' 
                                    src={task?.assignee?.image} 
                                    alt={task?.assignee?.name} 
                                  />
                                  <AvatarFallback>
                                    {task?.assignee?.name?.charAt(0) || 'I'}
                                  </AvatarFallback>
                                </Avatar>
                              </div>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="p-4 text-center text-gray-500">
                    {showArchive 
                      ? 'Нет завершенных поручений в этом подразделении'
                      : 'Нет активных поручений в этом подразделении'
                    }
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
              <DrawerClose className="absolute right-4 top-4 z-50 mt-20">
                <X className="h-6 w-6" />
              </DrawerClose>
              <div className="px-4 py-2 h-full overflow-auto mt-20">
                <TaskDetail />
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      )}

			{/* Add task */}
			<div className='fixed bottom-0 left-0 right-0  h-[57px] bg-transparent border-0 flex justify-center items-center z-1000'>
      <Dialog open={showNewTask} onOpenChange={setShowNewTask}>
        <DialogTrigger asChild>
          <Button className='rounded-full bg-[#4d76fd] hover:bg-[#4264d5] text-[14px] text-white font-semibold py-[8px] px-[26px]'>
            <span>Добавить поручение</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader className=" top-0 bg-background z-10 pt-2 pb-4">
            <DialogTitle>Создать новое поручение</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="task-title">Заголовок <span className="text-red-500">*</span></Label>
              <Input 
                id="task-title" 
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                className={!taskTitle && "border-red-500"}
                placeholder="Введите заголовок поручения"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="task-description">Описание <span className="text-red-500">*</span></Label>
              <Textarea 
                id="task-description" 
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                className={cn(
                  !taskDescription && "border-red-500",
                  "whitespace-pre-wrap" // Это ключевое свойство
                )}
                placeholder="Введите описание поручения"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="task-department">Подразделение <span className="text-red-500">*</span></Label>
              <Select value={taskDepartment} onValueChange={setTaskDepartment}>
                <SelectTrigger className={!taskDepartment && "border-red-500"}>
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
              <Label htmlFor="task-assignee">Исполнитель <span className="text-red-500">*</span></Label>
              <Select 
                value={taskAssignee} 
                onValueChange={setTaskAssignee}
                disabled={!taskDepartment || isLoadingUsers}
              >
                <SelectTrigger className={!taskAssignee && "border-red-500"}>
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
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="task-priority" 
                checked={taskPriority === 'high'}
                onCheckedChange={(checked) => setTaskPriority(checked ? 'high' : 'medium')}
              />
              <Label htmlFor="task-priority">Высокий приоритет</Label>
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
              <Label>Дедлайн <span className="text-red-500">*</span></Label>
              <Input 
                type="date"
                value={taskDeadline ? format(taskDeadline, 'yyyy-MM-dd') : ''}
                onChange={handleDateChange}
                className={`w-full ${!taskDeadline && "border-red-500"}`}
                min={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>
            
            <Button onClick={handleCreateTask} className="w-full">
              Создать поручение
            </Button>
          </div>
        </DialogContent>
      </Dialog>
			</div>
    </div>
  );
}
