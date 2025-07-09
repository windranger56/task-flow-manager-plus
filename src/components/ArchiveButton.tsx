import React from 'react';
import { Button } from '@/components/ui/button';

interface ArchiveButtonProps {
  showArchive: boolean;
  onToggle: () => void;
}

export default function ArchiveButton({ showArchive, onToggle }: ArchiveButtonProps) {
  return (
    <Button
      onClick={onToggle}
      className={`flex items-center gap-2 h-9 px-3 rounded-md text-sm font-medium ${showArchive ? 'bg-blue-500 text-white hover:bg-blue-600' : 'border text-black border-gray-300 bg-white hover:bg-gray-50'}`}
    >
      <span className="hidden sm:inline">
        {showArchive ? 'Показать активные' : 'Архив'}
      </span>
    </Button>
  );
} 