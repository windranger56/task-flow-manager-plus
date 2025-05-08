
import React, { useState } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, ChevronDown, ChevronUp, Plus, X } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useTaskContext } from '@/contexts/TaskContext';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  Drawer, 
  DrawerContent,
  DrawerClose,
} from '@/components/ui/drawer';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import TaskDetail from './TaskDetail';

export default function TaskList() {
  const { 
    tasks, 
    departments, 
    selectedDepartment,
    selectTask,
    users,
    selectedTask,
    addTask
  } = useTaskContext();
  
  const [showNewTask, setShowNewTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskAssignee, setTaskAssignee] = useState("");
  const [taskDepartment, setTaskDepartment] = useState("");
  const [taskPriority, setTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [taskProtocol, setTaskProtocol] = useState(false);
  const [taskDeadline, setTaskDeadline] = useState<Date>(new Date());
  
  const isMobile = useIsMobile();
  const [showTaskDetail, setShowTaskDetail] = useState(false);
  
  const handleTaskClick = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      selectTask(task);
      if (isMobile) {
        setShowTaskDetail(true);
      }
    }
  };
  
  const handleCreateTask = () => {
    if (taskTitle && taskDescription && taskAssignee && taskDepartment && taskDeadline) {
      addTask(
        taskTitle, 
        taskDescription, 
        taskAssignee, 
        taskDepartment, 
        taskPriority,
        taskProtocol, 
        taskDeadline
      );
      
      // Reset form
      setTaskTitle("");
      setTaskDescription("");
      setTaskAssignee("");
      setTaskDepartment("");
      setTaskPriority('medium');
      setTaskProtocol(false);
      setTaskDeadline(new Date());
      setShowNewTask(false);
    }
  };
  
  // Группируем задачи по подразделениям
  const tasksByDepartment = departments.map(department => {
    return {
      department,
      tasks: tasks.filter(task => task.departmentId === department.id)
    };
  });
  
  return (
    <div className="h-full flex flex-col relative">
      
      {/* Task List by Departments */}
      <div className="flex-1 overflow-auto">
        <Accordion type="multiple" className="w-full">
          {tasksByDepartment.map(({ department, tasks }) => (
            <AccordionItem key={department.id} value={department.id} className='relative'>
              <AccordionTrigger className="px-[25px] py-[20px] bg-[#f9f9fb] hover:bg-white hover:no-underline">
                <div className="flex items-center">
                  <div 
                    className="w-[4px] h-full absolute left-0 bottom-0"
                    style={{ backgroundColor: department.color }}
                  />
                  <span className='font-semibold text-[16px]'>{department.name}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <ul className="divide-y divide-gray-200">
                  {tasks.map((task) => (
                    <li 
                      key={task.id}
                      className={cn(
                        "p-[20px] cursor-pointer hover:bg-gray-50",
                        selectedTask?.id === task.id && "bg-gray-50"
                      )}
                      onClick={() => handleTaskClick(task.id)}
                    >
                      <div className="flex justify-between">
                        <div className="flex items-center gap-[10px]">
													{task.completed ? (
														<div className="flex justify-center items-center bg-taskBlue text-white rounded-full h-[24px] w-[24px]">
															<Check className="h-3 w-3" />
														</div>
													) : (
														<div className="rounded-full h-[24px] w-[24px] border-[#7a7e9d] border-[2px]" />
													)}
                          <div>
                            <h3 className="text-sm font-medium mb-1">{task.title}</h3>
														<p className='text-[#a1a4b9]'>22 Feb, 2019</p>
                          </div>
                        </div>
												<div className='bg-gray-200 rounded-full w-[32px] h-[32px]' />
                      </div>
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
      
      {/* Mobile Task Detail Drawer */}
      {isMobile && selectedTask && (
        <Drawer open={showTaskDetail} onOpenChange={setShowTaskDetail}>
          <DrawerContent className="h-[100vh] max-h-[100vh]">
            <div className="relative h-full">
              <DrawerClose className="absolute right-4 top-4 z-50">
                <X className="h-6 w-6" />
              </DrawerClose>
              <div className="px-4 py-2 h-full overflow-auto">
                <TaskDetail />
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      )}

			{/* Add task */}
			<div className='h-[57px] bg-[#f9f9fb] border-[#e5e4e9] border-t flex justify-center items-center'>
				<Dialog open={showNewTask} onOpenChange={setShowNewTask}>
          <DialogTrigger asChild>
            <Button className='rounded-full bg-[#4d76fd] hover:bg-[#4264d5] text-[14px] text-white font-semibold py-[8px] px-[26px]'>
              <span>Добавить задачу</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Создать новую задачу</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="task-title">Заголовок</Label>
                <Input 
                  id="task-title" 
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="task-description">Описание</Label>
                <Textarea 
                  id="task-description" 
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="task-assignee">Исполнитель</Label>
                <Select value={taskAssignee} onValueChange={setTaskAssignee}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите исполнителя" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="task-department">Подразделение</Label>
                <Select value={taskDepartment} onValueChange={setTaskDepartment}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите подразделение" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((department) => (
                      <SelectItem key={department.id} value={department.id}>
                        {department.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="task-priority">Приоритет</Label>
                <Select 
                  value={taskPriority} 
                  onValueChange={(value) => setTaskPriority(value as 'low' | 'medium' | 'high')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Низкий</SelectItem>
                    <SelectItem value="medium">Средний</SelectItem>
                    <SelectItem value="high">Высокий</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="task-protocol" 
                  checked={taskProtocol}
                  onCheckedChange={(checked) => setTaskProtocol(checked === true)}
                />
                <Label htmlFor="task-protocol">Добавить в протокол</Label>
              </div>
              
              <div className="space-y-2">
                <Label>Дедлайн</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left">
                      {taskDeadline ? (
                        format(taskDeadline, 'PPP', { locale: ru })
                      ) : (
                        <span>Выберите дату</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={taskDeadline}
                      onSelect={(date) => setTaskDeadline(date || new Date())}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <Button onClick={handleCreateTask} className="w-full">
                Создать задачу
              </Button>
            </div>
          </DialogContent>
        </Dialog>
			</div>
    </div>
  );
}
