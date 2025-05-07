
import React from 'react';
import LeftSidebar from '@/components/LeftSidebar';
import TaskList from '@/components/TaskList';
import TaskDetail from '@/components/TaskDetail';
import SearchBar from '@/components/SearchBar';
import { TaskProvider } from '@/contexts/TaskContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  Drawer, 
  DrawerContent, 
  DrawerTrigger 
} from '@/components/ui/drawer';

export default function Index() {
  const isMobile = useIsMobile();
  
  return (
    <TaskProvider>
      <div className="flex h-screen bg-white">
        {/* Left Sidebar - collapsible on mobile */}
        <LeftSidebar />
        
        {/* Main Content */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Search Bar */}
          <div className="p-4 border-b border-gray-200">
            <SearchBar />
          </div>
          
          {/* Task Content */}
          {isMobile ? (
            /* Mobile layout: Show only task list with drawer for details */
            <div className="flex-1 overflow-auto">
              <TaskList />
            </div>
          ) : (
            /* Desktop layout: Show task list and details side by side */
            <div className="flex flex-1 overflow-hidden">
              <div className="w-96 min-w-0 border-r border-gray-200">
                <TaskList />
              </div>
              <div className="flex-1 overflow-auto">
                <TaskDetail />
              </div>
            </div>
          )}
        </div>
      </div>
    </TaskProvider>
  );
}
