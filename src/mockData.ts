
import { supabase } from './supabase/client';
import { User, Department, Task, Message, TaskAction } from './types';

export const currentUser: User = {
  id: '1',
  name: 'Наталья Смирнова',
  email: 'natalie.smith@gmail.com',
  image: '/img/slut.webp',
  role: 'manager'
};

export const users: User[] = [
  currentUser,
  {
    id: '2',
    name: 'Ольга Новак',
    email: 'okla.nowak@gmail.com',
    image: 'https://i.pravatar.cc/150?img=32',
    role: 'employee'
  },
  {
    id: '3',
    name: 'Михаил Иванов',
    email: 'mike.johnson@gmail.com',
    image: 'https://i.pravatar.cc/150?img=33',
    role: 'employee'
  },
  {
    id: '4',
    name: 'Светлана Лебедева',
    email: 'sarah.lee@gmail.com',
    image: 'https://i.pravatar.cc/150?img=20',
    role: 'employee'
  },
  {
    id: '5',
    name: 'Дмитрий Чен',
    email: 'david.chen@gmail.com',
    image: 'https://i.pravatar.cc/150?img=69',
    role: 'employee'
  }
];

export const departments: () => Promise<Department[]> = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  try {
    // Первый запрос для получения данных департаментов
    const { data: departmentsData, error: departmentsError } = await supabase
      .from('departments')
      .select('*');
      
    if (departmentsError) throw departmentsError;
    
    // Для каждого департамента получаем информацию о руководителе
    const departmentsWithManagers = await Promise.all(
      departmentsData.map(async (department) => {
        // Запрос к таблице users для получения имени руководителя
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('fullname')
          .eq('id', department.managerId)
          .limit(1);
          
        if (userError && userError.code !== 'PGRST116') {
          console.error(`Ошибка при получении данных пользователя: ${userError.message}`);
        }
        
        // Добавляем имя руководителя к департаменту и совместимость с managerId
        return {
          ...department,
          managerId: department.managerId, // Для обратной совместимости
          managerName: userData?.[0]?.fullname || 'Не назначен'
        };
      })
    );
    
    return departmentsWithManagers;
  } catch (error) {
    console.error('Ошибка при получении департаментов:', error);
    return [];
  }
};



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
    action: 'status',
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

// Helper function to get department by ID
export const getDepartmentById = async (id: string): Promise<Department | undefined> => {
  const depts = await departments();
  return depts.find(department => department.id === id);
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
export const getDepartmentByUserId = async (userId: string): Promise<Department | undefined> => {
  const userDept = userDepartments.find(ud => ud.userId === userId);
  if (!userDept) return undefined;
  const depts = await departments();
  return depts.find(dept => dept.id === userDept.departmentId);
};
