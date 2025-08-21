import {
  createSlice,
  createAsyncThunk,
  AsyncThunkPayloadCreator,
} from "@reduxjs/toolkit";
import { supabase } from "@/supabase/client";
import { set, addThunkCases, RejectType, AsyncState } from "../common";
import { Session } from "@supabase/supabase-js"

// This state stores the user session
const slice = createSlice({
  name: "session",
  initialState: initialState(),
  reducers: { setSession: set<SessionState> },
  extraReducers: (builder) => addThunkCases(builder, getSession),
});

export const { setSession } = slice.actions;
export default slice.reducer;

function initialState(): SessionState {
  return {
    value: undefined,
    loading: false,
    error: undefined,
  };
}

export interface SessionState extends AsyncState {
  value?: Session;
}

export const getSession = createAsyncThunk<Session>(
  "session/authenticate",
  authenticate as unknown as AsyncThunkPayloadCreator<Session, void>,
);

async function authenticate(_: void, { rejectWithValue }: RejectType) {
  const { data, error } = await supabase.auth.getSession();
  if (error) return rejectWithValue(error.message);
  return data.session.user;
}
