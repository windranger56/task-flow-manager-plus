import React, { useState, useEffect } from 'react';
import { supabase } from '@/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Users, Building, Settings, UserPlus, Shield } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function AdminPanel() {
  const [users, setUsers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [newUser, setNewUser] = useState({
    email: '',
    fullname: '',
    password: '',
    departmentId: ''
  });
  const [newDepartment, setNewDepartment] = useState({
    name: '',
    managerId: '',
    color: '#3B82F6'
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Загружаем пользователей
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('fullname');
      
      if (usersError) throw usersError;
      
      // Загружаем департаменты
      const { data: departmentsData, error: departmentsError } = await supabase
        .from('departments')
        .select('*')
        .order('name');
      
      if (departmentsError) throw departmentsError;
      
      setUsers(usersData || []);
      setDepartments(departmentsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить данные",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createUser = async () => {
    try {
      if (!newUser.email || !newUser.fullname || !newUser.password || !newUser.departmentId) {
        toast({
          title: "Ошибка",
          description: "Заполните все поля",
          variant: "destructive"
        });
        return;
      }

      // Создаем пользователя в auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password
      });

      if (authError) throw authError;

      // Добавляем пользователя в таблицу users
      if (authData.user) {
        const { error: userError } = await supabase
          .from('users')
          .insert([{
            id: authData.user.id,
            email: newUser.email,
            fullname: newUser.fullname,
            departmentId: newUser.departmentId,
            image: null,
            role: newUser.departmentId
          }]);

        if (userError) throw userError;
      }

      toast({
        title: "Успех",
        description: "Пользователь создан успешно"
      });

      // Очищаем форму
      setNewUser({
        email: '',
        fullname: '',
        password: '',
        departmentId: ''
      });

      // Обновляем список пользователей
      loadData();
    } catch (error) {
      console.error('Error creating user:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось создать пользователя",
        variant: "destructive"
      });
    }
  };

  const createDepartment = async () => {
    try {
      if (!newDepartment.name || !newDepartment.managerId) {
        toast({
          title: "Ошибка",
          description: "Заполните все поля",
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase
        .from('departments')
        .insert([{
          name: newDepartment.name,
          managerId: newDepartment.managerId,
          color: newDepartment.color
        }]);

      if (error) throw error;

      toast({
        title: "Успех",
        description: "Подразделение создано успешно"
      });

      // Очищаем форму
      setNewDepartment({
        name: '',
        managerId: '',
        color: '#3B82F6'
      });

      // Обновляем список подразделений
      loadData();
    } catch (error) {
      console.error('Error creating department:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось создать подразделение",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Shield className="h-6 w-6 text-blue-600" />
        <h1 className="text-2xl font-semibold">Панель администратора</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Создание пользователя */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Создать пользователя
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="user-email">Email</Label>
              <Input
                id="user-email"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                placeholder="user@example.com"
              />
            </div>
            <div>
              <Label htmlFor="user-fullname">Полное имя</Label>
              <Input
                id="user-fullname"
                value={newUser.fullname}
                onChange={(e) => setNewUser({...newUser, fullname: e.target.value})}
                placeholder="Иванов Иван Иванович"
              />
            </div>
            <div>
              <Label htmlFor="user-password">Пароль</Label>
              <Input
                id="user-password"
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                placeholder="••••••••"
              />
            </div>
            <div>
              <Label htmlFor="user-department">Подразделение</Label>
              <Select
                value={newUser.departmentId}
                onValueChange={(value) => setNewUser({...newUser, departmentId: value})}
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
            <Button onClick={createUser} className="w-full">
              Создать пользователя
            </Button>
          </CardContent>
        </Card>

        {/* Создание подразделения */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Создать подразделение
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="dept-name">Название</Label>
              <Input
                id="dept-name"
                value={newDepartment.name}
                onChange={(e) => setNewDepartment({...newDepartment, name: e.target.value})}
                placeholder="Отдел разработки"
              />
            </div>
            <div>
              <Label htmlFor="dept-manager">Руководитель</Label>
              <Select
                value={newDepartment.managerId}
                onValueChange={(value) => setNewDepartment({...newDepartment, managerId: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите руководителя" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.fullname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="dept-color">Цвет</Label>
              <Input
                id="dept-color"
                type="color"
                value={newDepartment.color}
                onChange={(e) => setNewDepartment({...newDepartment, color: e.target.value})}
              />
            </div>
            <Button onClick={createDepartment} className="w-full">
              Создать подразделение
            </Button>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Список пользователей */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Пользователи ({users.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {users.map((user) => (
              <div key={user.id} className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-sm font-medium text-blue-600">
                      {user.fullname?.charAt(0) || 'U'}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-medium">{user.fullname}</h4>
                    <p className="text-sm text-gray-600">{user.email}</p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {departments.find(d => d.id === user.departmentId)?.name || 'Без подразделения'}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Список подразделений */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Подразделения ({departments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {departments.map((dept) => {
              const manager = users.find(u => u.id === dept.managerId);
              return (
                <div key={dept.id} className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div 
                      className="w-4 h-4 rounded-sm"
                      style={{ backgroundColor: dept.color }}
                    />
                    <h4 className="font-medium">{dept.name}</h4>
                  </div>
                  <p className="text-sm text-gray-600">
                    Руководитель: {manager?.fullname || 'Не назначен'}
                  </p>
                  <p className="text-sm text-gray-600">
                    Сотрудников: {users.filter(u => u.departmentId === dept.id).length}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
