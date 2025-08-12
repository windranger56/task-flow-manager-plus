import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Archive, FileDown, List, ChevronDown, ChevronUp } from 'lucide-react';
import SearchBar from '@/components/SearchBar';
import DepartmentCard from '@/components/DepartmentCard';
import MobileTaskCard from '@/components/MobileTaskCard';
import { useTaskContext } from '@/contexts/TaskContext';
import { TaskStatus, Task, User } from '@/types';
import { supabase } from '@/supabase/client';
import { Drawer, DrawerContent } from './ui/drawer';
import TaskDetail from './TaskDetail';
import ArchiveButton from './ArchiveButton';
import ExportButton from './ExportButton';

export default function MobileInterface() {
  const { 
    departments, 
    tasks,
    taskFilter, 
    setTaskFilter, 
    selectDepartment,
    getUserById,
    user,
    getFilteredTasks,
    selectTask,
		selectedTask,
		tab,
  } = useTaskContext();

  const [activeBottomTab, setActiveBottomTab] = useState<'menu' | 'tasks' | 'add' | 'settings' | 'notifications'>('tasks');
  const [expandedDepartment, setExpandedDepartment] = useState<string | null>(null);
  const [departmentTasks, setDepartmentTasks] = useState<{[key: string]: (Task & { assignee?: User; creator?: User })[]}>({});
  const [tasksWithNewMessages, setTasksWithNewMessages] = useState<Set<string>>(new Set());
	const [showDrawer, setShowDrawer] = useState(false);
	const [showArchive, setShowArchive] = useState(false);

  const today = new Date();
  const dayOfWeek = format(today, 'EEEE', { locale: ru });
  const dateString = format(today, 'dd MMMM yyyy', { locale: ru });

  const getDepartmentStatistics = (departmentId: string) => {
    const departmentTasks = tasks.filter(task => task.departmentId === departmentId);
    
    return {
      overdue: departmentTasks.filter(task => task.status === 'overdue').length,
      in_progress: departmentTasks.filter(task => task.status === 'in_progress').length,
      on_verification: departmentTasks.filter(task => task.status === 'on_verification').length,
      new: departmentTasks.filter(task => task.status === 'new').length,
    };
  };

  // Load tasks with user data for departments
  useEffect(() => {
    const loadDepartmentTasks = async () => {
      const allTasks = getFilteredTasks();
      const newDepartmentTasks: {[key: string]: (Task & { assignee?: User; creator?: User })[]} = {};
      
      for (const department of departments) {
        const deptTasks = allTasks.filter(task => task.departmentId === department.id);
        const tasksWithUsers = await Promise.all(
          deptTasks.map(async (task) => ({
            ...task,
            assignee: await getUserById(task.assignedTo),
            creator: await getUserById(task.createdBy)
          }))
        );
        newDepartmentTasks[department.id] = tasksWithUsers;
      }
      
      setDepartmentTasks(newDepartmentTasks);
    };
    
    loadDepartmentTasks();
  }, [tasks, taskFilter, departments, getUserById, getFilteredTasks]);

  // Load tasks with new messages
  useEffect(() => {
    const fetchTasksWithNewMessages = async () => {
      if (!user?.id) return;

      const { data, error } = await supabase
        .from('messages')
        .select('task_id')
        .eq('is_new', true)
        .neq('sent_by', user.id)
        .neq('is_system', true);

      if (!error && data) {
        const taskIds = new Set(data.map(msg => msg.task_id));
        setTasksWithNewMessages(taskIds);
      }
    };

    fetchTasksWithNewMessages();
  }, [user?.id]);

  const handleDepartmentClick = (departmentId: string) => {
    if (expandedDepartment === departmentId) {
      setExpandedDepartment(null);
    } else {
      setExpandedDepartment(departmentId);
    }
  };

  const handleTaskClick = async (task: Task) => {
    // Mark messages as read
    if (tasksWithNewMessages.has(task.id)) {
      await supabase
        .from('messages')
        .update({ is_new: false })
        .eq('task_id', task.id)
        .eq('is_new', true);

      setTasksWithNewMessages(prev => {
        const newSet = new Set(prev);
        newSet.delete(task.id);
        return newSet;
      });
    }

    selectTask(task);
		setShowDrawer(true);
  };

  const handleFilterClick = (filter: 'all' | 'author' | 'assignee') => {
    setTaskFilter(filter);
  };

  const handleAddTask = () => {
    // TODO: Implement add task functionality
    console.log('Add task clicked');
  };

  const handleNotifications = () => {
    // TODO: Implement notifications functionality
    console.log('Notifications clicked');
  };

  return (
    <div className="min-h-screen bg-[#f7f7f7] pb-20 pt-[58px]">
      
			<div className='fixed top-0 z-[60] w-full h-[58px] bg-white flex items-center justify-center shadow-md rounded-b-lg'>
				<div className='flex flex-col items-center w-full relative'>
					<span className='text-[#C5C7CD] text-sm'>{new Date().toLocaleDateString('ru-RU', { 
						weekday: 'long',
						day: 'numeric', 
						month: 'long', 
						year: 'numeric' 
					})}</span>
					<span>{tab}</span>
					<div className='absolute right-[17px] h-full flex gap-4 items-center text-[#C5C7CD]'>
						<ArchiveButton 
							showArchive={showArchive}
							onToggle={() => setShowArchive(!showArchive)}
							type='mobile'
						/>
						<ExportButton type='mobile' />	
					</div>
				</div>
			</div>

      {/* Search bar */}
      <div className="p-4">
        <SearchBar />
      </div>

      {/* Filter buttons */}
      <div className="px-4 pb-4">
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleFilterClick('all')}
            className={`${taskFilter === 'all' ? 'font-bold underline underline-offset-4' : 'text-foreground'}`}
          >
            Все
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleFilterClick('author')}
            className={`${taskFilter === 'author' ? 'font-bold underline underline-offset-4' : 'text-foreground'}`}
          >
            я Автор
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleFilterClick('assignee')}
            className={`${taskFilter === 'assignee' ? 'font-bold underline underline-offset-4' : 'text-foreground'}`}
          >
            я Исполнитель
          </Button>
        </div>
      </div>

      {/* Department cards grid */}
      <div className="px-4 pb-4">
        <div className="grid grid-cols-1 gap-3">
          {departments.map(department => {
            const statistics = getDepartmentStatistics(department.id);
            const isExpanded = expandedDepartment === department.id;
            const deptTasks = departmentTasks[department.id] || [];
            
            return (
              <div key={department.id}>
                <div className="relative">
                  <DepartmentCard
                    department={department}
                    manager={undefined} // Will be loaded asynchronously if needed
                    statistics={statistics}
                    onClick={() => handleDepartmentClick(department.id)}
                  />
                  {deptTasks.length > 0 && (
                    <div className="absolute top-2 right-2 text-muted-foreground">
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  )}
                </div>
                
                {/* Expanded tasks list */}
                {isExpanded && deptTasks.length > 0 && (
                  <div className="mt-2 pl-4 space-y-2 border-l-2 border-muted">
                    {deptTasks.map(task => (
                      <MobileTaskCard
                        key={task.id}
                        task={task}
                        onClick={() => handleTaskClick(task)}
                        hasNewMessages={tasksWithNewMessages.has(task.id)}
                      />
                    ))}
                  </div>
                )}
                
                {isExpanded && deptTasks.length === 0 && (
                  <div className="mt-2 pl-4 py-4 text-center text-muted-foreground text-sm border-l-2 border-muted">
                    Нет поручений в этом департаменте
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
			<Drawer open={showDrawer} onOpenChange={() => {setShowDrawer(false); selectTask(null)}}>
				<DrawerContent className="h-screen max-h-screen">
					<div className="relative h-full">
						<div className="lg:px-4 h-full">
							<TaskDetail />
						</div>
					</div>
				</DrawerContent>
			</Drawer>
    </div>
  );
}