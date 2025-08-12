import React, { useState, useEffect, useRef } from 'react';
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
import DepartmentSelector from './DepartmentSelector';
import ExecutorSelector from './ExecutorSelector';

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
    user,
    taskFilter,
    getFilteredTasks,
    selectedUserId
  } = useTaskContext();
  
  const [showNewTask, setShowNewTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskDepartment, setTaskDepartment] = useState("");
  const [taskAssignee, setTaskAssignee] = useState("");
  const [taskPriority, setTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [taskProtocol, setTaskProtocol] = useState<ProtocolStatus>('inactive');
  const [taskDeadline, setTaskDeadline] = useState<Date>(new Date(new Date().setHours(23, 59, 59, 999)));
	const [tasksByDepartment, setTasksByDepartment] = useState<any>([]);
  
  // Состояние для хранения списка пользователей из БД
  const [dbUsers, setDbUsers] = useState<{id: string, fullname: string}[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  // В начале компонента TaskList, после других состояний
  const [tasksWithNewMessages, setTasksWithNewMessages] = useState<Set<string>>(new Set());
  
  // Состояния для дублирования поручений
  const [isDuplicateMode, setIsDuplicateMode] = useState(false);
  const [selectedDepartmentsForDuplication, setSelectedDepartmentsForDuplication] = useState<string[]>([]);
  const [selectedExecutorsForDuplication, setSelectedExecutorsForDuplication] = useState<string[]>([]);
  const [availableExecutors, setAvailableExecutors] = useState<{id: string, fullname: string, departmentId: string}[]>([]);
  const [lastMessageCheck, setLastMessageCheck] = useState<{[key: string]: string}>({});

  
  // В начале компонента, после других ref
  const taskRefs = useRef<{[key: string]: HTMLDivElement | null}>({});

  const [accordionValue, setAccordionValue] = useState<string[]>([]);

  const handleAccordionChange = (value: string[]) => {
    // Находим только что открытый департамент
  const newlyOpened = value.find(id => !accordionValue.includes(id));
  
    setAccordionValue(value);
    
    if (newlyOpened && taskRefs.current[newlyOpened]) {
      // Используем setTimeout для корректной работы анимации аккордеона
      setTimeout(() => {
        const element = taskRefs.current[newlyOpened];
        if (element) {
          // Прокручиваем с небольшим отступом сверху
          element.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
          
          // Альтернатива - ручной расчет позиции для более точного контроля
          /*
          const container = tasksContainerRef.current;
          const element = taskRefs.current[newlyOpened];
          if (container && element) {
            const containerRect = container.getBoundingClientRect();
            const elementRect = element.getBoundingClientRect();
            const offset = 20; // Отступ сверху в пикселях
            
            container.scrollTo({
              top: elementRect.top - containerRect.top + container.scrollTop - offset,
              behavior: 'smooth'
            });
          }
          */
        }
      }, 100); // Небольшая задержка для завершения анимации аккордеона
    }
  };

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
      // Get filtered tasks from context
      const contextFilteredTasks = getFilteredTasks();
      
      const tasksWithUsers = await Promise.all(contextFilteredTasks.map(async t => ({
        ...t, 
        assignee: await getUserById(t.assignedTo),
        creator: await getUserById(t.createdBy)
      })));
      
      // Apply archive filter
      const filteredTasks = tasksWithUsers.filter(task => {
        return showArchive 
          ? task.status === 'completed'
          : task.status !== 'completed';
      });
      
      // Сортируем задачи по дедлайну (от ближайшего к дальнему)
      const sortedTasks = [...filteredTasks].sort((a, b) => {
        return a.deadline.getTime() - b.deadline.getTime();
      });
      
      setTasksByDepartment(departments.map(department => {
        return {
          department,
          tasks: sortedTasks.filter(task => task.departmentId === department.id)
        };
      }));
    })();
  }, [tasks, showArchive, user?.id, taskFilter, getFilteredTasks, selectedUserId]);
  
  
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
  };
  
  // Обработчик изменения даты с использованием нативного датапикера
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.value) return;
    
    // Создаем дату с временем 23:59:59 выбранного дня
    const selectedDate = new Date(e.target.value);
    const deadlineDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 23, 59, 59, 999);
    

    
    setTaskDeadline(deadlineDate);
  };
  
  // Функция для загрузки исполнителей из выбранных департаментов
  const loadExecutorsFromDepartments = async (departmentIds: string[]) => {
    if (departmentIds.length === 0) {
      setAvailableExecutors([]);
      return;
    }
    
    try {
      const allExecutors: {id: string, fullname: string, departmentId: string}[] = [];
      
      for (const deptId of departmentIds) {
        // Загружаем сотрудников департамента
        const { data: departmentEmployees, error: employeesError } = await supabase
          .from('users')
          .select('id, fullname, departmentId')
          .eq('departmentId', deptId);

        if (employeesError) {
          console.error('Ошибка при загрузке сотрудников департамента:', employeesError);
          continue;
        }

        // Добавляем сотрудников
        if (departmentEmployees) {
          departmentEmployees.forEach(emp => {
            if (emp.fullname) {
              allExecutors.push({
                id: emp.id,
                fullname: emp.fullname,
                departmentId: emp.departmentId
              });
            }
          });
        }

        // Загружаем руководителя департамента
        const department = departments.find(d => d.id === deptId);
        if (department?.managerId) {
          try {
            const manager = await getUserById(department.managerId);
            if (manager && manager.fullname && !allExecutors.find(u => u.id === manager.id)) {
              allExecutors.push({
                id: manager.id,
                fullname: manager.fullname,
                departmentId: deptId
              });
            }
          } catch (error) {
            console.error('Ошибка при загрузке руководителя департамента:', error);
          }
        }
      }
      
      // Сортируем по имени
      allExecutors.sort((a, b) => a.fullname.localeCompare(b.fullname));
      setAvailableExecutors(allExecutors);
    } catch (error) {
      console.error("Ошибка при загрузке исполнителей:", error);
    }
  };

  // Обработчики для дублирования
  const handleDepartmentToggleForDuplication = (departmentId: string) => {
    setSelectedDepartmentsForDuplication(prev => {
      const updated = prev.includes(departmentId)
        ? prev.filter(id => id !== departmentId)
        : [...prev, departmentId];
      
      // Загружаем исполнителей для обновленных департаментов
      loadExecutorsFromDepartments(updated);
      
      // Сбрасываем выбранных исполнителей
      setSelectedExecutorsForDuplication([]);
      
      return updated;
    });
  };

  const handleExecutorToggleForDuplication = (executorId: string) => {
    setSelectedExecutorsForDuplication(prev => 
      prev.includes(executorId)
        ? prev.filter(id => id !== executorId)
        : [...prev, executorId]
    );
  };

  const handleCreateTask = () => {
    // Проверяем каждое обязательное поле отдельно
    const errors = [];
    if (!taskTitle) errors.push("Заголовок");
    if (!taskDescription) errors.push("Описание");
    
    // Для обычного режима проверяем департамент и исполнителя
    if (!isDuplicateMode) {
      if (!taskDepartment) errors.push("Подразделение");
      if (!taskAssignee) errors.push("Исполнитель");
    } else {
      // Для режима дублирования проверяем выбранных исполнителей
      if (selectedExecutorsForDuplication.length === 0) {
        errors.push("Выберите исполнителей для дублирования");
      }
    }
    
    if (!taskDeadline) errors.push("Дедлайн");

    if (errors.length === 0) {
      if (isDuplicateMode) {
        // Создаем дублированные поручения
        addTask(
          taskTitle, 
          taskDescription, 
          taskPriority,
          taskProtocol, 
          taskDeadline,
          undefined, // selectedDepartmentId не нужен для дублирования
          undefined, // assigneeId не нужен для дублирования
          {
            selectedDepartments: selectedDepartmentsForDuplication,
            selectedExecutors: selectedExecutorsForDuplication
          }
        );
      } else {
        // Создаем обычное поручение
        addTask(
          taskTitle, 
          taskDescription, 
          taskPriority,
          taskProtocol, 
          taskDeadline,
          taskDepartment,
          taskAssignee
        );
      }
      
      // Reset form
      setTaskTitle("");
      setTaskDescription("");
      setTaskDepartment("");
      setTaskAssignee("");
      setTaskPriority('medium');
      setTaskProtocol('inactive');
      setTaskDeadline(new Date());
      setIsDuplicateMode(false);
      setSelectedDepartmentsForDuplication([]);
      setSelectedExecutorsForDuplication([]);
      setAvailableExecutors([]);
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
  
  useEffect(() => {
    if (isMobile && selectedTask) {
      setShowTaskDetail(true);
    }
  }, [isMobile, selectedTask]);
  
  return (
    <div className="h-full flex flex-col relative pb-4"> {/* Добавим padding-bottom для места под кнопку */}
      
      {/* Task List by Departments */}
      <div className="flex-1 overflow-auto pb-4"> {/* Уменьшим высоту списка задач */}
        <Accordion type="multiple" className="w-full"  value={accordionValue} onValueChange={handleAccordionChange}>
          {tasksByDepartment.map(({ department, tasks }) => (
            <AccordionItem key={department.id} value={department.id}>
              <AccordionTrigger className="px-[25px] py-[20px] bg-[#f9f9fb] hover:bg-white hover:no-underline relative">
                <div className="flex items-center w-full">
                  <span className='font-semibold text-[16px] flex-grow text-left '>{department.name}</span>
                  <span className="ml-2 text-sm text-gray-500">({tasks.length})</span>
                </div>
              </AccordionTrigger>
              <AccordionContent ref={(el) => taskRefs.current[department.id] = el}>
                {tasks.length > 0 ? (
                  <ul className="space-y-0"> {/* Убрали отступы между задачами */}
                    {tasks.map((task) => {
                      const isAuthor = user?.id === task.createdBy;
                      const isAssignee = user?.id === task.assignedTo;
                      
                      return (
                        <li 
                          key={task.id}
                          className={cn(
                            "pl-[35px] pr-[30px] py-[20px] cursor-pointer hover:bg-gray-50 relative",
                            selectedTask?.id === task.id && "bg-gray-50",
                          )}
                          onClick={() => {
                            handleTaskClick(task.id);
                            setTasksWithNewMessages(prev => {
                              const newSet = new Set(prev);
                              newSet.delete(task.id);
                              return newSet;
                            });
                          }}
                        >
                          {/* Верхняя граница с отступом для индикатора */}
                          <div className="absolute top-0 left-[30px] right-0 h-[1px] bg-gray-200"></div>
                          
                          {/* Цветовой индикатор с шириной 5px */}
                          <div 
                            className={cn(
                              "absolute left-[30px] top-0 bottom-0 w-[5px]",
                              {
                                'bg-green-500': task.status === 'completed',
                                'bg-[#3F79FF]': task.status === 'in_progress',
                                'bg-[#BCBCBC]': task.status === 'new',
                                'bg-[#DA100B]': task.status === 'overdue',
                                'bg-red-400': task.status === 'canceled',
                                'bg-[#EEF4C7]': task.status === 'on_verification',
                              }
                            )}
                          />
                          
                          {/* Нижняя граница с отступом для индикатора */}
                          <div className="absolute bottom-0 left-[30px] right-0 h-[1px] bg-gray-200"></div>

                          <div className="flex justify-between items-center gap-2 pl-[10px]">
                            {/* Левая часть - Название задачи */}
                            <div className="flex-1 min-w-0 break-words">
                              <div className="flex items-center gap-2">
                                <h3 className="text-sm font-medium">{task.title}</h3>
                                {tasksWithNewMessages.has(task.id) && (
                                  <span className="flex-shrink-0 h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                                )}
                              </div>
                            </div>

                            {/* Правая часть - Дата и аватар */}
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <div className="flex flex-col items-center">
                                {task.priority === 'high' && (
                                  <div className="mb-1 items-center">
                                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-transparent text-red-600 rounded-full">
                                      <svg 
                                        className="w-6 h-6" 
                                        viewBox="0 0 24 24" 
                                        fill="currentColor" // Это позволит иконке наследовать цвет text-red-600
                                      >
                                        <path d="M21.1744 9.63937C20.8209 9.27 20.4553 8.88938 20.3175 8.55469C20.19 8.24813 20.1825 7.74 20.175 7.24781C20.1609 6.33281 20.1459 5.29594 19.425 4.575C18.7041 3.85406 17.6672 3.83906 16.7522 3.825C16.26 3.8175 15.7519 3.81 15.4453 3.6825C15.1116 3.54469 14.73 3.17906 14.3606 2.82562C13.7137 2.20406 12.9788 1.5 12 1.5C11.0212 1.5 10.2872 2.20406 9.63937 2.82562C9.27 3.17906 8.88938 3.54469 8.55469 3.6825C8.25 3.81 7.74 3.8175 7.24781 3.825C6.33281 3.83906 5.29594 3.85406 4.575 4.575C3.85406 5.29594 3.84375 6.33281 3.825 7.24781C3.8175 7.74 3.81 8.24813 3.6825 8.55469C3.54469 8.88844 3.17906 9.27 2.82562 9.63937C2.20406 10.2863 1.5 11.0212 1.5 12C1.5 12.9788 2.20406 13.7128 2.82562 14.3606C3.17906 14.73 3.54469 15.1106 3.6825 15.4453C3.81 15.7519 3.8175 16.26 3.825 16.7522C3.83906 17.6672 3.85406 18.7041 4.575 19.425C5.29594 20.1459 6.33281 20.1609 7.24781 20.175C7.74 20.1825 8.24813 20.19 8.55469 20.3175C8.88844 20.4553 9.27 20.8209 9.63937 21.1744C10.2863 21.7959 11.0212 22.5 12 22.5C12.9788 22.5 13.7128 21.7959 14.3606 21.1744C14.73 20.8209 15.1106 20.4553 15.4453 20.3175C15.7519 20.19 16.26 20.1825 16.7522 20.175C17.6672 20.1609 18.7041 20.1459 19.425 19.425C20.1459 18.7041 20.1609 17.6672 20.175 16.7522C20.1825 16.26 20.19 15.7519 20.3175 15.4453C20.4553 15.1116 20.8209 14.73 21.1744 14.3606C21.7959 13.7137 22.5 12.9788 22.5 12C22.5 11.0212 21.7959 10.2872 21.1744 9.63937ZM20.0916 13.3228C19.6425 13.7916 19.1775 14.2763 18.9309 14.8716C18.6947 15.4434 18.6844 16.0969 18.675 16.7297C18.6656 17.3859 18.6553 18.0731 18.3638 18.3638C18.0722 18.6544 17.3897 18.6656 16.7297 18.675C16.0969 18.6844 15.4434 18.6947 14.8716 18.9309C14.2763 19.1775 13.7916 19.6425 13.3228 20.0916C12.8541 20.5406 12.375 21 12 21C11.625 21 11.1422 20.5387 10.6772 20.0916C10.2122 19.6444 9.72375 19.1775 9.12844 18.9309C8.55656 18.6947 7.90313 18.6844 7.27031 18.675C6.61406 18.6656 5.92688 18.6553 5.63625 18.3638C5.34562 18.0722 5.33437 17.3897 5.325 16.7297C5.31562 16.0969 5.30531 15.4434 5.06906 14.8716C4.8225 14.2763 4.3575 13.7916 3.90844 13.3228C3.45937 12.8541 3 12.375 3 12C3 11.625 3.46125 11.1422 3.90844 10.6772C4.35562 10.2122 4.8225 9.72375 5.06906 9.12844C5.30531 8.55656 5.31562 7.90313 5.325 7.27031C5.33437 6.61406 5.34469 5.92688 5.63625 5.63625C5.92781 5.34562 6.61031 5.33437 7.27031 5.325C7.90313 5.31562 8.55656 5.30531 9.12844 5.06906C9.72375 4.8225 10.2084 4.3575 10.6772 3.90844C11.1459 3.45937 11.625 3 12 3C12.375 3 12.8578 3.46125 13.3228 3.90844C13.7878 4.35562 14.2763 4.8225 14.8716 5.06906C15.4434 5.30531 16.0969 5.31562 16.7297 5.325C17.3859 5.33437 18.0731 5.34469 18.3638 5.63625C18.6544 5.92781 18.6656 6.61031 18.675 7.27031C18.6844 7.90313 18.6947 8.55656 18.9309 9.12844C19.1775 9.72375 19.6425 10.2084 20.0916 10.6772C20.5406 11.1459 21 11.625 21 12C21 12.375 20.5387 12.8578 20.0916 13.3228ZM11.25 12.75V7.5C11.25 7.30109 11.329 7.11032 11.4697 6.96967C11.6103 6.82902 11.8011 6.75 12 6.75C12.1989 6.75 12.3897 6.82902 12.5303 6.96967C12.671 7.11032 12.75 7.30109 12.75 7.5V12.75C12.75 12.9489 12.671 13.1397 12.5303 13.2803C12.3897 13.421 12.1989 13.5 12 13.5C11.8011 13.5 11.6103 13.421 11.4697 13.2803C11.329 13.1397 11.25 12.9489 11.25 12.75ZM13.125 16.125C13.125 16.3475 13.059 16.565 12.9354 16.75C12.8118 16.935 12.6361 17.0792 12.4305 17.1644C12.225 17.2495 11.9988 17.2718 11.7805 17.2284C11.5623 17.185 11.3618 17.0778 11.2045 16.9205C11.0472 16.7632 10.94 16.5627 10.8966 16.3445C10.8532 16.1262 10.8755 15.9 10.9606 15.6945C11.0458 15.4889 11.19 15.3132 11.375 15.1896C11.56 15.066 11.7775 15 12 15C12.2984 15 12.5845 15.1185 12.7955 15.3295C13.0065 15.5405 13.125 15.8266 13.125 16.125Z" />
                                      </svg>
                                    </span>
                                  </div>
                                )}
                                <p className={`text-sm whitespace-nowrap ${task.status === 'overdue' ? 'text-red-500' : 'text-[#a1a4b9]'}`}>
                                  {formatTaskDate(task.deadline)}
                                </p>
                              </div>
                              <div className="h-8 w-8 flex-shrink-0">
                                <Avatar>
                                  <AvatarImage 
                                    src={task?.assignee?.image} 
                                    alt={task?.assignee?.name} 
                                    className="rounded-full"
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

			{/* Add task */}
			{isMobile ? (
    <div className='fixed bottom-4 left-0 right-0 flex justify-center items-center z-50'>
      <Dialog open={showNewTask} onOpenChange={setShowNewTask}>
        <DialogTrigger asChild>
          <Button className='rounded-full bg-[#4d76fd] hover:bg-[#4264d5] text-[14px] text-white font-semibold py-3 px-6 shadow-lg'>
            <Plus className="mr-2 h-4 w-4" />
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
            
            {!isDuplicateMode && (
              <>
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
              </>
            )}
            
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
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="duplicate-mode" 
                checked={isDuplicateMode}
                onCheckedChange={(checked) => {
                  setIsDuplicateMode(!!checked);
                  if (!checked) {
                    setSelectedDepartmentsForDuplication([]);
                    setSelectedExecutorsForDuplication([]);
                    setAvailableExecutors([]);
                  }
                }}
              />
              <Label htmlFor="duplicate-mode">Дублировать</Label>
            </div>
            
            {isDuplicateMode && (
              <>
                <DepartmentSelector
                  departments={departments}
                  selectedDepartments={selectedDepartmentsForDuplication}
                  onDepartmentToggle={handleDepartmentToggleForDuplication}
                />
                
                {selectedDepartmentsForDuplication.length > 0 && (
                  <ExecutorSelector
                    executors={availableExecutors}
                    selectedExecutors={selectedExecutorsForDuplication}
                    onExecutorToggle={handleExecutorToggleForDuplication}
                    departmentNames={departments.reduce((acc, dept) => {
                      acc[dept.id] = dept.name;
                      return acc;
                    }, {} as {[key: string]: string})}
                  />
                )}
              </>
            )}
            
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
  ) : (
    // Десктоп — кнопка вверху списка задач
    <div className="flex justify-center">
      <Dialog open={showNewTask} onOpenChange={setShowNewTask}>
        <DialogTrigger asChild>
          <Button className='rounded-full bg-[#4d76fd] hover:bg-[#4264d5] text-[14px] text-white font-semibold py-3 px-6 shadow-lg'>
            <Plus className="mr-2 h-4 w-4" />
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
            
            {!isDuplicateMode && (
              <>
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
              </>
            )}
            
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
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="duplicate-mode-desktop" 
                checked={isDuplicateMode}
                onCheckedChange={(checked) => {
                  setIsDuplicateMode(!!checked);
                  if (!checked) {
                    setSelectedDepartmentsForDuplication([]);
                    setSelectedExecutorsForDuplication([]);
                    setAvailableExecutors([]);
                  }
                }}
              />
              <Label htmlFor="duplicate-mode-desktop">Дублировать</Label>
            </div>
            
            {isDuplicateMode && (
              <>
                <DepartmentSelector
                  departments={departments}
                  selectedDepartments={selectedDepartmentsForDuplication}
                  onDepartmentToggle={handleDepartmentToggleForDuplication}
                />
                
                {selectedDepartmentsForDuplication.length > 0 && (
                  <ExecutorSelector
                    executors={availableExecutors}
                    selectedExecutors={selectedExecutorsForDuplication}
                    onExecutorToggle={handleExecutorToggleForDuplication}
                    departmentNames={departments.reduce((acc, dept) => {
                      acc[dept.id] = dept.name;
                      return acc;
                    }, {} as {[key: string]: string})}
                  />
                )}
              </>
            )}
            
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
  )}
    </div>
  );
}
