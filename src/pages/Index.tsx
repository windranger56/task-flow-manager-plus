
import React, { useState } from 'react';
import LeftSidebar from '@/components/LeftSidebar';
import TaskList from '@/components/TaskList';
import TaskDetail from '@/components/TaskDetail';
import SearchBar from '@/components/SearchBar';
import { TaskProvider } from '@/contexts/TaskContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  Drawer, 
  DrawerContent,
} from '@/components/ui/drawer';

export default function Index() {
  const isMobile = useIsMobile();
  const [showMobileDrawer, setShowMobileDrawer] = useState(false);
  
  return (
    <TaskProvider>
      <div className="flex h-screen bg-white">
        {/* Left Sidebar - collapsible on mobile */}
        {!isMobile ? (
          <LeftSidebar />
        ) : (
          <Drawer open={showMobileDrawer} onOpenChange={setShowMobileDrawer}>
            <DrawerContent className="p-0 h-[85vh]">
              <LeftSidebar onItemClick={() => setShowMobileDrawer(false)} />
            </DrawerContent>
          </Drawer>
        )}
        
        {/* Main Content */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Search Bar */}
          <div className="p-4 border-b border-gray-200 flex items-center">
            {isMobile && (
              <button 
                className="mr-3 p-1 rounded-md hover:bg-gray-100"
                onClick={() => setShowMobileDrawer(true)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}
            <div className="flex-1">
              <SearchBar />
            </div>
          </div>
          
          {/* Task Content */}
          {isMobile ? (
            /* Mobile layout */
            <div className="flex-1 overflow-auto">
              <TaskList />
            </div>
          ) : (
            /* Desktop layout */
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
