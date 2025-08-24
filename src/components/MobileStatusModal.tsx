import React from 'react';
import { format } from 'date-fns';
import { TaskStatus } from '../types';

interface MobileStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStatus: TaskStatus;
  nextStatus: TaskStatus | null;
  setNextStatus: (status: TaskStatus | null) => void;
  newDeadline: Date | undefined;
  setNewDeadline: (date: Date | undefined) => void;
  statusComment: string;
  setStatusComment: (comment: string) => void;
  onConfirm: () => void;
  availableStatuses: Array<{ value: TaskStatus; label: string }>;
  isCreator: boolean;
  needsComment: boolean;
}

export const MobileStatusModal: React.FC<MobileStatusModalProps> = ({
  isOpen,
  onClose,
  currentStatus,
  nextStatus,
  setNextStatus,
  newDeadline,
  setNewDeadline,
  statusComment,
  setStatusComment,
  onConfirm,
  availableStatuses,
  isCreator,
  needsComment
}) => {
  console.log('🔄 MobileStatusModal render:', { isOpen, availableStatuses: availableStatuses.length, currentStatus });
  
  if (!isOpen) {
    console.log('❌ Modal not rendering - isOpen is false');
    return null;
  }
  
  console.log('✅ Modal rendering - isOpen is true');
  console.log('🎯 About to render modal content');

  return (
    <div 
      className="fixed inset-0 z-[999999] bg-black/50 flex items-center justify-center p-4"
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        console.log('🖱️ Modal overlay clicked - closing modal');
        onClose();
      }}
    >
      <div 
        className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          console.log('🖱️ Modal content clicked - preventing close');
        }}
      >
        <h2 className="text-lg font-semibold mb-2">Смена статуса поручения</h2>
        <p className="text-sm text-gray-600 mb-4">Выберите новый статус для поручения</p>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Доступные статусы:</label>
          <div className="space-y-2">
            {availableStatuses.map(opt => (
              <div 
                key={opt.value}
                className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation(); // Останавливаем всплытие
                  console.log('✅ Выбран статус:', opt.value);
                  setNextStatus(opt.value);
                }}
              >
                <div className={`w-4 h-4 border-2 rounded-full flex items-center justify-center ${nextStatus === opt.value ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`}>
                  {nextStatus === opt.value && <div className="w-2 h-2 bg-white rounded-full" />}
                </div>
                <span className="text-sm">{opt.label}</span>
              </div>
            ))}
          </div>
        </div>
        
        {isCreator && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Новый дедлайн (опционально)</label>
            <input
              type="date"
              value={newDeadline ? format(newDeadline, 'yyyy-MM-dd') : ''}
              onChange={e => setNewDeadline(e.target.value ? new Date(e.target.value) : undefined)}
              onClick={(e) => e.stopPropagation()}
              min={format(new Date(), 'yyyy-MM-dd')}
              className="w-full p-2 border border-gray-300 rounded-lg"
            />
          </div>
        )}
        
        {needsComment && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Комментарий для исполнителя <span className="text-red-500">*</span>
            </label>
            <textarea
              value={statusComment}
              onChange={e => setStatusComment(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              placeholder="Опишите, что нужно доработать..."
              className="w-full p-2 border border-gray-300 rounded-lg min-h-[80px] resize-none"
            />
          </div>
        )}
        
        <div className="flex justify-end gap-2 pt-4 border-t">
          <button 
            onClick={(e) => {
              e.stopPropagation(); // Останавливаем всплытие
              e.preventDefault(); // Останавливаем стандартное поведение
              console.log('❌ Кнопка Отмена нажата - закрываем модальное окно');
              onClose();
            }}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Отмена
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation(); // Останавливаем всплытие
              e.preventDefault(); // Останавливаем стандартное поведение
              console.log('✅ Кнопка Подтвердить нажата - выполняем действие');
              onConfirm();
            }}
            disabled={!nextStatus || (needsComment && !statusComment.trim())}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Подтвердить
          </button>
        </div>
      </div>
    </div>
  );


};
