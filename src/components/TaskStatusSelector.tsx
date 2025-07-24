import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { TaskStatus } from '@/types';

interface TaskStatusSelectorProps {
  selectedStatuses: TaskStatus[];
  onStatusToggle: (status: TaskStatus) => void;
  taskCounts?: { [key in TaskStatus]?: number };
}

const statusLabels: { [key in TaskStatus]: string } = {
  'new': 'Новое',
  'in_progress': 'В работе',
  'on_verification': 'На проверке',
  'completed': 'Завершено',
  'overdue': 'Просрочено'
};

export const TaskStatusSelector: React.FC<TaskStatusSelectorProps> = ({
  selectedStatuses,
  onStatusToggle,
  taskCounts = {}
}) => {
  const allStatuses: TaskStatus[] = ['new', 'in_progress', 'on_verification', 'completed', 'overdue'];
  
  const handleSelectAll = () => {
    const allSelected = allStatuses.every(status => selectedStatuses.includes(status));
    
    if (allSelected) {
      // Deselect all
      allStatuses.forEach(status => {
        if (selectedStatuses.includes(status)) {
          onStatusToggle(status);
        }
      });
    } else {
      // Select all missing
      allStatuses.forEach(status => {
        if (!selectedStatuses.includes(status)) {
          onStatusToggle(status);
        }
      });
    }
  };

  const allSelected = allStatuses.every(status => selectedStatuses.includes(status));
  const someSelected = allStatuses.some(status => selectedStatuses.includes(status));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Статусы поручений</h4>
        <button
            type="button"
            onClick={handleSelectAll}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            {allSelected ? 'Снять всё' : 'Выбрать всё'}
          </button>
        
      </div>
      
      <div className="space-y-2">
        {allStatuses.map((status) => (
          <div key={status} className="flex items-center space-x-2">
            <Checkbox
              id={`status-${status}`}
              checked={selectedStatuses.includes(status)}
              onCheckedChange={() => onStatusToggle(status)}
            />
            <label
              htmlFor={`status-${status}`}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1"
            >
              {statusLabels[status]}
              {taskCounts[status] !== undefined && (
                <span className="text-muted-foreground ml-1">
                  ({taskCounts[status]})
                </span>
              )}
            </label>
          </div>
        ))}
      </div>
      
      {someSelected && (
        <p className="text-xs text-muted-foreground">
          Выбрано статусов: {selectedStatuses.length} из {allStatuses.length}
        </p>
      )}
    </div>
  );
};