export interface User {
  id: string;
  fullname: string;
  email: string;
  image: string;
  role?: string;
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
export type TaskStatus = 'completed' | 'in_progress' | 'overdue' | 'new' | 'on_verification';

export interface Task {
  id: string;
  title: string;
  description: string;
  assignedTo: string;
  createdBy: string;
  departmentId: string;
  parentId:string;
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

export interface ExportFilters {
  startDate?: Date;
  endDate?: Date;
  assigneeId?: string; // Keeping for backward compatibility
  selectedDepartments?: string[]; // ID выбранных департаментов
  selectedExecutors?: string[];   // ID выбранных исполнителей
  approvedBy?: string;
  approvedByPosition?: string;
  protocolName?: string;
  protocolAuthor?: string;
  protocolAuthorPosition?: string;
}
