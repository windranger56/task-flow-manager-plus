import { createSlice } from "@reduxjs/toolkit";
import { Session } from "@supabase/supabase-js";

import { set, State } from "../common";
import { store } from "../store";
import { fetchUser } from "./user";

import { supabase } from "@/supabase/client";

const initialState: SessionState = { value: undefined };

const slice = createSlice({
  name: "session",
  initialState,
  reducers: { setSession: set<SessionState> },
});

export const { setSession } = slice.actions;
export default slice.reducer;

export interface SessionState extends State {
  value?: Session;
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
  void store.dispatch(fetchUser(session.user.id));
}
