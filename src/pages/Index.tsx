import React, { useState } from "react";
import { TaskProvider } from "@/contexts/TaskContext";
import LeftSidebar from "@/components/LeftSidebar";
import TaskList from "@/components/TaskList";
import TaskDetail from "@/components/TaskDetail";
import SearchBar from "@/components/SearchBar";
import ExportButton from "@/components/ExportButton";
import ArchiveButton from "@/components/ArchiveButton";
import MobileInterface from "@/components/MobileInterface";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import {
  Drawer,
  DrawerContent,
} from "@/components/ui/drawer";

export default function Index() {
  const isMobile = useIsMobile();
  const [showMobileDrawer, setShowMobileDrawer] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [showTaskList, setShowTaskList] = useState(false);

  return (
    <TaskProvider>
      <div className="min-h-screen bg-background">
        {isMobile ? (
          // Mobile Interface
          <>
            {!showTaskList ? (
              <MobileInterface
                showArchive={showArchive}
                onToggleArchive={() => setShowArchive(!showArchive)}
                onShowMobileDrawer={() => setShowMobileDrawer(true)}
                onShowTaskList={() => setShowTaskList(true)}
              />
            ) : (
              // Mobile Task List View
              <div className="min-h-screen bg-background pb-20">
                <div className="sticky top-0 bg-background border-b border-border py-3 px-4 z-10">
                  <div className="flex items-center gap-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowTaskList(false)}
                      className="p-2"
                    >
                      <ArrowLeft size={18} />
                    </Button>
                    <SearchBar />
                    <ExportButton />
                  </div>
                </div>
                <div className="px-4">
                  <TaskList showArchive={showArchive} />
                </div>
              </div>
            )}

            {/* Mobile Drawer */}
            <Drawer open={showMobileDrawer} onOpenChange={setShowMobileDrawer}>
              <DrawerContent>
                <div className="mx-auto w-full max-w-sm">
                  <LeftSidebar />
                </div>
              </DrawerContent>
            </Drawer>
          </>
        ) : (
          // Desktop Interface
          <div className="flex">
            <LeftSidebar />

            <div className="flex-1 px-4 sm:px-6 md:px-10 w-full max-w-screen">
              <div className="sticky top-0 bg-background border-b border-border py-3 mb-6 z-10">
                <div className="flex items-center gap-4">
                  <SearchBar />
                  <ExportButton />
                  <ArchiveButton 
                    showArchive={showArchive} 
                    onToggle={() => setShowArchive(!showArchive)} 
                  />
                </div>
              </div>

              <div className="flex gap-6">
                <div className="w-1/2">
                  <TaskList showArchive={showArchive} />
                </div>
                <div className="w-1/2">
                  <TaskDetail />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </TaskProvider>
  );
}