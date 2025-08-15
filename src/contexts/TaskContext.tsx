import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { 
  User, 
  Department, 
  Task, 
  Message, 
  Priority,
  ProtocolStatus,
  TaskStatus,
  Role
} from '../types';
import { 
  currentUser, 
  users, 
  messages as initialMessages,
} from '../mockData';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/supabase/client';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

interface TaskContextType {
	headerTitle,
	setHeaderTitle,
	viewHistory,
	setViewHistory,
	showArchive,
	setShowArchive,
  // Data
	user: User,
	setUser: React.Dispatch<User>,
  currentUser: User;
  users: User[];
  departments: Department[];
  tasks: Task[];
  messages: Message[];
  supabase: any; // Add supabase to the interface

  // Selected items
  selectedDepartment: Department | null;
  selectedTask: Task | null;
  selectedUserId: string | null;
  
  // Actions
  selectDepartment: (department: Department | null) => void;
  selectTask: (task: Task | null) => void;
  setSelectedUserId: (userId: string | null) => void;
  addDepartment: (name: string, managerId: string, userIds?: string[]) => void;
  addUsersToDepartment: (departmentId: string, userIds: string[]) => Promise<void>;
  addTask: (
    title: string,
    description: string,
    priority: Priority,
    isProtocol: ProtocolStatus,
    deadline: Date,
    selectedDepartmentId?: string,
    assigneeId?: string,
    duplicationData?: { selectedDepartments: string[]; selectedExecutors: string[]; }
  ) => Promise<void>;
  completeTask: (task: Task) => void;
  deleteTask: (taskId: string) => void;
  reassignTask: (taskId: string, newAssigneeId: string, newTitle?: string, newDescription?: string, newDeadline?: Date) => void;
  toggleProtocol: (taskId: string, newProtocolState?: 'active' | 'inactive') => void;
  addMessage: (taskId: string, content: string) => void;
  searchTasks: (query: string) => Task[];
  updateTaskIsNew: (taskId: string, isNew: boolean) => Promise<void>;
  
  // Task filter
  taskFilter: 'all' | 'author' | 'assignee';
  setTaskFilter: (filter: 'all' | 'author' | 'assignee') => void;
  getFilteredTasks: () => Task[];
  getUserDepartmentId: (userId: string) => Promise<string | null>;
  
  // Helper functions
  getUserById: (id: string) => Promise<any>;
  getDepartmentById: (id: string) => Promise<Department | undefined>;
  getDepartmentByUserId: (userId: string) => Promise<Department | undefined>;
  getTasksByDepartment: (departmentId: string) => Task[];
  getMessagesByTask: (taskId: string) => Message[];
  getSubordinates: () => Promise<User[]>;
  updateSelectedDepartmentId: (departmentId: string) => Promise<void>;
  fetchTasks: () => Promise<void>;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export function TaskProvider({ children }: { children: ReactNode }) {
	const [headerTitle, setHeaderTitle] = useState<string>("Поручения")
	const [viewHistory, setViewHistory] = useState<string[]>([]);
	const [showArchive, setShowArchive] = useState<boolean>(false);
	const [user, setUser] = useState(null)
  const [departments, setDepartments] = useState<Department[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [taskFilter, setTaskFilter] = useState<'all' | 'author' | 'assignee'>('all');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userDepartments, setUserDepartments] = useState<{userId: string, departmentId: string}[]>([
    { userId: '2', departmentId: '1' },
    { userId: '3', departmentId: '2' },
    { userId: '4', departmentId: '3' },
    { userId: '5', departmentId: '4' },
  ]);
  const navigate = useNavigate();
  
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const getRandomColor = () => {
    const colors = ['#4CAF50', '#2196F3', '#FFC107', '#F44336', '#9C27B0', '#00BCD4'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  // Возвращает цвет по ID департамента (циклично)
  const getDepartmentColor = (id: string | number) => {
    const colors = ['#4CAF50', '#2196F3', '#FFC107', '#F44336', '#9C27B0', '#00BCD4'];
    // Convert id to string to ensure we can use string methods
    const idString = String(id);
    // Используем числовое значение первого символа ID для определения индекса цвета
    const charSum = idString.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return colors[charSum % colors.length];
  };

  // Функция для загрузки подразделений пользователя
  const loadUserDepartments = async () => {
    try {
      // Получаем данные текущего пользователя
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate("/auth");
        return;
      }
      
      // Получаем ID пользователя из таблицы users
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, departmentId')
        .eq('user_unique_id', session.user.id)
        .single();
        
      if (userError) {
        console.error("Ошибка при получении данных пользователя:", userError);
        toast({ 
          title: "Ошибка загрузки", 
          description: "Не удалось получить данные пользователя", 
          variant: "destructive" 
        });
        return;
      }
      
      // Получаем подразделения, где пользователь является создателем или состоит в них
      let departmentsQuery;
      
      if (userData.departmentId) {
        // Если у пользователя есть подразделение, включаем его в запрос
        departmentsQuery = await supabase
          .from('departments')
          .select('*, manager:users!departments_managerId_fkey(id, fullname)')
          .or(`created_by.eq.${userData.id},id.eq.${userData.departmentId},managerId.eq.${userData.id}`);
      } else {
        // Если departmentId равен null, выбираем созданные пользователем и те, где он руководитель
        departmentsQuery = await supabase
          .from('departments')
          .select('*, manager:users!departments_managerId_fkey(id, fullname)')
          .or(`created_by.eq.${userData.id},managerId.eq.${userData.id}`);
      }
      
      const { data: departmentsData, error: departmentsError } = departmentsQuery;
      
      if (departmentsError) {
        console.error("Ошибка при загрузке подразделений:", departmentsError);
        toast({ 
          title: "Ошибка загрузки", 
          description: "Не удалось загрузить подразделения", 
          variant: "destructive" 
        });
        return;
      }
      
      if (!departmentsData || departmentsData.length === 0) {
        // Если подразделений не найдено, используем пустой массив
        setDepartments([]);
        return;
      }
      
      // Добавляем цвета к департаментам и информацию о руководителе
      const departmentsWithColors = departmentsData.map(dept => ({
        ...dept,
        color: getDepartmentColor(dept.id),
        managerName: dept.manager ? dept.manager.fullname : 'Руководитель не назначен'
      }));
      
      setDepartments(departmentsWithColors);
    } catch (error) {
      console.error("Ошибка при загрузке подразделений:", error);
      toast({ 
        title: "Ошибка загрузки", 
        description: "Не удалось загрузить подразделения", 
        variant: "destructive" 
      });
    }
  };

  // Fetch departments on component mount
  useEffect(() => {
    loadUserDepartments();
  }, []);

  // Функция для проверки и обновления просроченных задач
  const checkAndUpdateOverdueTasks = async (tasksToCheck: Task[]) => {
    const now = new Date();
    // Устанавливаем начало текущего дня (00:00:00)
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const tasksToUpdate = tasksToCheck.filter(task => {
      const deadline = new Date(task.deadline);
      // Задача просрочена, если дедлайн был до начала текущего дня (вчера или раньше)
      const isOverdue = deadline < startOfToday && task.status !== 'completed' && task.status !== 'overdue';
      return isOverdue;
    });
    
    if (tasksToUpdate.length > 0) {
      const updatePromises = tasksToUpdate.map(async (task) => {
        // Обновляем статус задачи
        const { error } = await supabase
          .from('tasks')
          .update({ status: 'overdue' })
          .eq('id', task.id);
        
        if (error) {
          console.error(`Ошибка при обновлении статуса поручения ${task.id}:`, error);
          return { ...task, status: 'overdue' as TaskStatus };
        }
        
        // Добавляем системное сообщение о просрочке
        try {
          await supabase
            .from('messages')
            .insert([{
              content: 'Поручение просрочено',
              task_id: task.id,
              sent_by: task.createdBy,
              is_system: 1,
            }]);
        } catch (messageError) {
          console.error(`Ошибка при добавлении системного сообщения для поручения ${task.id}:`, messageError);
        }
        
        return { ...task, status: 'overdue' as TaskStatus };
      });
      
      const updatedTasks = await Promise.all(updatePromises);
      
      // Обновляем локальное состояние
      setTasks(prevTasks => 
        prevTasks.map(task => {
          const updatedTask = updatedTasks.find(ut => ut.id === task.id);
          return updatedTask || task;
        })
      );
    }
  };

  // Fetch tasks from Supabase on component mount
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        // Получаем ID доступных подразделений
        const departmentIds = departments.map(dept => dept.id);
        
        if (departmentIds.length === 0) {
          // Если нет доступных подразделений, устанавливаем пустой массив задач
          setTasks([]);
          return;
        }
        
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .in('departmentId', departmentIds)
          .order('created_at', { ascending: false });
          
        if (error) {
          console.error("Ошибка при загрузке поручений:", error);
          toast({ 
            title: "Ошибка загрузки", 
            description: "Не удалось загрузить поручения", 
            variant: "destructive" 
          });
          return;
        }
        
        if (data) {
          // Преобразуем данные из Supabase в формат Task
          const formattedTasks: Task[] = data.map(task => ({
            id: task.id,
            title: task.title,
            description: task.description,
            assignedTo: task.assigned_to,
            createdBy: task.created_by,
            departmentId: task.departmentId,
            parentId: task.parent_id || '', // Fix missing parentId
            priority: task.priority,
            isProtocol: task.is_protocol as ProtocolStatus,
            createdAt: new Date(task.created_at),
            deadline: new Date(task.deadline),
            status: task.status as TaskStatus,
            is_new: task.is_new || false
          }));
          
          setTasks(formattedTasks);
          
          // Проверяем и обновляем просроченные задачи
          await checkAndUpdateOverdueTasks(formattedTasks);
        }
      } catch (error) {
        console.error("Ошибка при загрузке поручений:", error);
        toast({ 
          title: "Ошибка загрузки", 
          description: "Не удалось загрузить поручения", 
          variant: "destructive" 
        });
      }
    };
    
    // Загружаем поручения после того, как загружены департаменты
    if (departments.length > 0) {
      fetchTasks();
    } else {
      setTasks([]);
    }
  }, [departments]);

  // Периодическая проверка просроченных задач (каждые 5 минут)
  useEffect(() => {
    if (tasks.length === 0) return;
    
    const interval = setInterval(() => {
      checkAndUpdateOverdueTasks(tasks);
    }, 5 * 60 * 1000); // 5 минут
    
    return () => clearInterval(interval);
  }, [tasks]);

  const selectDepartment = (department: Department | null) => {
    setSelectedDepartment(department);
  };

  const selectTask = (task: Task | null) => {
		setHeaderTitle(task ? "Поручение" : "Поручения")
    setSelectedTask(task);
  };

  const addDepartment = async (name: string, managerId: string, userIds: string[] = []) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      navigate("/auth");
      return;
    }
    
    try {
      // Получаем ID текущего пользователя из таблицы users
      const { data: currentUserData, error: currentUserError } = await supabase
        .from('users')
        .select('id')
        .eq('user_unique_id', session.user.id)
        .limit(1);
      
      if (currentUserError || !currentUserData.length) {
        console.error("Ошибка при получении данных текущего пользователя:", currentUserError);
        toast({ 
          title: "Ошибка", 
          description: "Не удалось получить данные пользователя",
          variant: "destructive" 
        });
        return;
      }
      
      const creatorId = currentUserData[0].id;
      
      const newDepartment = {
        name: name.toUpperCase(),
        managerId: managerId,
        created_by: creatorId // Добавляем создателя подразделения
      };

      // Добавляем департамент в базу данных
      const { data, error } = await supabase
        .from('departments')
        .insert(newDepartment)
        .select('*, manager:users!departments_managerId_fkey(id, fullname)')
        .single();
        
      if (error) {
        console.error("Ошибка при добавлении департамента:", error);
        toast({ 
          title: "Ошибка", 
          description: "Не удалось добавить подразделение",
          variant: "destructive" 
        });

        return;
      }
      
      // Обновляем leader_id для назначенного руководителя
      const {error: userError} = await supabase
        .from('users')
        .update({leader_id: creatorId}) // Используем ID создателя
        .eq('id', managerId);           // Только для выбранного руководителя
      
      if (userError) {
        console.error("Ошибка при обновлении данных руководителя:", userError);
      }
      
      // Добавляем новый департамент в локальный стейт с автоматически назначенным цветом
      const departmentWithColor = {
        ...data,
        color: getDepartmentColor(data.id), // Назначаем цвет на основе ID
        managerName: data.manager ? data.manager.fullname : 'Руководитель не назначен'
      };
      
      // Обновляем список подразделений, чтобы отобразить все доступные пользователю
      await loadUserDepartments();
      
      // Assign users to the new department
      const newUserDepartments = [...userDepartments];
      userIds.forEach(userId => {
        // Remove user from old department if exists
        const index = newUserDepartments.findIndex(ud => ud.userId === userId);
        if (index !== -1) {
          newUserDepartments.splice(index, 1);
        }
        
        // Add user to new department
        newUserDepartments.push({ userId, departmentId: data.id });
      });
      
      setUserDepartments(newUserDepartments);
      
      toast({ 
        title: "Подразделение добавлено", 
        description: `${name} добавлено в подразделения.` 
      });
    } catch (e) {
      console.error("Ошибка:", e);
      toast({ 
        title: "Ошибка", 
        description: "Произошла ошибка при добавлении подразделения",
        variant: "destructive"
      });
    }
  };

  // Добавим функцию для обновления выбранного департамента 
  const updateSelectedDepartmentId = async (departmentId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return;
    }

    try {
      const { data: currentUserData, error: currentUserError } = await supabase
        .from('users')
        .select('id')
        .eq('user_unique_id', session.user.id)
        .limit(1);
      
      if (currentUserError || !currentUserData.length) {
        console.error("Ошибка при получении данных пользователя:", currentUserError);
        return;
      }

      // Обновляем departmentId у текущего пользователя
      const { error: updateError } = await supabase
        .from('users')
        .update({ departmentId: departmentId })
        .eq('id', currentUserData[0].id);
      
      if (updateError) {
        console.error("Ошибка при обновлении департамента пользователя:", updateError);
      }
    } catch (error) {
      console.error("Ошибка:", error);
    }
  };

  const addTask = async (
    title: string,
    description: string,
    priority: Priority,
    isProtocol: ProtocolStatus,
    deadline: Date,
    selectedDepartmentId?: string,
    assigneeId?: string,
    duplicationData?: { selectedDepartments: string[]; selectedExecutors: string[]; }
  ) => {
    // Проверка наличия сессии
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      navigate("/auth");
      return;
    }

    try {
      // Получаем ID текущего пользователя из таблицы users
      const { data: currentUserData, error: currentUserError } = await supabase
        .from('users')
        .select('id, departmentId')
        .eq('user_unique_id', session.user.id)
        .limit(1);
      
      if (currentUserError || !currentUserData.length) {
        console.error("Ошибка при получении данных текущего пользователя:", currentUserError);
        toast({ 
          title: "Ошибка", 
          description: "Не удалось получить данные пользователя",
          variant: "destructive" 
        });
        return;
      }

      const createdBy = currentUserData[0].id;

      // Если есть данные дублирования, создаем несколько поручений
      if (duplicationData && duplicationData.selectedExecutors.length > 0) {
        const tasksToCreate = [];
        
        // Создаем массив задач для каждого выбранного исполнителя
        for (const executorId of duplicationData.selectedExecutors) {
          // Получаем департамент исполнителя
          const { data: executorData, error: executorError } = await supabase
            .from('users')
            .select('departmentId')
            .eq('id', executorId)
            .single();
            
          if (executorError || !executorData?.departmentId) {
            console.error(`Ошибка при получении данных исполнителя ${executorId}:`, executorError);
            continue;
          }
          
          tasksToCreate.push({
            title,
            description,
            created_by: createdBy,
            departmentId: executorData.departmentId,
            assigned_to: executorId,
            priority,
            is_protocol: isProtocol,
            created_at: new Date().toISOString(),
            deadline: deadline.toISOString(),
            status: 'new' as TaskStatus
          });
        }
        
        if (tasksToCreate.length === 0) {
          toast({ 
            title: "Ошибка", 
            description: "Не удалось получить данные исполнителей для дублирования",
            variant: "destructive" 
          });
          return;
        }
        
        // Массовая вставка задач
        const { data: createdTasks, error: insertError } = await supabase
          .from('tasks')
          .insert(tasksToCreate)
          .select();
        
        if (insertError) {
          console.error("Ошибка при создании дублированных поручений:", insertError);
          toast({ 
            title: "Ошибка", 
            description: "Не удалось создать дублированные поручения",
            variant: "destructive" 
          });
          return;
        }
        
        // Преобразуем созданные задачи в формат Task
        const newTasks: Task[] = createdTasks.map(task => ({
          id: task.id,
          title: task.title,
          description: task.description,
          assignedTo: task.assigned_to,
          createdBy: task.created_by,
          departmentId: task.departmentId,
          parentId: task.parent_id || '',
          priority: task.priority,
          isProtocol: task.is_protocol as ProtocolStatus,
          createdAt: new Date(task.created_at),
          deadline: new Date(task.deadline),
          status: task.status as TaskStatus
        }));
        
        // Обновляем локальное состояние
        setTasks([...tasks, ...newTasks]);
        toast({ 
          title: "Поручения созданы", 
          description: `Создано ${newTasks.length} поручений для выбранных исполнителей.` 
        });
        return;
      }
      
      // Обычное создание одного поручения
      const departmentId = selectedDepartmentId || currentUserData[0].departmentId;

      if (!departmentId) {
        toast({ 
          title: "Ошибка", 
          description: "У вас не выбрано подразделение. Пожалуйста, обратитесь к администратору.",
          variant: "destructive" 
        });
        return;
      }

      const taskData = {
        title,
        description,
        created_by: createdBy,
        departmentId: departmentId,
        assigned_to: assigneeId || createdBy,
        priority,
        is_protocol: isProtocol,
        created_at: new Date().toISOString(),
        deadline: deadline.toISOString(),
        status: 'new' as TaskStatus
      };

      const { data, error } = await supabase
        .from('tasks')
        .insert(taskData)
        .select()
        .single();
      
      if (error) {
        console.error("Ошибка при добавлении поручения:", error);
        toast({ 
          title: "Ошибка", 
          description: "Не удалось добавить поручение",
          variant: "destructive" 
        });
        return;
      }

      const newTask: Task = {
        id: data.id,
        title: data.title,
        description: data.description,
        assignedTo: data.assigned_to,
        createdBy: data.created_by,
        departmentId: data.departmentId,
        parentId: data.parent_id || '',
        priority: data.priority,
        isProtocol: data.is_protocol as ProtocolStatus,
        createdAt: new Date(data.created_at),
        deadline: new Date(data.deadline),
        status: data.status as TaskStatus
      };
      
      setTasks([...tasks, newTask]);
      toast({ title: "Поручение добавлено", description: "Новое поручение создано." });
    } catch (e) {
      console.error("Ошибка:", e);
      toast({ 
        title: "Ошибка", 
        description: "Произошла ошибка при добавлении поручения",
        variant: "destructive"
      });
    }
  };

  const completeTask = async (task: Task) => {
    try {
      if(task.status === 'on_verification' && user.id === task.assignedTo) throw new Error("Недостаточно привилегий")
      if(task.status === 'completed') throw new Error("Невозможно изменить статус поручения так как оно уже завершено")
      if(task.status === 'new' && user.id !== task.assignedTo) throw new Error("Только исполнитель может взять поручение в работу")
      if(task.status === 'in_progress' && user.id !== task.assignedTo) throw new Error("Только исполнитель может отправить поручение на проверку")  

      // Update task status in Supabase
      const { error } = await supabase
        .from('tasks')
        .update({
          status: task.status === 'new'
          ? 'in_progress'
          : (
            task.status === 'in_progress'
              ? 'on_verification'
              : (
                task.status === 'overdue'
                  ? 'in_progress'
                  : 'completed'
              )
          ) })
        .eq('id', task.id);
      if (error) {
        console.error("Ошибка при обновлении статуса поручения:", error);
        toast({ 
          title: "Ошибка", 
          description: "Не удалось обновить статус поручения",
          variant: "destructive" 
        });
        return;
      }
      setTasks(tasks => {
        const updatedTasks = tasks.map(t => {
          if (task.id !== t.id) return t;
      
          // Проверка прав для overdue задач
          if (t.status === 'overdue' && user?.id !== t.createdBy) {
            throw new Error("Только создатель может перевести просроченное поручение в работу или на проверку");
          }
      
          // Определяем новый статус
          const newStatus: TaskStatus = 
            t.status === 'new' ? 'in_progress' :
            t.status === 'in_progress' ? 'on_verification' :
            t.status === 'overdue' ? 'in_progress' :
            'completed';
      
          return {
            ...t,
            status: newStatus,
            updated_at: new Date().toISOString() // синхронизация с Supabase
          };
        });
      
        // Обновляем selectedTask если он есть
        if (selectedTask) {
          const updatedTask = updatedTasks.find(t => t.id === selectedTask.id);
          if (updatedTask) {
            setSelectedTask(updatedTask);
          }
        }
      
        return updatedTasks;
      });
      
              toast({ title: "Статус поручения ", description: "Статус поручения успешно изменен." });
    } catch (error) {
      console.error("Ошибка при изменении статуса поручения:", error);
      toast({ 
        title: "Ошибка", 
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      // Удаляем все сообщения, связанные с задачей
      const { error: msgError } = await supabase
        .from('messages')
        .delete()
        .eq('task_id', Number(taskId));
      if (msgError) {
        console.error('Ошибка при удалении сообщений поручения:', msgError);
        toast({ title: 'Ошибка', description: 'Не удалось удалить сообщения поручения', variant: 'destructive' });
        return;
      }
      // Удаляем саму задачу
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', Number(taskId));
      if (error) {
        console.error('Ошибка при удалении поручения:', error);
        toast({ title: 'Ошибка', description: 'Не удалось удалить поручение', variant: 'destructive' });
        return;
      }
      setTasks(tasks.filter(task => task.id !== taskId));
      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask(null);
      }
      toast({ title: 'Поручение удалено', description: 'Поручение и все связанные сообщения были удалены.' });
    } catch (e) {
      console.error('Ошибка при удалении поручения:', e);
      toast({ title: 'Ошибка', description: 'Не удалось удалить поручение', variant: 'destructive' });
    }
  };

  const reassignTask = async (
    taskId: string, 
    newAssigneeId: string, 
    newTitle?: string, 
    newDescription?: string, 
    newDeadline?: Date
  ) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      navigate("/auth");
      return;
    }

    const { data: currentUserData, error: userError } = await supabase
      .from('users')
      .select('id, fullname, departmentId')
      .eq('user_unique_id', session.user.id)
      .single();

    if (userError || !currentUserData) {
      toast({ title: "Ошибка", description: "Не удалось получить данные пользователя", variant: "destructive" });
      return;
    }

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // Получаем департаменты, где текущий пользователь руководитель
    const managedDepartments = departments.filter(dept => dept.managerId === currentUserData.id);
    // Получаем департаменты, где текущий пользователь является создателем
    const createdDepartments = departments.filter(dept => dept.created_by === currentUserData.id);
    // Получаем департамент задачи
    const taskDepartment = departments.find(dept => dept.id === task.departmentId);
    // Получаем департамент нового исполнителя
    const newAssigneeDept = departments.find(dept => dept.id === (taskDepartment && taskDepartment.id));

    let canReassign = false;
    let targetDepartmentId = task.departmentId;

    // 1. Руководитель департамента может переназначить задачу любому сотруднику своего департамента
    if (managedDepartments.some(dept => dept.id === task.departmentId)) {
      // Проверяем, что новый исполнитель состоит в этом департаменте
      const { data: usersInDept } = await supabase
        .from('users')
        .select('id')
        .eq('departmentId', task.departmentId);
      if (usersInDept?.some((u: any) => u.id === newAssigneeId)) {
        canReassign = true;
        targetDepartmentId = task.departmentId;
      }
    }

    // 2. Создатель задачи может переназначить задачу любому сотруднику того же департамента или в другой департамент
    if (!canReassign && task.createdBy === currentUserData.id) {
      // Можно переназначить на любого сотрудника любого департамента
      const { data: userData } = await supabase
        .from('users')
        .select('departmentId')
        .eq('id', newAssigneeId)
        .single();
      if (userData && userData.departmentId) {
        canReassign = true;
        targetDepartmentId = userData.departmentId;
      }
    }

    // 3. Исполнитель может переназначить задачу сотруднику департамента, где он руководитель
    if (!canReassign && task.assignedTo === currentUserData.id) {
      for (const dept of managedDepartments) {
        const { data: usersInDept } = await supabase
          .from('users')
          .select('id')
          .eq('departmentId', dept.id);
        if (usersInDept?.some((u: any) => u.id === newAssigneeId)) {
          canReassign = true;
          targetDepartmentId = dept.id;
          break;
        }
      }
    }

    // 4. Исполнитель может переназначить задачу на руководителя департамента, где он created_by
    if (!canReassign && task.assignedTo === currentUserData.id) {
      for (const dept of createdDepartments) {
        if (dept.managerId === newAssigneeId) {
          canReassign = true;
          targetDepartmentId = dept.id;
          break;
        }
      }
    }

    if (!canReassign) {
      toast({
        title: "Ошибка переназначения",
        description: "Недостаточно прав для переназначения поручения на выбранного сотрудника.",
        variant: "destructive"
      });
      return;
    }

    const assignee = await getUserById(newAssigneeId);
    if (!assignee) return;

    const descriptionWithInfo = (newDescription || task.description || '');

    const newTaskData = {
      title: newTitle || `[Переназначено] ${task.title}`,
      description: descriptionWithInfo,
      assigned_to: newAssigneeId,
      created_by: currentUserData.id,
      departmentId: targetDepartmentId,
      parent_id: task.id,
      priority: task.priority,
      is_protocol: task.isProtocol,
      deadline: newDeadline || task.deadline,
      status: 'new' as TaskStatus
    };

    const { data, error } = await supabase
      .from('tasks')
      .insert(newTaskData)
      .select()
      .single();

    if (error) {
      toast({ title: "Ошибка", description: "Не удалось переназначить поручение", variant: "destructive" });
      return;
    }

    const createdTask: Task = {
      id: data.id,
      title: data.title,
      description: data.description,
      assignedTo: data.assigned_to,
      createdBy: data.created_by,
      departmentId: data.departmentId,
      parentId: data.parent_id,
      priority: data.priority,
      isProtocol: data.is_protocol as ProtocolStatus,
      createdAt: new Date(data.created_at),
      deadline: new Date(data.deadline),
      status: data.status as TaskStatus
    };

    setTasks([...tasks, createdTask]);

    const targetDepartment = await getDepartmentById(targetDepartmentId);
    toast({
      title: "Поручение переназначено",
      description: `Создана новая задача в подразделении "${targetDepartment?.name}" для ${assignee.fullname}.`
    });
  };

  const toggleProtocol = async (taskId: string, newProtocolState?: 'active' | 'inactive') => {
    try {
      const currentTask = tasks.find(t => t.id === taskId);
      if (!currentTask) return;
      
      const targetState = newProtocolState || (currentTask.isProtocol === 'active' ? 'inactive' : 'active');
      
      const { error } = await supabase
        .from('tasks')
        .update({ is_protocol: targetState })
        .eq('id', taskId);
  
      if (error) throw error;
  
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === taskId 
            ? { ...task, isProtocol: targetState } 
            : task
        )
      );
  
      toast({ 
        title: `Поручение ${targetState === 'active' ? "добавлено в протокол" : "исключено из протокола"}`,
      });
    } catch (error) {
      console.error("Ошибка:", error);
      toast({ variant: "destructive", title: "Ошибка", description: error.message });
    }
  };

  const addMessage = (taskId: string, content: string) => {
    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      taskId,
      userId: currentUser.id,
      content,
      timestamp: new Date()
    };
    
    setMessages([...messages, newMessage]);
  };

  const searchTasks = (query: string) => {
    if (!query) return [];
    
    const searchTerm = query.toLowerCase();
    
    // Функция для получения читаемого статуса
    const getStatusLabel = (status: string): string => {
      switch (status) {
        case 'new': return 'Новое';
        case 'in_progress': return 'В работе';
        case 'on_verification': return 'На проверке';
        case 'completed': return 'Завершено';
        case 'overdue': return 'Просрочено';
        default: return status;
      }
    };
    
    // Фильтруем задачи, доступные текущему пользователю
    const accessibleTasks = tasks.filter(task => {
      // Пользователь может видеть задачи, где он:
      // 1. Создатель задачи
      // 2. Исполнитель задачи
      return task.createdBy === user?.id || task.assignedTo === user?.id;
    });
    
    return accessibleTasks.filter(task => 
      task.title.toLowerCase().includes(searchTerm) ||
      task.description.toLowerCase().includes(searchTerm) ||
      getStatusLabel(task.status).toLowerCase().includes(searchTerm)
    );
  };

  const getUserById = async (id: string): Promise<User> => {
		const { data, error } = await supabase.from('users').select('*').eq('id', id)
    return data[0];
  };

  const getDepartmentById = async (id: string): Promise<Department | undefined> => {
    // Найдем департамент в локальном состоянии
    const localDept = departments.find(department => department.id === id);
    if (localDept) return localDept;
    
    // Если не найден, попробуем загрузить из базы данных
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*, manager:users!departments_managerId_fkey(id, fullname)')
        .eq('id', id)
        .single();
        
      if (error || !data) return undefined;
      
      return {
        ...data,
        color: getDepartmentColor(data.id),
        managerName: data.manager ? data.manager.fullname : 'Руководитель не назначен'
      };
    } catch (e) {
      console.error("Ошибка при получении департамента:", e);
      return undefined;
    }
  };

  const getDepartmentByUserId = async (userId: string): Promise<Department | undefined> => {
    try {
      // 1. Получаем departmentId пользователя из БД
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('departmentId')
        .eq('id', userId)
        .single();
  
      if (userError || !userData?.departmentId) return undefined;
  
      // 2. Получаем данные подразделения
      const { data: department, error: deptError } = await supabase
        .from('departments')
        .select('*, manager:users!departments_managerId_fkey(id, fullname)')
        .eq('id', userData.departmentId)
        .single();
  
      if (deptError || !department) return undefined;
  
      // 3. Возвращаем с дополнительными полями
      return {
        ...department,
        color: getDepartmentColor(department.id),
        managerName: department.manager?.fullname || 'Руководитель не назначен'
      };
      
    } catch (error) {
      console.error('Error in getDepartmentByUserId:', error);
      return undefined;
    }
  };
   
  // Функция для добавления пользователей в существующий департамент
  const addUsersToDepartment = async (departmentId: string, userIds: string[]) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      navigate("/auth");
      return;
    }
    
    try {
      // Проверяем, существует ли департамент
      const selectedDept = departments.find(dept => dept.id === departmentId);
      if (!selectedDept) {
        toast({ 
          title: "Ошибка", 
          description: "Подразделение не найдено",
          variant: "destructive" 
        });
        return;
      }
      
      // Получаем ID текущего пользователя из таблицы users
      const { data: currentUserData, error: currentUserError } = await supabase
        .from('users')
        .select('id')
        .eq('user_unique_id', session.user.id)
        .limit(1);
      
      if (currentUserError || !currentUserData.length) {
        console.error("Ошибка при получении данных текущего пользователя:", currentUserError);
        toast({ 
          title: "Ошибка", 
          description: "Не удалось получить данные пользователя",
          variant: "destructive" 
        });
        return;
      }
      
      // Обновляем department_id для каждого пользователя отдельно
      const updatePromises = userIds.map(async (userId) => {
        const { error } = await supabase
          .from('users')
          .update({ 
            departmentId: departmentId,
            leader_id: currentUserData[0].id // Устанавливаем leader_id на id текущего пользователя
          })
          .eq('id', userId);
          
        if (error) {
          console.error(`Ошибка при обновлении пользователя ${userId}:`, error);
          return false;
        }
        return true;
      });
      
      // Ждем завершения всех обновлений
      const results = await Promise.all(updatePromises);
      
      // Проверяем, были ли ошибки
      if (results.includes(false)) {
        toast({ 
          title: "Предупреждение", 
          description: "Некоторые пользователи не были добавлены в подразделение",
          variant: "destructive" 
        });
      } else {
        // Обновляем локальное состояние
        const newUserDepartments = [...userDepartments];
        userIds.forEach(userId => {
          // Удаляем старую связь, если существует
          const index = newUserDepartments.findIndex(ud => ud.userId === userId);
          if (index !== -1) {
            newUserDepartments.splice(index, 1);
          }
          
          // Добавляем новую связь
          newUserDepartments.push({ userId, departmentId });
        });
        
        setUserDepartments(newUserDepartments);
        
        toast({ 
          title: "Пользователи добавлены", 
          description: `Пользователи добавлены в подразделение ${selectedDept.name}` 
        });
      }
    } catch (e) {
      console.error("Ошибка:", e);
      toast({ 
        title: "Ошибка", 
        description: "Произошла ошибка при добавлении пользователей в подразделение",
        variant: "destructive"
      });
    }
  };

  const getTasksByDepartment = (departmentId: string): Task[] => {
    return tasks.filter(task => task.departmentId === departmentId);
  };

  const getMessagesByTask = (taskId: string): Message[] => {
    return messages.filter(message => message.taskId === taskId);
  };

  const getSubordinates = async (): Promise<User[]> => {
    // Получаем сессию пользователя
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return [];
    }

    try {
      // Сначала получаем ID текущего пользователя из таблицы users
      const { data: currentUserData, error: currentUserError } = await supabase
        .from('users')
        .select('id')
        .eq('user_unique_id', session.user.id)
        .limit(1);
      
      if (currentUserError || !currentUserData.length) {
        console.error("Ошибка при получении данных текущего пользователя:", currentUserError);
        return [];
      }

      const currentUserId = currentUserData[0].id;

      // Получаем всех пользователей, где leader_id равен ID текущего пользователя
      const { data: subordinates, error: subordinatesError } = await supabase
        .from('users')
        .select('*')
        .eq('leader_id', currentUserId);
      
      if (subordinatesError) {
        console.error("Ошибка при получении подчиненных:", subordinatesError);
        return [];
      }

      // Преобразуем данные в формат User
      return subordinates.map(user => ({
        id: user.id,
        fullname: user.fullname || '', // Fix: use fullname instead of name
        email: user.email || '',
        image: user.image || '',
        role: Role.employee // Устанавливаем роль по умолчанию
      }));
    } catch (error) {
      console.error("Ошибка при получении подчиненных:", error);
      return [];
    }
  };

  const fetchTasks = async () => {
    try {
      // Получаем ID доступных подразделений
      const departmentIds = departments.map(dept => dept.id);
      
      if (departmentIds.length === 0) {
        // Если нет доступных подразделений, устанавливаем пустой массив задач
        setTasks([]);
        return;
      }
      
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .in('departmentId', departmentIds)
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error("Ошибка при загрузке поручений:", error);
        toast({ 
          title: "Ошибка загрузки", 
          description: "Не удалось загрузить поручения", 
          variant: "destructive" 
        });
        return;
      }
      
      if (data) {
        // Преобразуем данные из Supabase в формат Task
        const formattedTasks: Task[] = data.map(task => ({
          id: task.id,
          title: task.title,
          description: task.description,
          assignedTo: task.assigned_to,
          createdBy: task.created_by,
          departmentId: task.departmentId,
          parentId: task.parent_id || '', // Fix missing parentId
          priority: task.priority,
          isProtocol: task.is_protocol as ProtocolStatus,
          createdAt: new Date(task.created_at),
          deadline: new Date(task.deadline),
          status: task.status as TaskStatus,
          is_new: task.is_new || false
        }));
        
        setTasks(formattedTasks);
        
        // Проверяем и обновляем просроченные задачи
        await checkAndUpdateOverdueTasks(formattedTasks);
      }
    } catch (error) {
      console.error("Ошибка при загрузке поручений:", error);
      toast({ 
        title: "Ошибка загрузки", 
        description: "Не удалось загрузить поручения", 
        variant: "destructive" 
      });
    }
  };

  // Function to update is_new field for a task
  const updateTaskIsNew = async (taskId: string, isNew: boolean) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ is_new: isNew })
        .eq('id', taskId);

      if (error) {
        console.error("Ошибка при обновлении поля is_new:", error);
        return;
      }

      // Update local state
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === taskId ? { ...task, is_new: isNew } : task
        )
      );

      // Update selected task if it's the one being updated
      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask({ ...selectedTask, is_new: isNew });
      }
    } catch (error) {
      console.error("Ошибка при обновлении поля is_new:", error);
    }
  };

  // Function to get user's department ID
  const getUserDepartmentId = async (userId: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('departmentId')
        .eq('id', userId)
        .single();
        
      if (error || !data) {
        console.error("Ошибка при получении departmentId пользователя:", error);
        return null;
      }
      
      return data.departmentId;
    } catch (error) {
      console.error("Ошибка при получении departmentId пользователя:", error);
      return null;
    }
  };

  // Function to get filtered tasks based on current filter
  const getFilteredTasks = (): Task[] => {
    if (!user) return [];
    
    // If a specific user is selected, show only their tasks
    if (selectedUserId) {
      return tasks.filter(task => 
        task.createdBy === selectedUserId || task.assignedTo === selectedUserId
      );
    }
    
    // Otherwise use the regular filter
    switch(taskFilter) {
      case 'author':
        return tasks.filter(task => task.createdBy === user.id);
      case 'assignee':
        return tasks.filter(task => task.assignedTo === user.id);
      case 'all':
      default:
        return tasks.filter(task => 
          task.createdBy === user.id || task.assignedTo === user.id
        );
    }
  };

  return (
    <TaskContext.Provider value={{
			headerTitle,
			setHeaderTitle,
			viewHistory,
			setViewHistory,
			showArchive,
			setShowArchive,
			user,
			setUser,
      currentUser: user, // Добавляем currentUser
      users,
      departments,
      tasks,
      messages,
      supabase, // Add supabase to the context value
      selectedDepartment,
      selectedTask,
      selectedUserId,
      selectDepartment,
      selectTask,
      setSelectedUserId,
      addDepartment,
      addUsersToDepartment,
      addTask,
      completeTask,
      deleteTask,
      reassignTask,
      toggleProtocol,
      addMessage,
      searchTasks,
      updateTaskIsNew,
      getUserById,
      getDepartmentById,
      getDepartmentByUserId,
      getTasksByDepartment,
      getMessagesByTask,
      getSubordinates,
      updateSelectedDepartmentId,
      fetchTasks,
      taskFilter,
      setTaskFilter,
      getFilteredTasks,
      getUserDepartmentId
    }}>
      {children}
    </TaskContext.Provider>
  );
}

export function useTaskContext() {
  const context = useContext(TaskContext);
  if (context === undefined) {
    throw new Error('useTaskContext must be used within a TaskProvider');
  }
  return context;
}
