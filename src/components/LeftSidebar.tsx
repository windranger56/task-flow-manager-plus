import { useEffect, useState } from "react";
import { Bell, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Tooltip } from "react-tooltip";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/supabase/client";
import { User } from "@/state/features/user";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppDispatch, useAppSelector } from "@/state/hooks";
import {
  setSelectedTask,
  Task,
  TaskStatus,
} from "@/state/features/selected-task";
import { setMobileTab } from "@/state/features/mobile-tab";
import { groupTasks } from "@/state/features/grouped-tasks";
import { setTasksFilter, TasksFilter } from "@/state/features/tasks-filter";
import { markNotificationsWithTypeAsRead } from "@/state/features/notifications";
import { setViewHistory } from "@/state/features/viewHistory";

const LeftSidebar = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { value: user, loading: userLoading } = useAppSelector(
    (state) => state.user,
  );
  const { value: subordinates, loading: subordinatesLoading } = useAppSelector(
    (state) => state.subordinates,
  );
  const { value: tasks, loading: tasksLoading } = useAppSelector(
    (state) => state.tasks,
  );
  const groupedTasks = useAppSelector((state) => state.groupedTasks.value);
  const filter = useAppSelector((state) => state.tasksFilter.value);
  const screenSize = useAppSelector((state) => state.screenSize.value);
  const viewHistory = useAppSelector((state) => state.viewHistory.value);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>(tasks);
  const {
    value: { tasksWithNewMessages, tasksWithNewStatus },
    loading: notificationsLoading,
  } = useAppSelector((state) => state.notifications);

  const handleTaskClick = (task: Task) => {
    dispatch(setSelectedTask(task));
    if (screenSize == "mobile") {
      dispatch(setMobileTab("tasks"));
      dispatch(setViewHistory([...viewHistory, "task"]));
    }
  };

  useEffect(() => {
    if (!user) navigate("/auth");
  }, [user]);

  const handleLogout = async () => {
    try {
      console.log("Начинаем локальный выход из системы...");

      // Используем scope: 'local' чтобы выход происходил только в текущей вкладке
      await supabase.auth.signOut({ scope: "local" });

      toast.success("Успешный выход", {
        description: "Вы вышли из системы (только в этой вкладке)",
      });
    } catch (error) {
      console.error("Ошибка при выходе:", error);
      toast.error("Ошибка", { description: "Не удалось выйти из системы" });
    }
  };

  // Функция для фильтрации задач по статусу
  const handleStatusClick = (status: TaskStatus) => {
    setFilteredTasks(groupedTasks.byStatus[status]);
    setSelectedStatus(status);
    setShowTasksDialog(true);
  };

  const handleRoleClick = (role: TasksFilter["role"]) => {
    dispatch(setTasksFilter({ ...filter, user, role }));
  };

  // Получите правильные названия статусов
  const getStatusLabel = (status: string) => {
    switch (status) {
      case "new":
        return "Новые";
      case "in_progress":
        return "В работе";
      case "on_verification":
        return "На проверке";
      case "overdue":
        return "Просрочено";
      default:
        return "";
    }
  };

  const [showTasksDialog, setShowTasksDialog] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<TaskStatus | "all">(
    "all",
  );

  const [showNotificationsDialog, setShowNotificationsDialog] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState("all"); // 'all', 'messages', 'status'

  const buttonGroupClass =
    screenSize == "mobile"
      ? "flex justify-center gap-4"
      : "flex justify-center gap-[25px]";

  const handleSelectEmployee = (subordinate: User) => {
    dispatch(
      groupTasks({
        tasks,
        filter: { ...filter, user: subordinate, role: "subordinate" },
      }),
    );
  };

  // Calculate total notifications count
  const totalNotifications =
    tasksWithNewMessages.length + tasksWithNewStatus.length;

  const loading =
    userLoading || tasksLoading || notificationsLoading || subordinatesLoading;

  return (
    <div
      className={`${
        screenSize == "mobile"
          ? "w-screen min-h-full flex flex-col overflow-y-auto bg-[#f7f7f7]"
          : "w-[360px] flex flex-col h-screen bg-white border-r border-gray-200 overflow-hidden"
      }
		`}
    >
      {!loading && (
        <>
          {screenSize != "mobile" && (
            <div className=" h-12 w-full flex justify-center items-center text-[#979dc3] text-[17px] font-bold tracking-[0.7px] border-[#e5e4e9] border-b">
              УПРАВЛЕНИЕ ПОРУЧЕНИЯМИ
            </div>
          )}

          <div
            className={`px-[40px] py-[5px] ${screenSize == "mobile" ? "text-center" : ""}`}
          >
            {/* User Info */}
            <div className="flex flex-col items-center">
              <h3 className="text-center text-xl font-semibold mt-[15px] mb-[8px]">
                {user.fullname}
              </h3>
              <p className="text-l text-gray-500">{user.email}</p>
              {user.department && (
                <p className="text-xs text-[#BCBCBC] mt-1">
                  {user.department.name}
                </p>
              )}
              <Avatar className={`h-[90px] w-[90px] mb-2 mt-4`}>
                <AvatarImage src={user.image} alt={user.fullname} />
                <AvatarFallback>
                  {user.fullname ? user.fullname.slice(0, 2) : "UN"}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Task Filter Buttons */}
            <div className="flex justify-center gap-4 mt-[20px] mb-[15px] ">
              <button
                onClick={() => handleRoleClick("all")}
                className={`text-m pb-1 ${filter.role === "all" ? "border-b-2 border-black" : "text-gray-600"}`}
              >
                Показать все
              </button>
              <button
                onClick={() => handleRoleClick("author")}
                className={`text-m pb-1 ${filter.role === "author" ? " border-b-2 border-black" : "text-gray-600"}`}
              >
                я Автор
              </button>
              <button
                onClick={() => handleRoleClick("assignee")}
                className={`text-m pb-1 ${filter.role === "assignee" ? " border-b-2 border-black" : "text-gray-600"}`}
              >
                я Исполнитель
              </button>
            </div>

            {/* Action Buttons */}
            <div className={`${buttonGroupClass} mt-[15px]`}>
              {/* Combined Notifications Button */}
              <Dialog
                open={showNotificationsDialog}
                onOpenChange={setShowNotificationsDialog}
              >
                <DialogTrigger asChild>
                  <Button
                    data-tooltip-id="tooltip"
                    data-tooltip-content="Уведомления"
                    className="w-[36px] h-[36px] relative bg-[#eaeefc] hover:bg-[#c0c3cf] rounded-full text-[#4d76fd]"
                  >
                    <Bell className="h-4 w-4" />
                    {totalNotifications > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                        {totalNotifications}
                      </span>
                    )}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Уведомления</DialogTitle>
                  </DialogHeader>

                  <Tabs
                    value={notificationFilter}
                    onValueChange={setNotificationFilter}
                    className="w-full"
                  >
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="all">Все</TabsTrigger>
                      <TabsTrigger value="messages">Сообщения</TabsTrigger>
                      <TabsTrigger value="status">Статусы</TabsTrigger>
                    </TabsList>

                    <TabsContent
                      value="all"
                      className="space-y-2 max-h-[400px] overflow-y-auto"
                    >
                      {tasksWithNewMessages.length === 0 &&
                      tasksWithNewStatus.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">
                          Нет новых уведомлений
                        </p>
                      ) : (
                        <>
                          {tasksWithNewMessages.length > 0 && (
                            <div className="mb-4">
                              <div className="flex justify-between items-center mb-2">
                                <h3 className="font-medium">
                                  Новые сообщения ({tasksWithNewMessages.length}
                                  )
                                </h3>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    void dispatch(
                                      markNotificationsWithTypeAsRead(
                                        "messages",
                                      ),
                                    )
                                  }
                                  className="text-xs"
                                >
                                  Прочитано
                                </Button>
                              </div>
                              {tasksWithNewMessages.map((task) => (
                                <div
                                  key={`msg-${task.id}`}
                                  className="p-3 border rounded-md cursor-pointer hover:bg-gray-50 mb-2"
                                  onClick={() => {
                                    handleTaskClick(task);
                                    setShowNotificationsDialog(false);
                                  }}
                                >
                                  <p className="font-medium">{task.title}</p>
                                  <p className="text-sm text-gray-500">
                                    {task.description}
                                  </p>
                                  <div className="flex justify-between mt-2">
                                    <span className="text-xs text-gray-500">
                                      Срок:{" "}
                                      {new Date(
                                        task.deadline,
                                      ).toLocaleDateString()}
                                    </span>
                                    {task.priority === "high" && (
                                      <span className="text-xs text-gray-500">
                                        Приоритет: Высокий
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {tasksWithNewStatus.length > 0 && (
                            <div>
                              <div className="flex justify-between items-center mb-2">
                                <h3 className="font-medium">
                                  Новые статусы ({tasksWithNewStatus.length})
                                </h3>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    void dispatch(
                                      markNotificationsWithTypeAsRead("status"),
                                    )
                                  }
                                  className="text-xs"
                                >
                                  Прочитано
                                </Button>
                              </div>
                              {tasksWithNewStatus.map((task) => (
                                <div
                                  key={`status-${task.id}`}
                                  className="p-3 border rounded-md cursor-pointer hover:bg-gray-50 mb-2"
                                  onClick={() => {
                                    handleTaskClick(task);
                                    setShowNotificationsDialog(false);
                                  }}
                                >
                                  <p className="font-medium">{task.title}</p>
                                  <p className="text-sm text-gray-500">
                                    {task.description}
                                  </p>
                                  <div className="flex justify-between mt-2">
                                    <span className="text-xs text-gray-500">
                                      Срок:{" "}
                                      {new Date(
                                        task.deadline,
                                      ).toLocaleDateString()}
                                    </span>
                                    <span className="text-xs text-blue-500">
                                      Статус:{" "}
                                      {task.status === "overdue"
                                        ? "просрочено"
                                        : task.status === "in_progress"
                                          ? "в работе"
                                          : task.status === "new"
                                            ? "новое"
                                            : task.status === "completed"
                                              ? "завершена"
                                              : task.status ===
                                                  "on_verification"
                                                ? "на проверке"
                                                : task.status}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </TabsContent>

                    <TabsContent
                      value="messages"
                      className="space-y-2 max-h-[400px] overflow-y-auto"
                    >
                      {tasksWithNewMessages.length > 0 ? (
                        <>
                          <div className="flex justify-end mb-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                void dispatch(
                                  markNotificationsWithTypeAsRead("messages"),
                                )
                              }
                              className="text-xs"
                            >
                              Пометить все как прочитанные
                            </Button>
                          </div>
                          {tasksWithNewMessages.map((task) => (
                            <div
                              key={`msg-${task.id}`}
                              className="p-3 border rounded-md cursor-pointer hover:bg-gray-50 mb-2"
                              onClick={() => {
                                handleTaskClick(task);
                                setShowNotificationsDialog(false);
                              }}
                            >
                              <p className="font-medium">{task.title}</p>
                              <p className="text-sm text-gray-500">
                                {task.description}
                              </p>
                              <div className="flex justify-between mt-2">
                                <span className="text-xs text-gray-500">
                                  Срок:{" "}
                                  {new Date(task.deadline).toLocaleDateString()}
                                </span>
                                {task.priority === "high" && (
                                  <span className="text-xs text-gray-500">
                                    Приоритет: Высокий
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </>
                      ) : (
                        <p className="text-gray-500 text-center py-4">
                          Нет новых сообщений
                        </p>
                      )}
                    </TabsContent>

                    <TabsContent
                      value="status"
                      className="space-y-2 max-h-[400px] overflow-y-auto"
                    >
                      {tasksWithNewStatus.length > 0 ? (
                        <>
                          <div className="flex justify-end mb-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                void dispatch(
                                  markNotificationsWithTypeAsRead("status"),
                                )
                              }
                              className="text-xs"
                            >
                              Пометить все как прочитанные
                            </Button>
                          </div>
                          {tasksWithNewStatus.map((task) => (
                            <div
                              key={`status-${task.id}`}
                              className="p-3 border rounded-md cursor-pointer hover:bg-gray-50 mb-2"
                              onClick={() => {
                                handleTaskClick(task);
                                setShowNotificationsDialog(false);
                              }}
                            >
                              <p className="font-medium">{task.title}</p>
                              <p className="text-sm text-gray-500">
                                {task.description}
                              </p>
                              <div className="flex justify-between mt-2">
                                <span className="text-xs text-gray-500">
                                  Срок:{" "}
                                  {new Date(task.deadline).toLocaleDateString()}
                                </span>
                                <span className="text-xs text-blue-500">
                                  Статус:{" "}
                                  {task.status === "overdue"
                                    ? "просрочено"
                                    : task.status === "in_progress"
                                      ? "в работе"
                                      : task.status === "new"
                                        ? "новое"
                                        : task.status === "completed"
                                          ? "завершена"
                                          : task.status === "on_verification"
                                            ? "на проверке"
                                            : task.status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </>
                      ) : (
                        <p className="text-gray-500 text-center py-4">
                          Нет обновлений статуса
                        </p>
                      )}
                    </TabsContent>
                  </Tabs>
                </DialogContent>
              </Dialog>

              {/* Кнопка выхода - только иконка на мобильных */}
              {screenSize == "mobile" ? (
                <Button
                  onClick={() => void handleLogout()}
                  variant="outline"
                  className="w-[36px] h-[36px] ml-5 p-0 bg-[#eaeefc] hover:bg-[#c0c3cf] rounded-full text-[#4d76fd]"
                  data-tooltip-id="tooltip"
                  data-tooltip-content="Выйти"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              ) : null}
            </div>

            {/* Stats */}
            <div className="bg-transperent w-full h-[8px] rounded-full mt-[20px] relative overflow-hidden">
              {/* Просроченные */}
              <div
                className="bg-[#DA100B] h-full absolute left-0 transition-all duration-300 rounded-full"
                style={{
                  width: `calc(${(groupedTasks.byStatus.overdue.length / (groupedTasks.byStatus.overdue.length + groupedTasks.byStatus.new.length + groupedTasks.byStatus.on_verification.length + groupedTasks.byStatus.in_progress.length)) * 100}% - 3.75px)`,
                  marginRight: "5px",
                }}
              />

              {/* Новые */}
              <div
                className="bg-[#BCBCBC] h-full absolute transition-all duration-300 rounded-full"
                style={{
                  width: `calc(${(groupedTasks.byStatus.new.length / (groupedTasks.byStatus.overdue.length + groupedTasks.byStatus.new.length + groupedTasks.byStatus.on_verification.length + groupedTasks.byStatus.in_progress.length)) * 100}% - 7.5px)`,
                  left: `calc(${(groupedTasks.byStatus.overdue.length / (groupedTasks.byStatus.overdue.length + groupedTasks.byStatus.new.length + groupedTasks.byStatus.on_verification.length + groupedTasks.byStatus.in_progress.length)) * 100}% + 1.25px)`,
                }}
              />

              {/* На проверке */}
              <div
                className="bg-[#EEF4C7] h-full absolute transition-all duration-300 rounded-full"
                style={{
                  width: `calc(${(groupedTasks.byStatus.on_verification.length / (groupedTasks.byStatus.overdue.length + groupedTasks.byStatus.new.length + groupedTasks.byStatus.on_verification.length + groupedTasks.byStatus.in_progress.length)) * 100}% - 7.5px)`,
                  left: `calc(${((groupedTasks.byStatus.overdue.length + groupedTasks.byStatus.new.length) / (groupedTasks.byStatus.overdue.length + groupedTasks.byStatus.new.length + groupedTasks.byStatus.on_verification.length + groupedTasks.byStatus.in_progress.length)) * 100}% + 1.25px)`,
                }}
              />

              {/* В работе */}
              <div
                className="bg-[#3F79FF] h-full absolute transition-all duration-300 rounded-full"
                style={{
                  width: `calc(${(groupedTasks.byStatus.in_progress.length / (groupedTasks.byStatus.overdue.length + groupedTasks.byStatus.new.length + groupedTasks.byStatus.on_verification.length + groupedTasks.byStatus.in_progress.length)) * 100}% - 3.75px)`,
                  left: `calc(${((groupedTasks.byStatus.overdue.length + groupedTasks.byStatus.new.length + groupedTasks.byStatus.on_verification.length) / (groupedTasks.byStatus.overdue.length + groupedTasks.byStatus.new.length + groupedTasks.byStatus.on_verification.length + groupedTasks.byStatus.in_progress.length)) * 100}% + 1.25px)`,
                }}
              />
            </div>

            <div className="p-4">
              <div className="flex flex-col space-y-3">
                {/* Первая строка */}
                <div className="flex justify-between space-x-3">
                  <div
                    className={`text-center p-3 rounded-lg cursor-pointer border flex-1 transition-all duration-200 h-4 min-w-[140px]
											'border-gray-200'}
											flex items-center space-x-2 justify-center hover:bg-gray-200`}
                    onClick={() => handleStatusClick("overdue")}
                  >
                    <div className="w-2 h-2 rounded-full bg-[#DA100B]"></div>
                    <p className="text-xs font-bold">
                      {groupedTasks.byStatus.overdue.length}
                    </p>
                    <p className="text-xs text-gray-500">Просрочено</p>
                  </div>

                  <div
                    className={`text-center p-3 rounded-lg cursor-pointer border flex-1 transition-all duration-200 h-4 min-w-[100px]
											'border-gray-200'}
											flex items-center space-x-2 justify-center hover:bg-gray-200`}
                    onClick={() => handleStatusClick("in_progress")}
                  >
                    <div className="w-2 h-2 rounded-full bg-[#3F79FF]"></div>
                    <p className="text-xs font-bold">
                      {groupedTasks.byStatus.in_progress.length}
                    </p>
                    <p className="text-xs text-gray-500">В работе</p>
                  </div>
                </div>

                {/* Вторая строка */}
                <div className="flex justify-between space-x-3">
                  <div
                    className={`text-center p-3 rounded-lg cursor-pointer border flex-1 transition-all duration-200 h-4 min-w-[90px] max-w-[100px]
											'border-gray-200'}
											flex items-center space-x-2 justify-center hover:bg-gray-200`}
                    onClick={() => handleStatusClick("new")}
                  >
                    <div className="w-2 h-2 rounded-full bg-[#BCBCBC]"></div>
                    <p className="text-xs font-bold">
                      {groupedTasks.byStatus.new.length}
                    </p>
                    <p className="text-xs text-gray-500">Новые</p>
                  </div>

                  <div
                    className={`text-center p-3 rounded-lg cursor-pointer border flex-1 transition-all duration-200 h-4 min-w-[120px]
											'border-gray-200'}
											flex items-center space-x-2 justify-center hover:bg-gray-200`}
                    onClick={() => handleStatusClick("on_verification")}
                  >
                    <div className="w-2 h-2 rounded-full bg-[#EEF4C7]"></div>
                    <p className="text-xs font-bold">
                      {groupedTasks.byStatus.on_verification.length}
                    </p>
                    <p className="text-xs text-gray-500">На проверке</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Subordinates */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
              <div
                className={`flex flex-col ${screenSize == "mobile" ? "items-center" : ""} gap-3`}
              >
                {subordinates.length > 0 ? (
                  subordinates.map((user) => (
                    <div
                      key={user.id}
                      className={`relative group flex items-center cursor-pointer hover:bg-gray-100 rounded p-2 w-full ${
                        filter.user.id === user.id
                          ? "border-b-2 border-blue-500"
                          : ""
                      }`}
                      onClick={() => handleSelectEmployee(user)}
                    >
                      <Avatar className="h-10 w-10 mr-3">
                        <AvatarImage src={user.image} alt={user.fullname} />
                        <AvatarFallback>
                          {user.fullname ? user.fullname.slice(0, 2) : "UN"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span
                          className={`text-m font-medium ${
                            filter.user.id === user.id
                              ? "border-b-2 border-blue-500"
                              : ""
                          }`}
                        >
                          {user.fullname}
                        </span>
                        <span className="text-s text-gray-500">
                          {user.department?.name || "Не назначен"}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-500">
                    Нет подчиненных
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Logout button at the bottom */}
          {screenSize != "mobile" ? (
            <div className="mt-auto p-4 border-t border-gray-200">
              <Button
                onClick={() => void handleLogout()}
                variant="outline"
                className="w-full flex items-center justify-center gap-2 text-gray-600 hover:text-red-500 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" />
                <span>Выйти</span>
              </Button>
            </div>
          ) : null}

          <Tooltip id="tooltip" />

          <Dialog open={showTasksDialog} onOpenChange={setShowTasksDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {getStatusLabel(selectedStatus)} ({filteredTasks.length})
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {filteredTasks.length > 0 ? (
                  filteredTasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-3 border rounded-md cursor-pointer hover:bg-gray-50"
                      onClick={() => {
                        handleTaskClick(task);
                        setShowTasksDialog(false);
                      }}
                    >
                      <p className="font-medium">{task.title}</p>
                      <p className="text-sm text-gray-500">
                        {task.description}
                      </p>
                      <div className="flex justify-between mt-2">
                        <span
                          className={`text-xs ${
                            task.status === "overdue"
                              ? "text-red-500"
                              : "text-gray-500"
                          }`}
                        >
                          {task.status === "overdue" ? "Просрочено" : "Срок"}:{" "}
                          {new Date(task.deadline).toLocaleDateString()}
                        </span>
                        {task.priority === "high" && (
                          <span className="text-xs text-gray-500">
                            Приоритет: Высокий
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">
                    Нет задач с выбранным статусом
                  </p>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
};

export default LeftSidebar;
