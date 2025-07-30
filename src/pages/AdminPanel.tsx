import { useEffect, useLayoutEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Menu, ChevronDown, ChevronUp } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { supabase } from "@/supabase/client"
import { toast } from "sonner"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { useNavigate } from "react-router-dom"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";


export default function AdminPanel({ session }) {
  const [selectedSection, setSelectedSection] = useState("главная");
	const [users, setUsers] = useState([]);

  const [isSheetOpen, setIsSheetOpen] = useState(false);
	const [deletingId, setDeletingId] = useState();

	const navigate = useNavigate();

  const [editUser, setEditUser] = useState(null);
const [editUserData, setEditUserData] = useState(null);
const [departments, setDepartments] = useState([]);
const [leaders, setLeaders] = useState([]);
const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
const [showCreateDept, setShowCreateDept] = useState(false);
const [newDept, setNewDept] = useState({ name: '', managerId: '', created_by: '' });
const [responsibles, setResponsibles] = useState([]);
const [departmentsTab, setDepartmentsTab] = useState([]);
const [editDept, setEditDept] = useState(null);
const [editDeptData, setEditDeptData] = useState({ name: '', managerId: '', created_by: '' });
const [sortField, setSortField] = useState<'name' | 'manager' | 'created_by'>('name');
const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
const [role, setRole] = useState(null)
const [sortUserField, setSortUserField] = useState('fullname');
const [sortUserDirection, setSortUserDirection] = useState<'asc' | 'desc'>('asc');
const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());
// --- Фильтры пользователей ---
const [userSearch, setUserSearch] = useState('');
const [userDeptFilter, setUserDeptFilter] = useState('all');
const [userRoleFilter, setUserRoleFilter] = useState('all');
// --- Фильтры департаментов ---
const [deptSearch, setDeptSearch] = useState('');
const [deptManagerFilter, setDeptManagerFilter] = useState('all');


useLayoutEffect(() => {
	supabase.from("users").select("privilege_level").eq('user_unique_id', session.user.id).then(({ data }) => {
		if (data[0].privilege_level === null) navigate("/");
		else setRole(data[0].privilege_level);
	});
}, []);

// useEffect для загрузки департаментов один раз при монтировании
useEffect(() => {
  supabase.from('departments').select('id, name').then(({ data }) => setDepartments(data || []));
}, []);

// Удалить загрузку департаментов из useEffect, который зависит от editUser
useEffect(() => {
  if (editUser) {
    supabase.from('users').select('id, fullname').then(({ data }) => setLeaders(data || []));
    setEditUserData({
      ...editUser,
      departmentId: editUser.department?.id || '',
      leaderId: editUser.leader_id || '',
      role: editUser.role || 'employee',
      avatar: null,
      password: editUser.password || ''
    });
    setAvatarPreview(editUser.image || null);
  }
}, [editUser]);

useEffect(() => {
  if (selectedSection === "департаменты") {
    fetchDepartmentsWithUsers();
    // Загружаем руководителей для фильтра
    supabase.from('users').select('id, fullname').then(({ data }) => setLeaders(data || []));
  }
}, [selectedSection]);

const fetchDepartmentsWithUsers = async () => {
  // Получаем департаменты с руководителями, ответственными и сотрудниками
  const { data: departments, error } = await supabase
    .from('departments')
    .select('id, name, managerId, created_by, manager:managerId (id, fullname, email), responsible:created_by (id, fullname, email), users:users_departmentId_fkey (id, fullname, email)');
  if (!error) {
    // Для каждого департамента добавляем руководителя в список сотрудников, если его там нет
    const departmentsWithManager = (departments || []).map(dep => {
      let users = Array.isArray(dep.users) ? dep.users : [];
      const manager = Array.isArray(dep.manager) ? dep.manager[0] : dep.manager;
      if (manager && manager.id && Array.isArray(users) && !users.find(u => u.id === manager.id)) {
        users = [manager, ...users];
      }
      return { ...dep, users };
    });
    setDepartmentsTab(departmentsWithManager);
  }
};

const handleEditUser = async () => {
	if (role === 'observer') {
		toast.error("Недостаточно привилегий для редактирования пользователей");
		setEditUser(null);
		return;
	}
  let avatarUrl = editUser.image;
  if (editUserData.avatar) {
    const fileExt = editUserData.avatar.name.split('.').pop();
    const filePath = `${Date.now()}/avatar.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from('images').upload(filePath, editUserData.avatar, { upsert: true });
    if (!uploadError) {
      const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(filePath);
      avatarUrl = publicUrl;
    }
  }
  const { error } = await supabase.from('users').update({
    fullname: editUserData.fullname,
    email: editUserData.email,
    password: editUserData.password,
    image: avatarUrl,
    departmentId: editUserData.departmentId ? Number(editUserData.departmentId) : null,
    role: editUserData.role,
    leader_id: editUserData.leaderId ? Number(editUserData.leaderId) : null
  }).eq('id', editUser.id);
  if (!error) {
    toast.success('Пользователь обновлен');
    setEditUser(null);
    setEditUserData(null);
    setAvatarPreview(null);
    fetchUsers();
  } else {
    toast.error('Ошибка при обновлении пользователя');
  }
};

  const handleSectionChange = (section) => {
    setSelectedSection(section)
    setIsSheetOpen(false)
    if (section === "пользователи") {
      fetchUsers();
      // Загружаем департаменты для фильтра
      supabase.from('departments').select('id, name').then(({ data }) => setDepartments(data || []));
    }
  }

	const fetchUsers = async () => {
		const response = await supabase
			.from("users")
			.select(`id, fullname, email, image, leader_id, password, departmentId, role, department:users_departmentId_fkey (*)`)
			.eq("active", true);


		if (response.error) {
			toast.error(response.error.message)
			return
		}

		// Получаем департаменты для поиска по managerId и departmentId
		const { data: allDepartments } = await supabase.from('departments').select('id, name, managerId');
		const departmentsList = Array.isArray(allDepartments) ? allDepartments.filter(dep => dep && dep.id) : [];
		setDepartments(departmentsList);

		response.data = await Promise.all(response.data.map(
			u => u.leader_id
				? supabase.from("users").select("fullname").eq("id", u.leader_id).eq("active", true)
					.then(({data}) => ({ ...u, leader: data?.[0]?.fullname || "Нет руководителя" }))
				: u
		))

		setUsers(response.data)
	}

	useEffect(() => { fetchUsers() }, [])
	useEffect(() => { console.log(deletingId) }, [deletingId])

  const handleCreateDept = async () => {
    if (!newDept.name || !newDept.managerId || !newDept.created_by) {
      toast.error('Заполните все поля');
      return;
    }
    
    const { data: deptData, error: deptError } = await supabase
      .from('departments')
      .insert({
        name: newDept.name,
        managerId: newDept.managerId ? Number(newDept.managerId) : null,
        created_by: newDept.created_by
      })
      .select()
      .single();
    
    if (!deptError && deptData) {
      // Обновляем departmentId у руководителя
      if (newDept.managerId) {
        const { error: userUpdateError } = await supabase
          .from('users')
          .update({ departmentId: deptData.id })
          .eq('id', newDept.managerId);
        
        if (userUpdateError) {
          console.error('Ошибка при обновлении departmentId руководителя:', userUpdateError);
        }
      }
      
      toast.success('Департамент создан');
      setShowCreateDept(false);
      setNewDept({ name: '', managerId: '', created_by: session?.user?.id || '' });
      fetchDepartmentsWithUsers(); // Обновляем список департаментов
      fetchUsers(); // Обновляем список пользователей
    } else {
      toast.error('Ошибка при создании департамента');
    }
  };

  useEffect(() => {
    if (showCreateDept) {
      supabase.from('users').select('id, fullname').then(({ data }) => {
        setLeaders(data || []);
        setResponsibles(data || []);
      });
      setNewDept(d => ({ ...d }));
    }
  }, [showCreateDept]);

  const handleEditDept = async () => {
		if (role === 'observer') {
			toast.error("Недостаточно привилегий для редактирования департаментов");
			setEditDept(null);
			return;
		}
    if (!editDeptData.name || !editDeptData.managerId) {
      toast.error('Заполните все поля');
      return;
    }
    const { error } = await supabase.from('departments').update({
      name: editDeptData.name,
      managerId: editDeptData.managerId ? Number(editDeptData.managerId) : null,
      created_by: editDeptData.created_by ? Number(editDeptData.created_by) : null
    }).eq('id', editDept.id);
    if (!error) {
      toast.success('Департамент обновлен');
      setEditDept(null);
      setEditDeptData({ name: '', managerId: '', created_by: '' });
      fetchDepartmentsWithUsers();
    } else {
      toast.error('Ошибка при обновлении департамента');
    }
  };

  useEffect(() => {
    if (editDept) {
      supabase.from('users').select('id, fullname').then(({ data }) => setLeaders(data || []));
      supabase.from('users').select('id, fullname').then(({ data }) => setResponsibles(data || []));
    }
  }, [editDept]);

  const handleDeleteDept = async (dept) => {
    if (role !== 'admin') {
      toast.error('Недостаточно привилегий для удаления департамента');
      return;
    }
    try {
      // 1. Найти все задачи, связанные с этим департаментом
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('id')
        .eq('departmentId', dept.id);
      if (tasksError) {
        toast.error('Ошибка при поиске задач департамента');
        return;
      }
      if (tasks && tasks.length > 0) {
        const taskIds = tasks.map(t => t.id);
        // 2. Удалить все сообщения по этим задачам
        await supabase.from('messages').delete().in('task_id', taskIds);
        // 3. Удалить задачи
        await supabase.from('tasks').delete().in('id', taskIds);
      }
      // 4. Обновить пользователей, чтобы их departmentId стал null
      await supabase.from('users').update({ departmentId: null }).eq('departmentId', dept.id);
      // 5. Удалить сам департамент
      const { error: deptError } = await supabase.from('departments').delete().eq('id', dept.id);
      if (!deptError) {
        toast.success(`Департамент '${dept.name}' и все связанные данные удалены!`);
        fetchDepartmentsWithUsers();
        fetchUsers();
      } else {
        toast.error('Ошибка при удалении департамента');
      }
    } catch (e) {
      toast.error('Ошибка при удалении департамента');
    }
  };

  const toggleDeptExpansion = (deptId: string) => {
    setExpandedDepts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(deptId)) {
        newSet.delete(deptId);
      } else {
        newSet.add(deptId);
      }
      return newSet;
    });
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-white border-r flex-col p-4">
        <div className="text-2xl font-bold mb-6">Панель управления</div>
        <nav className="flex flex-col gap-2">
          <Button
            variant={selectedSection === "главная" ? "default" : "ghost"}
            onClick={() => setSelectedSection("главная")}
            className="justify-start"
          >
            Главная
          </Button>
          <Button
            variant={selectedSection === "пользователи" ? "default" : "ghost"}
            onClick={() => setSelectedSection("пользователи")}
            className="justify-start"
          >
            Пользователи
          </Button>
          <Button
            variant={selectedSection === "департаменты" ? "default" : "ghost"}
            onClick={() => setSelectedSection("департаменты")}
            className="justify-start"
          >
            Департаменты
          </Button>
        </nav>
      </aside>

      {/* Main Section */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white shadow p-3 sm:p-4 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="md:hidden">
              <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[280px] sm:w-[300px]">
                  <div className="text-xl font-bold mb-6">Панель управления</div>
                  <nav className="flex flex-col gap-3">
                    <Button
                      variant={selectedSection === "главная" ? "default" : "ghost"}
                      onClick={() => handleSectionChange("главная")}
                      className="justify-start h-11"
                    >
                      Главная
                    </Button>
                    <Button
                      variant={selectedSection === "пользователи" ? "default" : "ghost"}
                      onClick={() => handleSectionChange("пользователи")}
                      className="justify-start h-11"
                    >
                      Пользователи
                    </Button>
                    <Button
                      variant={selectedSection === "департаменты" ? "default" : "ghost"}
                      onClick={() => handleSectionChange("департаменты")}
                      className="justify-start h-11"
                    >
                      Департаменты
                    </Button>
                  </nav>
                </SheetContent>
              </Sheet>
            </div>

            <div className="text-lg sm:text-xl font-semibold capitalize">
              {selectedSection}
            </div>
          </div>

          {/* Mobile Action Menu */}
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  Действия
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px]">
                <div className="flex flex-col gap-4 pt-6">
                  <Button 
                    onClick={() => role !== "observer" ? navigate('/register') : toast.error("Недостаточно привилегий для создания пользователя")} 
                    variant="outline"
                    className="w-full h-11"
                  >
                    Создать пользователя
                  </Button>
                  <Button 
                    onClick={() => role !== "observer" ? setShowCreateDept(true) : toast.error("Недостаточно привилегий для создания департамента")} 
                    variant="outline"
                    className="w-full h-11"
                  >
                    Создать департамент
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex gap-2">
            <Button 
              onClick={() => role !== "observer" ? navigate('/register') : toast.error("Недостаточно привилегий для создания пользователя")} 
              variant="outline"
              size="sm"
            >
              Создать пользователя
            </Button>
            <Button 
              onClick={() => role !== "observer" ? setShowCreateDept(true) : toast.error("Недостаточно привилегий для создания департамента")} 
              variant="outline"
              size="sm"
            >
              Создать департамент
            </Button>
          </div>

          {/* Create Department Dialog */}
          <Dialog open={showCreateDept} onOpenChange={setShowCreateDept}>
            <DialogContent className="w-[95vw] max-w-md mx-auto">
              <DialogHeader>
                <DialogTitle className="text-lg">Создать департамент</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <Input 
                  placeholder="Название департамента" 
                  value={newDept.name} 
                  onChange={e => setNewDept(d => ({ ...d, name: e.target.value }))}
                  className="h-11"
                />
                <Select value={newDept.managerId} onValueChange={val => setNewDept(d => ({ ...d, managerId: val }))}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Выберите руководителя" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все руководители</SelectItem>
                    {leaders.map(leader => (
                      <SelectItem key={leader.id} value={leader.id}>{leader.fullname}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={newDept.created_by} onValueChange={val => setNewDept(d => ({ ...d, created_by: val }))}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Выберите ответственного" />
                  </SelectTrigger>
                  <SelectContent>
                    {responsibles.map(user => (
                      <SelectItem key={user.id} value={user.id}>{user.fullname}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter className="gap-2">
                <Button onClick={handleCreateDept} className="h-11 flex-1 sm:flex-initial">
                  Создать
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </header>

        <main className="p-3 sm:p-6">
          {selectedSection === "главная" && (
            <div className="text-center text-muted-foreground py-8">
              Это главная страница со статистикой приложения. Она пока пустая.
            </div>
          )}
          
          {selectedSection === "пользователи" && (
            <>
              {/* Filters for Users */}
              <div className="mb-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm font-medium">Поиск по имени или email</label>
                    <Input
                      placeholder="Введите имя или email..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Фильтр по департаменту</label>
                    <Select value={userDeptFilter} onValueChange={setUserDeptFilter}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Все департаменты" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все департаменты</SelectItem>
                        {departments.map(dept => (
                          <SelectItem key={dept.id} value={String(dept.id)}>{dept.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Фильтр по роли</label>
                    <Select value={userRoleFilter} onValueChange={setUserRoleFilter}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Все роли" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все роли</SelectItem>
                        <SelectItem value="employee">Сотрудник</SelectItem>
                        <SelectItem value="manager">Руководитель</SelectItem>
                        <SelectItem value="admin">Админ</SelectItem>
                        <SelectItem value="observer">Наблюдатель</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setUserSearch('');
                        setUserDeptFilter('all');
                        setUserRoleFilter('all');
                      }}
                      className="w-full"
                    >
                      Сбросить фильтры
                    </Button>
                  </div>
                </div>
              </div>

              {/* Mobile Cards View */}
              <div className="md:hidden space-y-3">
               {[...users]
                .filter(user => {
                  // Фильтр по поиску
                  const searchMatch = !userSearch || 
                    user.fullname?.toLowerCase().includes(userSearch.toLowerCase()) ||
                    user.email?.toLowerCase().includes(userSearch.toLowerCase());
                  
                  // Фильтр по департаменту
                  let deptMatch = true;
                  if (userDeptFilter !== 'all') {
                    const userDept = departments.find(dep => String(dep.managerId) === String(user.id)) || 
                                   departments.find(dep => String(dep.id) === String(user.departmentId));
                    deptMatch = userDept && String(userDept.id) === userDeptFilter;
                  }
                  
                  // Фильтр по роли
                  const roleMatch = userRoleFilter === 'all' || user.role === userRoleFilter;
                  
                  return searchMatch && deptMatch && roleMatch;
                })
                .sort((a, b) => {
                  let aValue, bValue;
                  switch (sortUserField) {
                    case 'fullname':
                      aValue = a.fullname || '';
                      bValue = b.fullname || '';
                      break;
                    case 'email':
                      aValue = a.email || '';
                      bValue = b.email || '';
                      break;
                    case 'department': {
                      let aDept = departments.find(dep => String(dep.managerId) === String(a.id)) || departments.find(dep => String(dep.id) === String(a.departmentId));
                      let bDept = departments.find(dep => String(dep.managerId) === String(b.id)) || departments.find(dep => String(dep.id) === String(b.departmentId));
                      aValue = aDept ? aDept.name : '';
                      bValue = bDept ? bDept.name : '';
                      break;
                    }
                    case 'leader':
                      aValue = a.leader || '';
                      bValue = b.leader || '';
                      break;
                    case 'role':
                      aValue = a.role || '';
                      bValue = b.role || '';
                      break;
                    default:
                      aValue = '';
                      bValue = '';
                  }
                  if (aValue < bValue) return sortUserDirection === 'asc' ? -1 : 1;
                  if (aValue > bValue) return sortUserDirection === 'asc' ? 1 : -1;
                  return 0;
                })
                .map(u => {
                  let departmentName = "Не принадлежит";
                  let dept = departments.find(dep => String(dep.managerId) === String(u.id));
                  if (!dept) {
                    dept = departments.find(dep => String(dep.id) === String(u.departmentId));
                  }
                  if (dept) departmentName = dept.name;
                  
                  return (
                    <div 
                      key={u.id}
                      className="bg-white rounded-lg border p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => setEditUser(u)}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="h-12 w-12 flex-shrink-0">
                          <AvatarImage src={u.image} alt={u.fullname} />
                          <AvatarFallback className="text-sm">{u.fullname[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-lg truncate">{u.fullname}</h3>
                          <p className="text-sm text-muted-foreground truncate">{u.email}</p>
                          <div className="mt-2 space-y-1">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-muted-foreground">Департамент:</span>
                              <span className="truncate">{departmentName}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-muted-foreground">Руководитель:</span>
                              <span className="truncate">{u.leader || "Нет руководителя"}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-muted-foreground">Должность:</span>
                              <span className="truncate">
                                {u.role === 'manager' ? "Руководитель" : u.role === 'admin' ? 'Админ' : "Сотрудник"}
                              </span>
                            </div>
                            {u.password && (
                              <div className="flex items-center gap-2 text-sm">
                                <span className="text-muted-foreground">Пароль:</span>
                                <span className="font-mono text-xs bg-muted px-2 py-1 rounded">{u.password}</span>
                              </div>
                            )}
                          </div>
                          {role === 'admin' && (
                            <div className="mt-3 pt-3 border-t">
                              <Dialog onOpenChange={() => setDeletingId(p => !p ? u.id : null)}>
                                <DialogTrigger asChild>
                                  <Button 
                                    variant="destructive" 
                                    size="sm" 
                                    className="w-full h-9"
                                    onClick={e => e.stopPropagation()}
                                  >
                                    Удалить пользователя
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="w-[95vw] max-w-md mx-auto" onClick={e => e.stopPropagation()}>
                                  <DialogHeader>
                                    <DialogTitle className="text-lg">Удалить пользователя</DialogTitle>
                                    <DialogDescription className="text-sm">
                                      Вы точно хотите удалить пользователя {u.fullname}? После удаления пользователя вернуть будет уже нельзя!
                                    </DialogDescription>
                                  </DialogHeader>
                                  <DialogFooter className="gap-2 flex-col sm:flex-row">
                                    <DialogClose asChild>
                                      <Button variant="ghost" onClick={() => setDeletingId(null)} className="h-11 flex-1">
                                        Отмена
                                      </Button>
                                    </DialogClose>
                                    <DialogClose asChild>
                                      <Button variant="destructive" className="h-11 flex-1" onClick={async () => {
                                        await supabase.from('departments').update({ created_by: null }).eq('created_by', u.id);
                                        await supabase.from('users').update({ leader_id: null }).eq('leader_id', u.id);
                                        
                                        const { data: departmentsManaged, error: depError } = await supabase
                                          .from('departments').select('id').eq('managerId', u.id);
                                        if (!depError && departmentsManaged?.length > 0) {
                                          await supabase.from('departments').update({ managerId: null }).in('id', departmentsManaged.map(dep => dep.id));
                                        }
                                        
                                        const { data: userTasks, error: tasksError } = await supabase
                                          .from('tasks').select('id').or(`assigned_to.eq.${u.id},created_by.eq.${u.id}`);
                                        if (!tasksError && userTasks?.length > 0) {
                                          const taskIds = userTasks.map(t => t.id);
                                          await supabase.from('messages').delete().in('task_id', taskIds);
                                          await supabase.from('tasks').delete().in('id', taskIds);
                                        }
                                        
                                        await supabase.from('messages').delete().eq('sent_by', u.id);
                                        
                                        const { error } = await supabase.from('users').delete().eq('id', u.id);
                                        if (!error) {
                                          toast.success(`Пользователь ${u.fullname} и все его данные успешно удалены!`);
                                          setUsers(p => p.filter(fu => fu.id != u.id));
                                        } else {
                                          toast.error(`Что-то пошло не так... Попробуйте снова или свяжитесь с поддержкой`);
                                        }
                                      }}>
                                        Удалить
                                      </Button>
                                    </DialogClose>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Аватар</TableHead>
                      <TableHead style={{ cursor: 'pointer' }} onClick={() => {
                        if (sortUserField === 'fullname') setSortUserDirection(sortUserDirection === 'asc' ? 'desc' : 'asc');
                        else { setSortUserField('fullname'); setSortUserDirection('asc'); }
                      }}>
                        ФИО {sortUserField === 'fullname' ? (sortUserDirection === 'asc' ? '▲' : '▼') : ''}
                      </TableHead>
                      <TableHead style={{ cursor: 'pointer' }} onClick={() => {
                        if (sortUserField === 'email') setSortUserDirection(sortUserDirection === 'asc' ? 'desc' : 'asc');
                        else { setSortUserField('email'); setSortUserDirection('asc'); }
                      }}>
                        Логин {sortUserField === 'email' ? (sortUserDirection === 'asc' ? '▲' : '▼') : ''}
                      </TableHead>
                      <TableHead style={{ cursor: 'pointer' }} onClick={() => {
                        if (sortUserField === 'department') setSortUserDirection(sortUserDirection === 'asc' ? 'desc' : 'asc');
                        else { setSortUserField('department'); setSortUserDirection('asc'); }
                      }}>
                        Департамент {sortUserField === 'department' ? (sortUserDirection === 'asc' ? '▲' : '▼') : ''}
                      </TableHead>
                      <TableHead style={{ cursor: 'pointer' }} onClick={() => {
                        if (sortUserField === 'leader') setSortUserDirection(sortUserDirection === 'asc' ? 'desc' : 'asc');
                        else { setSortUserField('leader'); setSortUserDirection('asc'); }
                      }}>
                        Руководитель {sortUserField === 'leader' ? (sortUserDirection === 'asc' ? '▲' : '▼') : ''}
                      </TableHead>
                      <TableHead style={{ cursor: 'pointer' }} onClick={() => {
                        if (sortUserField === 'role') setSortUserDirection(sortUserDirection === 'asc' ? 'desc' : 'asc');
                        else { setSortUserField('role'); setSortUserDirection('asc'); }
                      }}>
                        Должность {sortUserField === 'role' ? (sortUserDirection === 'asc' ? '▲' : '▼') : ''}
                      </TableHead>
                      <TableHead>Пароль</TableHead>
                      { role === 'admin' && <TableHead>Действия</TableHead> }
                    </TableRow>
                    
                  </TableHeader>
                  <TableBody>
                                          {
                        [...users]
                        .filter(user => {
                          // Фильтр по поиску
                          const searchMatch = !userSearch || 
                            user.fullname?.toLowerCase().includes(userSearch.toLowerCase()) ||
                            user.email?.toLowerCase().includes(userSearch.toLowerCase());
                          
                          // Фильтр по департаменту
                          let deptMatch = true;
                          if (userDeptFilter !== 'all') {
                            const userDept = departments.find(dep => String(dep.managerId) === String(user.id)) || 
                                           departments.find(dep => String(dep.id) === String(user.departmentId));
                            deptMatch = userDept && String(userDept.id) === userDeptFilter;
                          }
                          
                          // Фильтр по роли
                          const roleMatch = userRoleFilter === 'all' || user.role === userRoleFilter;
                          
                          return searchMatch && deptMatch && roleMatch;
                        })
                        .sort((a, b) => {
                          let aValue, bValue;
                          switch (sortUserField) {
                            case 'fullname':
                              aValue = a.fullname || '';
                              bValue = b.fullname || '';
                              break;
                            case 'email':
                              aValue = a.email || '';
                              bValue = b.email || '';
                              break;
                            case 'department': {
                              let aDept = departments.find(dep => String(dep.managerId) === String(a.id)) || departments.find(dep => String(dep.id) === String(a.departmentId));
                              let bDept = departments.find(dep => String(dep.managerId) === String(b.id)) || departments.find(dep => String(dep.id) === String(b.departmentId));
                              aValue = aDept ? aDept.name : '';
                              bValue = bDept ? bDept.name : '';
                              break;
                            }
                            case 'leader':
                              aValue = a.leader || '';
                              bValue = b.leader || '';
                              break;
                            case 'role':
                              aValue = a.role || '';
                              bValue = b.role || '';
                              break;
                            default:
                              aValue = '';
                              bValue = '';
                          }
                          if (aValue < bValue) return sortUserDirection === 'asc' ? -1 : 1;
                          if (aValue > bValue) return sortUserDirection === 'asc' ? 1 : -1;
                          return 0;
                        })
                      .map(u => {
                        let departmentName = "Не принадлежит";
                        let dept = departments.find(dep => String(dep.managerId) === String(u.id));
                        if (!dept) {
                          dept = departments.find(dep => String(dep.id) === String(u.departmentId));
                        }
                        if (dept) departmentName = dept.name;
                        return (
                          <TableRow
                            key={u.id}
                            className="cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => setEditUser(u)}
                          >
                            <TableCell>
                              <Avatar>
                                <AvatarImage
                                  src={u.image}
                                  alt={u.fullname}
                                />
                                <AvatarFallback>{u.fullname[0]}</AvatarFallback>
                              </Avatar>
                            </TableCell>
                            <TableCell>{u.fullname}</TableCell>
                            <TableCell>{u.email}</TableCell>
                            <TableCell>{departmentName}</TableCell>
                            <TableCell>{u.leader || "Нет руководителя"}</TableCell>
                            <TableCell>{u.role === 'manager' ? "Руководитель" : u.role === 'admin' ? 'Админ' : "Сотрудник"}</TableCell>
                            <TableCell>{u.password || ''}</TableCell>
                            {
                              role === 'admin' && (
                                <TableCell className="space-x-2">
                                  <Dialog onOpenChange={() => setDeletingId(p => !p ? u.id : null)}>
                                    <DialogTrigger asChild>
                                      <Button variant="destructive" size="sm" onClick={e => e.stopPropagation()}>
                                        Удалить
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent onClick={e => e.stopPropagation()}>
                                      <DialogHeader>
                                        <DialogTitle>Удалить пользователя</DialogTitle>
                                        <DialogDescription>
                                          Вы точно хотите удалить пользователя {u.fullname}? После удаления пользователя вернуть будет уже нельзя!
                                        </DialogDescription>
                                      </DialogHeader>
                                      <DialogFooter>
                                        <DialogClose asChild>
                                          <Button variant="ghost" onClick={() => setDeletingId(null)}>
                                            Отмена
                                          </Button>
                                        </DialogClose>
                                        <DialogClose asChild>
                                          <Button variant="destructive" onClick={async () => {
                                            await supabase.from('departments').update({ created_by: null }).eq('created_by', u.id);
                                            await supabase.from('users').update({ leader_id: null }).eq('leader_id', u.id);
                                            const { data: departmentsManaged, error: depError } = await supabase
                                              .from('departments')
                                              .select('id')
                                              .eq('managerId', u.id);
                                            if (depError) {
                                              toast.error('Ошибка при проверке руководства департаментами');
                                              return;
                                            }
                                            if (departmentsManaged && departmentsManaged.length > 0) {
                                              const depIds = departmentsManaged.map(dep => dep.id);
                                              const { error: updateError } = await supabase
                                                .from('departments')
                                                .update({ managerId: null })
                                                .in('id', depIds);
                                              if (updateError) {
                                                toast.error('Ошибка при обновлении департаментов');
                                                return;
                                              }
                                            }
                                            const { data: userTasks, error: tasksError } = await supabase
                                              .from('tasks')
                                              .select('id')
                                              .or(`assigned_to.eq.${u.id},created_by.eq.${u.id}`);
                                            if (tasksError) {
                                              toast.error('Ошибка при поиске задач пользователя');
                                              return;
                                            }
                                            if (userTasks && userTasks.length > 0) {
                                              const taskIds = userTasks.map(t => t.id);
                                              await supabase.from('messages').delete().in('task_id', taskIds);
                                              await supabase.from('tasks').delete().in('id', taskIds);
                                            }
                                            await supabase.from('messages').delete().eq('sent_by', u.id);
                                            const { error } = await supabase.from('users').delete().eq('id', u.id);
                                            if (!error) {
                                              toast.success(`Пользователь ${u.fullname} и все его данные успешно удалены!`);
                                              setUsers(p => p.filter(fu => fu.id != u.id));
                                              return;
                                            }
                                            toast.error(`Что-то пошло не так... Попробуйте снова или свяжитесь с поддержкой`);
                                          }}>
                                            Удалить
                                          </Button>
                                        </DialogClose>
                                      </DialogFooter>
                                    </DialogContent>
                                  </Dialog>
                                </TableCell>
                              )
                            }
                          </TableRow>
                        )
                      })
                    }
                  </TableBody>
                </Table>
              </div>
            </>
          )}
          
          {selectedSection === "департаменты" && (
            <>
              {/* Filters for Departments */}
              <div className="mb-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium">Поиск по названию</label>
                    <Input
                      placeholder="Введите название департамента..."
                      value={deptSearch}
                      onChange={(e) => setDeptSearch(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Фильтр по руководителю</label>
                    <Select value={deptManagerFilter} onValueChange={setDeptManagerFilter}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Все руководители" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все руководители</SelectItem>
                        {leaders.map(leader => (
                          <SelectItem key={leader.id} value={String(leader.id)}>{leader.fullname}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setDeptSearch('');
                        setDeptManagerFilter('all');
                      }}
                      className="w-full"
                    >
                      Сбросить фильтры
                    </Button>
                  </div>
                </div>
              </div>

              {/* Mobile Cards View for Departments */}
              <div className="md:hidden space-y-4">
                {[...departmentsTab]
                  .filter(dept => {
                    // Фильтр по поиску
                    const searchMatch = !deptSearch || 
                      dept.name?.toLowerCase().includes(deptSearch.toLowerCase());
                    
                    // Фильтр по руководителю
                    const managerMatch = deptManagerFilter === 'all' || String(dept.managerId) === deptManagerFilter;
                    
                    return searchMatch && managerMatch;
                  })
                  .sort((a, b) => {
                    const aValue = sortField === 'name' ? a.name : (a.manager?.fullname || '');
                    const bValue = sortField === 'name' ? b.name : (b.manager?.fullname || '');
                    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
                    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
                    return 0;
                  })
                  .map(dep => (
                    <div 
                      key={dep.id}
                      className="bg-white rounded-lg border p-4 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div 
                        className="flex items-center justify-between cursor-pointer"
                        onClick={() => {
                          setEditDept(dep);
                          setEditDeptData({
                            name: dep.name,
                            managerId: dep.managerId ? String(dep.managerId) : '',
                            created_by: dep.created_by ? String(dep.created_by) : ''
                          });
                        }}
                      >
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-lg truncate">{dep.name}</h3>
                          <p className="text-sm text-muted-foreground truncate">
                            Руководитель: {dep.manager?.fullname || '—'}
                          </p>
                          <p className="text-sm text-muted-foreground truncate">
                            Ответственный: {dep.responsible?.fullname || '—'}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleDeptExpansion(dep.id);
                          }}
                          className="ml-2 h-8 w-8 p-0"
                        >
                          {expandedDepts.has(dep.id) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </div>
                      
                      {expandedDepts.has(dep.id) && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="mb-3">
                            <h4 className="font-medium text-sm text-muted-foreground mb-2">Сотрудники:</h4>
                            {Array.isArray(dep.users) && dep.users.length > 0 ? (
                              <div className="space-y-1">
                                {[...dep.users]
                                  .filter(user => user && typeof user.fullname === 'string')
                                  .sort((a, b) => a.fullname.localeCompare(b.fullname, 'ru'))
                                  .map(user => {
                                    const u = user as { id: string; fullname: string; email: string };
                                    return (
                                      <div key={u.id} className="text-sm bg-muted/50 p-2 rounded">
                                        <div className="font-medium">{u.fullname}</div>
                                        <div className="text-muted-foreground text-xs">{u.email}</div>
                                      </div>
                                    );
                                  })}
                              </div>
                            ) : (
                              <div className="text-sm text-muted-foreground">Нет сотрудников</div>
                            )}
                          </div>
                          
                          {role === 'admin' && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="destructive" size="sm" className="w-full h-9">
                                  Удалить департамент
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="w-[95vw] max-w-md mx-auto" onClick={e => e.stopPropagation()}>
                                <DialogHeader>
                                  <DialogTitle className="text-lg">Удалить департамент</DialogTitle>
                                  <DialogDescription className="text-sm">
                                    Вы точно хотите удалить департамент '{dep.name}'? Все связанные задачи, сообщения и сотрудники будут отвязаны!
                                  </DialogDescription>
                                </DialogHeader>
                                <DialogFooter className="gap-2 flex-col sm:flex-row">
                                  <DialogClose asChild>
                                    <Button variant="ghost" className="h-11 flex-1">
                                      Отмена
                                    </Button>
                                  </DialogClose>
                                  <DialogClose asChild>
                                    <Button variant="destructive" className="h-11 flex-1" onClick={async () => await handleDeleteDept(dep)}>
                                      Удалить
                                    </Button>
                                  </DialogClose>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
              </div>

              {/* Desktop Table View for Departments */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          if (sortField === 'name') {
                            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                          } else {
                            setSortField('name');
                            setSortDirection('asc');
                          }
                        }}
                      >
                        Название {sortField === 'name' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                      </TableHead>
                      <TableHead
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          if (sortField === 'manager') {
                            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                          } else {
                            setSortField('manager');
                            setSortDirection('asc');
                          }
                        }}
                      >
                        Руководитель {sortField === 'manager' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                      </TableHead>
                      <TableHead
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          if (sortField === 'created_by') {
                            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                          } else {
                            setSortField('created_by');
                            setSortDirection('asc');
                          }
                        }}
                      >
                        Ответственный {sortField === 'created_by' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                      </TableHead>
                      <TableHead>Сотрудники</TableHead>
                      {role === 'admin' && <TableHead>Действия</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...departmentsTab]
                      .filter(dept => {
                        // Фильтр по поиску
                        const searchMatch = !deptSearch || 
                          dept.name?.toLowerCase().includes(deptSearch.toLowerCase());
                        
                        // Фильтр по руководителю
                        const managerMatch = deptManagerFilter === 'all' || String(dept.managerId) === deptManagerFilter;
                        
                        return searchMatch && managerMatch;
                      })
                      .sort((a, b) => {
                        const aValue = sortField === 'name' ? a.name : (a.manager?.fullname || '');
                        const bValue = sortField === 'name' ? b.name : (b.manager?.fullname || '');
                        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
                        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
                        return 0;
                      })
                      .map(dep => (
                        <TableRow key={dep.id} className="cursor-pointer hover:bg-muted/50 transition-colors">
                          <TableCell onClick={() => {
                            setEditDept(dep);
                            setEditDeptData({
                              name: dep.name,
                              managerId: dep.managerId ? String(dep.managerId) : '',
                              created_by: dep.created_by ? String(dep.created_by) : ''
                            });
                          }}>{dep.name}</TableCell>
                          <TableCell onClick={() => {
                            setEditDept(dep);
                            setEditDeptData({
                              name: dep.name,
                              managerId: dep.managerId ? String(dep.managerId) : '',
                              created_by: dep.created_by ? String(dep.created_by) : ''
                            });
                          }}>{dep.manager?.fullname || '—'}</TableCell>
                          <TableCell onClick={() => {
                            setEditDept(dep);
                            setEditDeptData({
                              name: dep.name,
                              managerId: dep.managerId ? String(dep.managerId) : '',
                              created_by: dep.created_by ? String(dep.created_by) : ''
                            });
                          }}>{dep.responsible?.fullname || '—'}</TableCell>
                          <TableCell onClick={() => {
                            setEditDept(dep);
                            setEditDeptData({
                              name: dep.name,
                              managerId: dep.managerId ? String(dep.managerId) : '',
                              created_by: dep.created_by ? String(dep.created_by) : ''
                            });
                          }}>
                            {Array.isArray(dep.users) && dep.users.length > 0 ? (
                              <ul className="list-disc ml-4">
                                {[...dep.users]
                                  .filter(user => user && typeof user.fullname === 'string')
                                  .sort((a, b) => a.fullname.localeCompare(b.fullname, 'ru'))
                                  .map(user => {
                                    const u = user as { id: string; fullname: string; email: string };
                                    return <li key={u.id}>{u.fullname} ({u.email})</li>;
                                  })}
                              </ul>
                            ) : 'Нет сотрудников'}
                          </TableCell>
                          {role === 'admin' && (
                            <TableCell>
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="destructive" size="sm" onClick={e => e.stopPropagation()}>
                                    Удалить
                                  </Button>
                                </DialogTrigger>
                                <DialogContent onClick={e => e.stopPropagation()}>
                                  <DialogHeader>
                                    <DialogTitle>Удалить департамент</DialogTitle>
                                    <DialogDescription>
                                      Вы точно хотите удалить департамент '{dep.name}'? Все связанные задачи, сообщения и сотрудники будут отвязаны!
                                    </DialogDescription>
                                  </DialogHeader>
                                  <DialogFooter>
                                    <DialogClose asChild>
                                      <Button variant="ghost">
                                        Отмена
                                      </Button>
                                    </DialogClose>
                                    <DialogClose asChild>
                                      <Button variant="destructive" onClick={async () => await handleDeleteDept(dep)}>
                                        Удалить
                                      </Button>
                                    </DialogClose>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </main>
      </div>

      {/* Edit User Dialog */}
      {editUser && (
        <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
          <DialogContent className="w-[95vw] max-w-2xl mx-auto max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg">Редактировать пользователя</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">ФИО</label>
                  <Input
                    value={editUserData?.fullname || ''}
                    onChange={e => setEditUserData(prev => ({ ...prev, fullname: e.target.value }))}
                    className="mt-1 h-11"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    value={editUserData?.email || ''}
                    onChange={e => setEditUserData(prev => ({ ...prev, email: e.target.value }))}
                    className="mt-1 h-11"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Пароль</label>
                  <Input
                    value={editUserData?.password || ''}
                    onChange={e => setEditUserData(prev => ({ ...prev, password: e.target.value }))}
                    className="mt-1 h-11"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Роль</label>
                  <Select value={editUserData?.role || ''} onValueChange={val => setEditUserData(prev => ({ ...prev, role: val }))}>
                    <SelectTrigger className="mt-1 h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employee">Сотрудник</SelectItem>
                      <SelectItem value="manager">Руководитель</SelectItem>
                      <SelectItem value="admin">Админ</SelectItem>
                      <SelectItem value="observer">Наблюдатель</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Департамент</label>
                  <Select value={editUserData?.departmentId || ''} onValueChange={val => setEditUserData(prev => ({ ...prev, departmentId: val }))}>
                    <SelectTrigger className="mt-1 h-11">
                      <SelectValue placeholder="Выберите департамент" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Без департамента</SelectItem>
                      {departments.map(dept => (
                        <SelectItem key={dept.id} value={String(dept.id)}>{dept.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Руководитель</label>
                  <Select value={editUserData?.leaderId || ''} onValueChange={val => setEditUserData(prev => ({ ...prev, leaderId: val }))}>
                    <SelectTrigger className="mt-1 h-11">
                      <SelectValue placeholder="Выберите руководителя" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Без руководителя</SelectItem>
                      {leaders.map(leader => (
                        <SelectItem key={leader.id} value={String(leader.id)}>{leader.fullname}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Аватар</label>
                <div className="mt-1 flex items-center gap-4">
                  {avatarPreview && (
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={avatarPreview} />
                      <AvatarFallback>{editUserData?.fullname?.[0]}</AvatarFallback>
                    </Avatar>
                  )}
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setEditUserData(prev => ({ ...prev, avatar: file }));
                        setAvatarPreview(URL.createObjectURL(file));
                      }
                    }}
                    className="h-11"
                  />
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2 flex-col sm:flex-row">
              <Button variant="ghost" onClick={() => setEditUser(null)} className="h-11 flex-1 sm:flex-initial">
                Отмена
              </Button>
              <Button onClick={handleEditUser} className="h-11 flex-1 sm:flex-initial">
                Сохранить
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Department Dialog */}
      {editDept && (
        <Dialog open={!!editDept} onOpenChange={() => setEditDept(null)}>
          <DialogContent className="w-[95vw] max-w-md mx-auto">
            <DialogHeader>
              <DialogTitle className="text-lg">Редактировать департамент</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium">Название</label>
                <Input
                  value={editDeptData.name}
                  onChange={e => setEditDeptData(prev => ({ ...prev, name: e.target.value }))}
                  className="mt-1 h-11"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Руководитель</label>
                <Select value={editDeptData.managerId || ''} onValueChange={val => setEditDeptData(prev => ({ ...prev, managerId: val }))}>
                  <SelectTrigger className="mt-1 h-11">
                    <SelectValue placeholder="Выберите руководителя" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no-manager">Без руководителя</SelectItem>
                    {leaders.map(user => (
                      <SelectItem key={user.id} value={String(user.id)}>{user.fullname}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Ответственный</label>
                <Select value={editDeptData.created_by || ''} onValueChange={val => setEditDeptData(prev => ({ ...prev, created_by: val }))}>
                  <SelectTrigger className="mt-1 h-11">
                    <SelectValue placeholder="Выберите ответственного" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no-responsible">Без ответственного</SelectItem>
                    {responsibles.map(user => (
                      <SelectItem key={user.id} value={String(user.id)}>{user.fullname}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="gap-2 flex-col sm:flex-row">
              <Button variant="ghost" onClick={() => setEditDept(null)} className="h-11 flex-1 sm:flex-initial">
                Отмена
              </Button>
              <Button onClick={handleEditDept} className="h-11 flex-1 sm:flex-initial">
                Сохранить
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
