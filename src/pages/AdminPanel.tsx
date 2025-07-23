import { useEffect, useLayoutEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Menu } from "lucide-react"
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
const [newDept, setNewDept] = useState({ name: '', managerId: '' });
const [departmentsTab, setDepartmentsTab] = useState([]);
const [editDept, setEditDept] = useState(null);
const [editDeptData, setEditDeptData] = useState({ name: '', managerId: '' });
const [sortField, setSortField] = useState<'name' | 'manager'>('name');
const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
const [role, setRole] = useState(null)

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
  }
}, [selectedSection]);

const fetchDepartmentsWithUsers = async () => {
  // Получаем департаменты с руководителями и сотрудниками
  const { data: departments, error } = await supabase
    .from('departments')
    .select('id, name, managerId, manager:managerId (id, fullname, email), users:users_departmentId_fkey (id, fullname, email)');
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
    if (!newDept.name || !newDept.managerId) {
      toast.error('Заполните все поля');
      return;
    }
    
    const { data: deptData, error: deptError } = await supabase
      .from('departments')
      .insert({
        name: newDept.name,
        managerId: newDept.managerId ? Number(newDept.managerId) : null
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
      setNewDept({ name: '', managerId: '' });
      fetchDepartmentsWithUsers(); // Обновляем список департаментов
      fetchUsers(); // Обновляем список пользователей
    } else {
      toast.error('Ошибка при создании департамента');
    }
  };

  useEffect(() => {
    if (showCreateDept) {
      supabase.from('users').select('id, fullname').then(({ data }) => setLeaders(data || []));
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
      managerId: editDeptData.managerId ? Number(editDeptData.managerId) : null
    }).eq('id', editDept.id);
    if (!error) {
      toast.success('Департамент обновлен');
      setEditDept(null);
      setEditDeptData({ name: '', managerId: '' });
      fetchDepartmentsWithUsers();
    } else {
      toast.error('Ошибка при обновлении департамента');
    }
  };

  useEffect(() => {
    if (editDept) {
      supabase.from('users').select('id, fullname').then(({ data }) => setLeaders(data || []));
    }
  }, [editDept]);

  return (
    <div className="flex min-h-screen bg-gray-100">
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
        <header className="bg-white shadow p-4 flex items-center justify-between">
          <div className="md:hidden">
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu />
                </Button>
              </SheetTrigger>
              <SheetContent side="left">
                <div className="text-2xl font-bold mb-6">Панель управления</div>
                <nav className="flex flex-col gap-2">
                  <Button
                    variant={selectedSection === "главная" ? "default" : "ghost"}
                    onClick={() => handleSectionChange("главная")}
                    className="justify-start"
                  >
                    Главная
                  </Button>
                  <Button
                    variant={selectedSection === "пользователи" ? "default" : "ghost"}
                    onClick={() => handleSectionChange("пользователи")}
                    className="justify-start"
                  >
                    Пользователи
                  </Button>
                  <Button
                    variant={selectedSection === "департаменты" ? "default" : "ghost"}
                    onClick={() => handleSectionChange("департаменты")}
                    className="justify-start"
                  >
                    Департаменты
                  </Button>
                </nav>
              </SheetContent>
            </Sheet>
          </div>

          <div className="text-xl font-semibold capitalize">
            {selectedSection}
          </div>
          <Button onClick={() => role !== "observer" ? navigate('/register') : toast.error("Недостаточно привилегий для создания пользователя")} variant="outline">
            Создать пользователя
          </Button>
          <div className="flex gap-2">
            <Button onClick={() => role !== "observer" ? setShowCreateDept(true) : toast.error("Недостаточно привилегий для создания департамента")} variant="outline">Создать департамент</Button>
            <Dialog open={showCreateDept} onOpenChange={setShowCreateDept}>
              <DialogContent onClick={e => e.stopPropagation()}>
                <DialogHeader>
                  <DialogTitle>Создать департамент</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input placeholder="Название департамента" value={newDept.name} onChange={e => setNewDept(d => ({ ...d, name: e.target.value }))} />
                  <Select value={newDept.managerId} onValueChange={val => setNewDept(d => ({ ...d, managerId: val }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите руководителя" />
                    </SelectTrigger>
                    <SelectContent>
                      {leaders.map(leader => (
                        <SelectItem key={leader.id} value={leader.id}>{leader.fullname}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button onClick={handleCreateDept}>Создать</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        <main className="p-6">
          {selectedSection === "главная" && (
            <div>Это главная страница со статистикой приложения. Она пока пустая.</div>
          )}
          {selectedSection === "пользователи" && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Аватар</TableHead>
                  <TableHead>ФИО</TableHead>
                  <TableHead>Логин</TableHead>
                  <TableHead>Департамент</TableHead>
                  <TableHead>Руководитель</TableHead>
                  <TableHead>Должность</TableHead>
                  <TableHead>Пароль</TableHead>
									{ role === 'admin' && <TableHead>Действия</TableHead> }
                </TableRow>
              </TableHeader>
              <TableBody>
                {
                  users.map(u => {
                    let departmentName = "Не пренадлежит";
                    // Сначала ищем департамент, где managerId совпадает с user.id
                    let dept = departments.find(dep => String(dep.managerId) === String(u.id));
                    if (!dept) {
                      // Если не найдено, ищем по departmentId
                      dept = departments.find(dep => String(dep.id) === String(u.departmentId));
                    }
                    if (dept) departmentName = dept.name;
                    return (
                      <TableRow
                        key={u.id}
                        className="cursor-pointer hover:bg-[#d7d7d7] transition-all duration-300"
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
                        <TableCell>{u.role === 'manager' ? "Руководитель" : "Сотрудник"}</TableCell>
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
																				// 1. Снять пользователя с руководства департаментами
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
																				// 2. Удалить все задачи, где пользователь исполнитель или создатель
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
																					// Удалить все сообщения по этим задачам
																					await supabase.from('messages').delete().in('task_id', taskIds);
																					// Удалить задачи
																					await supabase.from('tasks').delete().in('id', taskIds);
																				}
																				// 3. Удалить все сообщения, где пользователь автор
																				await supabase.from('messages').delete().eq('sent_by', u.id);
																				// 4. Удалить пользователя
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
          )}
          {selectedSection === "департаменты" && (
            <>
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
                    <TableHead>Сотрудники</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...departmentsTab]
                    .sort((a, b) => {
                      const aValue = sortField === 'name' ? a.name : (a.manager?.fullname || '');
                      const bValue = sortField === 'name' ? b.name : (b.manager?.fullname || '');
                      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
                      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
                      return 0;
                    })
                    .map(dep => (
                      <TableRow key={dep.id} className="cursor-pointer hover:bg-[#d7d7d7]" onClick={() => {
                        setEditDept(dep);
                        setEditDeptData({ name: dep.name, managerId: dep.managerId ? String(dep.managerId) : '' });
                      }}>
                        <TableCell>{dep.name}</TableCell>
                        <TableCell>{dep.manager?.fullname || '—'}</TableCell>
                        <TableCell>
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
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
              <Dialog open={!!editDept} onOpenChange={open => { if (!open) { setEditDept(null); setEditDeptData({ name: '', managerId: '' }); } }}>
                <DialogContent onClick={e => e.stopPropagation()}>
                  <DialogHeader>
                    <DialogTitle>Редактировать департамент</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input placeholder="Название департамента" value={editDeptData.name} onChange={e => setEditDeptData(d => ({ ...d, name: e.target.value }))} />
                    <Select value={editDeptData.managerId} onValueChange={val => setEditDeptData(d => ({ ...d, managerId: val }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите руководителя" />
                      </SelectTrigger>
                      <SelectContent>
                        {leaders.map(leader => (
                          <SelectItem key={leader.id} value={leader.id}>{leader.fullname}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleEditDept}>Сохранить</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}
        </main>
      </div>
      <Dialog open={!!editUser} onOpenChange={open => { if (!open) { setEditUser(null); setEditUserData(null); setAvatarPreview(null); } }}>
  <DialogContent onClick={e => e.stopPropagation()}>
    <DialogHeader>
      <DialogTitle>Редактировать пользователя</DialogTitle>
    </DialogHeader>
    {editUserData && (
      <div className="space-y-4">
        <Input placeholder="ФИО" value={editUserData.fullname} onChange={e => setEditUserData(d => ({ ...d, fullname: e.target.value }))} />
        <Input placeholder="Логин (email)" value={editUserData.email} onChange={e => setEditUserData(d => ({ ...d, email: e.target.value }))} />
        <Input type="password" placeholder="Пароль" value={editUserData.password} onChange={e => setEditUserData(d => ({ ...d, password: e.target.value }))} />
        <Input type="file" accept="image/*" onChange={e => {
          const file = e.target.files?.[0] || null;
          setEditUserData(d => ({ ...d, avatar: file }));
          if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
            reader.readAsDataURL(file);
          } else {
            setAvatarPreview(editUser.image || null);
          }
        }} />
        {avatarPreview && (
          <div className="h-16 w-16 rounded-full overflow-hidden border">
            <img src={avatarPreview} alt="Avatar preview" className="h-full w-full object-cover" />
          </div>
        )}
        <Select value={editUserData.departmentId} onValueChange={val => setEditUserData(d => ({ ...d, departmentId: val }))}>
          <SelectTrigger>
            <SelectValue placeholder="Выберите департамент" />
          </SelectTrigger>
          <SelectContent>
            {departments.map(dep => (
              <SelectItem key={dep.id} value={dep.id}>{dep.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={editUserData.leaderId || ''} onValueChange={val => setEditUserData(d => ({ ...d, leaderId: val }))}>
          <SelectTrigger>
            <SelectValue placeholder="Выберите руководителя" />
          </SelectTrigger>
          <SelectContent>
            {leaders.map(leader => (
              <SelectItem key={leader.id} value={leader.id}>{leader.fullname}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={editUserData.role} onValueChange={val => setEditUserData(d => ({ ...d, role: val }))}>
          <SelectTrigger>
            <SelectValue placeholder="Выберите должность" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="employee">Сотрудник</SelectItem>
            <SelectItem value="manager">Руководитель</SelectItem>
            <SelectItem value="admin">Админ</SelectItem>
          </SelectContent>
        </Select>
      </div>
    )}
    <DialogFooter>
      <Button onClick={handleEditUser}>Сохранить</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
    </div>
  )
}
