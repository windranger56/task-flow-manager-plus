import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Swiper, SwiperSlide } from "swiper/react";

import { Drawer, DrawerContent, DrawerOverlay } from "./ui/drawer";
import TaskDetail from "./TaskDetail";
import ArchiveButton from "./ArchiveButton";
import ExportButton from "./ExportButton";
import { LeftArrow } from "./icons";
import MobileFooter from "./MobileFooter";
import LeftSidebar from "./LeftSidebar";

import { Button } from "@/components/ui/button";
import SearchBar from "@/components/SearchBar";
import DepartmentCard, {
  DepartmentStatistics,
} from "@/components/DepartmentCard";
import MobileTaskCard from "@/components/MobileTaskCard";
import { setSelectedTask, Task } from "@/state/features/selected-task";
import { useAppDispatch, useAppSelector } from "@/state/hooks";
import { setHeaderTitle } from "@/state/features/header-title";
import { MobileTab, setMobileTab } from "@/state/features/mobile-tab";
import { setViewHistory } from "@/state/features/viewHistory";
import { setTasksFilter, TasksFilter } from "@/state/features/tasks-filter";
import { filterTasksByStatus } from "@/state/features/grouped-tasks";
import "swiper/css";

const pages = {
  account: <LeftSidebar />,
  tasks: <TaskList />,
  add: (
    <div className="w-full h-full flex justify-center items-center">
      Страница отсутствует в дизайне
    </div>
  ),
  calendar: (
    <div className="w-full h-full flex justify-center items-center">
      Страница отсутствует в дизайне
    </div>
  ),
  notifications: (
    <div className="w-full h-full flex justify-center items-center">
      Страница отсутствует в дизайне
    </div>
  ),
} as const;

export default function MobileInterface() {
  const dispatch = useAppDispatch();
  const activeTab = useAppSelector((state) => state.mobileTab.value);
  const [swiper, setSwiper] = useState(null);
  const isSwipeInternal = useRef(false);

  useEffect(() => {
    if (!swiper) return;
    isSwipeInternal.current = true;
    swiper.slideTo(Object.keys(pages).findIndex((tab) => tab == activeTab));
    isSwipeInternal.current = false;
  }, [activeTab]);

  const handleSwipe = (swiper: any) => {
    if (isSwipeInternal.current) return;
    dispatch(setMobileTab(Object.keys(pages)[swiper.activeIndex] as MobileTab));
  };

  useEffect(() => {
    dispatch(setHeaderTitle(tabToTabName[activeTab]));
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-[#f7f7f7] pb-20 pt-[58px]">
      <Header />
      <Swiper
        onSwiper={setSwiper}
        spaceBetween={20}
        slidesPerView={1}
        onSlideChange={(swiper) => handleSwipe(swiper)}
      >
        {Object.values(pages).map((page, i) => (
          <SwiperSlide key={i}>{page}</SwiperSlide>
        ))}
      </Swiper>

      <MobileFooter
        activeTab={activeTab}
        onTabChange={(tab: MobileTab) => {
          dispatch(setMobileTab(tab));
        }}
      />
    </div>
  );
}

function Header() {
  const dispatch = useAppDispatch();
  const viewHistory = useAppSelector((state) => state.viewHistory.value);
  const headerTitle = useAppSelector((state) => state.headerTitle.value);

  return (
    <div
      onClick={(event) => event.stopPropagation()}
      className="fixed pointer-events-auto top-0 z-[60] w-full h-[58px] bg-white flex items-center justify-center shadow-md rounded-b-lg"
    >
      <div className="flex flex-col items-center w-full relative">
        <AnimatePresence>
          {viewHistory.length > 0 && (
            <motion.button
              key="backButton"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute left-[17px] h-full flex items-center"
              onClick={() => {
                dispatch(setViewHistory(viewHistory.slice(0, -1)));
                dispatch(setHeaderTitle("Поручения"));
              }}
            >
              <LeftArrow />
            </motion.button>
          )}
        </AnimatePresence>
        <span className="text-[#C5C7CD] text-sm">
          {new Date().toLocaleDateString("ru-RU", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </span>
        <span>{headerTitle}</span>
        <div className="absolute right-[17px] h-full flex gap-4 items-center text-[#C5C7CD]">
          <ArchiveButton type="mobile" />
          {/* <ExportButton type="mobile" /> */}
        </div>
      </div>
    </div>
  );
}

const tabToTabName = {
  account: "Личный кабинет",
  tasks: "Поручения",
  add: "Новое поручение",
  calendar: "Календарь",
  notifications: "Уведомления",
} as const;

function TaskList() {
  const dispatch = useAppDispatch();
  const viewHistory = useAppSelector((state) => state.viewHistory.value);
  const groupedTasks = useAppSelector((state) => state.groupedTasks.value);
  const taskFilter = useAppSelector((state) => state.tasksFilter.value);
  const user = useAppSelector((state) => state.user.value);
  const {
    value: { tasksWithNewMessages },
  } = useAppSelector((state) => state.notifications);

  const [expandedDepartment, setExpandedDepartment] = useState<string | null>(
    null,
  );

  const handleDepartmentClick = (departmentId: string) => {
    if (expandedDepartment === departmentId) {
      setExpandedDepartment(null);
    } else {
      setExpandedDepartment(departmentId);
    }
  };

  const handleTaskClick = (task: Task) => {
    dispatch(setHeaderTitle("Поручение"));
    dispatch(setSelectedTask(task));
    dispatch(setViewHistory([...viewHistory, "task"]));
  };

  const getDepartmentStatistics = (tasks: Task[]): DepartmentStatistics => ({
    overdue: filterTasksByStatus(tasks, "overdue").length,
    in_progress: filterTasksByStatus(tasks, "in_progress").length,
    on_verification: filterTasksByStatus(tasks, "on_verification").length,
    new: filterTasksByStatus(tasks, "new").length,
  });

  const handleRoleClick = (role: TasksFilter["role"]) => {
    dispatch(setTasksFilter({ ...taskFilter, role, user }));
  };

  return (
    <div className="w-screen">
      {/* Search bar */}
      <div className="p-4">
        <SearchBar />
      </div>

      {/* Filter buttons */}
      <div className="px-4 pb-4">
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleRoleClick("all")}
            className={`${taskFilter.role === "all" ? "font-bold underline underline-offset-4" : "text-foreground"}`}
          >
            Все
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleRoleClick("author")}
            className={`${taskFilter.role === "author" ? "font-bold underline underline-offset-4" : "text-foreground"}`}
          >
            я Автор
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleRoleClick("assignee")}
            className={`${taskFilter.role === "assignee" ? "font-bold underline underline-offset-4" : "text-foreground"}`}
          >
            я Исполнитель
          </Button>
        </div>
      </div>

      {/* Department cards grid */}
      <div className="px-4 pb-4">
        <div className="grid grid-cols-1 gap-3">
          {groupedTasks.byDepartment.map(({ department, tasks }) => {
            const statistics = getDepartmentStatistics(tasks);
            const isExpanded = Number(expandedDepartment) === department.id;

            return (
              <div key={department.id}>
                <div className="relative">
                  <DepartmentCard
                    department={department}
                    manager={undefined} // Will be loaded asynchronously if needed
                    statistics={statistics}
                    onClick={() =>
                      handleDepartmentClick(department.id.toString())
                    }
                  />
                  {tasks.length > 0 && (
                    <div className="absolute top-2 right-2 text-muted-foreground">
                      {isExpanded ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      )}
                    </div>
                  )}
                </div>

                {/* Expanded tasks list */}
                {isExpanded && tasks.length > 0 && (
                  <div className="mt-2 pl-4 space-y-2 border-l-2 border-muted">
                    {tasks.map((task) => (
                      <MobileTaskCard
                        key={task.id}
                        task={task}
                        onClick={() => handleTaskClick(task)}
                        hasNewMessages={
                          !!tasksWithNewMessages.find((t) => t.id == task.id)
                        }
                      />
                    ))}
                  </div>
                )}

                {isExpanded && tasks.length === 0 && (
                  <div className="mt-2 pl-4 py-4 text-center text-muted-foreground text-sm border-l-2 border-muted">
                    Нет поручений в этом департаменте
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <Drawer
        open={viewHistory[viewHistory.length - 1] == "task"}
        onOpenChange={(event) => {
          if (!event.valueOf()) {
            dispatch(setViewHistory(viewHistory.slice(0, -1)));
            dispatch(setSelectedTask(undefined));
          }
        }}
      >
        <DrawerOverlay className="pointer-events-none" />
        <DrawerContent className="h-screen max-h-screen">
          <div className="relative h-full">
            <div className="lg:px-4 h-full">
              <TaskDetail />
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
