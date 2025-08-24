import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Archive, FileDown, List, ChevronDown, ChevronUp } from 'lucide-react';
import SearchBar from '@/components/SearchBar';
import DepartmentCard from '@/components/DepartmentCard';
import MobileTaskCard from '@/components/MobileTaskCard';
import { useTaskContext } from '@/contexts/TaskContext';
import { useModalContext } from '@/contexts/ModalContext';
import { TaskStatus, Task, User } from '@/types';
import { supabase } from '@/supabase/client';
import { Drawer, DrawerContent, DrawerOverlay, DrawerPortal } from './ui/drawer';
import TaskDetail from './TaskDetail';
import { MobileStatusModal } from './MobileStatusModal';
import ArchiveButton from './ArchiveButton';
import ExportButton from './ExportButton';
import { LeftArrow } from './icons';
import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import MobileFooter from './MobileFooter';
import LeftSidebar from './LeftSidebar';
import MobileAccountPage from './MobileAccountPage';
import TaskListComponent from './TaskList';
import MobileTasksPage from './MobileTasksPage';

const PageComponents = {
	account: MobileAccountPage,
	tasks: MobileTasksPage, // Новый компонент согласно Figma
	add: () => <div className='w-full h-full flex justify-center items-center'>Страница отсутствует в дизайне</div>,
	calendar: () => <div className='w-full h-full flex justify-center items-center'>Страница отсутствует в дизайне</div>,
	notifications: () => <div className='w-full h-full flex justify-center items-center'>Страница отсутствует в дизайне</div>,
}

export default function MobileInterface() {
	const {headerTitle, setHeaderTitle, viewHistory, setViewHistory, selectTask, selectedTask, updateTaskStatus, user} = useTaskContext();
	const { isMobileStatusModalOpen, setIsMobileStatusModalOpen } = useModalContext();
  const [activeTab, setActiveTab] = useState<'account' | 'tasks' | 'add' | 'calendar' | 'notifications'>('tasks');
  const [nextStatus, setNextStatus] = useState<TaskStatus | null>(null);
  const [newDeadline, setNewDeadline] = useState<Date | undefined>(undefined);
  const [statusComment, setStatusComment] = useState('');

  // Функция для получения доступных статусов
  const getAvailableStatuses = () => {
    if (!selectedTask || !user) return [];
    
    const currentStatus = selectedTask.status;
    const isCreator = user.id === selectedTask.createdBy;
    
    switch (currentStatus) {
      case 'new':
        return [{ value: 'in_progress' as TaskStatus, label: 'В работу' }];
      case 'in_progress':
        return [{ value: 'on_verification' as TaskStatus, label: 'На проверку' }];
      case 'on_verification':
        if (isCreator) {
          return [
            { value: 'completed' as TaskStatus, label: 'Завершено' },
            { value: 'in_progress' as TaskStatus, label: 'В работу (вернуть на доработку)' }
          ];
        }
        return [];
      case 'overdue':
        return [{ value: 'in_progress' as TaskStatus, label: 'В работу' }];
      default:
        return [];
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f7f7] pb-20 pt-[90px]">
			<Header />		

			{(() => {
				const PageComponent = PageComponents[activeTab];
				return <PageComponent />;
			})()}
      
			<MobileFooter activeTab={activeTab} onTabChange={tab => {
				setHeaderTitle(tabToTabName[tab])
				setActiveTab(tab)
			}} />

			{/* Task Detail Drawer */}
			<Drawer open={viewHistory.some(view => view === "task") && !isMobileStatusModalOpen} onOpenChange={(event) => {
				if (!event.valueOf()) {
					setViewHistory(history => history.slice(0, -1));
					selectTask(null)
				}
			}}>
				<DrawerOverlay className='pointer-events-none z-[10000]' />
				<DrawerContent className="h-screen max-h-screen z-[10001] rounded-t-[20px] bg-[#f7f7f7]">
					{/* Swipe индикатор */}
					<div className="flex justify-center pt-3 pb-2 bg-[#f7f7f7]">
						<div className="w-[40px] h-[4px] bg-gray-300 rounded-full"></div>
					</div>
					<div className="relative h-full overflow-hidden">
						<div className="h-full overflow-y-auto">
							<TaskDetail />
						</div>
					</div>
				</DrawerContent>
			</Drawer>
			
			{/* Мобильное модальное окно смены статуса - рендерится на уровне всего экрана */}
			{isMobileStatusModalOpen && selectedTask && user && (
				<MobileStatusModal
					isOpen={isMobileStatusModalOpen}
					onClose={() => {
						console.log('🚫 Mobile modal onClose called from MobileInterface');
						setIsMobileStatusModalOpen(false);
					}}
					currentStatus={selectedTask.status}
					nextStatus={nextStatus}
					setNextStatus={setNextStatus}
					newDeadline={newDeadline}
					setNewDeadline={setNewDeadline}
					statusComment={statusComment}
					setStatusComment={setStatusComment}
					onConfirm={async () => {
						if (!nextStatus || !selectedTask) return;
						
						const needsComment = selectedTask.status === 'on_verification' && user.id === selectedTask.createdBy && nextStatus === 'in_progress';
						if (needsComment && !statusComment.trim()) {
							return;
						}
						
						try {
							if (needsComment) {
								await updateTaskStatus(selectedTask.id, nextStatus, statusComment, newDeadline);
							} else {
								await updateTaskStatus(selectedTask.id, nextStatus, undefined, newDeadline);
							}
							setIsMobileStatusModalOpen(false);
						} catch (error) {
							console.error('❌ Ошибка при обновлении статуса:', error);
						}
					}}
					availableStatuses={getAvailableStatuses()}
					isCreator={user.id === selectedTask.createdBy}
					needsComment={selectedTask.status === 'on_verification' && user.id === selectedTask.createdBy && nextStatus === 'in_progress'}
				/>
			)}
    </div>
  );
}

function Header() {
	const { viewHistory, setViewHistory, showArchive, setShowArchive, headerTitle, setHeaderTitle } = useTaskContext();

	return (
		<div onClick={event => event.stopPropagation()} className='fixed pointer-events-auto top-0 z-[9999] w-full h-[90px] bg-white flex items-center justify-center shadow-md rounded-b-lg'>
			<div className='flex flex-col items-center w-full relative mt-[30px]'>
				<AnimatePresence>
					{viewHistory.length > 0 && (
						<motion.button
							key="backButton"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							transition={{ duration: 0.3 }}
							className="absolute left-[17px] h-full flex items-center"
							onClick={() => {
								setViewHistory(history => history.slice(0, -1))
								setHeaderTitle("Поручения")
							}}
						>
							<LeftArrow />
						</motion.button>
					)}
				</AnimatePresence>
				<span className='text-[#C5C7CD] text-sm'>{new Date().toLocaleDateString('ru-RU', { 
					weekday: 'long',
					day: 'numeric', 
					month: 'long', 
					year: 'numeric' 
				})}</span>
				<span>{headerTitle}</span>
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
  );
}

const tabToTabName = {
	account: "Личный кабинет",
	tasks: "Поручения",
	add: "Новое поручение",
	calendar: "Календарь",
	notifications: "Уведомления"
}

function TaskList() {
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
		headerTitle,
		setHeaderTitle,
		viewHistory,
		setViewHistory,
  } = useTaskContext();

  const [departmentTasks, setDepartmentTasks] = useState<{[key: string]: (Task & { assignee?: User; creator?: User })[]}>({});
  const [expandedDepartment, setExpandedDepartment] = useState<string | null>(null);
  const [tasksWithNewMessages, setTasksWithNewMessages] = useState<Set<string>>(new Set());

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
		setViewHistory(history => [...history, "task"]);
  };

  const handleFilterClick = (filter: 'all' | 'author' | 'assignee') => {
    setTaskFilter(filter);
  };

	return (
		<div>
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

		</div>
	)
}