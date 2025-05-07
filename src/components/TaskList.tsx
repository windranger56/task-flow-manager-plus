
import React, { useState } from 'react';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, ChevronDown, Plus } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { useTaskContext } from '@/contexts/TaskContext';
import { cn } from '@/lib/utils';
import { Priority } from '@/types';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  Drawer, 
  DrawerContent, 
  DrawerTrigger 
} from '@/components/ui/drawer';
import TaskDetail from './TaskDetail';

export default function TaskList() {
  const { 
    selectedDepartment, 
    tasks, 
    selectTask, 
    selectedTask,
    getUserById, 
    departments,
    getTasksByDepartment,
    addTask,
    users
  } = useTaskContext();
  
  const isMobile = useIsMobile();
  const [showAddTask, setShowAddTask] = useState(false);
  const [showTaskDetail, setShowTaskDetail] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');
  const [newTaskDepartment, setNewTaskDepartment] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>('medium');
  const [newTaskIsProtocol, setNewTaskIsProtocol] = useState(false);
  const [newTaskDeadline, setNewTaskDeadline] = useState<Date>(new Date());
  
  const departmentTasks = selectedDepartment 
    ? getTasksByDepartment(selectedDepartment.id) 
    : [];
  
  const handleAddTask = () => {
    if (
      newTaskTitle && 
      newTaskAssignee && 
      newTaskDepartment
    ) {
      addTask(
        newTaskTitle,
        newTaskDescription,
        newTaskAssignee,
        newTaskDepartment,
        newTaskPriority,
        newTaskIsProtocol,
        newTaskDeadline
      );
      
      // Reset form
      setNewTaskTitle('');
      setNewTaskDescription('');
      setNewTaskAssignee('');
      setNewTaskDepartment('');
      setNewTaskPriority('medium');
      setNewTaskIsProtocol(false);
      setNewTaskDeadline(new Date());
      setShowAddTask(false);
    }
  };

  const handleTaskClick = (task: any) => {
    selectTask(task);
    if (isMobile) {
      setShowTaskDetail(true);
    }
  };

  return (
    <div className="flex flex-col h-full border-r border-gray-200">
      {/* Content */}
      <div className="flex-1 overflow-auto">
        {selectedDepartment ? (
          <>
            {/* Department Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-medium">{selectedDepartment.name}</h2>
              <Button variant="ghost" size="sm">
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Tasks */}
            <div className="divide-y divide-gray-100">
              {departmentTasks.map((task) => {
                const assignee = getUserById(task.assignedTo);
                return isMobile ? (
                  <Drawer key={task.id} open={showTaskDetail && selectedTask?.id === task.id} onOpenChange={setShowTaskDetail}>
                    <DrawerTrigger asChild>
                      <div 
                        className={cn(
                          "p-4 cursor-pointer hover:bg-gray-50 flex items-center",
                          task.completed ? "bg-gray-50" : ""
                        )}
                        onClick={() => handleTaskClick(task)}
                      >
                        <div className="mr-3">
                          {task.completed ? (
                            <div className="h-6 w-6 bg-taskBlue rounded-full flex items-center justify-center">
                              <Check className="h-4 w-4 text-white" />
                            </div>
                          ) : (
                            <div className="h-6 w-6 border-2 border-gray-200 rounded-full"></div>
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className={cn(
                            "font-medium", 
                            task.completed ? "text-gray-400" : ""
                          )}>
                            {task.title}
                          </h4>
                          <p className="text-xs text-gray-500">
                            {format(task.createdAt, 'dd MMM, yyyy')}
                          </p>
                        </div>
                        {assignee && (
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={assignee.avatar} alt={assignee.name} />
                            <AvatarFallback>{assignee.name.slice(0, 2)}</AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    </DrawerTrigger>
                    <DrawerContent className="h-[85vh]">
                      <div className="px-4 py-2">
                        <TaskDetail />
                      </div>
                    </DrawerContent>
                  </Drawer>
                ) : (
                  <div 
                    key={task.id}
                    className={cn(
                      "p-4 cursor-pointer hover:bg-gray-50 flex items-center",
                      task.completed ? "bg-gray-50" : ""
                    )}
                    onClick={() => selectTask(task)}
                  >
                    <div className="mr-3">
                      {task.completed ? (
                        <div className="h-6 w-6 bg-taskBlue rounded-full flex items-center justify-center">
                          <Check className="h-4 w-4 text-white" />
                        </div>
                      ) : (
                        <div className="h-6 w-6 border-2 border-gray-200 rounded-full"></div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className={cn(
                        "font-medium", 
                        task.completed ? "text-gray-400" : ""
                      )}>
                        {task.title}
                      </h4>
                      <p className="text-xs text-gray-500">
                        {format(task.createdAt, 'dd MMM, yyyy')}
                      </p>
                    </div>
                    {assignee && (
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={assignee.avatar} alt={assignee.name} />
                        <AvatarFallback>{assignee.name.slice(0, 2)}</AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <p>Select a department to view tasks</p>
          </div>
        )}
      </div>
      
      {/* Add Task Button */}
      <div className="p-4 border-t border-gray-200">
        <Dialog open={showAddTask} onOpenChange={setShowAddTask}>
          <DialogTrigger asChild>
            <Button className="w-full bg-taskBlue hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" /> Add task
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add New Task</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="task-assignee">Assign to</Label>
                <Select value={newTaskAssignee} onValueChange={setNewTaskAssignee}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
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
              
              <div className="grid gap-2">
                <Label htmlFor="task-priority">Priority</Label>
                <Select 
                  value={newTaskPriority} 
                  onValueChange={(value) => setNewTaskPriority(value as Priority)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="protocol" 
                  checked={newTaskIsProtocol}
                  onCheckedChange={(checked) => 
                    setNewTaskIsProtocol(checked as boolean)
                  }
                />
                <Label htmlFor="protocol">Protocol task</Label>
              </div>
              
              <div className="grid gap-2">
                <Label>Current Date</Label>
                <Input 
                  value={format(new Date(), 'PPP')} 
                  disabled 
                />
              </div>
              
              <div className="grid gap-2">
                <Label>Deadline</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start text-left"
                    >
                      {newTaskDeadline ? (
                        format(newTaskDeadline, 'PPP')
                      ) : (
                        <span>Select deadline date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 pointer-events-auto">
                    <Calendar
                      mode="single"
                      selected={newTaskDeadline}
                      onSelect={(date) => date && setNewTaskDeadline(date)}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="task-department">Department</Label>
                <Select value={newTaskDepartment} onValueChange={setNewTaskDepartment}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
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
              
              <div className="grid gap-2">
                <Label htmlFor="task-title">Task Title</Label>
                <Input 
                  id="task-title" 
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="task-description">Description</Label>
                <Input 
                  id="task-description" 
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                />
              </div>
              
              <Button onClick={handleAddTask}>
                Add Task
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
