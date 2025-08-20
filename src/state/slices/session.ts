import {
  createSlice,
  createAsyncThunk,
  AsyncThunkPayloadCreator,
} from "@reduxjs/toolkit";
import { supabase } from "@/supabase/client";
import { set, addThunkCases, RejectType, AsyncState } from "../common";

// This state stores the user session
const sessionSlice = createSlice({
  name: "session",
  initialState: initialState(),
  reducers: { setSession: set },
  extraReducers: (builder) => addThunkCases(builder, getSession),
});

export const { setSession } = sessionSlice.actions;
export default sessionSlice.reducer;

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

export interface Session {
  id: string;
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
