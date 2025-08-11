import React, { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LogOut, User, Users, BarChart3 } from "lucide-react";
import { useTaskContext } from '@/contexts/TaskContext';
import { supabase } from '@/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from "@/components/ui/use-toast";
import { User as UserType } from '@/types';

const AccountMobile: React.FC = () => {
  const {
    user,
    setUser,
    getSubordinates,
    getDepartmentByUserId,
    getFilteredTasks
  } = useTaskContext();
  
  const navigate = useNavigate();
  const [profile, setProfile] = useState({
    user_unique_id: "",
    fullname: "",
    email: "",
    image: "",
  });
  const [subordinates, setSubordinates] = useState<UserType[]>([]);
  const [userDepartment, setUserDepartment] = useState<string>('');
  const [taskStats, setTaskStats] = useState({
    total: 0,
    completed: 0,
    inProgress: 0,
    overdue: 0,
    new: 0,
    onVerification: 0
  });

  const handleLogout = async () => {
    try {
      console.log("Начинаем локальный выход из системы...");
      
      // Используем scope: 'local' чтобы выход происходил только в текущей вкладке
      await supabase.auth.signOut({ scope: 'local' });
      
      console.log("Локальный выход успешен, перенаправляем на страницу входа");
      
      // Очищаем локальные данные пользователя
      setUser(null);
      setProfile({
        user_unique_id: "",
        fullname: "",
        email: "",
        image: "",
      });
      
      navigate('/auth');
      
      toast({
        title: "Успешный выход",
        description: "Вы вышли из системы (только в этой вкладке)",
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
      return;
    }

    try {
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
    } catch (error) {
      console.error("Ошибка при получении профиля:", error);
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
    
    loadSubordinates();
    loadUserDepartment();
  }, [user]);

  useEffect(() => {
    if (user) {
      const filteredTasks = getFilteredTasks();
      
      setTaskStats({
        total: filteredTasks.length,
        completed: filteredTasks.filter(t => t.status === 'completed').length,
        inProgress: filteredTasks.filter(t => t.status === 'in_progress').length,
        overdue: filteredTasks.filter(t => t.status === 'overdue').length,
        new: filteredTasks.filter(t => t.status === 'new').length,
        onVerification: filteredTasks.filter(t => t.status === 'on_verification').length,
      });
    }
  }, [user, getFilteredTasks]);

  return (
    <div className="p-4 pb-20 space-y-4">
      {/* Профиль пользователя */}
      <Card>
        <CardHeader className="text-center pb-2">
          <div className="flex flex-col items-center space-y-3">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profile.image} alt={profile.fullname} />
              <AvatarFallback className="text-lg">
                {profile.fullname ? profile.fullname.slice(0, 2) : 'UN'}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-xl">{profile.fullname}</CardTitle>
              <p className="text-sm text-gray-500">{profile.email}</p>
              {userDepartment && (
                <Badge variant="secondary" className="mt-1">
                  {userDepartment}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Статистика задач */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Статистика поручений
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Прогресс-бар */}
          {taskStats.total > 0 && (
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Прогресс выполнения</span>
                <span>{Math.round((taskStats.completed / taskStats.total) * 100)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${(taskStats.completed / taskStats.total) * 100}%` }}
                />
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{taskStats.total}</div>
              <div className="text-xs text-gray-500">Всего</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{taskStats.completed}</div>
              <div className="text-xs text-gray-500">Завершено</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{taskStats.inProgress}</div>
              <div className="text-xs text-gray-500">В работе</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{taskStats.overdue}</div>
              <div className="text-xs text-gray-500">Просрочено</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-600">{taskStats.new}</div>
              <div className="text-xs text-gray-500">Новые</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{taskStats.onVerification}</div>
              <div className="text-xs text-gray-500">На проверке</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Подчиненные */}
      {subordinates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Подчиненные ({subordinates.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {subordinates.slice(0, 5).map((subordinate) => (
                <div key={subordinate.id} className="flex items-center space-x-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={subordinate.image} alt={subordinate.fullname} />
                    <AvatarFallback>
                      {subordinate.fullname ? subordinate.fullname.slice(0, 2) : 'UN'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {subordinate.fullname}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {subordinate.email}
                    </p>
                  </div>
                </div>
              ))}
              {subordinates.length > 5 && (
                <div className="text-center">
                  <p className="text-sm text-gray-500">
                    и еще {subordinates.length - 5} сотрудников
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Кнопка выхода */}
      <Card>
        <CardContent className="pt-6">
          <Button 
            onClick={handleLogout} 
            variant="destructive" 
            className="w-full flex items-center justify-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            <span>Выйти из аккаунта</span>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountMobile;
