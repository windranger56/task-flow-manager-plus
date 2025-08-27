import React from "react";
import { Plus, Calendar, Bell } from "lucide-react";

import { ListIcon, UserIcon } from "./icons";

import { Button } from "@/components/ui/button";
import { useAppSelector } from "@/state/hooks";

interface MobileFooterProps {
  activeTab: "account" | "tasks" | "add" | "calendar" | "notifications";
  onTabChange: (
    tab: "account" | "tasks" | "add" | "calendar" | "notifications",
  ) => void;
  notificationCount?: number;
}

const MobileFooter: React.FC<MobileFooterProps> = ({
  activeTab,
  onTabChange,
  notificationCount = 0,
}) => {
  const screenSize = useAppSelector((state) => state.screenSize.value);

  if (screenSize != "mobile") return null;

  const tabs = [
    {
      id: "account" as const,
      label: "",
      icon: UserIcon,
    },
    {
      id: "tasks" as const,
      label: "",
      icon: ListIcon,
    },
    {
      id: "add" as const,
      label: "",
      icon: Plus,
    },
    {
      id: "calendar" as const,
      label: "",
      icon: Calendar,
    },
    {
      id: "notifications" as const,
      label: "",
      icon: Bell,
    },
  ];

  return (
    <div className="fixed h-[70px] z-[60] pointer-events-auto bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-4 md:hidden">
      <div className="flex h-full justify-around items-center">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <Button
              key={tab.id}
              variant="link"
              size="sm"
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center justify-center min-w-0 h-auto relative`}
            >
              <div className="relative flex items-center justify-center">
                <Icon
                  className={`!h-[18px] !w-[18px] ${
                    isActive ? "text-[#757D8A]" : "text-[#C5C7CD]"
                  }`}
                />
                {tab.id === "notifications" && notificationCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                    {notificationCount > 9 ? "9+" : notificationCount}
                  </span>
                )}
              </div>
            </Button>
          );
        })}
      </div>
    </div>
  );
};

export default MobileFooter;
