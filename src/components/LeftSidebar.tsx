import React, { useState, useEffect } from 'react';
import { useTaskContext } from '@/contexts/TaskContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

export default function LeftSidebar() {
  const { 
    departments, 
    selectedDepartment, 
    selectDepartment, 
    tasks, 
    user,
    getUserById 
  } = useTaskContext();
  
  const [departmentTaskCounts, setDepartmentTaskCounts] = useState<{[key: string]: number}>({});
  const [isLoading, setIsLoading] = useState(true);
  const isMobile = useIsMobile();

  useEffect(() => {
    const calculateTaskCounts = async () => {
      if (!user?.id) return;
      
      setIsLoading(true);
      const counts: {[key: string]: number} = {};
      
      for (const department of departments) {
        const departmentTasks = tasks.filter(task => {
          const isAuthorOrAssignee = user.id === task.createdBy || user.id === task.assignedTo;
          return task.departmentId === department.id && 
                 isAuthorOrAssignee && 
                 task.status !== 'completed';
        });
        
        counts[department.id] = departmentTasks.length;
      }
      
      setDepartmentTaskCounts(counts);
      setIsLoading(false);
    };

    calculateTaskCounts();
  }, [tasks, departments, user?.id]);

  // Показываем только те департаменты, где есть задачи
  const activeDepartments = departments.filter(dept => 
    departmentTaskCounts[dept.id] > 0
  );

  if (isMobile) {
    return null; // На мобильных устройствах боковая панель не нужна
  }

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-full overflow-y-auto">
      <div className="p-4">
        <h2 className="text-lg font-semibold mb-4">Подразделения</h2>
        
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {activeDepartments.length > 0 ? (
              activeDepartments.map(department => (
                <Button
                  key={department.id}
                  variant={selectedDepartment?.id === department.id ? "default" : "ghost"}
                  className={cn(
                    "w-full justify-between h-auto p-3 text-left",
                    selectedDepartment?.id === department.id && "bg-blue-50 border-blue-200"
                  )}
                  onClick={() => selectDepartment(department)}
                >
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-sm"
                      style={{ backgroundColor: department.color }}
                    />
                    <span className="text-sm font-medium">{department.name}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {departmentTaskCounts[department.id] || 0}
                  </Badge>
                </Button>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm">Нет активных поручений</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
