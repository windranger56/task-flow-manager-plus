import React from 'react';
import { Button } from '@/components/ui/button';
import { List } from 'lucide-react';
import { ArchiveIcon } from '@/components/icons/ArchiveIcon';

interface ArchiveButtonProps {
  showArchive: boolean;
  onToggle: () => void;
	type?: "mobile" | "desktop";
}

export default function ArchiveButton({ showArchive, onToggle, type = "desktop" }: ArchiveButtonProps) {
  return (
    <Button
      onClick={onToggle}
      className={`${type === "mobile" ? "text-[#C5C7CD] p-0 w-[24px] h-[24px]" : `text-[#0f172a] flex items-center gap-2 h-9 px-3 rounded-md text-sm font-medium ${showArchive ? 'bg-blue-500 text-white hover:bg-blue-600"}' : 'border text-black border-gray-300 bg-white hover:bg-gray-50'}`}`}
			variant='link'
    >
      {showArchive ? (
        <>
          <List className="sm:hidden w-[24px] h-[24px]" size={24} />
          <span className="hidden sm:inline">Показать активные</span>
        </>
      ) : (
        <>
          <ArchiveIcon className="sm:hidden text-[#C5C7CD]" size={24} />
          <span className="hidden sm:inline">Архив</span>
        </>
      )}
    </Button>
  );
}