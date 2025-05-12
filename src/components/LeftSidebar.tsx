import React, { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Mail, Bell, ChevronDown, ChevronUp, Send } from "lucide-react";
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

// Add the props interface for LeftSidebar
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
		tasks
  } = useTaskContext();
  const navigate = useNavigate();
  const [profile, setProfile] = useState({
    user_unique_id: "",
    fullname: "",
    email: "",
    image: "",
  });

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
  const [showNewNotifications, setShowNewNotifications] = useState(false);
  const [showOverdueNotifications, setShowOverdueNotifications] = useState(false);
  const [expandedDepartments, setExpandedDepartments] = useState<string[]>([]);
  
  const [subordinates, setSubordinates] = useState<User[]>([]);
  
  useEffect(() => {
    getProfile();
    // Загружаем подчиненных сотрудников
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

  // Загрузка пользователей при открытии диалога создания департамента
  useEffect(() => {
    if (showNewDepartment) {
      fetchUsers();
    }
  }, [showNewDepartment]);

  // Загружаем пользователей при открытии диалога добавления в департамент
  useEffect(() => {
    if (showAddUsersToDepartment) {
      fetchUsersForExistingDepartment();
    }
  }, [showAddUsersToDepartment]);

  // Функция для загрузки пользователей из базы данных
  const fetchUsers = async () => {
    try {
      // Загружаем только пользователей без руководителя (без leader_id)
      const { data, error } = await supabase
        .from('users')
        .select('id, fullname')
        .is('leader_id', null)  // Выбираем только пользователей без руководителя
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

  // Функция для загрузки пользователей без руководителя для добавления в существующий департамент
  const fetchUsersForExistingDepartment = async () => {
    try {
      // Загружаем только пользователей без руководителя (без leader_id)
      const { data, error } = await supabase
        .from('users')
        .select('id, fullname')
        .is('leader_id', null)  // Выбираем только пользователей без руководителя
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

  // Функция для обработки выбора пользователей
  const handleUserSelection = (userId: string) => {
    setSelectedUsersToAdd(prev => 
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  // Функция для добавления выбранных пользователей в департамент
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

  return (
    <div className="w-[360px] flex flex-col h-screen bg-white border-r border-gray-200">
			{/* Application title */}
			<div className='h-[70px] w-full flex justify-center items-center text-[#979dc3] text-[17px] font-bold tracking-[0.7px] border-[#e5e4e9] border-b'>УПРАВЛЕНИЕ ПОРУЧЕНИЯМИ</div>
			<div className='px-[40px] py-[25px]'>
				{/* User Info */}
				<div className="flex flex-col items-center">
					<Avatar className="h-[70px] w-[70px] mb-2">
						<AvatarImage src={profile.image} alt={profile.fullname} />
						<AvatarFallback>{profile.fullname.slice(0, 2)}</AvatarFallback>
					</Avatar>
					<h3 className="text-lg font-semibold mt-[15px] mb-[8px]">{profile.fullname}</h3>
					<p className="text-sm text-gray-500">{profile.email}</p>
				</div>
				
				{/* Action Buttons */}
				<div className="flex justify-center mt-[25px] gap-[25px]">
					<Dialog open={showNewDepartment} onOpenChange={setShowNewDepartment}>
						<DialogTrigger asChild>
							<Button className="w-[36px] h-[36px] overflow-hidden relative bg-[#eaeefc] hover:bg-[#c0c3cf] rounded-full text-[#4d76fd]">
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 14" fill="currentColor">
									<path d="M13.533 5.6h-.961a.894.894 0 01-.834-.57.906.906 0 01.197-.985l.675-.675a.466.466 0 000-.66l-1.32-1.32a.466.466 0 00-.66 0l-.676.677a.9.9 0 01-.994.191.906.906 0 01-.56-.837V.467A.467.467 0 007.933 0H6.067A.467.467 0 005.6.467v.961c0 .35-.199.68-.57.834a.902.902 0 01-.983-.195L3.37 1.39a.466.466 0 00-.66 0L1.39 2.71a.466.466 0 000 .66l.675.675c.25.25.343.63.193.995a.902.902 0 01-.834.56H.467A.467.467 0 000 6.067v1.866c0 .258.21.467.467.467h.961c.35 0 .683.202.834.57a.904.904 0 01-.197.984l-.675.676a.466.466 0 000 .66l1.32 1.32a.466.466 0 00.66 0l.68-.68a.894.894 0 01.994-.187.897.897 0 01.556.829v.961c0 .258.21.467.467.467h1.866c.258 0 .467-.21.467-.467v-.961c0-.35.202-.683.57-.834a.904.904 0 01.984.197l.676.675a.466.466 0 00.66 0l1.32-1.32a.466.466 0 000-.66l-.68-.68a.894.894 0 01-.187-.994.897.897 0 01.829-.556h.961c.258 0 .467-.21.467-.467V6.067a.467.467 0 00-.467-.467zM7 9.333C5.713 9.333 4.667 8.287 4.667 7S5.713 4.667 7 4.667 9.333 5.713 9.333 7 8.287 9.333 7 9.333z"></path>
								</svg>
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
									<p className="text-xs text-gray-500 mt-1">
										Отображаются только пользователи без руководителя
									</p>
								</div>
								{/* <div className="space-y-2">
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
								</div> */}
								<Button onClick={handleCreateDepartment} className="w-full">
									Создать подразделение
								</Button>
							</div>
						</DialogContent>
					</Dialog>

					<Dialog open={showNewNotifications} onOpenChange={setShowNewNotifications}>
						<DialogTrigger asChild>
							<Button className="w-[36px] h-[36px] relative bg-[#eaeefc] hover:bg-[#c0c3cf] rounded-full text-[#4d76fd]">
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor">
									<path d="M10.688 95.156C80.958 154.667 204.26 259.365 240.5 292.01c4.865 4.406 10.083 6.646 15.5 6.646 5.406 0 10.615-2.219 15.469-6.604 36.271-32.677 159.573-137.385 229.844-196.896 4.375-3.698 5.042-10.198 1.5-14.719C494.625 69.99 482.417 64 469.333 64H42.667c-13.083 0-25.292 5.99-33.479 16.438-3.542 4.52-2.875 11.02 1.5 14.718z"></path>
									<path d="M505.813 127.406a10.618 10.618 0 00-11.375 1.542C416.51 195.01 317.052 279.688 285.76 307.885c-17.563 15.854-41.938 15.854-59.542-.021-33.354-30.052-145.042-125-208.656-178.917a10.674 10.674 0 00-11.375-1.542A10.674 10.674 0 000 137.083v268.25C0 428.865 19.135 448 42.667 448h426.667C492.865 448 512 428.865 512 405.333v-268.25a10.66 10.66 0 00-6.187-9.677z"></path>
								</svg>
								{/* <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
								</span> */}
							</Button>
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>Новые задачи</DialogTitle>
							</DialogHeader>
							{/* <div className="space-y-2">
								<div className="p-3 border rounded-md">
									<p className="font-medium">Новая задача: Обзор дизайна</p>
									<p className="text-sm text-gray-500">Назначил: Иванов Иван</p>
								</div>
								<div className="p-3 border rounded-md">
									<p className="font-medium">Новая задача: Обновление сайта</p>
									<p className="text-sm text-gray-500">Назначил: Петрова Мария</p>
								</div>
							</div> */}
						</DialogContent>
					</Dialog>

					<Dialog open={showOverdueNotifications} onOpenChange={setShowOverdueNotifications}>
						<DialogTrigger asChild>
							<Button className="w-[36px] h-[36px] relative bg-[#eaeefc] hover:bg-[#c0c3cf] rounded-full text-[#4d76fd]">
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor">
									<path d="M467.812 431.851l-36.629-61.056a181.363 181.363 0 01-25.856-93.312V224c0-67.52-45.056-124.629-106.667-143.04V42.667C298.66 19.136 279.524 0 255.993 0s-42.667 19.136-42.667 42.667V80.96C151.716 99.371 106.66 156.48 106.66 224v53.483c0 32.853-8.939 65.109-25.835 93.291L44.196 431.83a10.653 10.653 0 00-.128 10.752c1.899 3.349 5.419 5.419 9.259 5.419H458.66c3.84 0 7.381-2.069 9.28-5.397 1.899-3.329 1.835-7.468-.128-10.753zM188.815 469.333C200.847 494.464 226.319 512 255.993 512s55.147-17.536 67.179-42.667H188.815z"></path>
								</svg>
								{/* <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
									3
								</span> */}
							</Button>
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>Просроченные задачи</DialogTitle>
							</DialogHeader>
							{/* <div className="space-y-2">
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
							</div> */}
						</DialogContent>
					</Dialog>
				</div>
				
				{/* Stats */}
				<div className='mt-[11px] flex justify-end text-[10px] text-[#7a7e9d] font-semibold'>
					{doneTasks.length}/{tasks.length}
				</div>
				<div className='bg-[#e7edf5] w-full h-[8px] rounded-full mt-[5px] relative overflow-hidden'>
					<div className='bg-[#4d76fd] h-full rounded-full transition-all duration-300' style={{ width: doneTasks.length / tasks.length * 100 + "%" }} />
				</div>
				<div className="flex justify-between p-4 border-b border-gray-200">
					<div className="text-center">
						<p className="text-2xl font-bold">{doneTasks.length}</p>
						<p className="text-xs text-gray-500">Завершено</p>
					</div>
					<div className="text-center">
						<p className="text-2xl font-bold">{tasks.length - doneTasks.length}</p>
						<p className="text-xs text-gray-500">Нужно сделать</p>
					</div>
					<div className="text-center">
						<p className="text-2xl font-bold">{doneTasks.length}</p>
						<p className="text-xs text-gray-500">Всего завершено</p>
					</div>
				</div>
			</div>
      
      {/* Departments */}
      <div className=" border-b border-gray-200">
        <h4 className="text-sm font-medium uppercase tracking-wider mb-2 flex justify-between items-center">
        ПОДРАЗДЕЛЕНИЯ
        <div className="flex space-x-2">
            <Dialog open={showAddUsersToDepartment} onOpenChange={setShowAddUsersToDepartment}>
              <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="w-[36px] h-[36px] overflow-hidden relative bg-[#eaeefc] hover:bg-[#c0c3cf] rounded-full text-[#4d76fd] mr-5" >
                <svg className='text-[#7a7e9d] h-[36px] w-[36px] font-bold' xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="rgb(77, 118, 253)" stroke="none" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20.75 11V8.75H23V7.25H20.75V5H19.25V7.25H17V8.75H19.25V11H20.75Z" stroke="rgb(77, 118, 253)" />
                  <path d="M11 4C8.79 4 7 5.79 7 8C7 10.21 8.79 12 11 12C13.21 12 15 10.21 15 8C15 5.79 13.21 4 11 4Z" />
                  <path d="M3 18C3 15.34 8.33 14 11 14C13.67 14 19 15.34 19 18V20H3V18Z"  />
                </svg>
              </Button> 
                {/* <Button size="sm" variant="outline" className="text-xs h-8">
                  Добавить пользователя
                </Button> */}
              </DialogTrigger>
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
          </div>       
        </h4>
        <ul className="space-y-2">
          {departments.map((department) => (
            <Collapsible 
              key={department.id}
              className="border border-gray-100 rounded-sm mr-2 mb-2"
              open={expandedDepartments.includes(department.id)}
            >
              <CollapsibleTrigger asChild>
                <div 
                  className="flex items-center justify-between cursor-pointer hover:bg-gray-100 p-2 rounded "
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
          {subordinates.length > 0 ? (
            subordinates.map((user) => (
              <Avatar key={user.id} className="h-10 w-10">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback>{user.name.slice(0, 2)}</AvatarFallback>
              </Avatar>
            ))
          ) : (
            <p className="text-sm text-gray-500">У вас нет подчиненных сотрудников</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Simple chat component
function DepartmentChat() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);

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

export default LeftSidebar;
