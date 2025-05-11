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
  managerName?: string;
  color: string;
}

export type Priority = 'high' | 'medium' | 'low';

// Кастомный тип для статуса протокола
export type ProtocolStatus = 'active' | 'inactive' | 'pending';

// Кастомный тип для статуса задачи
export type TaskStatus = 'completed' | 'in_progress' | 'overdue';

export interface Task {
  id: string;
  title: string;
  description: string;
  assignedTo: string;
  createdBy: string;
  departmentId: string;
  priority: Priority;
  isProtocol: ProtocolStatus; // Используем кастомный тип вместо boolean
  createdAt: Date;
  deadline: Date;
  status: TaskStatus; // Используем кастомный тип вместо boolean
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
  action: 'assigned' | 'added' | 'created' | 'status';
  target?: string;
  timestamp: Date;
}
