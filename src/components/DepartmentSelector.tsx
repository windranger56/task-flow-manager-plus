
import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Department } from '@/types';

interface DepartmentSelectorProps {
  departments: Department[];
  selectedDepartments: string[];
  onDepartmentToggle: (departmentId: string) => void;
}

export default function DepartmentSelector({
  departments,
  selectedDepartments,
  onDepartmentToggle
}: DepartmentSelectorProps) {
  const handleSelectAll = () => {
    if (selectedDepartments.length === departments.length) {
      // Deselect all
      departments.forEach(dept => onDepartmentToggle(dept.id));
    } else {
      // Select all missing departments
      departments.forEach(dept => {
        if (!selectedDepartments.includes(dept.id)) {
          onDepartmentToggle(dept.id);
        }
      });
    }
  };

  const isAllSelected = selectedDepartments.length === departments.length;
  const isPartiallySelected = selectedDepartments.length > 0 && selectedDepartments.length < departments.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Департаменты</Label>
        <button
          type="button"
          onClick={handleSelectAll}
          className="text-xs text-blue-600 hover:text-blue-800"
        >
          {isAllSelected ? 'Снять все' : 'Выбрать все'}
        </button>
      </div>
      
      <div className="space-y-2 max-h-32 overflow-y-auto">
        {departments.map((department) => (
          <div key={department.id} className="flex items-center space-x-2">
            <Checkbox
              id={`dept-${department.id}`}
              checked={selectedDepartments.includes(department.id)}
              onCheckedChange={() => onDepartmentToggle(department.id)}
            />
            <Label 
              htmlFor={`dept-${department.id}`}
              className="text-sm cursor-pointer flex-1"
            >
              {department.name}
            </Label>
          </div>
        ))}
      </div>
      
      {departments.length > 0 && (
        <div className="text-xs text-gray-500">
          Выбрано: {selectedDepartments.length} из {departments.length}
        </div>
      )}
    </div>
  );
}
