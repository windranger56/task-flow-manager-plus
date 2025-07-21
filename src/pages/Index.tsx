
import React, { useState } from 'react';
import LeftSidebar from '@/components/LeftSidebar';
import TaskList from '@/components/TaskList';
import TaskDetail from '@/components/TaskDetail';
import SearchBar from '@/components/SearchBar';
import ExportButton from '@/components/ExportButton';
import ArchiveButton from '@/components/ArchiveButton';
import { TaskProvider } from '@/contexts/TaskContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  Drawer, 
  DrawerContent,
  DrawerClose,
} from '@/components/ui/drawer';
import { X } from 'lucide-react';

export default function Index() {
  const isMobile = useIsMobile();
  const [showMobileDrawer, setShowMobileDrawer] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  
  return (
    <TaskProvider>
			<div className='flex h-screen'>
				<div className="flex w-full bg-white">
					{/* Left Sidebar - collapsible on mobile */}
					{!isMobile ? (
						<LeftSidebar />
					) : (
						<Drawer open={showMobileDrawer} onOpenChange={setShowMobileDrawer}>
							<DrawerContent className="h-[100vh] p-0">
								<div className="relative">
									<DrawerClose className="absolute right-4 mt-20 z-50">
										<X className="h-6 w-6" />
									</DrawerClose>
									<LeftSidebar onItemClick={() => setShowMobileDrawer(false)} />
								</div>
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
							<div className="flex-1 flex items-center gap-3">
								<div className="flex-1">
									<SearchBar />
								</div>
								<ArchiveButton 
									showArchive={showArchive}
									onToggle={() => setShowArchive(!showArchive)}
								/>
								<ExportButton />
							</div>
						</div>
						
						{/* Task Content */}
						{isMobile ? (
							/* Mobile layout */
							<div className="flex-1 overflow-auto">
								<TaskList showArchive={showArchive} />
							</div>
						) : (
							/* Desktop layout */
							<div className="flex flex-1 overflow-hidden">
								<div className="w-1/3 min-w-0 border-r border-gray-200 overflow-auto">
									<TaskList showArchive={showArchive} />
								</div>
								<div className="flex-1 overflow-auto">
									<TaskDetail />
								</div>
							</div>
						)}
					</div>
				</div>
			</div>
    </TaskProvider>
  );
}
