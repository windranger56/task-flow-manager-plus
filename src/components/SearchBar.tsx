
import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { useTaskContext } from '@/contexts/TaskContext';
import { Check, Search } from "lucide-react";

export default function SearchBar() {
  const { searchTasks, selectTask, getUserById } = useTaskContext();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ReturnType<typeof searchTasks>>([]);
  const [showResults, setShowResults] = useState(false);
  
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    
    if (value.trim()) {
      const searchResults = searchTasks(value);
      setResults(searchResults);
      setShowResults(true);
    } else {
      setResults([]);
      setShowResults(false);
    }
  };
  
  const handleSelectTask = (taskId: string) => {
    const task = results.find(t => t.id === taskId);
    if (task) {
      selectTask(task);
      setShowResults(false);
    }
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input 
          className="w-full pl-10 py-2"
          placeholder="Search tasks..."
          value={query}
          onChange={handleSearch}
          onFocus={() => query.trim() && setShowResults(true)}
          onBlur={() => setTimeout(() => setShowResults(false), 100)}
        />
      </div>
      
      {showResults && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 bg-white shadow-lg rounded-md mt-1 z-10 max-h-80 overflow-auto">
          {results.map(task => {
            const assignee = getUserById(task.assignedTo);
            return (
              <div 
                key={task.id}
                className="p-3 hover:bg-gray-100 cursor-pointer flex items-center"
                onClick={() => handleSelectTask(task.id)}
              >
                <div className="mr-3">
                  {task.completed ? (
                    <div className="h-6 w-6 bg-taskBlue rounded-full flex items-center justify-center">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                  ) : (
                    <div className="h-6 w-6 border-2 border-gray-200 rounded-full"></div>
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">{task.title}</h4>
                  <p className="text-xs text-gray-500 truncate">{task.description}</p>
                </div>
                {assignee && (
                  <div className="text-xs text-gray-500">{assignee.name}</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
