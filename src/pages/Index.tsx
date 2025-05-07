
import React from 'react';
import LeftSidebar from '@/components/LeftSidebar';
import TaskList from '@/components/TaskList';
import TaskDetail from '@/components/TaskDetail';
import SearchBar from '@/components/SearchBar';
import { TaskProvider } from '@/contexts/TaskContext';

export default function Index() {
  return (
    <TaskProvider>
      <div className="flex h-screen bg-white">
        {/* Left Sidebar */}
        <LeftSidebar />
        
        {/* Main Content */}
        <div className="flex flex-col flex-1">
          {/* Search Bar */}
          <div className="p-4 border-b border-gray-200">
            <SearchBar />
          </div>
          
          {/* Task Content */}
          <div className="flex flex-1">
            {/* Task List */}
            <div className="w-96">
              <TaskList />
            </div>
            
            {/* Task Detail */}
            <div className="flex-1">
              <TaskDetail />
            </div>
          </div>
        </div>
      </div>
    </TaskProvider>
  );
}
