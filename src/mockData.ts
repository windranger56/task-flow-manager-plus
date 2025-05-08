
import { User, Department, Task, Message, TaskAction } from './types';

export const currentUser: User = {
  id: '1',
  name: 'Наталья Смирнова',
  email: 'natalie.smith@gmail.com',
  avatar: '/lovable-uploads/c5169996-d67c-4a43-ace3-c62a65517e9d.png',
  role: 'manager'
};

export const users: User[] = [
  currentUser,
  {
    id: '2',
    name: 'Ольга Новак',
    email: 'okla.nowak@gmail.com',
    avatar: 'https://i.pravatar.cc/150?img=32',
    role: 'employee'
  },
  {
    id: '3',
    name: 'Михаил Иванов',
    email: 'mike.johnson@gmail.com',
    avatar: 'https://i.pravatar.cc/150?img=33',
    role: 'employee'
  },
  {
    id: '4',
    name: 'Светлана Лебедева',
    email: 'sarah.lee@gmail.com',
    avatar: 'https://i.pravatar.cc/150?img=20',
    role: 'employee'
  },
  {
    id: '5',
    name: 'Дмитрий Чен',
    email: 'david.chen@gmail.com',
    avatar: 'https://i.pravatar.cc/150?img=69',
    role: 'employee'
  }
];

export const departments: Department[] = [
  {
    id: '1',
    name: 'ПРОЕКТНЫЙ КОНТРОЛЬ',
    managerId: '1',
    color: '#7E69AB'
  },
  {
    id: '2',
    name: 'КОНТРОЛЬ ПОСТАВОК',
    managerId: '1',
    color: '#4CAF50'
  },
  {
    id: '3',
    name: 'ЛОГИСТИКА',
    managerId: '1',
    color: '#FFC107'
  },
  {
    id: '4',
    name: 'ЗАКУПКИ',
    managerId: '1',
    color: '#F44336'
  }
];

export const tasks: Task[] = [
  {
    id: '1',
    title: 'Написать статью о дизайне',
    description: 'Необходимо написать детальную статью о современных трендах в дизайне интерфейсов с примерами и рекомендациями для начинающих дизайнеров. Статья должна включать разделы о цветовых решениях, типографике, микроанимации и адаптивном дизайне.',
    assignedTo: '2',
    createdBy: '1',
    departmentId: '1',
    priority: 'high',
    isProtocol: false,
    createdAt: new Date(2019, 1, 22),
    deadline: new Date(2019, 1, 28),
    completed: true
  },
  {
    id: '2',
    title: 'Разработать инновационный подход',
    description: 'Создать что-то, что нарушает текущие стандарты дизайна с необработанным эстетическим подходом.',
    assignedTo: '3',
    createdBy: '1',
    departmentId: '1',
    priority: 'medium',
    isProtocol: false,
    createdAt: new Date(2019, 1, 22),
    deadline: new Date(2019, 2, 15),
    completed: false
  },
  {
    id: '3',
    title: 'Исследовать современные тренды',
    description: 'Исследование на пересечении трендов хипстерской еды и культуры крафтового пива.',
    assignedTo: '4',
    createdBy: '1',
    departmentId: '1',
    priority: 'low',
    isProtocol: true,
    createdAt: new Date(2019, 1, 22),
    deadline: new Date(2019, 3, 1),
    completed: true
  },
  {
    id: '4',
    title: 'Анализ эстетики вейпорвейва',
    description: 'Анализ тенденции эстетики вейпорвейва в современном дизайне.',
    assignedTo: '5',
    createdBy: '1',
    departmentId: '1',
    priority: 'medium',
    isProtocol: false,
    createdAt: new Date(2019, 1, 22),
    deadline: new Date(2019, 2, 20),
    completed: false
  },
  {
    id: '5',
    title: 'Экономический анализ тостов',
    description: 'Исследовать экономические последствия ценообразования на артезиальные тосты в городских центрах.',
    assignedTo: '2',
    createdBy: '1',
    departmentId: '1',
    priority: 'high',
    isProtocol: false,
    createdAt: new Date(2019, 1, 22),
    deadline: new Date(2019, 3, 10),
    completed: false
  },
  {
    id: '6',
    title: 'Влияние диетических трендов',
    description: 'Изучить влияние диетических тенденций на модные аксессуары в городской среде.',
    assignedTo: '3',
    createdBy: '1',
    departmentId: '1',
    priority: 'low',
    isProtocol: false,
    createdAt: new Date(2019, 1, 22),
    deadline: new Date(2019, 2, 28),
    completed: false
  },
  {
    id: '7',
    title: 'Проверка инвентаря за Q1',
    description: 'Завершить проверку инвентаря за первый квартал и подготовить отчет.',
    assignedTo: '4',
    createdBy: '1',
    departmentId: '2',
    priority: 'high',
    isProtocol: true,
    createdAt: new Date(2019, 1, 22),
    deadline: new Date(2019, 3, 31),
    completed: false
  },
  {
    id: '8',
    title: 'Оптимизация маршрутов доставки',
    description: 'Анализ и оптимизация маршрутов доставки для максимальной эффективности.',
    assignedTo: '5',
    createdBy: '1',
    departmentId: '3',
    priority: 'medium',
    isProtocol: false,
    createdAt: new Date(2019, 1, 22),
    deadline: new Date(2019, 2, 15),
    completed: false
  },
  {
    id: '9',
    title: 'Переговоры с новыми поставщиками',
    description: 'Связаться и договориться об условиях с потенциальными новыми поставщиками.',
    assignedTo: '2',
    createdBy: '1',
    departmentId: '4',
    priority: 'high',
    isProtocol: true,
    createdAt: new Date(2019, 1, 22),
    deadline: new Date(2019, 3, 1),
    completed: false
  }
];

export const taskActions: TaskAction[] = [
  {
    userId: '2', // Ольга Новак
    action: 'assigned',
    target: 'Наталья Смирнова',
    timestamp: new Date(2019, 10, 25) // 25 Ноя, 2019
  },
  {
    userId: '2', // Ольга Новак
    action: 'added',
    target: 'Маркетинг',
    timestamp: new Date(2019, 1, 18) // 18 Фев, 2019
  },
  {
    userId: '2', // Ольга Новак
    action: 'created',
    timestamp: new Date(2019, 1, 18) // 18 Фев, 2019
  },
  {
    userId: '1', // Наталья Смирнова
    action: 'completed',
    timestamp: new Date(2020, 4, 19) // 19 Май, 2020
  }
];

export const messages: Message[] = [
  {
    id: '1',
    taskId: '1',
    userId: '1',
    content: 'Как продвигается статья?',
    timestamp: new Date(2019, 1, 23)
  },
  {
    id: '2',
    taskId: '1',
    userId: '2',
    content: "Я закончила первый черновик, отправлю на проверку завтра.",
    timestamp: new Date(2019, 1, 23)
  },
  {
    id: '3',
    taskId: '1',
    userId: '1',
    content: 'Отлично! Жду с нетерпением.',
    timestamp: new Date(2019, 1, 24)
  }
];

// Mapping of which users belong to which departments for the mock data
const userDepartments: {userId: string, departmentId: string}[] = [
  { userId: '2', departmentId: '1' },
  { userId: '3', departmentId: '2' },
  { userId: '4', departmentId: '3' },
  { userId: '5', departmentId: '4' },
];

// Helper function to get user by ID
export const getUserById = (id: string): User | undefined => {
  return users.find(user => user.id === id);
};

// Helper function to get tasks by department
export const getTasksByDepartment = (departmentId: string): Task[] => {
  return tasks.filter(task => task.departmentId === departmentId);
};

// Helper function to get department by ID
export const getDepartmentById = (id: string): Department | undefined => {
  return departments.find(department => department.id === id);
};

// Helper function to get messages by task
export const getMessagesByTask = (taskId: string): Message[] => {
  return messages.filter(message => message.taskId === taskId);
};

// Helper function to get subordinates for current user
export const getSubordinates = (): User[] => {
  // In a real app, you would filter based on reporting relationships
  // For this mock, we'll return all users except the current user
  return users.filter(user => user.id !== currentUser.id);
};

// Helper function to get department by user ID
export const getDepartmentByUserId = (userId: string): Department | undefined => {
  const userDept = userDepartments.find(ud => ud.userId === userId);
  if (!userDept) return undefined;
  return departments.find(dept => dept.id === userDept.departmentId);
};
