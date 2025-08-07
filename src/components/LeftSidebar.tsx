import React, { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Mail, Bell, ChevronDown, ChevronUp, Send, LogOut } from "lucide-react";
import { useTaskContext } from '@/contexts/TaskContext';
import { supabase } from '@/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent
} from '@/components/ui/collapsible';
import { User } from '@/types';
import { toast } from "@/components/ui/use-toast";
import { Tooltip } from 'react-tooltip';

interface LeftSidebarProps {
  onItemClick?: () => void;
}

const LeftSidebar = ({ onItemClick }: LeftSidebarProps) => {
  const {
    user,
    setUser,
    departments,
    selectDepartment,
    getUserById,
    users,
    addDepartment,
    getSubordinates,
    getDepartmentByUserId,
    addUsersToDepartment,
    selectTask,
    tasks
  } = useTaskContext();
  const navigate = useNavigate();
  const [profile, setProfile] = useState({
    user_unique_id: "",
    fullname: "",
    email: "",
    image: "",
  });

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

  const getProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      navigate("/auth");
    }

    const { data, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('user_unique_id', session.user.id)
      .limit(1);
    if (userError) throw userError;

    setUser(data[0])
 
    if(data) {
      setProfile({
        user_unique_id: data[0].user_unique_id || "",
        fullname: data[0].fullname || "",
        email: data[0].email || "",
        image: data[0].image || "",
      });
    }
  }

  // Функция для фильтрации задач по статусу
  const handleStatusClick = (status: string) => {
    setSelectedStatus(status);
    let tasksToShow = [];
    
    switch(status) {
      case 'new':
        tasksToShow = newTasks;
        break;
      case 'in_progress':
        tasksToShow = inworkTasks;
        break;
      case 'on_verification':
        tasksToShow = verifyTasks;
        break;
      case 'overdue':
        tasksToShow = overdueTasks;
        break;
      default:
        tasksToShow = [];
    }
    
    setFilteredTasks(tasksToShow);
    setShowTasksDialog(true);
  };

  // Получите правильные названия статусов
  const getStatusLabel = (status: string) => {
    switch(status) {
      case 'new': return 'Новые';
      case 'in_progress': return 'В работе';
      case 'on_verification': return 'На проверке';
      case 'overdue': return 'Просрочено';
      default: return '';
    }
  };

  const [showNewDepartment, setShowNewDepartment] = useState(false);
  const [showAddUsersToDepartment, setShowAddUsersToDepartment] = useState(false);
  const [newDeptName, setNewDeptName] = useState("");
  const [newDeptManager, setNewDeptManager] = useState("");
  const [availableUsers, setAvailableUsers] = useState<{id: string, fullname: string}[]>([]);
  const [selectedDeptForUsers, setSelectedDeptForUsers] = useState("");
  const [selectedUsersToAdd, setSelectedUsersToAdd] = useState<string[]>([]);
  const [doneTasks, setDoneTasks] = useState([])
  const [inworkTasks, setinworkTasks] = useState([])
  const [overdueTasks, setOverdueTasks] = useState([])
  const [verifyTasks, setverifyTasks] = useState([])
  const [showNewNotifications, setShowNewNotifications] = useState(false);
  const [showOverdueNotifications, setShowOverdueNotifications] = useState(false);
  const [expandedDepartments, setExpandedDepartments] = useState<string[]>([]);
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [newTasks, setNewTasks] = useState([]);
  const [subordinates, setSubordinates] = useState<User[]>([]);
  const [deletingSubordinateId, setDeletingSubordinateId] = useState<string | null>(null);
  const [showTasksDialog, setShowTasksDialog] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [filteredTasks, setFilteredTasks] = useState([]);
  
  // New states for new messages and status notifications
  const [tasksWithNewMessages, setTasksWithNewMessages] = useState([]);
  const [tasksWithNewStatus, setTasksWithNewStatus] = useState([]);
  const [showNewMessagesDialog, setShowNewMessagesDialog] = useState(false);
  const [showNewStatusDialog, setShowNewStatusDialog] = useState(false);
  
  // Function to fetch tasks with new messages
  const fetchTasksWithNewMessages = async () => {
    if (!user) return;
    
    try {
      // Fetch tasks where user has unread messages
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
        .neq('sent_by', user.id) // Messages not sent by current user
        .eq('is_read', false) // Unread messages
        .or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`, { foreignTable: 'tasks' });

      if (error) throw error;

      // Group by task and format data
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
  
  useEffect(() => {
    getProfile();
    const loadSubordinates = async () => {
      try {
        const subs = await getSubordinates();
        setSubordinates(subs);
      } catch (error) {
        console.error("Ошибка при загрузке подчиненных:", error);
      }
    };
    
    loadSubordinates();
  }, []);

  useEffect(() => {
    if (user) {
      const filteredTasks = tasks.filter(task => 
        task.createdBy === user.id || task.assignedTo === user.id
      );
      
      setDoneTasks(filteredTasks.reduce((a, c) => ([...a, ...(c.status === 'completed' ? [c] : [])]), []));
      setOverdueTasks(filteredTasks.reduce((a, c) => ([...a, ...(c.status === 'overdue' ? [c] : [])]), []));
      setNewTasks(filteredTasks.reduce((a, c) => ([...a, ...(c.status === 'new' ? [c] : [])]), []));
      setinworkTasks(filteredTasks.reduce((a, c) => ([...a, ...(c.status === 'in_progress' ? [c] : [])]), []));
      setverifyTasks(filteredTasks.reduce((a, c) => ([...a, ...(c.status === 'on_verification' ? [c] : [])]), []));
      
      // Fetch new messages and status notifications
      fetchTasksWithNewMessages();
      fetchTasksWithNewStatus();
    }
  }, [tasks, user]);

  // Effect to periodically refresh new messages and statuses
  useEffect(() => {
    if (!user) return;
    
    const interval = setInterval(() => {
      fetchTasksWithNewMessages();
      fetchTasksWithNewStatus();
    }, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(interval);
  }, [user]);

  

  // useEffect(() => {
  //   setDoneTasks(tasks.reduce((a, c) => ([...a, ...(c.status === 'completed' ? [c] : [])]), []))
  // }, [tasks])

  // useEffect(() => {
  //   setinworkTasks(tasks.reduce((a, c) => ([...a, ...(c.status === 'in_progress' ? [c] : [])]), []))
  // }, [tasks])

  // useEffect(() => {
  //   setverifyTasks(tasks.reduce((a, c) => ([...a, ...(c.status === 'on_verification' ? [c] : [])]), []))
  // }, [tasks])

  // useEffect(() => {
  //   setOverdueTasks(tasks.reduce((a, c) => ([...a, ...(c.status === 'overdue' ? [c] : [])]), []))
  // }, [tasks])

  // useEffect(() => {
  //   setDoneTasks(tasks.reduce((a, c) => ([...a, ...(c.status === 'completed' ? [c] : [])]), []));
  //   setOverdueTasks(tasks.reduce((a, c) => ([...a, ...(c.status === 'overdue' ? [c] : [])]), []));
  //   setNewTasks(tasks.reduce((a, c) => ([...a, ...(c.status === 'new' ? [c] : [])]), []));
  // }, [tasks]);

  useEffect(() => {
    if (showNewDepartment) {
      fetchUsers();
    }
  }, [showNewDepartment]);

  useEffect(() => {
    if (showAddUsersToDepartment) {
      fetchUsersForExistingDepartment();
    }
  }, [showAddUsersToDepartment]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/auth');
      toast({
        title: "Успешный выход",
        description: "Вы вышли из системы",
      });
    } catch (error) {
      console.error("Ошибка при выходе:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось выйти из системы",
        variant: "destructive"
      });
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, fullname')
        .is('leader_id', null)
        .order('fullname');
        
      if (error) {
        console.error("Ошибка при загрузке пользователей:", error);
        toast({
          title: "Ошибка", 
          description: "Не удалось загрузить пользователей",
          variant: "destructive"
        });
        return;
      }
      
      if (data) {
        if (data.length === 0) {
          toast({
            title: "Внимание", 
            description: "Нет доступных пользователей без руководителя",
            variant: "default"
          });
        }
        setAvailableUsers(data);
      }
    } catch (error) {
      console.error("Ошибка при загрузке пользователей:", error);
      toast({
        title: "Ошибка", 
        description: "Произошла ошибка при загрузке пользователей",
        variant: "destructive"
      });
    }
  };

  const fetchUsersForExistingDepartment = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, fullname')
        .is('leader_id', null)
        .order('fullname');
        
      if (error) {
        console.error("Ошибка при загрузке пользователей:", error);
        toast({
          title: "Ошибка", 
          description: "Не удалось загрузить пользователей",
          variant: "destructive"
        });
        return;
      }
      
      if (data) {
        if (data.length === 0) {
          toast({
            title: "Внимание", 
            description: "Нет доступных пользователей без руководителя",
            variant: "default"
          });
        }
        setAvailableUsers(data);
      }
    } catch (error) {
      console.error("Ошибка при загрузке пользователей:", error);
      toast({
        title: "Ошибка", 
        description: "Произошла ошибка при загрузке пользователей",
        variant: "destructive"
      });
    }
  };
  
  const handleCreateDepartment = () => {
    if (newDeptName && newDeptManager) {
      addDepartment(newDeptName, newDeptManager);
      setNewDeptName("");
      setNewDeptManager("");
      setShowNewDepartment(false);
    }
  };

  const handleUserSelection = (userId: string) => {
    setSelectedUsersToAdd(prev => 
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleAddUsersToDepartment = () => {
    if (selectedDeptForUsers && selectedUsersToAdd.length > 0) {
      addUsersToDepartment(selectedDeptForUsers, selectedUsersToAdd);
      setSelectedDeptForUsers("");
      setSelectedUsersToAdd([]);
      setShowAddUsersToDepartment(false);
    }
  };

  const toggleDepartment = (departmentId: string) => {
    setExpandedDepartments(prev => 
      prev.includes(departmentId) 
        ? prev.filter(id => id !== departmentId) 
        : [...prev, departmentId]
    );
  };

  // Mobile-specific styles
  const sidebarClass = isMobile 
    ? "w-full flex flex-col bg-white max-h-[100vh] overflow-y" 
    : "w-[360px] flex flex-col h-screen bg-white border-r border-gray-200";

  const borderClass = isMobile ? "" : "border-b border-gray-200";
  const avatarSize = isMobile ? "h-16 w-16" : "h-[70px] w-[70px]";
  const buttonGroupClass = isMobile ? "flex justify-center gap-4" : "flex justify-center gap-[25px]";
  const statsClass = isMobile ? "flex justify-center gap-6" : "flex justify-between";
  const subordinateAvatarSize = isMobile ? "h-8 w-8" : "h-10 w-10";

  // --- ДОБАВИТЬ состояния для выбранного сотрудника и его задач ---
  const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null);
  const [selectedEmployeeTasks, setSelectedEmployeeTasks] = useState<any[]>([]);
  const [showEmployeeTasksDialog, setShowEmployeeTasksDialog] = useState(false);

  // --- ДОБАВИТЬ функцию для загрузки задач сотрудника ---
  const handleShowEmployeeTasks = async (employee: User) => {
    setSelectedEmployee(employee);
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .or(`assigned_to.eq.${employee.id},created_by.eq.${employee.id}`);
    if (!error) {
      setSelectedEmployeeTasks(data || []);
      setShowEmployeeTasksDialog(true);
    } else {
      setSelectedEmployeeTasks([]);
      setShowEmployeeTasksDialog(true);
    }
  };

  return (
    <div className={sidebarClass}>
      {isMobile ? (
        <div className='h-[50px] w-full flex justify-center items-center text-[#979dc3] text-[17px] font-bold tracking-[0.7px]'>
          УПРАВЛЕНИЕ ПОРУЧЕНИЯМИ
        </div>
      ) : (
        <div className='h-[70px] w-full flex justify-center items-center text-[#979dc3] text-[17px] font-bold tracking-[0.7px] border-[#e5e4e9] border-b'>
          УПРАВЛЕНИЕ ПОРУЧЕНИЯМИ
        </div>
      )}
      
      <div className={`px-[40px] py-[5px] ${isMobile ? 'text-center' : ''}`}>
        {/* User Info */}
        <div className="flex flex-col items-center">
          <Avatar className={`${avatarSize} mb-2`}>
            <AvatarImage src={profile.image} alt={profile.fullname} />
            <AvatarFallback>{profile.fullname ? profile.fullname.slice(0, 2) : 'UN'}</AvatarFallback>
          </Avatar>
          <h3 className="text-center font-semibold mt-[15px] mb-[8px]">{profile.fullname}</h3>
          <p className="text-sm text-gray-500">{profile.email}</p>
        </div>
        
        {/* Action Buttons */}
        <div className={`${buttonGroupClass} mt-[25px]`}>
          {/* <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
            <DialogTrigger asChild>
              <Button 
                data-tooltip-id="tooltip" 
                data-tooltip-content="Действия с подразделениями"
                className="w-[36px] h-[36px] overflow-hidden relative bg-[#eaeefc] hover:bg-[#c0c3cf] rounded-full text-[#4d76fd] flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M20.75 11V8.75H23V7.25H20.75V5H19.25V7.25H17V8.75H19.25V11H20.75Z" stroke="rgb(77, 118, 253)" />
                  <path d="M11 4C8.79 4 7 5.79 7 8C7 10.21 8.79 12 11 12C13.21 12 15 10.21 15 8C15 5.79 13.21 4 11 4Z" />
                  <path d="M3 18C3 15.34 8.33 14 11 14C13.67 14 19 15.34 19 18V20H3V18Z" stroke="rgb(77, 118, 253)" />
                </svg>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Что вы хотите сделать?</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="flex flex-col space-y-2">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowActionDialog(false);
                      setShowNewDepartment(true);
                    }}
                  >
                    Добавить новое подразделение
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowActionDialog(false);
                      setShowAddUsersToDepartment(true);
                    }}
                  >
                    Добавить пользователей
                  </Button>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => setShowActionDialog(false)}
                  className="w-full"
                >
                  Отмена
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showNewDepartment} onOpenChange={setShowNewDepartment}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Добавить новое подразделение</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="department-name">Название подразделения <span className="text-red-500">*</span> </Label>
                <Input 
                  id="department-name" 
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  placeholder="Введите название подразделения"
                  className={!newDeptName && "border-red-500"}
                />
               
              </div>
              <div className="space-y-2">
                <Label htmlFor="department-manager">Руководитель подразделения <span className="text-red-500">*</span> </Label>
                <Select value={newDeptManager} onValueChange={setNewDeptManager}>
                  <SelectTrigger className={!newDeptManager && "border-red-500"}>
                    <SelectValue placeholder="Выберите руководителя" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUsers.length > 0 ? (
                      availableUsers.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.fullname}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-2 text-center text-gray-500">
                        Нет доступных пользователей без руководителя
                      </div>
                    )}
                  </SelectContent>
                </Select>
                
              </div>
              <Button 
                onClick={() => {
                  if (!newDeptName || !newDeptManager) {
                    return;
                  }
                  handleCreateDepartment();
                }} 
                className="w-full"
              >
                Добавить подразделение
              </Button>
            </div>
          </DialogContent>
        </Dialog> */}

        {/* <Dialog open={showAddUsersToDepartment} onOpenChange={setShowAddUsersToDepartment}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Добавить пользователей в подразделение</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="department-select">Выберите подразделение</Label>
                <Select 
                  value={selectedDeptForUsers} 
                  onValueChange={setSelectedDeptForUsers}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите подразделение" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Выберите пользователей <span className="text-red-500">*</span> </Label>
                <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
                  {availableUsers.length > 0 ? (
                    availableUsers.map((user) => (
                      <div key={user.id} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`user-${user.id}`} 
                          checked={selectedUsersToAdd.includes(user.id)}
                          onCheckedChange={() => handleUserSelection(user.id)}
                        />
                        <Label htmlFor={`user-${user.id}`} className="flex items-center">
                          <span>{user.fullname}</span>
                        </Label>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-500 py-2">
                      Нет доступных пользователей без руководителя
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Отображаются только пользователи без руководителя
                </p>
              </div>
              <Button 
                onClick={handleAddUsersToDepartment} 
                disabled={!selectedDeptForUsers || selectedUsersToAdd.length === 0} 
                className="w-full"
              >
                Добавить пользователей
              </Button>
            </div>
          </DialogContent>
        </Dialog> */}

        {/* New Messages Dialog */}
        <Dialog open={showNewMessagesDialog} onOpenChange={setShowNewMessagesDialog}>
          <DialogTrigger asChild>
            <Button 
              data-tooltip-id="tooltip" 
              data-tooltip-content="Новые сообщения"
              className="w-[36px] h-[36px] relative bg-[#eaeefc] hover:bg-[#c0c3cf] rounded-full text-[#4d76fd]"
            >
              <Mail className="h-4 w-4" />
              {tasksWithNewMessages.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {tasksWithNewMessages.length}
                </span>
              )}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Поручения с новыми сообщениями</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {tasksWithNewMessages.length > 0 ? (
                tasksWithNewMessages.map(task => (
                  <div 
                    key={task.id} 
                    className="p-3 border rounded-md cursor-pointer hover:bg-gray-50"
                    onClick={() => {
                      handleTaskClick(task.id);
                      setShowNewMessagesDialog(false);
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
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">Нет новых сообщений</p>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* New Status Dialog */}
        <Dialog open={showNewStatusDialog} onOpenChange={setShowNewStatusDialog}>
          <DialogTrigger asChild>
            <Button 
              data-tooltip-id="tooltip" 
              data-tooltip-content="Новые статусы"
              className="w-[36px] h-[36px] relative bg-[#eaeefc] hover:bg-[#c0c3cf] rounded-full text-[#4d76fd]"
            >
              <Bell className="h-4 w-4" />
              {tasksWithNewStatus.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {tasksWithNewStatus.length}
                </span>
              )}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Поручения с новым статусом</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {tasksWithNewStatus.length > 0 ? (
                tasksWithNewStatus.map(task => (
                  <div 
                    key={task.id} 
                    className="p-3 border rounded-md cursor-pointer hover:bg-gray-50"
                    onClick={() => {
                      handleTaskClick(task.id);
                      setShowNewStatusDialog(false);
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
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">Нет обновлений статуса</p>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Кнопка выхода - только иконка на мобильных */}
        {isMobile ? (
            <Button 
              onClick={handleLogout} 
              variant="outline" 
              className="w-[36px] h-[36px] ml-5 p-0 bg-[#eaeefc] hover:bg-[#c0c3cf] rounded-full text-[#4d76fd]"
              data-tooltip-id="tooltip" 
              data-tooltip-content="Выйти"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          ) : null}
          
        </div>
        
        {/* Stats */}
        {/* <div className='mt-[11px] flex justify-end text-[10px] text-[#7a7e9d] font-semibold'>
          {doneTasks.length}/{tasks.length}
        </div> */}
        <div className='bg-[#e7edf5] w-full h-[8px] rounded-full mt-[50px] relative overflow-hidden'>
          {/* Просроченные - красный */}
          <div 
            className='bg-red-500 border-b h-full absolute left-0 transition-all duration-300' 
            style={{ width: `${(overdueTasks.length / (overdueTasks.length + newTasks.length + verifyTasks.length + inworkTasks.length)) * 100}%` }}
          />
          
          {/* Новые - голубой */}
          <div 
            className='bg-blue-500 h-full absolute transition-all duration-300' 
            style={{ 
              width: `${(newTasks.length / (overdueTasks.length + newTasks.length + verifyTasks.length + inworkTasks.length)) * 100}%`,
              left: `${(overdueTasks.length / (overdueTasks.length + newTasks.length + verifyTasks.length + inworkTasks.length)) * 100}%`
            }}
          />
          
          {/* На проверке - фиолетовый */}
          <div 
            className='bg-purple-500 h-full absolute transition-all duration-300' 
            style={{ 
              width: `${(verifyTasks.length / (overdueTasks.length + newTasks.length + verifyTasks.length + inworkTasks.length)) * 100}%`,
              left: `${((overdueTasks.length + newTasks.length) / (overdueTasks.length + newTasks.length + verifyTasks.length + inworkTasks.length)) * 100}%`
            }}
          />
          
          {/* В работе - желтый */}
          <div 
            className='bg-yellow-500 h-full absolute transition-all duration-300' 
            style={{ 
              width: `${(inworkTasks.length / (overdueTasks.length + newTasks.length + verifyTasks.length + inworkTasks.length)) * 100}%`,
              left: `${((overdueTasks.length + newTasks.length + verifyTasks.length) / (overdueTasks.length + newTasks.length + verifyTasks.length + inworkTasks.length)) * 100}%`
            }}
          />
        </div>
        
        <div className="p-4">
          <div className="flex flex-col space-y-3">
            {/* Первая строка */}
            <div className="flex justify-between space-x-3">
              <div 
                className={`text-center p-3 rounded-lg cursor-pointer border flex-1 transition-all duration-200 min-w-[140px]
                  ${selectedStatus === 'overdue' ? 'bg-red-50 border-red-300' : 'border-gray-200 hover:border-red-200 hover:border-2'}
                  flex items-center space-x-2 justify-center`}
                onClick={() => handleStatusClick('overdue')}
              >
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <p className="text-xs font-bold">{overdueTasks.length}</p>
                <p className="text-xs text-gray-500">Просрочено</p>
              </div>
              
              <div 
                className={`text-center p-3 rounded-lg cursor-pointer border flex-1 transition-all duration-200 min-w-[100px]
                  ${selectedStatus === 'in_progress' ? 'bg-yellow-50 border-yellow-300' : 'border-gray-200 hover:border-yellow-200 hover:border-2'}
                  flex items-center space-x-2 justify-center`}
                onClick={() => handleStatusClick('in_progress')}
              >
                <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                <p className="text-xs font-bold">{inworkTasks.length}</p>
                <p className="text-xs text-gray-500">В работе</p>
              </div>
            </div>
            
            {/* Вторая строка */}
            <div className="flex justify-between space-x-3">
              <div 
                className={`text-center p-3 rounded-lg cursor-pointer border flex-1 transition-all duration-200 min-w-[90px] max-w-[100px]
                  ${selectedStatus === 'new' ? 'bg-blue-50 border-blue-300' : 'border-gray-200 hover:border-blue-200 hover:border-2'}
                  flex items-center space-x-2 justify-center`}
                onClick={() => handleStatusClick('new')}
              >
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <p className="text-xs font-bold">{newTasks.length}</p>
                <p className="text-xs text-gray-500">Новые</p>
              </div>
              
              <div 
                className={`text-center p-3 rounded-lg cursor-pointer border flex-1 transition-all duration-200 min-w-[120px]
                  ${selectedStatus === 'on_verification' ? 'bg-purple-50 border-purple-300' : 'border-gray-200 hover:border-purple-200 hover:border-2'}
                  flex items-center space-x-2 justify-center`}
                onClick={() => handleStatusClick('on_verification')}
              >
                <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                <p className="text-xs font-bold">{verifyTasks.length}</p>
                <p className="text-xs text-gray-500">На проверке</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Departments */}
      {/* <div className={borderClass}>
        <h4 className="text-sm font-medium uppercase tracking-wider mb-2 flex justify-between items-center px-4">
          ПОДРАЗДЕЛЕНИЯ
          <div className="flex space-x-2"></div>       
        </h4>
        <ul className="space-y-2 px-4">
          {departments.map((department) => (
            <Collapsible 
              key={department.id}
              className={`border border-transparent rounded-sm ${isMobile ? '' : 'mr-5'} mb-2`}
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
                <p>Руководитель: {department.managerName || 'Не назначен'}</p>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </ul>
      </div> */}
      
      {/* Subordinates */}
      <div className="p-4">
        {/* <h4 className="text-sm font-medium uppercase tracking-wider mb-4">СОТРУДНИКИ</h4> */}
        <div className={`flex flex-col ${isMobile ? 'items-center' : ''} overflow-y-auto max-h-[400px] gap-3`}>
          {subordinates.length > 0 ? (
            subordinates.map((user) => (
              <div
                key={user.id}
                className="relative group flex items-center cursor-pointer hover:bg-gray-100 rounded p-2 w-full"
                onClick={() => handleShowEmployeeTasks(user)}
              >
                <Avatar className="h-10 w-10 mr-3">
                  <AvatarImage src={user.image} alt={user.fullname} />
                  <AvatarFallback>{user.fullname ? user.fullname.slice(0, 2) : 'UN'}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{user.fullname}</span>
                  {/* <span className="text-xs text-gray-500">{ || 'Не указан отдел'}</span> */}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-gray-500">Нет подчиненных</div>
          )}
        </div>
                {/* <Button
                  size="icon"
                  variant="destructive"
                  className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 w-6 h-6 p-0 text-xs"
                  onClick={() => setDeletingSubordinateId(user.id)}
                  title="Удалить сотрудника"
                >
                  ×
                </Button> */}
                {/* Диалог подтверждения удаления */}
                {/* <Dialog open={deletingSubordinateId === user.id} onOpenChange={(open) => !open && setDeletingSubordinateId(null)}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Удалить сотрудника</DialogTitle>
                    </DialogHeader>
                    <div className="py-2">Вы уверены, что хотите удалить сотрудника <b>{user.fullname}</b>? Это действие нельзя отменить.</div>
                    <div className="flex gap-2 justify-end mt-4">
                      <Button variant="ghost" onClick={() => setDeletingSubordinateId(null)}>Отмена</Button>
                      <Button
                        variant="destructive"
                        onClick={async () => {
                          const { data: departmentsManaged, error: depError } = await supabase
                            .from('departments')
                            .select('id')
                            .eq('managerId', user.id);
                          if (depError) {
                            toast({ title: 'Ошибка', description: 'Не удалось проверить руководителя департамента', variant: 'destructive' });
                            return;
                          }
                          if (departmentsManaged && departmentsManaged.length > 0) {
                            const depIds = departmentsManaged.map(dep => dep.id);
                            const { error: updateError } = await supabase
                              .from('departments')
                              .update({ managerId: null })
                              .in('id', depIds);
                            if (updateError) {
                              toast({ title: 'Ошибка', description: 'Не удалось обновить департамент(ы)', variant: 'destructive' });
                              return;
                            }
                          }
                          const { error } = await supabase.from('users').update({ active: false, leader_id: null }).eq('id', user.id);
                          if (!error) {
                            setSubordinates((prev) => prev.filter((u) => u.id !== user.id));
                            setDeletingSubordinateId(null);
                            toast({ title: `Сотрудник ${user.fullname} удалён!` });
                          } else {
                            toast({ title: 'Ошибка', description: 'Не удалось удалить сотрудника', variant: 'destructive' });
                          }
                        }}
                      >
                        Удалить
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog> */}
              {/* </div>
            ))
          ) : (
            <p className="text-sm text-gray-500 w-full text-center">У вас нет подчинённых сотрудников</p>
          )}
        </div> */}
      </div>
      
      {/* Logout button at the bottom */}
      {!isMobile ? (
      <div className={`mt-auto p-4 ${isMobile ? '' : 'border-t border-gray-200'}`}>
        <Button 
          onClick={handleLogout} 
          variant="outline" 
          className={`w-full flex items-center justify-center gap-2 text-gray-600 hover:text-red-500 hover:bg-red-50 ${
            isMobile ? 'mx-auto max-w-[280px]' : ''
          }`}
        >
          <LogOut className="h-4 w-4" />
          <span>Выйти</span>
        </Button>
      </div>
      ) : null}
      
      <Tooltip id="tooltip" />

      <Dialog open={showTasksDialog} onOpenChange={setShowTasksDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{getStatusLabel(selectedStatus)} ({filteredTasks.length})</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {filteredTasks.length > 0 ? (
              filteredTasks.map(task => (
                <div 
                  key={task.id} 
                  className="p-3 border rounded-md cursor-pointer hover:bg-gray-50"
                  onClick={() => {
                    handleTaskClick(task.id);
                    setShowTasksDialog(false);
                  }}
                >
                  <p className="font-medium">{task.title}</p>
                  <p className="text-sm text-gray-500">{task.description}</p>
                  <div className="flex justify-between mt-2">
                    <span className={`text-xs ${
                      task.status === 'overdue' ? 'text-red-500' : 'text-gray-500'
                    }`}>
                      {task.status === 'overdue' ? 'Просрочено' : 'Срок'}: {new Date(task.deadline).toLocaleDateString()}
                    </span>
                    {task.priority === 'high' && (
                      <span className="text-xs text-gray-500">
                        Приоритет: Высокий
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">Нет задач с выбранным статусом</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Диалог для задач выбранного сотрудника */}
      <Dialog open={showEmployeeTasksDialog} onOpenChange={setShowEmployeeTasksDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Поручения: {selectedEmployee?.fullname}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {selectedEmployeeTasks.length > 0 ? (
              selectedEmployeeTasks.map(task => (
                <div key={task.id} className="p-3 border rounded-md">
                  <p className="font-medium">{task.title}</p>
                  <p className="text-sm text-gray-500">{task.description}</p>
                  <div className="flex justify-between mt-2">
                    <span className="text-xs text-gray-500">
                      Срок: {task.deadline ? new Date(task.deadline).toLocaleDateString() : '—'}
                    </span>
                    <span className="text-xs text-gray-500">
                      Статус: {task.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">Нет поручений</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default LeftSidebar;
