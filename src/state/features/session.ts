import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Session } from "@supabase/supabase-js";

import { AsyncState } from "../common";
import { store } from "../store";
import { fetchUser } from "./user";

import { supabase } from "@/supabase/client";

const initialState: SessionState = {
  value: undefined,
  loading: true,
  error: null,
};

const slice = createSlice({
  name: "session",
  initialState,
  reducers: { setSession: handleSessionSetting },
});

export const { setSession } = slice.actions;
export default slice.reducer;

export interface SessionState extends AsyncState {
  value?: Session;
}

function handleSessionSetting(
  state: SessionState,
  action: PayloadAction<Session>,
) {
  state.value = action.payload;
  state.loading = false;
}

export function listenToSession() {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(handleNewAuthState);

  return () => {
    subscription.unsubscribe();
  };
}

function handleNewAuthState(_: any, session: Session) {
  store.dispatch(setSession(session));
  if (session) void store.dispatch(fetchUser(session.user.id));
}
