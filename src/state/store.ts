import { configureStore } from "@reduxjs/toolkit";

import session from "./features/session";
import headerTitle from "./features/header-title";
import mobileTab from "./features/mobile-tab";
import isShowingArchived from "./features/is-showing-archived";
import screenSize from "./features/screen-size";
import departments from "./features/departments";
import tasks from "./features/tasks";
import tasksFilter from "./features/tasks-filter";
import groupedTasks from "./features/grouped-tasks";
import selectedTask from "./features/selected-task";
import user from "./features/user";
import subordinates from "./features/subordinates";
import notifications from "./features/notifications";
import viewHistory from "./features/viewHistory";

export const store = configureStore({
  reducer: {
    session,
    user,
    subordinates,
    headerTitle,
    mobileTab,
    isShowingArchived,
    screenSize,
    tasks,
    groupedTasks,
    selectedTask,
    tasksFilter,
    departments,
    notifications,
    viewHistory,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
