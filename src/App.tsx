import { Navigate } from "react-router-dom";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect, useLayoutEffect } from "react";
import { Provider } from "react-redux";
import { Loader2 } from "lucide-react";

import Index from "./pages/Index";
import { store } from "./state/store";
import { useAppDispatch, useAppSelector } from "./state/hooks";
import { listenToSession } from "./state/features/session";
import { listenToScreenSize } from "./state/features/screen-size";
import { fetchTasks } from "./state/features/tasks";
import { fetchDepartments } from "./state/features/departments";
import { fetchSubordinates } from "./state/features/subordinates";
import { fetchNotifications } from "./state/features/notifications";
import { groupTasks } from "./state/features/grouped-tasks";
import { setTasksFilter } from "./state/features/tasks-filter";

import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import Auth from "@/pages/Auth";

const App = () => {
  const dispatch = useAppDispatch();

  const session = useAppSelector((state) => state.session.value);
  const { value: user, loading: userLoading } = useAppSelector(
    (state) => state.user,
  );
  const { value: tasks, loading: tasksLoading } = useAppSelector(
    (state) => state.tasks,
  );
  const subordinatesLoading = useAppSelector(
    (state) => state.subordinates.loading,
  );
  const notificationsLoading = useAppSelector(
    (state) => state.notifications.loading,
  );
  const filter = useAppSelector((state) => state.tasksFilter.value);

  useLayoutEffect(() => {
    removeLovableBadge();
    return listenToSession();
  }, []);

  useLayoutEffect(() => {
    if (!user) return;
    void dispatch(fetchDepartments());
    void dispatch(fetchTasks());
    void dispatch(fetchSubordinates());
    void dispatch(fetchNotifications());
    dispatch(setTasksFilter({ user, role: "all", archived: false }));
  }, [user]);

  useLayoutEffect(() => {
    if (!tasks.length) return;
    dispatch(groupTasks({ tasks, filter }));
  }, [tasks]);

  useEffect(() => listenToScreenSize(), []);

  if (
    userLoading ||
    tasksLoading ||
    subordinatesLoading ||
    notificationsLoading
  )
    return (
      <div className="h-screen w-screen flex justify-center items-center">
        <Loader2 className="h-16 w-16 animate-spin text-blue-600" />
      </div>
    );

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/auth"
          element={session ? <Navigate to="/" replace /> : <Auth />}
        />
        <Route
          path="/"
          element={
            session ? (
              <AuthenticatedLayout>
                <Index />
              </AuthenticatedLayout>
            ) : (
              <Navigate to="/auth" replace />
            )
          }
        />
      </Routes>
    </BrowserRouter>
  );
};

function Root() {
  return (
    <Provider store={store}>
      <Toaster />
      <TooltipProvider>
        <App />
      </TooltipProvider>
    </Provider>
  );
}

export default Root;

function removeLovableBadge() {
  const badge = document.getElementById("lovable-badge");
  if (badge) badge.style.display = "none";
}

const AuthenticatedLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen bg-background">
    <div className="flex">
      <div className="flex-1 md:px-10 w-full max-w-screen">{children}</div>
    </div>
  </div>
);
