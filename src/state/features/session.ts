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
  void supabase.auth
    .getSession()
    .then(({ data: { session } }) => handleNewAuthState(session));

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((someShit, session) =>
    handleNewAuthState(session),
  );

  return () => {
    subscription.unsubscribe();
  };
}

function handleNewAuthState(session: Session) {
  store.dispatch(setSession(session || undefined));
  if (session) void store.dispatch(fetchUser(session.user.id));
}
