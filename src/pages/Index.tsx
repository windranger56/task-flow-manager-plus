import React, { useEffect, useState } from "react";

import LeftSidebar from "@/components/LeftSidebar";
import MobileInterface from "@/components/MobileInterface";
import { useAppSelector } from "@/state/hooks";
import SearchBar from "@/components/SearchBar";
import TaskList from "@/components/TaskList";
import ArchiveButton from "@/components/ArchiveButton";
import TaskDetail from "@/components/TaskDetail";

export default function Index() {
  const [showArchive, setShowArchive] = useState(false);
  const { value: screenSize } = useAppSelector((state) => state.screenSize);

  if (screenSize == "mobile") return <MobileInterface />;

  return (
    <div className="flex h-screen">
      <div className="flex w-full bg-white">
        {/* Left Sidebar */}
        <LeftSidebar />

        {/* Main Content */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Search Bar */}
          <div className="sticky top-0 bg-white z-10 p-1 border-b border-gray-200 flex items-center h-12">
            <div className="flex-1 flex items-center gap-4 justify-left">
              <div className="w-1/3 min-w-0">
                <SearchBar />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="text-sm font-medium text-gray-600 mr-2">
                  <p>Сегодня</p>
                </div>
                <div className="text-sm font-medium text-black">
                  {new Date()
                    .toLocaleDateString("ru-RU", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                    .replace(/^./, (str) => str.toUpperCase())}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ArchiveButton />
                {/*<ExportButton /> */}
              </div>
            </div>
          </div>

          {/* Task Content */}
          <div className="flex flex-1 overflow-hidden">
            <div className="w-1/3 min-w-0 border-r border-gray-200 overflow-auto">
              <TaskList />
            </div>
            <div className="flex-1 overflow-auto">
              <TaskDetail />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
