import React, { useState } from "react";
import { X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn, getTaskStatusColor } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/state/hooks";
import { setSelectedTask } from "@/state/features/selected-task";

export default function SearchBar() {
  const dispatch = useAppDispatch();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    ReturnType<typeof searchTasks>
  >([]);
  const [isFocused, setIsFocused] = useState(false);
  const user = useAppSelector((state) => state.user.value);
  const tasks = useAppSelector((state) => state.tasks.value);

  const searchTasks = (query: string) => {
    if (!query) return [];

    const searchTerm = query.toLowerCase();

    // Функция для получения читаемого статуса
    const getStatusLabel = (status: string): string => {
      switch (status) {
        case "new":
          return "Новое";
        case "in_progress":
          return "В работе";
        case "on_verification":
          return "На проверке";
        case "completed":
          return "Завершено";
        case "overdue":
          return "Просрочено";
        default:
          return status;
      }
    };

    const accessibleTasks = tasks.filter((task) => {
      return task.createdBy === user?.id || task.assignedTo === user?.id;
    });

    return accessibleTasks.filter(
      (task) =>
        task.title.toLowerCase().includes(searchTerm) ||
        task.description.toLowerCase().includes(searchTerm) ||
        getStatusLabel(task.status).toLowerCase().includes(searchTerm),
    );
  };

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

  const handleSelectTask = (taskId: number) => {
    const task = searchResults.find((t) => t.id === taskId);
    if (task) {
      dispatch(setSelectedTask(task));
      setSearchQuery("");
      setSearchResults([]);
      setIsFocused(false);
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case "new":
        return "Новое";
      case "in_progress":
        return "В работе";
      case "on_verification":
        return "На проверке";
      case "completed":
        return "Завершено";
      case "overdue":
        return "Просрочено";
      default:
        return status;
    }
  };

  const renderSearchResults = () => (
    <div
      className={cn(
        "absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-md shadow-md z-10 max-h-96 overflow-y-auto",
        "md:relative md:mt-2 md:max-h-96",
      )}
    >
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
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {task.title}
                  </p>
                  <p className="text-xs text-gray-500 truncate mt-1">
                    {task.description}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className={cn(
                        "px-2 py-1 text-xs rounded-full",
                        getTaskStatusColor(task.status),
                        task.status === "completed"
                          ? "text-white"
                          : "text-gray-700",
                      )}
                    >
                      {getStatusLabel(task.status)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end ml-2">
                <div className="text-xs text-[#BCBCBC]">
                  {task.createdBy === user?.id
                    ? "Вы создали"
                    : task.assignedTo === user?.id
                      ? "Вы исполнитель"
                      : "Доступно"}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className="relative">
      <div className="flex items-center gap-2 relative z-20">
        <Input
          type="search"
          placeholder="Поиск ваших поручений по названию, описанию или статусу..."
          className="w-full bg-[#f0f0f7] border-0"
          value={searchQuery}
          onChange={handleSearch}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
        />
        {isFocused && (
          <button
            onClick={() => {
              setSearchQuery("");
              setSearchResults([]);
              setIsFocused(false);
            }}
            className="p-2 text-gray-600 hover:text-gray-900 md:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {isFocused && searchResults.length > 0 && renderSearchResults()}
    </div>
  );
}
