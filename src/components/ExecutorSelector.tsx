
import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { User } from '@/types';

interface ExecutorSelectorProps {
  executors: {id: string, fullname: string, departmentId: string}[];
  selectedExecutors: string[];
  onExecutorToggle: (executorId: string) => void;
  departmentNames: { [key: string]: string };
}

export default function ExecutorSelector({
  executors,
  selectedExecutors,
  onExecutorToggle,
  departmentNames
}: ExecutorSelectorProps) {
  const handleSelectAll = () => {
    if (selectedExecutors.length === executors.length) {
      // Deselect all
      executors.forEach(exec => onExecutorToggle(exec.id));
    } else {
      // Select all missing executors
      executors.forEach(exec => {
        if (!selectedExecutors.includes(exec.id)) {
          onExecutorToggle(exec.id);
        }
      });
    }
  };

  const isAllSelected = selectedExecutors.length === executors.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Исполнители</Label>
        {executors.length > 0 && (
          <button
            type="button"
            onClick={handleSelectAll}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            {isAllSelected ? 'Снять все' : 'Выбрать все'}
          </button>
        )}
      </div>
      
      <div className="space-y-2 max-h-40 overflow-y-auto">
        {executors.length === 0 ? (
          <div className="text-sm text-gray-500 italic">
            Сначала выберите департаменты
          </div>
        ) : (
          executors.map((executor) => (
            <div key={executor.id} className="flex items-center space-x-2">
              <Checkbox
                id={`exec-${executor.id}`}
                checked={selectedExecutors.includes(executor.id)}
                onCheckedChange={() => onExecutorToggle(executor.id)}
              />
              <Label 
                htmlFor={`exec-${executor.id}`}
                className="text-sm cursor-pointer flex-1"
              >
                {executor.fullname}
                <div className="text-xs text-gray-500">
                  {departmentNames[executor.departmentId] || 'Неизвестное подразделение'}
                </div>
              </Label>
            </div>
          ))
        )}
      </div>
      
      {executors.length > 0 && (
        <div className="text-xs text-gray-500">
          Выбрано: {selectedExecutors.length} из {executors.length}
        </div>
      )}
    </div>
  );
}
