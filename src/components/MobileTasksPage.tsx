import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useTaskContext } from '@/contexts/TaskContext';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';
import { Task, User, Department } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { useSearchDebounce } from '@/hooks/useOptimizedDebounce';

interface DepartmentStats {
  overdue: number;
  in_progress: number;
  on_verification: number;
  new: number;
}

interface TaskWithUsers extends Task {
  assignee?: User;
  creator?: User;
}

const MobileTasksPage = memo(() => {
  const { 
    departments, 
    tasks,
    taskFilter, 
    setTaskFilter, 
    getUserById,
    user,
    getFilteredTasks,
    selectTask,
    setViewHistory
  } = useTaskContext();

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedDepartments, setExpandedDepartments] = useState<Set<string>>(new Set());
  const [departmentTasks, setDepartmentTasks] = useState<{[key: string]: TaskWithUsers[]}>({});
  const [departmentManagers, setDepartmentManagers] = useState<{[key: string]: User}>({});

  // Оптимизированный дебаунс для поиска
  const { debouncedSearchTerm, shouldSearch } = useSearchDebounce(searchQuery, 300, 2);

  // Мемоизированная статистика департаментов (только актуальные задачи)
  const getDepartmentStatistics = useCallback((departmentId: string): DepartmentStats => {
    const deptTasks = tasks.filter(task => 
      task.departmentId === departmentId && 
      task.status !== 'completed' && 
      task.status !== 'cancelled'
    );
    
    return {
      overdue: deptTasks.filter(task => task.status === 'overdue').length,
      in_progress: deptTasks.filter(task => task.status === 'in_progress').length,
      on_verification: deptTasks.filter(task => task.status === 'on_verification').length,
      new: deptTasks.filter(task => task.status === 'new').length,
    };
  }, [tasks]);

  // Загрузка руководителей департаментов (мемоизированная)
  const loadDepartmentManagers = useCallback(async () => {
    const managers: {[key: string]: User} = {};
    
    for (const department of departments) {
      if (department.managerId) {
        const manager = await getUserById(department.managerId);
        if (manager) {
          managers[department.id] = manager;
        }
      }
    }
    
    setDepartmentManagers(managers);
  }, [departments, getUserById]);

  useEffect(() => {
    if (departments.length > 0) {
      loadDepartmentManagers();
    }
  }, [departments.length, loadDepartmentManagers]);

  // Загрузка задач по департаментам с пользователями (только актуальные задачи)
  useEffect(() => {
    const loadDepartmentTasks = async () => {
      const allTasks = getFilteredTasks();
      const newDepartmentTasks: {[key: string]: TaskWithUsers[]} = {};
      
      for (const department of departments) {
        const deptTasks = allTasks.filter(task => 
          task.departmentId === department.id &&
          task.status !== 'completed' && 
          task.status !== 'cancelled'
        );
        const tasksWithUsers = await Promise.all(
          deptTasks.map(async (task): Promise<TaskWithUsers> => ({
            ...task,
            assignee: await getUserById(task.assignedTo),
            creator: await getUserById(task.createdBy),
          }))
        );
        newDepartmentTasks[department.id] = tasksWithUsers;
      }
      
      setDepartmentTasks(newDepartmentTasks);
    };

    loadDepartmentTasks();
  }, [departments, getFilteredTasks, getUserById]);

  // Получение департамента текущего пользователя
  const userDepartment = useMemo(() => {
    if (!user) return null;
    return departments.find(dept => {
      const manager = departmentManagers[dept.id];
      return manager?.id === user.id;
    });
  }, [user, departments, departmentManagers]);

  // Фильтрация и сортировка департаментов
  const filteredDepartments = useMemo(() => {
    let depsToFilter = departments;

    // Фильтрация по поиску (только актуальные задачи)
    if (shouldSearch && debouncedSearchTerm.trim()) {
      depsToFilter = departments.filter(department => {
        const deptTasks = (departmentTasks[department.id] || []).filter(task => 
          task.status !== 'completed' && task.status !== 'cancelled'
        );
        return deptTasks.some(task => 
          task.title.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
          task.description.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
        ) || department.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
      });
    }

    // Сортировка: департамент пользователя первый, остальные по алфавиту
    return depsToFilter.sort((a, b) => {
      // Если это департамент текущего пользователя, он идет первым
      if (userDepartment && a.id === userDepartment.id) return -1;
      if (userDepartment && b.id === userDepartment.id) return 1;
      
      // Остальные сортируются по алфавиту
      return a.name.localeCompare(b.name, 'ru');
    });
  }, [departments, departmentTasks, debouncedSearchTerm, shouldSearch, userDepartment]);

  // Обработчики
  const handleDepartmentToggle = useCallback((departmentId: string) => {
    setExpandedDepartments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(departmentId)) {
        newSet.delete(departmentId);
      } else {
        newSet.add(departmentId);
      }
      return newSet;
    });
  }, []);

  const handleTaskClick = useCallback((task: Task) => {
    selectTask(task);
    setViewHistory(history => [...history, "task"]);
  }, [selectTask, setViewHistory]);

  const handleFilterChange = useCallback((filter: 'all' | 'author' | 'assignee') => {
    setTaskFilter(filter);
  }, [setTaskFilter]);

  // Цвета для статусов задач (из Figma)
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'overdue': return '#DA100B';
      case 'in_progress': return '#3F79FF';
      case 'on_verification': return '#EEF4C7'; // Исправляем цвет на правильный
      case 'new': return '#BCBCBC';
      default: return '#BCBCBC';
    }
  };

  const getTaskBackgroundColor = (status: string) => {
    switch (status) {
      case 'overdue': return 'bg-red-50';
      case 'in_progress': return 'bg-blue-50';
      case 'on_verification': return 'bg-gray-50';
      case 'new': return 'bg-yellow-50';
      default: return 'bg-white';
    }
  };

  return (
    <div className="bg-[#f7f7f7] min-h-screen">
      {/* Поиск */}
      <div className="px-5 pt-5 pb-4">
        <div className="relative">
          <Input
            placeholder="Поиск ваших поручений по названию, описанию или статусу"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-white border-0 shadow-sm rounded-[10px] h-[45px] text-[10px] text-[#757D8A] placeholder:text-[#757D8A]"
          />
        </div>
      </div>

      {/* Фильтры */}
      <div className="px-5 pb-5">
        <div className="flex justify-center gap-10">
          <div className="flex flex-col items-center">
            <button
              onClick={() => handleFilterChange('all')}
              className={`text-sm ${
                taskFilter === 'all' 
                  ? 'text-[#020817] font-normal' 
                  : 'text-[#757D8A] font-normal'
              } pb-1`}
            >
              Показать все
            </button>
            {taskFilter === 'all' && (
              <div className="w-full h-[1px] bg-[#020817]" />
            )}
          </div>
          
          <button
            onClick={() => handleFilterChange('author')}
            className={`text-sm ${
              taskFilter === 'author' 
                ? 'text-[#020817] font-normal' 
                : 'text-[#757D8A] font-normal'
            }`}
          >
            я Автор
          </button>
          
          <button
            onClick={() => handleFilterChange('assignee')}
            className={`text-sm ${
              taskFilter === 'assignee' 
                ? 'text-[#020817] font-normal' 
                : 'text-[#757D8A] font-normal'
            }`}
          >
            я Исполнитель
          </button>
        </div>
      </div>

      {/* Список департаментов */}
      <div className="px-5 space-y-3">
        {filteredDepartments.map((department) => {
          const stats = getDepartmentStatistics(department.id);
          const totalTasks = stats.overdue + stats.in_progress + stats.on_verification + stats.new;
          const isExpanded = expandedDepartments.has(department.id);
          const deptTasks = departmentTasks[department.id] || [];
          const manager = departmentManagers[department.id];
          const isUserDepartment = userDepartment?.id === department.id;

                     return (
             <div key={department.id} className={`${isExpanded && deptTasks.length > 0 ? '' : 'rounded-[10px]'} ${isExpanded && deptTasks.length > 0 ? '' : 'bg-white'}`} style={isExpanded && deptTasks.length > 0 ? {} : { boxShadow: '0px 0px 20px 0px rgba(73, 73, 73, 0.1)' }}>
               {/* Заголовок департамента */}
               <div 
                 className="p-4 cursor-pointer h-[90px] flex flex-col justify-between rounded-[10px] bg-white"
                 style={{ boxShadow: '0px 0px 20px 0px rgba(73, 73, 73, 0.1)' }}
                 onClick={() => handleDepartmentToggle(department.id)}
               >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {/* Аватар руководителя */}
                    <div 
                      className="w-[30px] h-[30px] rounded-full bg-gray-200 overflow-hidden flex-shrink-0"
                      title={manager?.fullname || 'Руководитель не назначен'}
                    >
                      <Avatar className="w-full h-full rounded-full">
                        <AvatarImage 
                          src={manager?.image || "/placeholder-avatar.jpg"} 
                          alt={manager?.fullname || department.name}
                          className="w-full h-full object-cover aspect-square rounded-full"
                        />
                        <AvatarFallback className="text-xs bg-gray-300 text-gray-600 w-full h-full flex items-center justify-center rounded-full aspect-square">
                          {manager?.fullname 
                            ? manager.fullname.split(' ').map(n => n.charAt(0)).join('').slice(0, 2)
                            : department.name.charAt(0)
                          }
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    
                    {/* Название департамента */}
                    <h3 className="text-base font-bold text-[#020817] leading-tight">
                      {department.name}
                    </h3>
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* Иконка предупреждения */}
                    {stats.overdue > 0 && (
                      <Info className="w-5 h-5 text-[#DA100B]" />
                    )}
                    
                    {/* Общее количество задач */}
                    <span className="text-[10px] text-[#757D8A]">
                      ({totalTasks})
                    </span>
                    
                    {/* Стрелка */}
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-[#3C3F44]" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[#3C3F44]" />
                    )}
                  </div>
                </div>

                {/* Статистика */}
                <div className="flex justify-between px-11">
                  <div className="flex flex-col items-center gap-[3px] w-[61px]">
                    <span className="text-sm font-normal text-[#757D8A] text-center">{stats.overdue}</span>
                    <span className="text-[10px] font-normal text-[#757D8A] text-center leading-tight">просрочено</span>
                  </div>
                  <div className="flex flex-col items-center gap-[3px] w-[61px]">
                    <span className="text-sm font-normal text-[#757D8A] text-center">{stats.in_progress}</span>
                    <span className="text-[10px] font-normal text-[#757D8A] text-center leading-tight">в работе</span>
                  </div>
                  <div className="flex flex-col items-center gap-[3px] w-[61px]">
                    <span className="text-sm font-normal text-[#757D8A] text-center">{stats.on_verification}</span>
                    <span className="text-[10px] font-normal text-[#757D8A] text-center leading-tight">на проверке</span>
                  </div>
                  <div className="flex flex-col items-center gap-[3px] w-[61px]">
                    <span className="text-sm font-normal text-[#757D8A] text-center">{stats.new}</span>
                    <span className="text-[10px] font-normal text-[#757D8A] text-center leading-tight">новое</span>
                  </div>
                </div>
              </div>

              {/* Список задач (раскрывающийся) */}
              {isExpanded && (
                <div className="pl-[45px] pt-1 pb-4 space-y-1 bg-transparent">
                  {deptTasks.length > 0 ? (
                    deptTasks.map((task, index) => (
                      <div
                        key={task.id}
                        className="flex cursor-pointer hover:bg-gray-50 transition-colors overflow-hidden rounded-[10px]"
                        onClick={() => handleTaskClick(task)}
                        style={{ 
                          boxShadow: '0px 0px 10px 0px rgba(73, 73, 73, 0.05)'
                        }}
                      >
                        {/* Цветная полоска статуса - узкая 4px */}
                        <div 
                          className="w-[4px] h-[60px]"
                          style={{ backgroundColor: getStatusColor(task.status) }}
                        />
                        
                        {/* Содержимое задачи */}
                        <div className="flex-1 bg-white h-[60px] relative rounded-r-[10px]">
                          {/* Контейнер для центрирования текста */}
                          <div className="absolute left-[15px] top-0 right-[93px] h-full flex flex-col justify-center">
                            {/* Заголовок задачи - первая строка */}
                            <h4 className="text-xs font-normal text-[#020817] leading-tight truncate" style={{ fontSize: '12px' }}>
                              {task.title}
                            </h4>
                            
                            {/* Описание задачи - вторая строка */}
                            <p className="text-[10px] font-normal text-[#757D8A] leading-tight truncate">
                              {task.description || 'Без описания'}
                            </p>
                          </div>
                          
                          {/* Контейнер для иконки и даты - центрирован по вертикали */}
                          <div className="absolute right-[15px] top-0 h-full flex flex-col justify-center items-end">
                            {/* Иконка предупреждения для просроченных */}
                            {task.status === 'overdue' && (
                              <div className="mb-1">
                                <Info className="w-5 h-5 text-[#DA100B]" />
                              </div>
                            )}
                            
                            {/* Дата */}
                            <div>
                              <span className={`text-[10px] font-normal leading-tight ${
                                task.status === 'overdue' ? 'text-[#DA100B]' : 'text-[#757D8A]'
                              }`}>
                                {new Date(task.deadline).toLocaleDateString('ru-RU', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-[#757D8A] text-sm">
                      Нет задач в этом департаменте
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Отступ снизу для навигации */}
      <div className="h-20" />
    </div>
  );
});

MobileTasksPage.displayName = 'MobileTasksPage';

export default MobileTasksPage;
