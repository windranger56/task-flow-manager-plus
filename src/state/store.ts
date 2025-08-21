import { configureStore } from "@reduxjs/toolkit";
import session from "./slices/session";
import headerTitle from "./slices/header-title";
import isShowingArchived from "./slices/is-showing-archived";
import screenSize from "./slices/screen-size";

export const store = configureStore({
  reducer: {
    session,
    headerTitle,
    isShowingArchived,
    screenSize,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
