import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { useTaskContext } from '@/contexts/TaskContext';
import { cn, getTaskStatusColor } from '@/lib/utils';
import { Search, X } from 'lucide-react';

export default function SearchBar() {
  const { searchTasks, selectTask, user } = useTaskContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ReturnType<typeof searchTasks>>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (query.trim()) {
      const results = searchTasks(query);
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  };
  
  const handleSelectTask = (taskId: string) => {
    const task = searchResults.find(t => t.id === taskId);
    if (task) {
      selectTask(task);
      setSearchQuery('');
      setSearchResults([]);
      setMobileSearchOpen(false);
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'new': return 'Новое';
      case 'in_progress': return 'В работе';
      case 'on_verification': return 'На проверке';
      case 'completed': return 'Завершено';
      case 'overdue': return 'Просрочено';
      default: return status;
    }
  };

  const handleMobileSearchToggle = () => {
    setMobileSearchOpen(!mobileSearchOpen);
    if (mobileSearchOpen) {
      setSearchQuery('');
      setSearchResults([]);
    }
  };

  return (
    <>
      {/* Desktop version - always visible */}
      <div className="hidden md:block relative">
        <Input
          type="search"
          placeholder="Поиск ваших поручений по названию, описанию или статусу..."
          className="w-full bg-[#f0f0f7] border-0"
          value={searchQuery}
          onChange={handleSearch}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
        />
        {isFocused && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-md z-10 max-h-96 overflow-y-auto">
            <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 text-xs text-gray-500">
              Найдено {searchResults.length} ваших поручений
            </div>
            <ul>
              {searchResults.map((task) => (
                <li
                  key={task.id}
                  className="px-3 py-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                  onClick={() => handleSelectTask(task.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start flex-1 min-w-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                        <p className="text-xs text-gray-500 truncate mt-1">{task.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={cn(
                            "px-2 py-1 text-xs rounded-full",
                            getTaskStatusColor(task.status),
                            task.status === 'completed' ? "text-white" : "text-gray-700"
                          )}>
                            {getStatusLabel(task.status)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end ml-2">
                      <div className="text-xs text-[#BCBCBC]">
                        {task.createdBy === user?.id ? 'Вы создали' : 
                         task.assignedTo === user?.id ? 'Вы исполнитель' : 'Доступно'}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Mobile version - icon and fullscreen search */}
      <div className="md:hidden w-6">
        <button 
          onClick={handleMobileSearchToggle}
          className="p-2 text-gray-600 hover:text-gray-900"
        >
          <Search className="h-5 w-5" />
        </button>

        {mobileSearchOpen && (
          <div className="fixed inset-0 bg-white z-50 p-4 flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <Input
                type="search"
                placeholder="Поиск поручений..."
                className="flex-1 bg-[#f0f0f7] border-0"
                value={searchQuery}
                onChange={handleSearch}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                autoFocus
              />
              <button 
                onClick={handleMobileSearchToggle}
                className="p-2 text-gray-600 hover:text-gray-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {searchResults.length > 0 && (
              <div className="flex-1 overflow-y-auto">
                <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 text-xs text-gray-500">
                  Найдено {searchResults.length} поручений
                </div>
                <ul>
                  {searchResults.map((task) => (
                    <li
                      key={task.id}
                      className="px-3 py-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                      onClick={() => handleSelectTask(task.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start flex-1 min-w-0">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                            <p className="text-xs text-gray-500 truncate mt-1">{task.description}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className={cn(
                                "px-2 py-1 text-xs rounded-full",
                                getTaskStatusColor(task.status),
                                task.status === 'completed' ? "text-white" : "text-gray-700"
                              )}>
                                {getStatusLabel(task.status)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end ml-2">
                          <div className="text-xs text-[#BCBCBC]">
                            {task.createdBy === user?.id ? 'Вы создали' : 
                             task.assignedTo === user?.id ? 'Вы исполнитель' : 'Доступно'}
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}