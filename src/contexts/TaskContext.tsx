
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
  addDepartment: (name: string, managerId: string, userIds?: string[]) => void;
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
  getDepartmentByUserId: (userId: string) => Department | undefined;
  getTasksByDepartment: (departmentId: string) => Task[];
  getMessagesByTask: (taskId: string) => Message[];
  getSubordinates: () => User[];
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export function TaskProvider({ children }: { children: ReactNode }) {
  const [departments, setDepartments] = useState<Department[]>(initialDepartments);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [userDepartments, setUserDepartments] = useState<{userId: string, departmentId: string}[]>([
    { userId: '2', departmentId: '1' },
    { userId: '3', departmentId: '2' },
    { userId: '4', departmentId: '3' },
    { userId: '5', departmentId: '4' },
  ]);
  
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const selectDepartment = (department: Department | null) => {
    setSelectedDepartment(department);
    setSelectedTask(null);
  };

  const selectTask = (task: Task | null) => {
    setSelectedTask(task);
  };

  const addDepartment = (name: string, managerId: string, userIds: string[] = []) => {
    const newDepartment: Department = {
      id: `dep-${Date.now()}`,
      name: name.toUpperCase(),
      managerId,
      color: getRandomColor()
    };
    
    setDepartments([...departments, newDepartment]);
    
    // Assign users to the new department
    const newUserDepartments = [...userDepartments];
    userIds.forEach(userId => {
      // Remove user from old department if exists
      const index = newUserDepartments.findIndex(ud => ud.userId === userId);
      if (index !== -1) {
        newUserDepartments.splice(index, 1);
      }
      
      // Add user to new department
      newUserDepartments.push({ userId, departmentId: newDepartment.id });
    });
    
    setUserDepartments(newUserDepartments);
    
    toast({ title: "Подразделение добавлено", description: `${name} добавлено в подразделения.` });
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
    toast({ title: "Задача добавлена", description: "Новая задача создана." });
  };

  const completeTask = (taskId: string) => {
    setTasks(
      tasks.map(task => 
        task.id === taskId ? { ...task, completed: true } : task
      )
    );
    toast({ title: "Задача выполнена", description: "Задача отмечена как выполненная." });
  };

  const deleteTask = (taskId: string) => {
    setTasks(tasks.filter(task => task.id !== taskId));
    
    if (selectedTask && selectedTask.id === taskId) {
      setSelectedTask(null);
    }
    
    toast({ title: "Задача удалена", description: "Задача была удалена." });
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
      title: "Задача переназначена", 
      description: `Задача переназначена на ${getUserById(newAssigneeId)?.name}.` 
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
      const action = task.isProtocol ? "удалена из" : "добавлена в";
      toast({ title: `Статус протокола обновлен`, description: `Задача ${action} протокол.` });
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

  const getDepartmentByUserId = (userId: string): Department | undefined => {
    const userDept = userDepartments.find(ud => ud.userId === userId);
    if (!userDept) return undefined;
    return departments.find(dept => dept.id === userDept.departmentId);
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
        getDepartmentByUserId,
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
