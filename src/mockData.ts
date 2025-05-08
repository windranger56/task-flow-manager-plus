
import { User, Department, Task, Message, TaskAction } from './types';

export const currentUser: User = {
  id: '1',
  name: 'Natalie Smith',
  email: 'natalie.smith@gmail.com',
  avatar: '/lovable-uploads/c5169996-d67c-4a43-ace3-c62a65517e9d.png',
  role: 'manager'
};

export const users: User[] = [
  currentUser,
  {
    id: '2',
    name: 'Okla Nowak',
    email: 'okla.nowak@gmail.com',
    avatar: 'https://i.pravatar.cc/150?img=32',
    role: 'employee'
  },
  {
    id: '3',
    name: 'Mike Johnson',
    email: 'mike.johnson@gmail.com',
    avatar: 'https://i.pravatar.cc/150?img=33',
    role: 'employee'
  },
  {
    id: '4',
    name: 'Sarah Lee',
    email: 'sarah.lee@gmail.com',
    avatar: 'https://i.pravatar.cc/150?img=20',
    role: 'employee'
  },
  {
    id: '5',
    name: 'David Chen',
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
    title: 'Write an article about design',
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Fusce accumsan commodo lectus gravida dictum. Aliquam a dui eu arcu hendrerit porta sed in velit. Fusce eu semper magna. Aenean porta facilisis neque, ac dignissim magna vestibulum eu. Etiam id ligula eget neque placerat ultricies in sed neque. Nam vitae rutrum est. Etiam non condimentum ante, eu consequat orci. Aliquam a dui eu arcu hendrerit porta sed in velit. Fusce eu semper magna.',
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
    title: 'Disrupt next level aesthetic raw',
    description: 'Create something that disrupts current design standards with a raw aesthetic approach.',
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
    title: 'Chicharrones craft beer tattooed',
    description: 'Research on the intersection of hipster food trends and craft beer culture.',
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
    title: 'Vaporware readymade shabby',
    description: 'Analyze the trend of vaporware aesthetics in contemporary design.',
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
    title: 'Four dollar toast taxidermy',
    description: 'Investigate the economic implications of artisanal toast pricing across urban centers.',
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
    title: 'Slow-carb disrupt kogi tote bag',
    description: 'Study the impact of dietary trends on fashion accessories in urban environments.',
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
    title: 'Inventory check for Q1',
    description: 'Complete inventory check for first quarter and prepare report.',
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
    title: 'Route optimization for delivery',
    description: 'Analyze and optimize delivery routes for maximum efficiency.',
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
    title: 'Negotiate with new suppliers',
    description: 'Contact and negotiate terms with potential new suppliers.',
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
    userId: '2', // Okla Nowak
    action: 'assigned',
    target: 'Natalie Smith',
    timestamp: new Date(2019, 10, 25) // 25 Nov, 2019
  },
  {
    userId: '2', // Okla Nowak
    action: 'added',
    target: 'Marketing',
    timestamp: new Date(2019, 1, 18) // 18 Feb, 2019
  },
  {
    userId: '2', // Okla Nowak
    action: 'created',
    timestamp: new Date(2019, 1, 18) // 18 Feb, 2019
  },
  {
    userId: '1', // Natalie Smith
    action: 'completed',
    timestamp: new Date(2020, 4, 19) // 19 May, 2020
  }
];

export const messages: Message[] = [
  {
    id: '1',
    taskId: '1',
    userId: '1',
    content: 'How is the article coming along?',
    timestamp: new Date(2019, 1, 23)
  },
  {
    id: '2',
    taskId: '1',
    userId: '2',
    content: "I've finished the first draft, will send it over for review by tomorrow.",
    timestamp: new Date(2019, 1, 23)
  },
  {
    id: '3',
    taskId: '1',
    userId: '1',
    content: 'Great! Looking forward to it.',
    timestamp: new Date(2019, 1, 24)
  }
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
