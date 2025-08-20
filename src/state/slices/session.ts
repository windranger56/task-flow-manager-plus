import {
  createSlice,
  createAsyncThunk,
  AsyncThunkPayloadCreator,
} from "@reduxjs/toolkit";
import { supabase } from "@/supabase/client";
import { State, set as commonSet, addThunkCases, RejectType } from "../common";

const sessionSlice = createSlice({
  name: "session",
  initialState: initialState(),
  reducers: { set: commonSet },
  extraReducers: (builder) => addThunkCases(builder, authenticationThunk),
});

export const { set } = sessionSlice.actions;
export default sessionSlice.reducer;

function initialState(): SessionState {
  return {
    value: undefined,
    loading: false,
    error: undefined,
  };
}

interface SessionState extends State {
  value?: Session;
}

export interface Session {
  id: string;
}

export const authenticationThunk = createAsyncThunk<Session>(
  "session/authenticate",
  authenticate as unknown as AsyncThunkPayloadCreator<Session, void>,
);

async function authenticate(_: void, { rejectWithValue }: RejectType) {
  const { data, error } = await supabase.auth.getSession();
  if (error) return rejectWithValue(error.message);
  return data.session.user;
}
