import { createAsyncThunk, createSlice, GetThunkAPI } from "@reduxjs/toolkit";

import { addThunkCases, AsyncState, set } from "../common";
import { User } from "./user";
import { RootState } from "../store";

import { supabase } from "@/supabase/client";

const initialState: SubordinatesState = {
  value: [],
  loading: false,
  error: null,
};

const slice = createSlice({
  name: "subordinates",
  initialState,
  reducers: { setSubordinates: set<SubordinatesState> },
  extraReducers: (builder) => {
    addThunkCases(builder, fetchSubordinates);
  },
});

export const { setSubordinates } = slice.actions;
export default slice.reducer;

export interface SubordinatesState extends AsyncState {
  value: User[];
}

export const fetchSubordinates = createAsyncThunk<User[], void>(
  "subordinates/fetch",
  (_, thunkAPI) => handleDepartmentsFetch(thunkAPI),
);

async function handleDepartmentsFetch(
  thunkAPI: GetThunkAPI<{ state: RootState }>,
) {
  const user = thunkAPI.getState().user.value;

  const { data, error } = await supabase
    .from("users")
    .select("*, department:departments!users_departmentId_fkey(*)")
    .eq("leader_id", user.id);

  if (error) throw error;

  return data as User[];
}
