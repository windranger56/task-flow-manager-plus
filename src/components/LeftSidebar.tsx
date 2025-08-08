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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
    tasks,
    taskFilter,
    setTaskFilter
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
  
  // States for notifications
  const [tasksWithNewMessages, setTasksWithNewMessages] = useState([]);
  const [tasksWithNewStatus, setTasksWithNewStatus] = useState([]);
  const [showNotificationsDialog, setShowNotificationsDialog] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState('all'); // 'all', 'messages', 'status'
  
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
            created_by
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
    getProfile();
    const loadSubordinates = async () => {
      try {
        const subs = await getSubordinates();
        setSubordinates(subs);
      } catch (error) {
        console.error("Ошибка при загрузке подчиненных:", error);
      }
    };
    
    const loadUserDepartment = async () => {
      if (user) {
        try {
          const department = await getDepartmentByUserId(user.id);
          setUserDepartment(department?.name || '');
        } catch (error) {
          console.error("Ошибка при загрузке департамента пользователя:", error);
        }
      }
    };
    
    const loadSubordinateDepartments = async () => {
      if (subordinates.length > 0) {
        try {
          const deptPromises = subordinates.map(async (sub) => {
            const dept = await getDepartmentByUserId(sub.id);
            return { userId: sub.id, departmentName: dept?.name || 'Не назначен' };
          });
          
          const deptResults = await Promise.all(deptPromises);
          const deptMap = deptResults.reduce((acc, curr) => {
            acc[curr.userId] = curr.departmentName;
            return acc;
          }, {} as {[userId: string]: string});
          
          setSubordinateDepartments(deptMap);
        } catch (error) {
          console.error("Ошибка при загрузке департаментов подчиненных:", error);
        }
      }
    };
    
    loadSubordinates().then(() => {
      loadSubordinateDepartments();
    });
    loadUserDepartment();
  }, [user]);

  useEffect(() => {
    if (user) {
      let filteredTasks = [];
      
      // Filter tasks based on selected filter
      switch(taskFilter) {
        case 'author':
          filteredTasks = tasks.filter(task => task.createdBy === user.id);
          break;
        case 'assignee':
          filteredTasks = tasks.filter(task => task.assignedTo === user.id);
          break;
        case 'all':
        default:
          filteredTasks = tasks.filter(task => 
            task.createdBy === user.id || task.assignedTo === user.id
          );
          break;
      }
      
      setDoneTasks(filteredTasks.reduce((a, c) => ([...a, ...(c.status === 'completed' ? [c] : [])]), []));
      setOverdueTasks(filteredTasks.reduce((a, c) => ([...a, ...(c.status === 'overdue' ? [c] : [])]), []));
      setNewTasks(filteredTasks.reduce((a, c) => ([...a, ...(c.status === 'new' ? [c] : [])]), []));
      setinworkTasks(filteredTasks.reduce((a, c) => ([...a, ...(c.status === 'in_progress' ? [c] : [])]), []));
      setverifyTasks(filteredTasks.reduce((a, c) => ([...a, ...(c.status === 'on_verification' ? [c] : [])]), []));
      
      // Fetch new messages and status notifications
      fetchTasksWithNewMessages();
      fetchTasksWithNewStatus();
    }
  }, [tasks, user, taskFilter]);

  // Effect to periodically refresh new messages and statuses
  useEffect(() => {
    if (!user) return;
    
    const interval = setInterval(() => {
      fetchTasksWithNewMessages();
      fetchTasksWithNewStatus();
    }, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(interval);
  }, [user]);

  // Mobile-specific styles
  const sidebarClass = isMobile 
  ? "w-full flex flex-col bg-white h-screen overflow-y-auto" 
  : "w-[360px] flex flex-col h-screen bg-white border-r border-gray-200 overflow-hidden";

  const borderClass = isMobile ? "" : "border-b border-gray-200";
  const avatarSize = isMobile ? "h-16 w-16" : "h-[70px] w-[70px]";
  const buttonGroupClass = isMobile ? "flex justify-center gap-4" : "flex justify-center gap-[25px]";
  const statsClass = isMobile ? "flex justify-center gap-6" : "flex justify-between";
  const subordinateAvatarSize = isMobile ? "h-8 w-8" : "h-10 w-10";

  // States for selected employee and their tasks
  const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null);
  const [selectedEmployeeTasks, setSelectedEmployeeTasks] = useState<any[]>([]);
  const [showEmployeeTasksDialog, setShowEmployeeTasksDialog] = useState(false);
  
  // States for department and task filter
  const [userDepartment, setUserDepartment] = useState<string>('');
  const [subordinateDepartments, setSubordinateDepartments] = useState<{[userId: string]: string}>({});

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

  // Calculate total notifications count
  const totalNotifications = tasksWithNewMessages.length + tasksWithNewStatus.length;

  return (
    <div className={sidebarClass}>
      {isMobile ? (
        <div className='h-[50px] w-full flex justify-center items-center text-[#979dc3] text-[17px] font-bold tracking-[0.7px]'>
          УПРАВЛЕНИЕ ПОРУЧЕНИЯМИ
        </div>
      ) : (
        <div className=' h-12 w-full flex justify-center items-center text-[#979dc3] text-[17px] font-bold tracking-[0.7px] border-[#e5e4e9] border-b'>
          УПРАВЛЕНИЕ ПОРУЧЕНИЯМИ
        </div>
      )}
      
      <div className={`px-[40px] py-[5px] ${isMobile ? 'text-center' : ''}`}>
        {/* User Info */}
        <div className="flex flex-col items-center">

          <h3 className="text-center text-xl font-semibold mt-[15px] mb-[8px]">{profile.fullname}</h3>
          <p className="text-l text-gray-500">{profile.email}</p>
          {userDepartment && (
            <p className="text-xs text-[#BCBCBC] mt-1">{userDepartment}</p>
          )}
          <Avatar className={`h-[90px] w-[90px] mb-2 mt-4`}>
            <AvatarImage src={profile.image} alt={profile.fullname} />
            <AvatarFallback>{profile.fullname ? profile.fullname.slice(0, 2) : 'UN'}</AvatarFallback>
          </Avatar>
          
        </div>
        
        {/* Task Filter Buttons */}
        <div className="flex justify-center gap-4 mt-[20px] mb-[15px] ">
          <button
            onClick={() => setTaskFilter('all')}
            className={`text-m pb-1 ${taskFilter === 'all' ? 'font-bold border-b-2 border-black' : 'text-gray-600'}`}
          >
            Все
          </button>
          <button
            onClick={() => setTaskFilter('author')}
            className={`text-m pb-1 ${taskFilter === 'author' ? 'font-bold border-b-2 border-black' : 'text-gray-600'}`}
          >
            я Автор
          </button>
          <button
            onClick={() => setTaskFilter('assignee')}
            className={`text-m pb-1 ${taskFilter === 'assignee' ? 'font-bold border-b-2 border-black' : 'text-gray-600'}`}
          >
            я Исполнитель
          </button>
        </div>
        
        {/* Action Buttons */}
        <div className={`${buttonGroupClass} mt-[15px]`}>
          {/* Combined Notifications Button */}
          <Dialog open={showNotificationsDialog} onOpenChange={setShowNotificationsDialog}>
            <DialogTrigger asChild>
              <Button 
                data-tooltip-id="tooltip" 
                data-tooltip-content="Уведомления"
                className="w-[36px] h-[36px] relative bg-[#eaeefc] hover:bg-[#c0c3cf] rounded-full text-[#4d76fd]"
              >
                <Bell className="h-4 w-4" />
                {totalNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                    {totalNotifications}
                  </span>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Уведомления</DialogTitle>
              </DialogHeader>
              
              <Tabs 
                value={notificationFilter} 
                onValueChange={setNotificationFilter}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="all">Все</TabsTrigger>
                  <TabsTrigger value="messages">Сообщения</TabsTrigger>
                  <TabsTrigger value="status">Статусы</TabsTrigger>
                </TabsList>
                
                <TabsContent value="all" className="space-y-2 max-h-[400px] overflow-y-auto">
                  {tasksWithNewMessages.length === 0 && tasksWithNewStatus.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">Нет новых уведомлений</p>
                  ) : (
                    <>
                      {tasksWithNewMessages.length > 0 && (
                        <div className="mb-4">
                          <div className="flex justify-between items-center mb-2">
                            <h3 className="font-medium">Новые сообщения ({tasksWithNewMessages.length})</h3>
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
                              onClick={() => {
                                handleTaskClick(task.id);
                                setShowNotificationsDialog(false);
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
                          ))}
                        </div>
                      )}
                      
                      {tasksWithNewStatus.length > 0 && (
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <h3 className="font-medium">Новые статусы ({tasksWithNewStatus.length})</h3>
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
                              onClick={() => {
                                handleTaskClick(task.id);
                                setShowNotificationsDialog(false);
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
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </TabsContent>
                
                <TabsContent value="messages" className="space-y-2 max-h-[400px] overflow-y-auto">
                  {tasksWithNewMessages.length > 0 ? (
                    <>
                      <div className="flex justify-end mb-2">
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
                          onClick={() => {
                            handleTaskClick(task.id);
                            setShowNotificationsDialog(false);
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
                      ))}
                    </>
                  ) : (
                    <p className="text-gray-500 text-center py-4">Нет новых сообщений</p>
                  )}
                </TabsContent>
                
                <TabsContent value="status" className="space-y-2 max-h-[400px] overflow-y-auto">
                  {tasksWithNewStatus.length > 0 ? (
                    <>
                      <div className="flex justify-end mb-2">
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
                          onClick={() => {
                            handleTaskClick(task.id);
                            setShowNotificationsDialog(false);
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
                      ))}
                    </>
                  ) : (
                    <p className="text-gray-500 text-center py-4">Нет обновлений статуса</p>
                  )}
                </TabsContent>
              </Tabs>
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
        <div className='bg-transperent w-full h-[8px] rounded-full mt-[20px] relative overflow-hidden'>
          {/* Просроченные */}
          <div 
            className='bg-[#DA100B] h-full absolute left-0 transition-all duration-300 rounded-full' 
            style={{ 
              width: `calc(${(overdueTasks.length / (overdueTasks.length + newTasks.length + verifyTasks.length + inworkTasks.length)) * 100}% - 3.75px)`,
              marginRight: '5px'
            }}
          />
          
          {/* Новые */}
          <div 
            className='bg-[#BCBCBC] h-full absolute transition-all duration-300 rounded-full' 
            style={{ 
              width: `calc(${(newTasks.length / (overdueTasks.length + newTasks.length + verifyTasks.length + inworkTasks.length)) * 100}% - 7.5px)`,
              left: `calc(${(overdueTasks.length / (overdueTasks.length + newTasks.length + verifyTasks.length + inworkTasks.length)) * 100}% + 1.25px)`
            }}
          />
          
          {/* На проверке */}
          <div 
            className='bg-[#EEF4C7] h-full absolute transition-all duration-300 rounded-full' 
            style={{ 
              width: `calc(${(verifyTasks.length / (overdueTasks.length + newTasks.length + verifyTasks.length + inworkTasks.length)) * 100}% - 7.5px)`,
              left: `calc(${(overdueTasks.length + newTasks.length) / (overdueTasks.length + newTasks.length + verifyTasks.length + inworkTasks.length) * 100}% + 1.25px)`
            }}
          />
          
          {/* В работе */}
          <div 
            className='bg-[#3F79FF] h-full absolute transition-all duration-300 rounded-full' 
            style={{ 
              width: `calc(${(inworkTasks.length / (overdueTasks.length + newTasks.length + verifyTasks.length + inworkTasks.length)) * 100}% - 3.75px)`,
              left: `calc(${(overdueTasks.length + newTasks.length + verifyTasks.length) / (overdueTasks.length + newTasks.length + verifyTasks.length + inworkTasks.length) * 100}% + 1.25px)`
            }}
          />
        </div>
        
        <div className="p-4">
          <div className="flex flex-col space-y-3">
            {/* Первая строка */}
            <div className="flex justify-between space-x-3">
              <div 
                className={`text-center p-3 rounded-lg cursor-pointer border flex-1 transition-all duration-200 h-4 min-w-[140px]
                   'border-gray-200'}
                  flex items-center space-x-2 justify-center hover:bg-gray-200`}
                onClick={() => handleStatusClick('overdue')}
              >
                <div className="w-2 h-2 rounded-full bg-[#DA100B]"></div>
                <p className="text-xs font-bold">{overdueTasks.length}</p>
                <p className="text-xs text-gray-500">Просрочено</p>
              </div>
              
              <div 
                className={`text-center p-3 rounded-lg cursor-pointer border flex-1 transition-all duration-200 h-4 min-w-[100px]
                   'border-gray-200'}
                  flex items-center space-x-2 justify-center hover:bg-gray-200`}
                onClick={() => handleStatusClick('in_progress')}
              >
                <div className="w-2 h-2 rounded-full bg-[#3F79FF]"></div>
                <p className="text-xs font-bold">{inworkTasks.length}</p>
                <p className="text-xs text-gray-500">В работе</p>
              </div>
            </div>
            
            {/* Вторая строка */}
            <div className="flex justify-between space-x-3">
              <div 
                className={`text-center p-3 rounded-lg cursor-pointer border flex-1 transition-all duration-200 h-4 min-w-[90px] max-w-[100px]
                   'border-gray-200'}
                  flex items-center space-x-2 justify-center hover:bg-gray-200`}
                onClick={() => handleStatusClick('new')}
              >
                <div className="w-2 h-2 rounded-full bg-[#BCBCBC]"></div>
                <p className="text-xs font-bold">{newTasks.length}</p>
                <p className="text-xs text-gray-500">Новые</p>
              </div>
              
              <div 
                className={`text-center p-3 rounded-lg cursor-pointer border flex-1 transition-all duration-200 h-4 min-w-[120px]
                  'border-gray-200'}
                  flex items-center space-x-2 justify-center hover:bg-gray-200`}
                onClick={() => handleStatusClick('on_verification')}
              >
                <div className="w-2 h-2 rounded-full bg-[#EEF4C7]"></div>
                <p className="text-xs font-bold">{verifyTasks.length}</p>
                <p className="text-xs text-gray-500">На проверке</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Subordinates */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <div className={`flex flex-col ${isMobile ? 'items-center' : ''} gap-3`}>
            {subordinates.length > 0 ? (
              subordinates.map((user, index) => (
                <div
                  key={user.id}
                  className={`relative group flex items-center cursor-pointer hover:bg-gray-100 rounded p-2 w-full`}
                  onClick={() => handleShowEmployeeTasks(user)}
                >
                  <Avatar className="h-10 w-10 mr-3">
                    <AvatarImage src={user.image} alt={user.fullname} />
                    <AvatarFallback>{user.fullname ? user.fullname.slice(0, 2) : 'UN'}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-m font-medium">{user.fullname}</span>
                    <span className="text-s text-gray-500">{subordinateDepartments[user.id] || 'Не назначен'}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500">Нет подчиненных</div>
            )}
          </div>
        </div>
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

