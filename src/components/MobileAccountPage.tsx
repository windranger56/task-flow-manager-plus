import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useTaskContext } from '@/contexts/TaskContext';
import { Info } from 'lucide-react';
import { LogoutIcon } from '@/components/icons/LogoutIcon';
import { supabase } from '@/supabase/client';
import { User, Task } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface TaskStats {
  overdue: number;
  in_progress: number;
  on_verification: number;
  new: number;
}



const MobileAccountPage = memo(() => {
  const { 
    user, 
    tasks, 
    getUserById, 
    getFilteredTasks, 
    taskFilter, 
    setTaskFilter, 
    getSubordinates,
    getDepartmentByUserId,
    setSelectedUserId,
    selectedUserId,
    departments,
    selectDepartment,
    getUserDepartmentId,
    selectTask
  } = useTaskContext();
  
  const [taskStats, setTaskStats] = useState<TaskStats>({
    overdue: 0,
    in_progress: 0,
    on_verification: 0,
    new: 0
  });
  const [subordinates, setSubordinates] = useState<User[]>([]);
  const [subordinateDepartments, setSubordinateDepartments] = useState<{[userId: string]: string}>({});
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  
  // States for tasks dialog
  const [showTasksDialog, setShowTasksDialog] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);

  // Мемоизированные задачи по статусам
  const tasksByStatus = useMemo(() => {
    if (!user) return { done: [], overdue: [], new: [], inwork: [], verify: [] };
    
    const filteredTasks = getFilteredTasks();
    
    return {
      done: filteredTasks.filter(t => t.status === 'completed'),
      overdue: filteredTasks.filter(t => t.status === 'overdue'),
      new: filteredTasks.filter(t => t.status === 'new'),
      inwork: filteredTasks.filter(t => t.status === 'in_progress'),
      verify: filteredTasks.filter(t => t.status === 'on_verification')
    };
  }, [tasks, user, taskFilter, selectedUserId, getFilteredTasks]);

  // Обновление статистики задач на основе мемоизированных данных
  useEffect(() => {
    if (!user) return;

    const stats = {
      overdue: tasksByStatus.overdue.length,
      in_progress: tasksByStatus.inwork.length,
      on_verification: tasksByStatus.verify.length,
      new: tasksByStatus.new.length,
    };
    
    setTaskStats(stats);
  }, [user, tasksByStatus]);

  // Оптимизированная загрузка подчиненных
  useEffect(() => {
    if (!user) return;

    const loadSubordinatesAndDepartments = async () => {
      try {
        const subs = await getSubordinates();
        setSubordinates(subs);
        
        if (subs.length > 0) {
          const deptPromises = subs.map(async (sub) => {
            const dept = await getDepartmentByUserId(sub.id);
            return { userId: sub.id, departmentName: dept?.name || 'Не назначен' };
          });
          
          const deptResults = await Promise.all(deptPromises);
          const deptMap = deptResults.reduce((acc, curr) => {
            acc[curr.userId] = curr.departmentName;
            return acc;
          }, {} as {[userId: string]: string});
          
          setSubordinateDepartments(deptMap);
        }
      } catch (error) {
        console.error("Ошибка при загрузке подчиненных и их департаментов:", error);
      }
    };
    
    loadSubordinatesAndDepartments();
  }, [user, getSubordinates, getDepartmentByUserId]);

  const handleLogout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      window.location.href = '/auth';
    } catch (error) {
      console.error('Error logging out:', error);
    }
  }, []);

  const handleSelectEmployee = useCallback(async (employee: User) => {
    try {
      // Set selected user in context
      setSelectedUserId(employee.id);
      setSelectedEmployeeId(employee.id);
      
      // Get user's department and auto-select it
      const departmentId = await getUserDepartmentId(employee.id);
      if (departmentId) {
        const department = departments.find(d => d.id === departmentId);
        if (department) {
          selectDepartment(department);
        }
      }
      
      // Reset task filter to 'all'
      setTaskFilter('all');
    } catch (error) {
      console.error("Ошибка при выборе сотрудника:", error);
    }
  }, [setSelectedUserId, getUserDepartmentId, departments, selectDepartment, setTaskFilter]);

  // Функция для фильтрации задач по статусу
  const handleStatusClick = useCallback((status: string) => {
    setSelectedStatus(status);
    let tasksToShow: Task[] = [];
    
    switch(status) {
      case 'new':
        tasksToShow = tasksByStatus.new;
        break;
      case 'in_progress':
        tasksToShow = tasksByStatus.inwork;
        break;
      case 'on_verification':
        tasksToShow = tasksByStatus.verify;
        break;
      case 'overdue':
        tasksToShow = tasksByStatus.overdue;
        break;
      default:
        tasksToShow = [];
    }
    
    setFilteredTasks(tasksToShow);
    setShowTasksDialog(true);
  }, [tasksByStatus]);

  // Получите правильные названия статусов
  const getStatusLabel = useCallback((status: string) => {
    switch(status) {
      case 'new': return 'Новые';
      case 'in_progress': return 'В работе';
      case 'on_verification': return 'На проверке';
      case 'overdue': return 'Просрочено';
      default: return '';
    }
  }, []);

  const handleTaskClick = useCallback((task: Task) => {
    selectTask(task);
    setShowTasksDialog(false);
    // В мобильной версии можно добавить навигацию к детали задачи
  }, [selectTask]);

  // Мемоизированные обработчики фильтров
  const handleAllFilter = useCallback(() => {
    setTaskFilter('all');
    setSelectedUserId(null);
    setSelectedEmployeeId(null);
  }, [setTaskFilter, setSelectedUserId]);

  const handleAuthorFilter = useCallback(() => {
    setTaskFilter('author');
    setSelectedUserId(null);
    setSelectedEmployeeId(null);
  }, [setTaskFilter, setSelectedUserId]);

  const handleAssigneeFilter = useCallback(() => {
    setTaskFilter('assignee');
    setSelectedUserId(null);
    setSelectedEmployeeId(null);
  }, [setTaskFilter, setSelectedUserId]);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Загрузка профиля...</div>
      </div>
    );
  }

  const totalTasks = Object.values(taskStats).reduce((sum, count) => sum + count, 0);

  return (
    <div className="bg-[#f7f7f7] relative">
      <div className="px-[24px] pt-[20px] pb-6">
        {/* ФИО и email пользователя сверху с кнопкой выхода слева */}
        <div className="relative text-center pt-[16px] mb-4">
          {/* Logout Button - слева от ФИО с отступом от хедера */}
          <div className="absolute left-0 top-[8px]">
            <button
              onClick={handleLogout}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogoutIcon className="text-[#C5C7CD]" size={24} />
            </button>
          </div>
          
          <h1 className="text-base font-normal text-[#020817] mb-2">
            {user.fullname}
          </h1>
          <p className="text-xs font-normal text-[#757D8A]">
            {user.email}
          </p>
        </div>

        {/* User Avatar - центрированный */}
        <div className="flex justify-center mb-[24px]">
          <Avatar className="w-[100px] h-[100px]">
            <AvatarImage src={user.image} alt={user.fullname} />
            <AvatarFallback className="bg-[#D9D9D9] text-gray-600 text-2xl">
              {user.fullname ? user.fullname.slice(0, 2).toUpperCase() : 'UN'}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Filter Buttons - после аватара */}
        <div className="flex justify-center items-center gap-10 mb-[24px]">
          <div className="flex flex-col items-center">
            <button
              onClick={handleAllFilter}
              className={`text-sm font-normal ${
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
            onClick={handleAuthorFilter}
            className={`text-sm font-normal ${
              taskFilter === 'author' 
                ? 'text-[#020817] font-normal' 
                : 'text-[#757D8A] font-normal'
            }`}
          >
            я Автор
          </button>
          
          <button
            onClick={handleAssigneeFilter}
            className={`text-sm font-normal ${
              taskFilter === 'assignee' 
                ? 'text-[#020817] font-normal' 
                : 'text-[#757D8A] font-normal'
            }`}
          >
            я Исполнитель
          </button>
        </div>

        {/* Task Statistics Progress Bar с иконкой Info - после фильтров */}
        {totalTasks > 0 && (
          <div className="mb-[24px]">
            <div className="flex justify-between items-center w-full max-w-[320px] mx-auto">
              <div className="h-[5px] bg-gray-200 rounded-[5px] overflow-hidden flex flex-1 mr-4">
              {taskStats.overdue > 0 && (
                <div 
                  className="h-full bg-[#DA100B]"
                  style={{ width: `${(taskStats.overdue / totalTasks) * 100}%` }}
                />
              )}
              {taskStats.in_progress > 0 && (
                <div 
                  className="h-full bg-[#3F79FF]"
                  style={{ width: `${(taskStats.in_progress / totalTasks) * 100}%` }}
                />
              )}
              {taskStats.on_verification > 0 && (
                <div 
                  className="h-full bg-[#EEF4C7]"
                  style={{ width: `${(taskStats.on_verification / totalTasks) * 100}%` }}
                />
              )}
              {taskStats.new > 0 && (
                <div 
                  className="h-full bg-[#BCBCBC]"
                  style={{ width: `${(taskStats.new / totalTasks) * 100}%` }}
                />
              )}
            </div>
            
              {/* Info Icon - справа от прогресс-бара */}
              <div>
                <Info className="h-6 w-6 text-[#020817]" />
              </div>
            </div>
          </div>
        )}

        {/* Task Statistics Cards - после прогресс бара */}
        <div className="mb-[24px]">
          <div className="flex flex-wrap justify-center gap-3 w-full max-w-[320px] mx-auto">
            {/* Первая строка */}
            <div className="flex gap-3 w-full">
              {/* Просрочено - Longer width */}
              <div 
                className="bg-white border border-[#E5E7EB] rounded-[10px] h-[45px] flex items-center justify-center gap-1 px-4 w-[170px] cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => handleStatusClick('overdue')}
              >
                <div className="w-3 h-2 bg-[#DA100B] rounded-[5px]" />
                <span className="text-sm font-normal text-[#020817]">{taskStats.overdue}</span>
                <span className="text-xs font-normal text-[#757D8A]">Просрочено</span>
              </div>

              {/* В работе - Shorter width */}
              <div 
                className="bg-white border border-[#E5E7EB] rounded-[10px] h-[45px] flex items-center justify-center gap-1 px-4 w-[120px] cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => handleStatusClick('in_progress')}
              >
                <div className="w-3 h-2 bg-[#3F79FF] rounded-[5px]" />
                <span className="text-sm font-normal text-[#020817]">{taskStats.in_progress}</span>
                <span className="text-xs font-normal text-[#757D8A]">В работе</span>
              </div>
            </div>

            {/* Вторая строка */}
            <div className="flex gap-3 w-full">
              {/* Новые - Shorter width */}
              <div 
                className="bg-white border border-[#E5E7EB] rounded-[10px] h-[45px] flex items-center justify-center gap-1 px-4 w-[120px] cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => handleStatusClick('new')}
              >
                <div className="w-3 h-2 bg-[#BCBCBC] rounded-[5px]" />
                <span className="text-sm font-normal text-[#020817]">{taskStats.new}</span>
                <span className="text-xs font-normal text-[#757D8A]">Новые</span>
              </div>

              {/* На проверке - Longer width */}
              <div 
                className="bg-white border border-[#E5E7EB] rounded-[10px] h-[45px] flex items-center justify-center gap-1 px-4 w-[170px] cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => handleStatusClick('on_verification')}
              >
                <div className="w-3 h-2 bg-[#EEF4C7] rounded-[5px]" />
                <span className="text-sm font-normal text-[#020817]">{taskStats.on_verification}</span>
                <span className="text-xs font-normal text-[#757D8A]">На проверке</span>
              </div>
            </div>
          </div>
        </div>

        {/* Employees List - At the bottom */}
        <div className="space-y-5 mt-[40px] max-w-[309px] mx-auto">
          {subordinates.length > 0 ? (
            subordinates.map((employee) => (
              <div 
                key={employee.id} 
                className={`flex items-center space-x-4 h-[50px] cursor-pointer rounded-lg p-2 transition-colors ${
                  selectedEmployeeId === employee.id 
                    ? 'bg-blue-50 border-2 border-blue-200' 
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => handleSelectEmployee(employee)}
              >
                <Avatar className="w-[50px] h-[50px]">
                  <AvatarImage src={employee.image} alt={employee.fullname} />
                  <AvatarFallback className="bg-[#D9D9D9] text-gray-600">
                    {employee.fullname ? employee.fullname.slice(0, 2).toUpperCase() : 'UN'}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-normal text-[#020817] mb-1">
                    {employee.fullname}
                  </h3>
                  <p className="text-xs font-normal text-[#757D8A]">
                    {subordinateDepartments[employee.id] || 'Не назначен'}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-gray-500 py-4">Нет подчиненных</div>
          )}
        </div>
      </div>

      {/* Tasks Dialog */}
      <Dialog open={showTasksDialog} onOpenChange={setShowTasksDialog}>
        <DialogContent className="max-w-[90vw] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{getStatusLabel(selectedStatus)} ({filteredTasks.length})</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {filteredTasks.length > 0 ? (
              filteredTasks.map(task => (
                <div 
                  key={task.id} 
                  className="p-3 border rounded-md cursor-pointer hover:bg-gray-50"
                  onClick={() => handleTaskClick(task)}
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
    </div>
  );
});

MobileAccountPage.displayName = 'MobileAccountPage';

export default MobileAccountPage;
