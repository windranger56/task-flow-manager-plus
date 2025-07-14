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
    setDoneTasks(tasks.reduce((a, c) => ([...a, ...(c.status === 'completed' ? [c] : [])]), []))
  }, [tasks])

  useEffect(() => {
    setinworkTasks(tasks.reduce((a, c) => ([...a, ...(c.status === 'in_progress' ? [c] : [])]), []))
  }, [tasks])

  useEffect(() => {
    setverifyTasks(tasks.reduce((a, c) => ([...a, ...(c.status === 'on_verification' ? [c] : [])]), []))
  }, [tasks])

  useEffect(() => {
    setOverdueTasks(tasks.reduce((a, c) => ([...a, ...(c.status === 'overdue' ? [c] : [])]), []))
  }, [tasks])

  useEffect(() => {
    setDoneTasks(tasks.reduce((a, c) => ([...a, ...(c.status === 'completed' ? [c] : [])]), []));
    setOverdueTasks(tasks.reduce((a, c) => ([...a, ...(c.status === 'overdue' ? [c] : [])]), []));
    setNewTasks(tasks.reduce((a, c) => ([...a, ...(c.status === 'new' ? [c] : [])]), []));
  }, [tasks]);

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
    ? "w-full flex flex-col bg-white" 
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
            <AvatarFallback>{profile.fullname.slice(0, 2)}</AvatarFallback>
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

          {/* Остальные диалоги остаются без изменений */}
          {/* ... */}
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
                <p>Руководитель: {department.managerName || getUserById(department.managerId)?.name || 'Не назначен'}</p>
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
              <Avatar key={user.id} className={subordinateAvatarSize}>
                <AvatarImage src={user.image} alt={user.name} />
                <AvatarFallback>{user.name.slice(0, 2)}</AvatarFallback>
              </Avatar>
            ))
          ) : (
            <p className="text-sm text-gray-500 w-full text-center">У вас нет подчиненных сотрудников</p>
          )}
        </div>
      </div>

      {/* Logout button at the bottom */}
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
      
      <Tooltip id="tooltip" />
    </div>
  );
}

export default LeftSidebar;