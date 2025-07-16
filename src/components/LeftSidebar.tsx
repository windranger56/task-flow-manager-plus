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
    }
  }, [tasks, user]);

  

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
      
      <div className={`px-[40px] py-[25px] ${isMobile ? 'text-center' : ''}`}>
        {/* User Info */}
        <div className="flex flex-col items-center">
          <Avatar className={`${avatarSize} mb-2`}>
            <AvatarImage src={profile.image} alt={profile.fullname} />
            <AvatarFallback>{profile.fullname ? profile.fullname.slice(0, 2) : 'UN'}</AvatarFallback>
          </Avatar>
          <h3 className="text-lg font-semibold mt-[15px] mb-[8px]">{profile.fullname}</h3>
          <p className="text-sm text-gray-500">{profile.email}</p>
        </div>
        
        {/* Action Buttons */}
        <div className={`${buttonGroupClass} mt-[25px]`}>
          <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
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
        </Dialog>

        {/* Диалог добавления пользователей (остаётся без изменений) */}
        <Dialog open={showAddUsersToDepartment} onOpenChange={setShowAddUsersToDepartment}>
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
                <Label>Выберите пользователей</Label>
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
        </Dialog>

        <Dialog open={showNewNotifications} onOpenChange={setShowNewNotifications}>
          <DialogTrigger asChild>
            <Button 
              data-tooltip-id="tooltip" 
              data-tooltip-content="Новые поручения"
              className="w-[36px] h-[36px] relative bg-[#eaeefc] hover:bg-[#c0c3cf] rounded-full text-[#4d76fd]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor">
                <path d="M10.688 95.156C80.958 154.667 204.26 259.365 240.5 292.01c4.865 4.406 10.083 6.646 15.5 6.646 5.406 0 10.615-2.219 15.469-6.604 36.271-32.677 159.573-137.385 229.844-196.896 4.375-3.698 5.042-10.198 1.5-14.719C494.625 69.99 482.417 64 469.333 64H42.667c-13.083 0-25.292 5.99-33.479 16.438-3.542 4.52-2.875 11.02 1.5 14.718z"></path>
                <path d="M505.813 127.406a10.618 10.618 0 00-11.375 1.542C416.51 195.01 317.052 279.688 285.76 307.885c-17.563 15.854-41.938 15.854-59.542-.021-33.354-30.052-145.042-125-208.656-178.917a10.674 10.674 0 00-11.375-1.542A10.674 10.674 0 000 137.083v268.25C0 428.865 19.135 448 42.667 448h426.667C492.865 448 512 428.865 512 405.333v-268.25a10.66 10.66 0 00-6.187-9.677z"></path>
              </svg>
              {newTasks.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {newTasks.length}
                </span>
              )}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Новые поручения</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {newTasks.length > 0 ? (
                newTasks.map(task => (
                  <div 
                    key={task.id} 
                    className="p-3 border rounded-md cursor-pointer hover:bg-gray-50"
                    onClick={() => {
                      handleTaskClick(task.id);
                      setShowNewNotifications(false);
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
                <p className="text-gray-500 text-center py-4">Новых поручений нет</p>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showOverdueNotifications} onOpenChange={setShowOverdueNotifications}>
          <DialogTrigger asChild>
            <Button 
              data-tooltip-id="tooltip" 
              data-tooltip-content="Просроченные поручения"
              className="w-[36px] h-[36px] relative bg-[#eaeefc] hover:bg-[#c0c3cf] rounded-full text-[#4d76fd]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor">
                <path d="M467.812 431.851l-36.629-61.056a181.363 181.363 0 01-25.856-93.312V224c0-67.52-45.056-124.629-106.667-143.04V42.667C298.66 19.136 279.524 0 255.993 0s-42.667 19.136-42.667 42.667V80.96C151.716 99.371 106.66 156.48 106.66 224v53.483c0 32.853-8.939 65.109-25.835 93.291L44.196 431.83a10.653 10.653 0 00-.128 10.752c1.899 3.349 5.419 5.419 9.259 5.419H458.66c3.84 0 7.381-2.069 9.28-5.397 1.899-3.329 1.835-7.468-.128-10.753zM188.815 469.333C200.847 494.464 226.319 512 255.993 512s55.147-17.536 67.179-42.667H188.815z"></path>
              </svg>
              {overdueTasks.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {overdueTasks.length}
                </span>
              )}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Просроченные поручения</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {overdueTasks.length > 0 ? (
                overdueTasks.map(task => (
                  <div 
                    key={task.id} 
                    className="p-3 border rounded-md cursor-pointer hover:bg-gray-50"
                    onClick={() => {
                      handleTaskClick(task.id);
                      setShowOverdueNotifications(false);
                    }}
                  >
                    <p className="font-medium">{task.title}</p>
                    <p className="text-sm text-gray-500">{task.description}</p>
                    <div className="flex justify-between mt-2">
                      <span className="text-xs text-red-500">
                        Просрочено: {new Date(task.deadline).toLocaleDateString()}
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
                <p className="text-gray-500 text-center py-4">Просроченных поручений нет</p>
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
        <div className='mt-[11px] flex justify-end text-[10px] text-[#7a7e9d] font-semibold'>
          {doneTasks.length}/{tasks.length}
        </div>
        <div className='bg-[#e7edf5] w-full h-[8px] rounded-full mt-[5px] relative overflow-hidden'>
          <div className='bg-[#4d76fd] h-full rounded-full transition-all duration-300' style={{ width: doneTasks.length / tasks.length * 100 + "%" }} />
        </div>
        <div className={`p-4 ${borderClass} ${statsClass}`}>
          <div className="text-center">
            <p className="text-2xl font-bold">{inworkTasks.length}</p>
            <p className="text-xs text-gray-500">В работе</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{verifyTasks.length}</p>
            <p className="text-xs text-gray-500">На проверке</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{doneTasks.length}</p>
            <p className="text-xs text-gray-500">Завершено</p>
          </div>
        </div>
      </div>
      
      {/* Departments */}
      <div className={borderClass}>
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
                <p>Руководитель: {department.managerName || getUserById(department.managerId)?.fullname || 'Не назначен'}</p>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </ul>
      </div>
      
      {/* Subordinates */}
      <div className="p-4">
        <h4 className="text-sm font-medium uppercase tracking-wider mb-4">СОТРУДНИКИ</h4>
        <div className={`flex ${isMobile ? 'justify-center' : 'flex-wrap'} gap-2`}>
          {subordinates.length > 0 ? (
            subordinates.map((user) => (
              <div key={user.id} className="relative group flex flex-col items-center">
                <Avatar className={subordinateAvatarSize}>
                  <AvatarImage src={user.image} alt={user.fullname} />
                  <AvatarFallback>{user.fullname ? user.fullname.slice(0, 2) : 'UN'}</AvatarFallback>
                </Avatar>
                <span className="text-xs mt-1 text-center max-w-[70px] truncate">{user.fullname}</span>
                <Button
                  size="icon"
                  variant="destructive"
                  className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 w-6 h-6 p-0 text-xs"
                  onClick={() => setDeletingSubordinateId(user.id)}
                  title="Удалить сотрудника"
                >
                  ×
                </Button>
                {/* Диалог подтверждения удаления */}
                <Dialog open={deletingSubordinateId === user.id} onOpenChange={(open) => !open && setDeletingSubordinateId(null)}>
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
                </Dialog>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500 w-full text-center">У вас нет подчинённых сотрудников</p>
          )}
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
    </div>
  );
}

export default LeftSidebar;
