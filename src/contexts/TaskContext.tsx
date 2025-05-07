
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { 
  User, 
  Department, 
  Task, 
  Message, 
  Priority 
} from '../types';
import { 
  currentUser, 
  users, 
  departments as initialDepartments, 
  tasks as initialTasks, 
  messages as initialMessages,
  getUserById,
  getDepartmentById,
  getMessagesByTask,
  getTasksByDepartment,
  getSubordinates
} from '../mockData';
import { toast } from '@/components/ui/use-toast';

interface TaskContextType {
  // Data
  currentUser: User;
  users: User[];
  departments: Department[];
  tasks: Task[];
  messages: Message[];
  
  // Selected items
  selectedDepartment: Department | null;
  selectedTask: Task | null;
  
  // Actions
  selectDepartment: (department: Department | null) => void;
  selectTask: (task: Task | null) => void;
  addDepartment: (name: string, managerId: string) => void;
  addTask: (
    title: string,
    description: string,
    assignedTo: string,
    departmentId: string,
    priority: Priority,
    isProtocol: boolean,
    deadline: Date
  ) => void;
  completeTask: (taskId: string) => void;
  deleteTask: (taskId: string) => void;
  reassignTask: (taskId: string, newAssigneeId: string, newTitle?: string, newDescription?: string, newDeadline?: Date) => void;
  toggleProtocol: (taskId: string) => void;
  addMessage: (taskId: string, content: string) => void;
  searchTasks: (query: string) => Task[];
  
  // Helper functions
  getUserById: (id: string) => User | undefined;
  getDepartmentById: (id: string) => Department | undefined;
  getTasksByDepartment: (departmentId: string) => Task[];
  getMessagesByTask: (taskId: string) => Message[];
  getSubordinates: () => User[];
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export function TaskProvider({ children }: { children: ReactNode }) {
  const [departments, setDepartments] = useState<Department[]>(initialDepartments);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const selectDepartment = (department: Department | null) => {
    setSelectedDepartment(department);
    setSelectedTask(null);
  };

  const selectTask = (task: Task | null) => {
    setSelectedTask(task);
  };

  const addDepartment = (name: string, managerId: string) => {
    const newDepartment: Department = {
      id: `dep-${Date.now()}`,
      name: name.toUpperCase(),
      managerId,
      color: getRandomColor()
    };
    
    setDepartments([...departments, newDepartment]);
    toast({ title: "Department added", description: `${name} has been added to departments.` });
  };

  const addTask = (
    title: string,
    description: string,
    assignedTo: string,
    departmentId: string,
    priority: Priority,
    isProtocol: boolean,
    deadline: Date
  ) => {
    const newTask: Task = {
      id: `task-${Date.now()}`,
      title,
      description,
      assignedTo,
      createdBy: currentUser.id,
      departmentId,
      priority,
      isProtocol,
      createdAt: new Date(),
      deadline,
      completed: false
    };
    
    setTasks([...tasks, newTask]);
    toast({ title: "Task added", description: "New task has been created." });
  };

  const completeTask = (taskId: string) => {
    setTasks(
      tasks.map(task => 
        task.id === taskId ? { ...task, completed: true } : task
      )
    );
    toast({ title: "Task completed", description: "Task marked as completed." });
  };

  const deleteTask = (taskId: string) => {
    setTasks(tasks.filter(task => task.id !== taskId));
    
    if (selectedTask && selectedTask.id === taskId) {
      setSelectedTask(null);
    }
    
    toast({ title: "Task deleted", description: "Task has been deleted." });
  };

  const reassignTask = (taskId: string, newAssigneeId: string, newTitle?: string, newDescription?: string, newDeadline?: Date) => {
    // Find the task to reassign
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    // Create a new task based on the original one
    const newTask: Task = {
      id: `task-${Date.now()}`,
      title: newTitle || task.title,
      description: newDescription || task.description,
      assignedTo: newAssigneeId,
      createdBy: currentUser.id,
      departmentId: task.departmentId,
      priority: task.priority,
      isProtocol: task.isProtocol,
      createdAt: new Date(),
      deadline: newDeadline || task.deadline,
      completed: false
    };
    
    setTasks([...tasks, newTask]);
    toast({ 
      title: "Task reassigned", 
      description: `Task has been reassigned to ${getUserById(newAssigneeId)?.name}.` 
    });
  };

  const toggleProtocol = (taskId: string) => {
    setTasks(
      tasks.map(task => 
        task.id === taskId ? { ...task, isProtocol: !task.isProtocol } : task
      )
    );
    
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      const action = task.isProtocol ? "removed from" : "marked as";
      toast({ title: `Protocol status updated`, description: `Task ${action} protocol.` });
    }
  };

  const addMessage = (taskId: string, content: string) => {
    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      taskId,
      userId: currentUser.id,
      content,
      timestamp: new Date()
    };
    
    setMessages([...messages, newMessage]);
  };

  const searchTasks = (query: string) => {
    if (!query) return [];
    
    const searchTerm = query.toLowerCase();
    return tasks.filter(task => 
      task.title.toLowerCase().includes(searchTerm) ||
      task.description.toLowerCase().includes(searchTerm)
    );
  };

  const getRandomColor = () => {
    const colors = ['#4CAF50', '#2196F3', '#FFC107', '#F44336', '#9C27B0', '#00BCD4'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  return (
    <TaskContext.Provider
      value={{
        currentUser,
        users,
        departments,
        tasks,
        messages,
        selectedDepartment,
        selectedTask,
        selectDepartment,
        selectTask,
        addDepartment,
        addTask,
        completeTask,
        deleteTask,
        reassignTask,
        toggleProtocol,
        addMessage,
        searchTasks,
        getUserById,
        getDepartmentById,
        getTasksByDepartment,
        getMessagesByTask,
        getSubordinates
      }}
    >
      {children}
    </TaskContext.Provider>
  );
}

export function useTaskContext() {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTaskContext must be used within a TaskProvider');
  }
  return context;
}
