import { configureStore } from "@reduxjs/toolkit";
import session from "./slices/session";
import headerTitle from "./slices/header-title";
import isShowingArchived from "./slices/is-showing-archived";

export const store = configureStore({
  reducer: {
    session,
    headerTitle,
    isShowingArchived,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
