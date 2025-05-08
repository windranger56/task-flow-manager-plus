
import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { useTaskContext } from '@/contexts/TaskContext';
import { cn } from '@/lib/utils';

export default function SearchBar() {
  const { searchTasks, selectTask } = useTaskContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ReturnType<typeof searchTasks>>([]);
  const [isFocused, setIsFocused] = useState(false);
  
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
    }
  };
  
  return (
    <div className="relative">
      <Input
        type="search"
        placeholder="Поиск задач..."
        className="w-full"
        value={searchQuery}
        onChange={handleSearch}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setTimeout(() => setIsFocused(false), 200)}
      />
      {isFocused && searchResults.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-md z-10">
          <ul>
            {searchResults.map((task) => (
              <li
                key={task.id}
                className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                onClick={() => handleSelectTask(task.id)}
              >
                <div className="flex items-center">
                  <div className={cn(
                    "w-2 h-2 rounded-full mr-2",
                    task.priority === 'high' ? "bg-red-500" :
                    task.priority === 'medium' ? "bg-yellow-500" : "bg-green-500"
                  )} />
                  <div>
                    <p className="text-sm font-medium">{task.title}</p>
                    <p className="text-xs text-gray-500 truncate max-w-xs">{task.description}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
