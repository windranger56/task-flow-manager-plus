import React, { ReactElement, useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Check, Eye, EyeOff, Loader2, Send, Download } from "lucide-react";
import { useTaskContext } from '@/contexts/TaskContext';
import { cn, getTaskStatusColor } from '@/lib/utils';
import { ru } from 'date-fns/locale';
import { supabase } from '@/supabase/client';
import { Paperclip, X, FileIcon, Trash2 } from 'lucide-react';
import { FileViewer } from './FileViewer'; // или путь к вашему компоненту
import { Task } from '@/types';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarIcon, CompletedIcon, HistoryIcon, InProgressIcon, NewIcon, OnVerificationIcon, OverdueIcon, PriorityIcon, ProtocolIcon, ReassignIcon } from './icons';

export default function TaskDetail() {
  const { 
    user,
    selectedTask, 
    getUserById, 
    deleteTask, 
    reassignTask, 
    toggleProtocol, 
    completeTask,
    users, // оставляем для других нужд
    selectTask,
    fetchTasks,
    getSubordinates, // добавляем функцию получения сотрудников
    updateTaskIsNew
  } = useTaskContext();


  const [viewerFile, setViewerFile] = useState<any | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showReassign, setShowReassign] = useState(false);
  const [reassignTo, setReassignTo] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newDeadline, setNewDeadline] = useState<Date | undefined>(undefined);
  const [creator, setCreator] = useState<any>(null);
  const [assignee, setAssignee] = useState<any>(null);
  const [isStatusConfirmOpen, setIsStatusConfirmOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [nextStatus, setNextStatus] = useState<string | null>(null);
  const [statusComment, setStatusComment] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [taskHistory, setTaskHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [subordinates, setSubordinates] = useState<any[]>([]);
  const [showOnlySystemMessages, setShowOnlySystemMessages] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [hasTaskChain, setHasTaskChain] = useState(false);
	const [department, setDepartment] = useState("");

	useEffect(() => {
		if (!selectedTask) return
		(async () => {
			const {data} = await supabase.from("departments").select("name").eq("id", selectedTask.departmentId);
			setDepartment(data[0].name);
		})()
	}, [selectedTask])

  useEffect(() => {
    const fetchData = async () => {
      if(!selectedTask) return;

      // Проверяем, есть ли цепочка переназначений
      await checkTaskChain(selectedTask.id);

      
      // Подписка на изменения сообщений
      const channel = supabase
        .channel(`task-${selectedTask.id}-messages`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'messages',
            filter: `task_id=eq.${selectedTask.id}`,
          },
          (payload) => {
            if(payload.eventType === 'INSERT') {
              setChatMessages(prev => [...prev, payload.new]);
            } else if (payload.eventType === 'UPDATE') {
              setChatMessages(prev => prev.map(m => 
                m.id === payload.old.id ? { ...payload.new, is_deleted: payload.new.is_deleted || false } : m
              ));
            }
          }
        )
        .subscribe();

      // Загрузка начальных данных
      const loadData = async () => {
        const { data: messagesData, error: messagesError } = await supabase
          .from('messages')
          .select()
          .eq('task_id', selectedTask.id)
          .order('created_at', { ascending: true });

        if(messagesError) {
          console.error("Ошибка загрузки сообщений:", messagesError);
          return;
        }

        setChatMessages(messagesData || []);

        const creatorData = user.id === selectedTask.createdBy 
          ? user 
          : await getUserById(selectedTask.createdBy);
        
        const assigneeData = user.id === selectedTask.assignedTo 
          ? user 
          : await getUserById(selectedTask.assignedTo);

        setCreator(creatorData);
        setAssignee(assigneeData);
      };

      await loadData();

      // Reset is_new flag when task is opened
      if (selectedTask.is_new) {
        await updateTaskIsNew(selectedTask.id, false);
      }

      // Загружаем сотрудников для селектора переназначения
      const loadSubordinates = async () => {
        const subs = await getSubordinates();
        setSubordinates(subs);
      };
      loadSubordinates();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    fetchData();
  }, [selectedTask]);

  const isMobile = window.innerWidth < 768; // или использовать хук useMediaQuery

 
  
  const handleCloseHistory = () => {
    setIsHistoryOpen(false);
  };

  const handleSendChatMessage = async () => {
    if (!chatMessage.trim() && selectedFiles.length === 0) return;
    if (!selectedTask) return;
  
    try {
      // Загрузка файлов, если они есть
      const fileUrls = [];
      for (const file of selectedFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
        const filePath = `chat/${selectedTask.id}/${fileName}`;
        
        const { error } = await supabase.storage
          .from('chat-files')
          .upload(filePath, file);
        
        if (error) throw error;
        
        // Получаем URL файла
        const { data: { publicUrl } } = supabase.storage
          .from('chat-files')
          .getPublicUrl(filePath);
        
        fileUrls.push({
          name: file.name,
          url: publicUrl,
          type: file.type
        });
      }
  
      // Отправка сообщения в базу данных
      const { error } = await supabase
        .from('messages')
        .insert([{
          content: chatMessage,
          task_id: selectedTask.id,
          sent_by: user.id,
          is_system: 0,
          files: fileUrls.length > 0 ? fileUrls : null
        }]);
  
      if (error) throw error;
  
      // Очистка полей после отправки
      setChatMessage('');
      setSelectedFiles([]);
    } catch (error) {
      console.error("Ошибка отправки сообщения:", error);
      alert('Произошла ошибка при отправке сообщения');
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: string, reason?: string, newDeadline?: Date) => {
    try {
      // Если меняем статус с 'overdue' на 'in_progress' или 'on_verification' и передан новый дедлайн, обновляем оба поля
      const updateFields: any = { status: newStatus };
      if (newDeadline && (newStatus === 'in_progress' || newStatus === 'on_verification')) {
        updateFields.deadline = newDeadline.toISOString();
      }
      const { error: taskError } = await supabase
        .from('tasks')
        .update(updateFields)
        .eq('id', taskId);

      if (taskError) throw taskError;

      // Добавляем системное сообщение о смене статуса
      const statusLabels = {
        'new': 'Новое',
        'in_progress': 'В работе',
        'on_verification': 'На проверке',
        'completed': 'Завершено',
        'overdue': 'Просрочено',
      };
      
      // Первое сообщение - статус и дедлайн (системное)
      let statusMessage = `Статус изменён на: ${statusLabels[newStatus] || newStatus}`;
      
      // Добавляем информацию о новом дедлайне, если статус меняется с 'overdue' на 'in_progress' или 'on_verification'
      if ((newStatus === 'in_progress' || newStatus === 'on_verification') && newDeadline) {
        const formattedDeadline = formatDateSafe(newDeadline, 'dd.MM.yyyy');
        statusMessage += `\nНовый дедлайн: ${formattedDeadline}`;
      }
      
      // Вставляем первое сообщение (системное)
      await supabase
        .from('messages')
        .insert([{
          content: statusMessage,
          task_id: taskId,
          sent_by: user.id,
          is_system: 1,
        }]);

      // Второе сообщение - комментарий (несистемное), только если есть reason
      if (newStatus === 'in_progress' && reason) {
        await supabase
          .from('messages')
          .insert([{
            content: `Комментарий: ${reason}`,
            task_id: taskId,
            sent_by: user.id,
            is_system: 0,
          }]);
      }

      // Set is_new flag for status changes (except for the user who made the change)
      await updateTaskIsNew(taskId, true);

      // Получаем обновлённую задачу и обновляем selectedTask
      const { data: updatedTask, error: fetchError } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single();
      if (!fetchError && updatedTask) {
        selectTask({
          ...selectedTask,
          ...updatedTask,
        });
        await fetchTasks();
      }

    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const handleRejectTask = async () => {
    if (!rejectReason.trim()) {
      alert('Пожалуйста, укажите причину отклонения');
      return;
    }
    
    try {
      await updateTaskStatus(selectedTask.id, 'canceled', rejectReason);
      
      // Добавляем сообщение в локальное состояние
      const newSystemMessage = {
        id: Date.now().toString(), // временный ID
        content: `Поручение отклонено. Причина: ${rejectReason}`,
        task_id: selectedTask.id,
        sent_by: user.id,
        is_system: 1,
        created_at: new Date().toISOString()
      };
      
      setChatMessages(prev => [...prev, newSystemMessage]);
      
      setRejectReason('');
      setShowRejectDialog(false);
      setIsStatusConfirmOpen(false);
    } catch (error) {
      alert('Не удалось отклонить поручение');
    }
  };

  const handleReassign = async () => {
    if (!reassignTo) return;
    try {
      // Получаем данные нового исполнителя перед переназначением
      const newAssignee = subordinates.find(u => u.id === reassignTo);
      
      // Выполняем переназначение
      await reassignTask(
        selectedTask.id, 
        reassignTo, 
        newTitle || undefined,
        newDescription || undefined,
        newDeadline
      );
      
      // Добавляем системное сообщение о переназначении
      if (newAssignee) {
        const currentDate = format(new Date(), 'dd.MM.yyyy HH:mm');
        await supabase
          .from('messages')
          .insert([{
            content: `Поручение переназначено ${currentDate} на: ${newAssignee.fullname}`,
            task_id: selectedTask.id,
            sent_by: user.id,
            is_system: 1,
          }]);
      }
      
      // Добавляем сообщение в локальное состояние для мгновенного отображения
      const newSystemMessage = {
        id: Date.now().toString(), // временный ID
        content: `Поручение переназначено ${format(new Date(), 'dd.MM.yyyy HH:mm')} на: ${newAssignee?.fullname || 'нового исполнителя'}`,
        task_id: selectedTask.id,
        sent_by: user.id,
        is_system: 1,
        created_at: new Date().toISOString()
      };
      
      setChatMessages(prev => [...prev, newSystemMessage]);
      setShowReassign(false);
      
      // Сбрасываем поля формы
      setReassignTo('');
      setNewTitle('');
      setNewDescription('');
      setNewDeadline(undefined);
    } catch (error) {
      console.error("Ошибка переназначения:", error);
      alert('Произошла ошибка при переназначении поручения');
    }
  };

  const calculateDeadlineDays = (deadlineDate: Date | string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(deadlineDate);
    deadline.setHours(0, 0, 0, 0);
    
    const diffTime = deadline.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return "Срок истекает сегодня!";
    } else if (diffDays < 0) {
      return `Срок истек ${Math.abs(diffDays)} ${getDayWord(Math.abs(diffDays))} назад!`;
    } else {
      return `Срок истекает через ${diffDays} ${getDayWord(diffDays)}!`;
    }
  };

  const getDayWord = (days: number) => {
    if (days % 10 === 1 && days % 100 !== 11) {
      return 'день';
    } else if ([2, 3, 4].includes(days % 10) && ![12, 13, 14].includes(days % 100)) {
      return 'дня';
    } else {
      return 'дней';
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Проверка размера файлов и расширений
    const validFiles = files.filter(file => {
      if (file.size > 25 * 1024 * 1024) {
        alert(`Файл ${file.name} превышает максимальный размер 25MB`);
        return false;
      }
      if (file.name.endsWith('.exe')) {
        alert('Файлы с расширением .exe запрещены');
        return false;
      }
      return true;
    });
    
    setSelectedFiles([...selectedFiles, ...validFiles]);
    if (e.target) e.target.value = ''; // Сброс input
  };
  
  const removeFile = (index: number) => {
    const newFiles = [...selectedFiles];
    newFiles.splice(index, 1);
    setSelectedFiles(newFiles);
  };
  
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      // Обновляем сообщение в Supabase, устанавливая is_deleted = true
      const { error } = await supabase
        .from('messages')
        .update({ is_deleted: true })
        .eq('id', messageId);
      
      if (error) throw error;
      
      // Обновляем локальное состояние
      setChatMessages(chatMessages.map(msg => 
        msg.id === messageId ? { ...msg, is_deleted: true } : msg
      ));
      
    } catch (error) {
      console.error('Ошибка при удалении сообщения:', error);
      alert('Не удалось удалить сообщение');
    }
  };

  const fetchTaskHistory = async (taskId: string) => {
    setIsLoadingHistory(true);

		const history = await Promise.all([
			fetchHistoryBackwards(selectedTask).then(tasks => tasks.slice(0, -1)),

			supabase.from("tasks").select(`
				*,
				creator:users!created_by(fullname)
			`).eq("id", selectedTask.id).then(async ({data}) => {
				const task = data[0];
				task.assignee = await supabase.from("users").select("fullname").eq("id", task.assigned_to).then(({data}) => data[0])
				return task;
			}),

			fetchHistoryForwards(selectedTask).then(tasks => tasks.slice(1)),
		]).then((array) => array.flat());

		setIsLoadingHistory(false);

		return history;
  };

	const fetchHistoryBackwards = async (task: Task) => {
		const tasks: Array<any> = [task];

		while (true) {
			if(!tasks[0].parentId) break;

			var {data} = await supabase.from("tasks").select(`
				*,
				creator:users!created_by(fullname)
			`).eq("id", tasks[0].parentId);

			tasks.unshift(data[0]);

			tasks[0].assignee = await supabase.from("users").select("fullname").eq("id", tasks[0].assigned_to).then(({data}) => data[0])
		}

		return tasks;
	}

	const fetchHistoryForwards = async (task: Task) => {
		const tasks: Array<any> = [task];

		while (true) {
			var {data} = await supabase.from("tasks").select(`
				*,
				creator:users!created_by(fullname)
			`).eq("parent_id", tasks[tasks.length - 1].id);

			if(!data[0]) break;
			tasks.push(data[0]);

			tasks[tasks.length - 1].assignee = await supabase.from("users").select("fullname").eq("id", tasks[tasks.length - 1].assigned_to).then(({data}) => data[0])
		}

		return tasks;
	}

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'new': return 'Новое';
      case 'in_progress': return 'В работе';
      case 'on_verification': return 'На проверке';
      case 'completed': return 'Завершено';
      case 'overdue': return 'Просрочено';
      default: return status;
    }
  };

  const formatDateSafe = (date: Date | string | null | undefined, formatStr: string): string => {
    if (!date) return 'Дата не указана';
    
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      return isNaN(dateObj.getTime()) ? 'Некорректная дата' : format(dateObj, formatStr, { locale: ru });
    } catch {
      return 'Ошибка даты';
    }
  };

  const checkTaskChain = async (taskId: string) => {
    try {
      // Проверяем, есть ли родительская задача
      const { data: currentTask } = await supabase
        .from('tasks')
        .select('parent_id')
        .eq('id', taskId)
        .single();

      // Проверяем, есть ли дочерние задачи
      const { data: children } = await supabase
        .from('tasks')
        .select('id')
        .eq('parent_id', taskId);

      const hasChain = !!(currentTask?.parent_id || (children && children.length > 0));
      setHasTaskChain(hasChain);
    } catch (error) {
      console.error('Error checking task chain:', error);
      setHasTaskChain(false);
    }
  };

  const handleOpenHistory = async () => {
    setHistoryOpen(true);
    const history = await fetchTaskHistory(selectedTask.id);
		console.log(history)
		setTaskHistory(history);
  };

  const filteredMessages = chatMessages.filter(msg => 
    showOnlySystemMessages ? msg.is_system : !msg.is_system
  );


  // Функция для определения доступных статусов
  function getAvailableStatuses() {
    if (!selectedTask || !user) return [];
    const isExecutor = user.id === selectedTask.assignedTo;
    const isCreator = user.id === selectedTask.createdBy;
    const status = selectedTask.status;
    if (status === 'new' && isExecutor) {
      return [{ value: 'in_progress', label: 'В работе' }];
    }
    if (status === 'in_progress' && isExecutor) {
      return [{ value: 'on_verification', label: 'На проверке' }];
    }
    if (status === 'on_verification' && isCreator) {
      return [
        { value: 'completed', label: 'Завершено' },
        { value: 'in_progress', label: 'В работе (вернуть на доработку)' },
      ];
    }
    if (status === 'overdue' && isCreator) {
      return [
        { value: 'in_progress', label: 'В работе' },
        { value: 'on_verification', label: 'На проверке' },
      ];
    }
    return [];
  }

  if (!selectedTask) {
    return (
      <div className="w-full h-screen flex items-center justify-center text-gray-500">
        <p>Выберите поручение для просмотра деталей</p>
      </div>
    );
  }

  return (
		<div className='w-full h-full'>
			{/* Десктопная версия */}
			<div className="hidden md:flex w-full h-full flex-col">
				<div className='grid grid-cols-7 h-full'>
					{/* Основное содержимое поручения */}
					<div className="col-span-7 md:col-span-5 flex flex-col flex-1 overflow-auto p-8 border-r-2 border-[#E1E3E6] h-full relative">
						{/* Заголовок и статус */}
						<div className="flex flex-row lg:flex-col gap-2 mb-6">
							<p className='text-xl text-[#757D8A]'>Тема</p>
							<h1 className='text-2xl text-[#020817] font-bold'>{selectedTask.title}</h1>
						</div>
						{/* Описание поручения */}
						<div className="flex flex-col gap-3 mt-7">
							<p className='text-xl text-[#757D8A]'>Описание</p>
							<p className="text-xl text-[#020817]">
								{selectedTask.description}
							</p>
						</div>
						
						{/* Чат поручения */}
						<div className="w-full mt-8 pt-4 pb-16">
						{/* Кнопка переключения между обычными и системными сообщениями */}
						<div className="flex justify-end mb-2 px-4 text-[#757D8A] font-thin">
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setShowOnlySystemMessages(!showOnlySystemMessages)}
								className="text-sm gap-2 flex items-center"
							>
								{showOnlySystemMessages ? (
									<>
										<EyeOff size={14} className="flex-shrink-0" />
										<span className="whitespace-nowrap">Показать обычные сообщения</span>
									</>
								) : (
									<>
										<Eye size={14} className="flex-shrink-0" />
										<span className="whitespace-nowrap">Показать системные сообщения</span>
									</>
								)}
							</Button>
						</div>
						
						<div className="h-full overflow-y-auto mb-4 rounded-md pb-16">
							{filteredMessages.map(msg => (
								<div 
								key={msg.id} 
								className={`mb-2 p-2 rounded-md relative pr-12 ${
									msg.sent_by === user.id 
										? 'ml-auto bg-blue-100 max-w-[80%]' 
										: 'mr-auto bg-gray-100 max-w-[80%] sm:mr-0 sm:ml-0'
								} ${
									msg.is_deleted ? 'opacity-50' : ''
								}`}
							>
								{msg.is_deleted ? (
									<div className="text-gray-500 italic">Сообщение удалено</div>
								) : (
									<>
										<div className={`break-all whitespace-pre-wrap ${msg.is_system ? 'w-full text-center' : ''}`}>
											{msg.content}
											
											{msg.files && msg.files.map((file: { name: string | number | boolean | React.ReactElement<any, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode>; type: string; url: string | URL | Request; }, index: React.Key) => (
												<div key={index} className="mt-2 p-2 border border-gray-200 rounded bg-blue-100">
													<div className="flex items-center justify-between">
														<div className="flex items-center">
															<FileIcon size={16} className="mr-2" />
															<span>{file.name}</span>
														</div>
														<div className="flex gap-2 items-center">
															{(file.type.startsWith('image/') || file.name.toLowerCase().endsWith('.pdf')) && (
																<div className="relative group">
																	<button 
																		onClick={() => setViewerFile(file)}
																		className="text-blue-500 hover:text-blue-700 p-1 flex items-center justify-center"
																	>
																		<Eye className="w-4 h-4" />
																	</button>
																	<div className="absolute z-10 top-full left-1/2 transform -translate-x-1/2 mt-1 px-2 py-1 text-xs font-medium text-white bg-gray-800 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
																		Просмотреть
																	</div>
																</div>
															)}
															<div className="relative group">
																<a 
																	href="#" 
																	className="text-blue-500 hover:text-blue-700 p-1 flex items-center justify-center"
																	onClick={async (e) => {
																		e.preventDefault();
																		try {
																			const response = await fetch(file.url);
																			const blob = await response.blob();
																			const url = window.URL.createObjectURL(blob);
																			const link = document.createElement('a');
																			link.href = url;
																			link.download = file.name;
																			document.body.appendChild(link);
																			link.click();
																			document.body.removeChild(link);
																			window.URL.revokeObjectURL(url);
																		} catch (error) {
																			console.error('Download error:', error);
																		}
																	}}
																>
																	<Download size={14} />
																</a>
																<div className="absolute z-10 top-full left-1/2 transform -translate-x-1/2 mt-1 px-2 py-1 text-xs font-medium text-white bg-gray-800 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
																	Скачать
																</div>
															</div>
														</div>
														
													</div>
													
													{file.type.startsWith('image/') && (
														<img 
															src={file.url} 
															alt={file.name}
															className="max-w-full h-auto max-h-40 rounded mt-2 cursor-pointer"
															onClick={() => setViewerFile(file)}
														/>
													)}
												</div>
											))}
										</div>
										
										{/* Кнопка скачивания и удаления (только для своих сообщений) */}
										{msg.sent_by === user.id && !msg.is_system && !msg.is_deleted && (
											<div className="absolute top-1 right-2 flex gap-1">
											<div className="relative group overflow-visible">
												<button 
													onClick={() => handleDeleteMessage(msg.id)}
													className="text-gray-500 hover:text-red-500"
												>
													<Trash2 size={14} />
												</button>
												
											</div>
										</div>
										)}
									</>
								)}
								
								<span className={`text-xs absolute bottom-1 right-2 ${
									msg.sent_by === user.id ? 'text-blue-600' : 'text-gray-600'
								}`}>
									{format(new Date(msg.created_at), 'dd.MM HH:mm')}
								</span>
							</div>
							))}

							{/* Модальное окно для просмотра изображений */}
							<Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
								<DialogContent className="max-w-[90vw] max-h-[90vh] flex items-center justify-center">
									<img 
										src={selectedImage || ''} 
										alt="Увеличенное изображение"
										className="max-w-full max-h-[80vh] object-contain"
									/>
								</DialogContent>
							</Dialog>
							</div>
						</div>
				
							{/* Поле ввода сообщения */}
							{/* Поле ввода сообщения - исправленная версия */}
							<div className="fixed sm:absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-10">
								{/* Отображение выбранных файлов */}
								{selectedFiles.length > 0 && (
									<div className="bg-white p-2 max-h-[200px] overflow-y-auto">
										{selectedFiles.map((file, index) => (
											<div key={index} className="flex items-center justify-between p-1">
												<div className="flex items-center truncate">
													<FileIcon size={16} className="mr-2 text-gray-500" />
													<span className="truncate text-sm">{file.name}</span>
													<span className="text-xs text-gray-500 ml-2">({formatFileSize(file.size)})</span>
												</div>
												<button 
													onClick={() => removeFile(index)}
													className="text-red-500 hover:text-red-700"
												>
													<X size={16} />
												</button>
											</div>
										))}
									</div>
								)}
								
								<div className="flex w-full h-[57px]">
									{/* Кнопка загрузки файла */}
									<label className="flex items-center justify-center px-3 cursor-pointer text-gray-500 hover:text-gray-700">
										<input 
											type="file" 
											ref={fileInputRef}
											className="hidden" 
											onChange={handleFileSelect}
											multiple
											accept="*/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.txt,.zip,.rar"
										/>
										<Paperclip size={20} />
									</label>
									
									<Input 
										value={chatMessage}
										onChange={(e) => setChatMessage(e.target.value)}
										placeholder="Напишите сообщение..."
										className="flex-1 py-[20px] pl-[16px] pr-[30px] outline-none h-full text-[15px] rounded-none bg-[#f6f7fb] border-none"
										onKeyDown={(e) => {
											if (e.key === 'Enter') {
												handleSendChatMessage();
											}
										}}
									/>
									<Button 
										onClick={handleSendChatMessage} 
										className='w-[55px] h-full bg-[#4d76fd] rounded-none'
										disabled={!chatMessage.trim() && !selectedFiles.length}
									>
										<Send size={30} />
									</Button>
								</div>
							</div>

							{/* Отображение выбранных файлов */}
							{selectedFiles.length > 0 && (
								<div className="absolute bottom-[57px] left-0 right-0 bg-white border-t border-gray-200 p-2 max-h-[200px] overflow-y-auto">
									{selectedFiles.map((file, index) => (
										<div key={index} className="flex items-center justify-between p-1">
											<div className="flex items-center truncate">
												<FileIcon size={16} className="mr-2 text-gray-500" />
												<span className="truncate text-sm">{file.name}</span>
												<span className="text-xs text-gray-500 ml-2">({formatFileSize(file.size)})</span>
											</div>
											<button 
												onClick={() => removeFile(index)}
												className="text-red-500 hover:text-red-700"
											>
												<X size={16} />
											</button>
										</div>
									))}
								</div>
							)}
					{viewerFile && (
						<FileViewer 
						file={viewerFile} 
						onClose={() => setViewerFile(null)}
						/>
					)}
					</div>
					{/* Раздел дополнительной информации о задаче */}
					<div className='hidden md:flex col-span-2 flex-col px-4 py-8 gap-12'>
						<div className='w-full flex flex-col gap-2 items-center'>
							<p className='text-xl text-[#757D8A]'>Исполнитель</p>
							<Avatar className="h-[100px] w-[100px]">
								<AvatarImage src={assignee?.image} alt={assignee?.fullname} />
								<AvatarFallback>{assignee?.fullname?.slice(0,2)}</AvatarFallback>
							</Avatar>
							<p className='max-w-[70%] text-center text-[#020817] text-xl line-height-[140%] font-normal uppercase'>{assignee?.fullname}</p>
							<p className='text-[#757D8A] text-base'>{department}</p>
						</div>
						<div className='w-full flex flex-col gap-4 items-center'>
							<div
								className={`flex gap-3 ${selectedTask.priority == "high" ? "text-[#F05D5E]" : "text-[#757D8A]"}`}
							>
								<PriorityIcon />
								{selectedTask.priority == "high" ? "Высокий приоритет" : "Стандартный приоритет"}
							</div>
							<div className='text-[#757D8A] flex gap-3 text-sm'>
								<CalendarIcon />
								{new Date(selectedTask.createdAt).toLocaleDateString('ru-RU', { 
									day: 'numeric', 
									month: 'short', 
									year: 'numeric' 
								})} - {new Date(selectedTask.deadline).toLocaleDateString('ru-RU', { 
									day: 'numeric', 
									month: 'short', 
									year: 'numeric' 
								})}
							</div>
							<div className='hidden bg-[#0DA678] bg-[#D3E0FF] bg-[#BCBCBC] bg-[#EEF4C7] bg-[#FFDFDF] bg-[#FFF2DA] text-[#DA100B] text-[#FFFFFF] text-[#3F79FF] text-[#414141] text-[#0DA678]' /> 
							<button
								className={`flex justify-center gap-4 text-xl font-bold w-full py-4 rounded-[21px] bg-[${bgFromStatus[selectedTask.status]}] text-[${textFromStatus[selectedTask.status]}]`}
								onClick={() => {
									setIsStatusConfirmOpen(true);
									setNextStatus(null);
									setStatusComment('');
								}}
							>
								{iconFromStatus[selectedTask.status]}
								{getStatusLabel(selectedTask.status)}
							</button>
							<Dialog open={isStatusConfirmOpen} onOpenChange={setIsStatusConfirmOpen}>
							<DialogContent>
								<DialogHeader>
									<DialogTitle>Смена статуса поручения</DialogTitle>
								</DialogHeader>
								<div className="py-4">
									<div className="mb-4">
										<Label>Доступные статусы:</Label>
										<div className="flex flex-col gap-2 mt-2">
											{getAvailableStatuses().map(opt => (
												<label key={opt.value} className="flex items-center gap-2">
													<input
														type="radio"
														name="status"
														value={opt.value}
														checked={nextStatus === opt.value}
														onChange={() => setNextStatus(opt.value)}
													/>
													{opt.label}
												</label>
											))}
											{getAvailableStatuses().length === 0 && (
												<span className="text-gray-500 text-sm">Нет доступных статусов для смены</span>
											)}
										</div>
									</div>
									{/* Изменение дедлайна — только для создателя */}
									{user.id === selectedTask.createdBy && (
										<div className="mb-4">
											<Label>Новый дедлайн (опционально)</Label>
											<Input
												type="date"
												value={newDeadline ? format(newDeadline, 'yyyy-MM-dd') : ''}
												onChange={e => setNewDeadline(e.target.value ? new Date(e.target.value) : undefined)}
												min={format(new Date(), 'yyyy-MM-dd')}
											/>
										</div>
									)}
									{/* Комментарий обязателен, если постановщик возвращает задачу на доработку */}
									{selectedTask.status === 'on_verification' && user.id === selectedTask.createdBy && nextStatus === 'in_progress' && (
										<div className="mb-2">
											<Label>Комментарий для исполнителя <span className="text-red-500">*</span></Label>
											<Textarea
												value={statusComment}
												onChange={e => setStatusComment(e.target.value)}
												placeholder="Опишите, что нужно доработать..."
												className="min-h-[80px]"
											/>
										</div>
									)}
								</div>
								<div className="flex justify-end gap-2">
									<Button variant="outline" onClick={() => setIsStatusConfirmOpen(false)}>
										Отмена
									</Button>
									<Button
										onClick={async () => {
											if (!nextStatus) return;
											if (selectedTask.status === 'on_verification' && user.id === selectedTask.createdBy && nextStatus === 'in_progress' && !statusComment.trim()) {
												return;
											}
											// Если возвращаем на доработку, добавить комментарий
											if (selectedTask.status === 'on_verification' && user.id === selectedTask.createdBy && nextStatus === 'in_progress') {
												await updateTaskStatus(selectedTask.id, nextStatus, statusComment, newDeadline);
											} else {
												await updateTaskStatus(selectedTask.id, nextStatus, undefined, newDeadline);
											}
											setIsStatusConfirmOpen(false);
										}}
										disabled={
											!nextStatus ||
											(selectedTask.status === 'on_verification' && user.id === selectedTask.createdBy && nextStatus === 'in_progress' && !statusComment.trim())
										}
									>
										Подтвердить
									</Button>
								</div>
							</DialogContent>
						</Dialog>
						</div>
						<div className='w-full flex flex-col gap-4 items-center'>
							<button
								className={`flex gap-3 ${selectedTask.isProtocol == "active" ? "text-[#3F79FF]" : "text-[#757D8A]"}`}
								onClick={() => {
									// Определяем новое состояние ДО вызова API
									const newProtocolState = selectedTask.isProtocol === 'active' ? 'inactive' : 'active';
									
									// Сразу применяем локальные изменения (оптимистичное обновление)
									selectTask({
										...selectedTask,
										isProtocol: newProtocolState
									});
									
									// Затем вызываем API
									Promise.resolve(toggleProtocol(selectedTask.id, newProtocolState)).catch(() => {
										// В случае ошибки - возвращаем предыдущее состояние
										selectTask({
											...selectedTask,
											isProtocol: selectedTask.isProtocol // исходное значение
										});
									});
								}}
							>
								<ProtocolIcon />
								{selectedTask.isProtocol === "active" ? "Протокол активен" : "Протокол не активен"}
							</button>
							<button className="flex gap-3 text-[#757D8A]" onClick={() => setHistoryOpen(true)}>
								<HistoryIcon />
								История поручения
							</button>
							{/* Диалог для истории */}
							<Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
								<DialogContent className={cn(
									"h-screen max-h-screen fixed left-0 top-0 translate-x-0 translate-y-0 rounded-none border-r",
									"w-full max-w-full", // 100% ширины на мобильных
									"sm:w-[40%] sm:max-w-[40%]", // 40% ширины на десктопе
									"mx-0" // Убираем margin
								)} style={{ margin: 0 }}>
									<DialogHeader>
										<DialogTitle className="text-xl">История поручения</DialogTitle>
									</DialogHeader>
									
									<div className="overflow-y-auto h-[calc(100vh-100px)]">
										<AnimatePresence>
											{
												isLoadingHistory ? (
													<div className="flex justify-center py-8">
														<Loader2 className="h-8 w-8 animate-spin" />
													</div>
												) : taskHistory.length > 0 ? (
												<div className="space-y-4 pr-4">
														{taskHistory.map((task, index) => {
															const isCurrentTask = task.id === selectedTask.id;
															return (
																<motion.div
																	layout
																	key={task.id}
																	initial={{ opacity: 0, y: 20 }}
																	animate={{ opacity: 1, y: 0 }}
																	transition={{ delay: index * 0.1, duration: 0.3 }}
																	className={`p-4 rounded-lg border ${isCurrentTask ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'}`}
																>
																	<div className="flex items-start gap-3">
																		<div className={`h-8 w-8 rounded-full flex items-center justify-center ${isCurrentTask ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
																			{index + 1}
																		</div>
																		<div className="flex-1">
																			<div className="flex items-center justify-between">
																				<h4 className={`font-medium ${isCurrentTask ? 'text-blue-600' : 'text-gray-700'}`}>
																					{task.title}
																				</h4>
																				<span className="text-xs text-gray-500">
																					{formatDateSafe(task.created_at, 'dd.MM.yyyy')}
																				</span>
																			</div>
																			
																			{task.description && (
																				<p className="text-sm text-gray-600 mt-1">
																					{task.description}
																				</p>
																			)}
																			
																			<div className="mt-2 flex flex-wrap gap-2">
																				<span className="text-xs px-2 py-1 bg-gray-100 rounded">
																					{getStatusLabel(task.status)}
																				</span>
																				
																				{task.isProtocol === 'active' && (
																					<span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">
																						Протокольное
																					</span>
																				)}
																				
																				<span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
																					Автор: {task.creator?.fullname}
																				</span>
																				
																				<span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
																					Исполнитель: {task.assignee?.fullname}
																				</span>
																				
																				<span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded">
																					Создано: {formatDateSafe(task.created_at, 'dd.MM.yyyy')}
																				</span>
																				
																				{task.deadline && (
																					<span className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded">
																						Срок: {formatDateSafe(task.deadline, 'dd.MM.yyyy')}
																					</span>
																				)}
																			</div>
																		</div>
																	</div>
																</motion.div>
															);
														})}
												</div>
												) : (
													<div className="text-center py-8 text-gray-500">
														Нет истории изменений
													</div>
												)
											}
										</AnimatePresence>
									</div>
								</DialogContent>
							</Dialog>
							<button className="flex gap-3 text-[#757D8A]" onClick={() => setShowReassign(true)}>
								<ReassignIcon />
								Сменить исполнителя
							</button>
							{/* Кнопка переназначения */}
							<Dialog open={showReassign} onOpenChange={setShowReassign}>
								<DialogContent>
									<DialogHeader>
										<DialogTitle>Переназначить поручение</DialogTitle>
									</DialogHeader>
									<div className="space-y-4 py-4">
										<div className="space-y-2">
											<Label htmlFor="reassign-to">Переназначить <span className="text-red-500">*</span> </Label>
											<Select value={reassignTo} onValueChange={setReassignTo}>
												<SelectTrigger>
													<SelectValue placeholder="Выберите сотрудника" />
												</SelectTrigger>
												<SelectContent>
													{subordinates
														.filter(user => user.id !== selectedTask.assignedTo)
														.map((user) => (
															<SelectItem key={user.id} value={user.id}>
																{user.name || user.fullname}
															</SelectItem>
														))
													}
												</SelectContent>
											</Select>
										</div>
										
										<div className="space-y-2">
											<Label htmlFor="new-title">Новый заголовок (Опционально)</Label>
											<Input 
												id="new-title" 
												placeholder={selectedTask.title}
												value={newTitle}
												onChange={(e) => setNewTitle(e.target.value)}
											/>
										</div>
										
										<div className="space-y-2">
											<Label htmlFor="new-description">Новое описание (Опционально)</Label>
											<Textarea 
												id="new-description" 
												placeholder={selectedTask.description}
												value={newDescription}
												onChange={(e) => setNewDescription(e.target.value)}
											/>
										</div>
										
										<div className="space-y-2">
											<Label>Новый дедлайн (Опционально)</Label>
											<Input 
												type="date"
												value={newDeadline ? format(newDeadline, 'yyyy-MM-dd') : ''}
												onChange={(e) => setNewDeadline(e.target.value ? new Date(e.target.value) : undefined)}
												className="w-full"
												min={format(new Date(), 'yyyy-MM-dd')}
											/>
										</div>
										
										<Button onClick={handleReassign} className="w-full">
											Переназначить поручение
										</Button>
									</div>
								</DialogContent>
							</Dialog>
						</div>
					</div>
				</div>
			</div>

			{/* Мобильная версия */}
			<div className='w-full h-full flex md:hidden flex-col items-center gap-6 bg-[#f7f7f7] p-4 pt-[58px] pb-32 overflow-y-auto'>
				{/* Исполнитель */}
				<div className='w-full bg-white shadow-md rounded-l-[50px] rounded-r-xl pr-2 flex gap-2'>
					<Avatar className="h-[50px] w-[50px]">
						<AvatarImage src={assignee?.image} alt={assignee?.fullname} />
						<AvatarFallback>{assignee?.fullname?.slice(0,2)}</AvatarFallback>
					</Avatar>
					<div className='text-[12px] flex flex-col gap-1 p-1 w-full'>
						<div className='flex-1 flex justify-between text-[#757D8A]'>
							<span>Исполнитель</span>
							<span>{department}</span>
						</div>
						<div className='text-[14px]'>{assignee?.fullname}</div>
					</div>
				</div>
				{/* Основная информация о задаче */}
				<div className='w-full bg-white shadow-md rounded-xl p-2 pb-6 flex flex-col gap-10'>
					<div className='flex flex-col gap-1'>
						<span className='text-[12px] text-[#757D8A]'>Тема</span>
						<h1 className='text-[16px] font-bold'>{selectedTask.title}</h1>
					</div>
					<div className='flex gap-3'>
						{selectedTask.priority == "high" && (
							<div className='text-[#DA100B]'><PriorityIcon /></div>
						)}
						<div className='text-[#757D8A]'>
							{new Date(selectedTask.createdAt).toLocaleDateString('ru-RU', { 
								day: 'numeric', 
								month: 'short', 
								year: 'numeric' 
							})} - {new Date(selectedTask.deadline).toLocaleDateString('ru-RU', { 
								day: 'numeric', 
								month: 'short', 
								year: 'numeric' 
							})}
						</div>
					</div>
					<div className='flex flex-col gap-1'>
						<span className='text-[12px] text-[#757D8A]'>Описание</span>
						<h1 className='text-[16px]'>{selectedTask.description}</h1>
					</div>
				</div>

				{/* Панель управления */}
				<div className='w-1/2 flex justify-between'>
					<button
						className={`flex gap-3 ${selectedTask.isProtocol == "active" ? "text-[#3F79FF]" : "text-[#757D8A]"}`}
						onClick={() => {
							// Определяем новое состояние ДО вызова API
							const newProtocolState = selectedTask.isProtocol === 'active' ? 'inactive' : 'active';
							
							// Сразу применяем локальные изменения (оптимистичное обновление)
							selectTask({
								...selectedTask,
								isProtocol: newProtocolState
							});
							
							// Затем вызываем API
							Promise.resolve(toggleProtocol(selectedTask.id, newProtocolState)).catch(() => {
								// В случае ошибки - возвращаем предыдущее состояние
								selectTask({
									...selectedTask,
									isProtocol: selectedTask.isProtocol // исходное значение
								});
							});
						}}
					>
						<ProtocolIcon />
					</button>
					<button className="flex gap-3 text-[#757D8A]" onClick={() => setHistoryOpen(true)}>
						<HistoryIcon />
					</button>
					{/* Диалог для истории */}
					<Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
						<DialogContent className={cn(
							"h-screen max-h-screen fixed left-0 top-0 translate-x-0 translate-y-0 rounded-none border-r",
							"w-full max-w-full", // 100% ширины на мобильных
							"sm:w-[40%] sm:max-w-[40%]", // 40% ширины на десктопе
							"mx-0" // Убираем margin
						)} style={{ margin: 0 }}>
							<DialogHeader>
								<DialogTitle className="text-xl">История поручения</DialogTitle>
							</DialogHeader>
							
							<div className="overflow-y-auto h-[calc(100vh-100px)]">
								<AnimatePresence>
									{
										isLoadingHistory ? (
											<div className="flex justify-center py-8">
												<Loader2 className="h-8 w-8 animate-spin" />
											</div>
										) : taskHistory.length > 0 ? (
										<div className="space-y-4 pr-4">
												{taskHistory.map((task, index) => {
													const isCurrentTask = task.id === selectedTask.id;
													return (
														<motion.div
															layout
															key={task.id}
															initial={{ opacity: 0, y: 20 }}
															animate={{ opacity: 1, y: 0 }}
															transition={{ delay: index * 0.1, duration: 0.3 }}
															className={`p-4 rounded-lg border ${isCurrentTask ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'}`}
														>
															<div className="flex items-start gap-3">
																<div className={`h-8 w-8 rounded-full flex items-center justify-center ${isCurrentTask ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
																	{index + 1}
																</div>
																<div className="flex-1">
																	<div className="flex items-center justify-between">
																		<h4 className={`font-medium ${isCurrentTask ? 'text-blue-600' : 'text-gray-700'}`}>
																			{task.title}
																		</h4>
																		<span className="text-xs text-gray-500">
																			{formatDateSafe(task.created_at, 'dd.MM.yyyy')}
																		</span>
																	</div>
																	
																	{task.description && (
																		<p className="text-sm text-gray-600 mt-1">
																			{task.description}
																		</p>
																	)}
																	
																	<div className="mt-2 flex flex-wrap gap-2">
																		<span className="text-xs px-2 py-1 bg-gray-100 rounded">
																			{getStatusLabel(task.status)}
																		</span>
																		
																		{task.isProtocol === 'active' && (
																			<span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">
																				Протокольное
																			</span>
																		)}
																		
																		<span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
																			Автор: {task.creator?.fullname}
																		</span>
																		
																		<span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
																			Исполнитель: {task.assignee?.fullname}
																		</span>
																		
																		<span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded">
																			Создано: {formatDateSafe(task.created_at, 'dd.MM.yyyy')}
																		</span>
																		
																		{task.deadline && (
																			<span className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded">
																				Срок: {formatDateSafe(task.deadline, 'dd.MM.yyyy')}
																			</span>
																		)}
																	</div>
																</div>
															</div>
														</motion.div>
													);
												})}
										</div>
										) : (
											<div className="text-center py-8 text-gray-500">
												Нет истории изменений
											</div>
										)
									}
								</AnimatePresence>
							</div>
						</DialogContent>
					</Dialog>
					<button className="flex gap-3 text-[#757D8A]" onClick={() => setShowReassign(true)}>
						<ReassignIcon />
					</button>
					{/* Кнопка переназначения */}
					<Dialog open={showReassign} onOpenChange={setShowReassign}>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>Переназначить поручение</DialogTitle>
							</DialogHeader>
							<div className="space-y-4 py-4">
								<div className="space-y-2">
									<Label htmlFor="reassign-to">Переназначить <span className="text-red-500">*</span> </Label>
									<Select value={reassignTo} onValueChange={setReassignTo}>
										<SelectTrigger>
											<SelectValue placeholder="Выберите сотрудника" />
										</SelectTrigger>
										<SelectContent>
											{subordinates
												.filter(user => user.id !== selectedTask.assignedTo)
												.map((user) => (
													<SelectItem key={user.id} value={user.id}>
														{user.name || user.fullname}
													</SelectItem>
												))
											}
										</SelectContent>
									</Select>
								</div>
								
								<div className="space-y-2">
									<Label htmlFor="new-title">Новый заголовок (Опционально)</Label>
									<Input 
										id="new-title" 
										placeholder={selectedTask.title}
										value={newTitle}
										onChange={(e) => setNewTitle(e.target.value)}
									/>
								</div>
								
								<div className="space-y-2">
									<Label htmlFor="new-description">Новое описание (Опционально)</Label>
									<Textarea 
										id="new-description" 
										placeholder={selectedTask.description}
										value={newDescription}
										onChange={(e) => setNewDescription(e.target.value)}
									/>
								</div>
								
								<div className="space-y-2">
									<Label>Новый дедлайн (Опционально)</Label>
									<Input 
										type="date"
										value={newDeadline ? format(newDeadline, 'yyyy-MM-dd') : ''}
										onChange={(e) => setNewDeadline(e.target.value ? new Date(e.target.value) : undefined)}
										className="w-full"
										min={format(new Date(), 'yyyy-MM-dd')}
									/>
								</div>
								
								<Button onClick={handleReassign} className="w-full">
									Переназначить поручение
								</Button>
							</div>
						</DialogContent>
					</Dialog>
				</div>
				
				{/* Чат */}
				<div className='relative bg-white shadow-md rounded-xl min-h-72 w-full flex flex-col overflow-y-auto p-[10px]'>
					{/* Кнопка переключения между обычными и системными сообщениями */}
					<div className="flex justify-end mb-2 px-4 text-[#757D8A] font-thin">
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setShowOnlySystemMessages(!showOnlySystemMessages)}
							className="text-sm gap-2 flex items-center"
						>
							{showOnlySystemMessages ? (
								<>
									<EyeOff size={14} className="flex-shrink-0" />
									<span className="whitespace-nowrap">Показать обычные сообщения</span>
								</>
							) : (
								<>
									<Eye size={14} className="flex-shrink-0" />
									<span className="whitespace-nowrap">Показать системные сообщения</span>
								</>
							)}
						</Button>
					</div>
					
					<div className="h-full overflow-y-auto mb-4 rounded-md pb-16">
						{filteredMessages.map(msg => (
							<div 
							key={msg.id} 
							className={`mb-2 p-2 rounded-md relative pr-12 ${
								msg.sent_by === user.id 
									? 'ml-auto bg-blue-100 max-w-[80%]' 
									: 'mr-auto bg-gray-100 max-w-[80%] sm:mr-0 sm:ml-0'
							} ${
								msg.is_deleted ? 'opacity-50' : ''
							}`}
						>
							{msg.is_deleted ? (
								<div className="text-gray-500 italic">Сообщение удалено</div>
							) : (
								<>
									<div className={`break-all whitespace-pre-wrap ${msg.is_system ? 'w-full text-center' : ''}`}>
										{msg.content}
										
										{msg.files && msg.files.map((file: { name: string | number | boolean | React.ReactElement<any, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode>; type: string; url: string | URL | Request; }, index: React.Key) => (
											<div key={index} className="mt-2 p-2 border border-gray-200 rounded bg-blue-100">
												<div className="flex items-center justify-between">
													<div className="flex items-center">
														<FileIcon size={16} className="mr-2" />
														<span>{file.name}</span>
													</div>
													<div className="flex gap-2 items-center">
														{(file.type.startsWith('image/') || file.name.toLowerCase().endsWith('.pdf')) && (
															<div className="relative group">
																<button 
																	onClick={() => setViewerFile(file)}
																	className="text-blue-500 hover:text-blue-700 p-1 flex items-center justify-center"
																>
																	<Eye className="w-4 h-4" />
																</button>
																<div className="absolute z-10 top-full left-1/2 transform -translate-x-1/2 mt-1 px-2 py-1 text-xs font-medium text-white bg-gray-800 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
																	Просмотреть
																</div>
															</div>
														)}
														<div className="relative group">
															<a 
																href="#" 
																className="text-blue-500 hover:text-blue-700 p-1 flex items-center justify-center"
																onClick={async (e) => {
																	e.preventDefault();
																	try {
																		const response = await fetch(file.url);
																		const blob = await response.blob();
																		const url = window.URL.createObjectURL(blob);
																		const link = document.createElement('a');
																		link.href = url;
																		link.download = file.name;
																		document.body.appendChild(link);
																		link.click();
																		document.body.removeChild(link);
																		window.URL.revokeObjectURL(url);
																	} catch (error) {
																		console.error('Download error:', error);
																	}
																}}
															>
																<Download size={14} />
															</a>
															<div className="absolute z-10 top-full left-1/2 transform -translate-x-1/2 mt-1 px-2 py-1 text-xs font-medium text-white bg-gray-800 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
																Скачать
															</div>
														</div>
													</div>
													
												</div>
												
												{file.type.startsWith('image/') && (
													<img 
														src={file.url} 
														alt={file.name}
														className="max-w-full h-auto max-h-40 rounded mt-2 cursor-pointer"
														onClick={() => setViewerFile(file)}
													/>
												)}
											</div>
										))}
									</div>
									
									{/* Кнопка скачивания и удаления (только для своих сообщений) */}
									{msg.sent_by === user.id && !msg.is_system && !msg.is_deleted && (
										<div className="absolute top-1 right-2 flex gap-1">
										<div className="relative group overflow-visible">
											<button 
												onClick={() => handleDeleteMessage(msg.id)}
												className="text-gray-500 hover:text-red-500"
											>
												<Trash2 size={14} />
											</button>
											
										</div>
									</div>
									)}
								</>
							)}
							
							<span className={`text-xs absolute bottom-1 right-2 ${
								msg.sent_by === user.id ? 'text-blue-600' : 'text-gray-600'
							}`}>
								{format(new Date(msg.created_at), 'dd.MM HH:mm')}
							</span>
						</div>
						))}

						{/* Модальное окно для просмотра изображений */}
						<Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
							<DialogContent className="max-w-[90vw] max-h-[90vh] flex items-center justify-center">
								<img 
									src={selectedImage || ''} 
									alt="Увеличенное изображение"
									className="max-w-full max-h-[80vh] object-contain"
								/>
							</DialogContent>
						</Dialog>
						</div>
			
						{/* Поле ввода сообщения */}
						{/* Поле ввода сообщения - исправленная версия */}
						<div className="absolute bottom-0 left-0 right-0 bg-[#f7f7f7] border-t border-gray-200 z-10">
							{/* Отображение выбранных файлов */}
							{selectedFiles.length > 0 && (
								<div className="bg-white p-2 max-h-[200px] overflow-y-auto">
									{selectedFiles.map((file, index) => (
										<div key={index} className="flex items-center justify-between p-1">
											<div className="flex items-center truncate">
												<FileIcon size={16} className="mr-2 text-gray-500" />
												<span className="truncate text-sm">{file.name}</span>
												<span className="text-xs text-gray-500 ml-2">({formatFileSize(file.size)})</span>
											</div>
											<button 
												onClick={() => removeFile(index)}
												className="text-red-500 hover:text-red-700"
											>
												<X size={16} />
											</button>
										</div>
									))}
								</div>
							)}
							
							<div className="flex w-full h-[50px]">
								{/* Кнопка загрузки файла */}
								<label className="flex items-center justify-center px-3 cursor-pointer text-[#020817] hover:text-gray-700">
									<input 
										type="file" 
										ref={fileInputRef}
										className="hidden" 
										onChange={handleFileSelect}
										multiple
										accept="*/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.txt,.zip,.rar"
									/>
									<Paperclip size={20} />
								</label>
								
								<input 
									value={chatMessage}
									onChange={(e) => setChatMessage(e.target.value)}
									placeholder="Напишите сообщение..."
									className="border-r-white border-r-4 flex-1 py-[20px] pl-[16px] pr-[30px] outline-none h-full text-[15px] rounded-none bg-[#f6f7fb] border-none"
								/>
								<button 
									onClick={handleSendChatMessage} 
									className='flex justify-center items-center w-[55px] h-full rounded-none bg-[#f7f7f7] text-[#020817] disabled:text-gray-400'
									disabled={!chatMessage.trim() && !selectedFiles.length}
								>
									<Send size={20} />
								</button>
							</div>
						</div>

						{/* Отображение выбранных файлов */}
						{selectedFiles.length > 0 && (
							<div className="absolute bottom-[57px] left-0 right-0 bg-white border-t border-gray-200 p-2 max-h-[200px] overflow-y-auto">
								{selectedFiles.map((file, index) => (
									<div key={index} className="flex items-center justify-between p-1">
										<div className="flex items-center truncate">
											<FileIcon size={16} className="mr-2 text-gray-500" />
											<span className="truncate text-sm">{file.name}</span>
											<span className="text-xs text-gray-500 ml-2">({formatFileSize(file.size)})</span>
										</div>
										<button 
											onClick={() => removeFile(index)}
											className="text-red-500 hover:text-red-700"
										>
											<X size={16} />
										</button>
									</div>
								))}
							</div>
						)}
						{viewerFile && (
							<FileViewer 
							file={viewerFile} 
							onClose={() => setViewerFile(null)}
							/>
						)}
					</div>
				<button
					className={`flex justify-center gap-4 text-xl font-bold w-4/5 py-4 rounded-[21px] bg-[${bgFromStatus[selectedTask.status]}] text-[${textFromStatus[selectedTask.status]}]`}
					onClick={() => {
						setIsStatusConfirmOpen(true);
						setNextStatus(null);
						setStatusComment('');
					}}
				>
					{iconFromStatus[selectedTask.status]}
					{getStatusLabel(selectedTask.status)}
				</button>
				<Dialog open={isStatusConfirmOpen} onOpenChange={setIsStatusConfirmOpen}>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Смена статуса поручения</DialogTitle>
						</DialogHeader>
						<div className="py-4">
							<div className="mb-4">
								<Label>Доступные статусы:</Label>
								<div className="flex flex-col gap-2 mt-2">
									{getAvailableStatuses().map(opt => (
										<label key={opt.value} className="flex items-center gap-2">
											<input
												type="radio"
												name="status"
												value={opt.value}
												checked={nextStatus === opt.value}
												onChange={() => setNextStatus(opt.value)}
											/>
											{opt.label}
										</label>
									))}
									{getAvailableStatuses().length === 0 && (
										<span className="text-gray-500 text-sm">Нет доступных статусов для смены</span>
									)}
								</div>
							</div>
							{/* Изменение дедлайна — только для создателя */}
							{user.id === selectedTask.createdBy && (
								<div className="mb-4">
									<Label>Новый дедлайн (опционально)</Label>
									<Input
										type="date"
										value={newDeadline ? format(newDeadline, 'yyyy-MM-dd') : ''}
										onChange={e => setNewDeadline(e.target.value ? new Date(e.target.value) : undefined)}
										min={format(new Date(), 'yyyy-MM-dd')}
									/>
								</div>
							)}
							{/* Комментарий обязателен, если постановщик возвращает задачу на доработку */}
							{selectedTask.status === 'on_verification' && user.id === selectedTask.createdBy && nextStatus === 'in_progress' && (
								<div className="mb-2">
									<Label>Комментарий для исполнителя <span className="text-red-500">*</span></Label>
									<Textarea
										value={statusComment}
										onChange={e => setStatusComment(e.target.value)}
										placeholder="Опишите, что нужно доработать..."
										className="min-h-[80px]"
									/>
								</div>
							)}
						</div>
						<div className="flex justify-end gap-2">
							<Button variant="outline" onClick={() => setIsStatusConfirmOpen(false)}>
								Отмена
							</Button>
							<Button
								onClick={async () => {
									if (!nextStatus) return;
									if (selectedTask.status === 'on_verification' && user.id === selectedTask.createdBy && nextStatus === 'in_progress' && !statusComment.trim()) {
										return;
									}
									// Если возвращаем на доработку, добавить комментарий
									if (selectedTask.status === 'on_verification' && user.id === selectedTask.createdBy && nextStatus === 'in_progress') {
										await updateTaskStatus(selectedTask.id, nextStatus, statusComment, newDeadline);
									} else {
										await updateTaskStatus(selectedTask.id, nextStatus, undefined, newDeadline);
									}
									setIsStatusConfirmOpen(false);
								}}
								disabled={
									!nextStatus ||
									(selectedTask.status === 'on_verification' && user.id === selectedTask.createdBy && nextStatus === 'in_progress' && !statusComment.trim())
								}
							>
								Подтвердить
							</Button>
						</div>
					</DialogContent>
				</Dialog>
			</div>
		</div>
  );
};

const bgFromStatus = {
	completed: "#0DA678",
	in_progress: "#D3E0FF",
	new: "#BCBCBC",
	on_verification: "#EEF4C7",
	overdue: "#FFDFDF",
}

const textFromStatus = {
	completed: "#FFFFFF",
	in_progress: "#3F79FF",
	new: "#414141",
	on_verification: "#0DA678",
	overdue: "#DA100B",
}

const iconFromStatus = {
	completed: <CompletedIcon />,
	in_progress: <InProgressIcon />,
	new: <NewIcon />,
	on_verification: <OnVerificationIcon />,
	overdue: <OverdueIcon />,
}