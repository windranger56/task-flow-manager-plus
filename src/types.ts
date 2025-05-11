
export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role?: 'manager' | 'employee';
}

export interface Department {
  id: string;
  name: string;
  managerId: string;
  color?: string;
}

export type Priority = 'high' | 'medium' | 'low';

export interface Task {
  id: string;
  title: string;
  description: string;
  assignedTo: string;
  createdBy: string;
  departmentId: string;
  priority: Priority;
  isProtocol: boolean;
  createdAt: Date;
  deadline: Date;
  completed: boolean;
}

export interface Message {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  timestamp: Date;
}

export interface TaskAction {
  userId: string;
  action: 'assigned' | 'added' | 'created' | 'completed';
  target?: string;
  timestamp: Date;
}
