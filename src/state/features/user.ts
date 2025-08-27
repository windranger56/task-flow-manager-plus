import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { addThunkCases, AsyncState, set } from "../common";
import { Department } from "./departments";

import { supabase } from "@/supabase/client";

const initialState: UserState = {
  value: undefined,
  loading: true,
  error: null,
};

const slice = createSlice({
  name: "user",
  initialState,
  reducers: { setUser: set<UserState> },
  extraReducers: (builder) => addThunkCases(builder, fetchUser),
});

export const { setUser } = slice.actions;
export default slice.reducer;

export interface UserState extends AsyncState {
  value?: User;
}

export interface User {
  id: number;
  departmentId: number;
  department: Department;
  fullname: string;
  email: string;
  image: string;
  role?: Role;
}

export enum Role {
  employee,
  manager,
  admin,
}

export const fetchUser = createAsyncThunk<User, string>("user/fetch", (uid) =>
  handleUserFetching(uid),
);

async function handleUserFetching(uid: string) {
  const { data, error } = await supabase
    .from("users")
    .select("*, department:departments!users_departmentId_fkey(*)")
    .eq("user_unique_id", uid)
    .single<User>();

  if (error) throw error;
  return data;
}

export async function updateUser(id: number, newData: Partial<User>) {
  const { error } = await supabase.from("users").update(newData).eq("id", id);
  if (error) throw error;
}
