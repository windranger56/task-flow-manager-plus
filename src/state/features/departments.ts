import { createAsyncThunk, createSlice, GetThunkAPI } from "@reduxjs/toolkit";

import { addThunkCases, AsyncState, set } from "../common";
import { User } from "./user";
import { RootState } from "../store";

import { supabase } from "@/supabase/client";

const initialState: DepartmentsState = {
  value: [],
  loading: false,
  error: null,
};

const slice = createSlice({
  name: "departments",
  initialState,
  reducers: { setDepartments: set<DepartmentsState> },
  extraReducers: (builder) => {
    addThunkCases(builder, fetchDepartments);
    addThunkCases(builder, createDepartment);
  },
});

export const { setDepartments } = slice.actions;
export default slice.reducer;

export interface DepartmentsState extends AsyncState {
  value: Department[];
}

export interface Department {
  id: number;
  name: string;
  manager: User;
  employees: User[];
  color: string;
  created_by?: number;
}

export const fetchDepartments = createAsyncThunk<Department[], void>(
  "departments/fetch",
  (_, thunkAPI) => handleDepartmentsFetch(thunkAPI),
);

async function handleDepartmentsFetch(
  thunkAPI: GetThunkAPI<{ state: RootState }>,
) {
  const user = thunkAPI.getState().user.value;

  const { data, error } = await supabase
    .from("departments")
    .select(
      "*, manager:users!departments_managerId_fkey(*), tasks(*), employees:users!users_departmentId_fkey(*)",
    )
    .or(
      `${user.departmentId ? `id.eq.${user.departmentId},` : ""}created_by.eq.${user.id},managerId.eq.${user.id}`,
    )
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data as Department[];
}

export const createDepartment = createAsyncThunk<
  Department[],
  DepartmentCreationData
>("departments/new", (form, thunkAPI) =>
  handleDepartmentCreation(form, thunkAPI),
);

async function handleDepartmentCreation(
  data: DepartmentCreationData,
  thunkAPI: GetThunkAPI<{ state: RootState }>,
) {
  const departments = thunkAPI.getState().departments.value;

  const [newDepartment] = await Promise.all([
    createDepartmentInDB(data),
    updateLeader(data.managerId, data.user.id),
  ]);

  return [...departments, newDepartment];
}

async function createDepartmentInDB(data: DepartmentCreationData) {
  const { name, managerId, user } = data;

  const formData = {
    name,
    managerId,
    created_by: user.id,
  };

  const { data: department, error } = await supabase
    .from("departments")
    .insert(formData)
    .select("*, manager:users!departments_managerId_fkey(id, fullname)")
    .single<Department>();

  if (error) throw error;

  return department;
}

async function updateLeader(managerId: number, leaderId: number) {
  const { error } = await supabase
    .from("users")
    .update({ leader_id: leaderId })
    .eq("id", managerId);

  if (error) throw error;
}

export interface DepartmentCreationData {
  user: User;
  name: string;
  managerId: number;
  userIds: string[];
}
