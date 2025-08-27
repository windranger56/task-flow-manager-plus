import { createSlice } from "@reduxjs/toolkit";

import { set, State } from "../common";
import { User } from "./user";
import { Department } from "./departments";

const initialState: SelectedTaskState = { value: undefined };

const slice = createSlice({
  name: "selected-task",
  initialState,
  reducers: { setSelectedTask: set<SelectedTaskState> },
});

export const { setSelectedTask } = slice.actions;
export default slice.reducer;

export interface SelectedTaskState extends State {
  value?: Task;
}

export interface Task {
  id: number;
  title: string;
  description: string;
  assignedTo: number;
  assignee: User;
  createdBy: number;
  departmentId: number;
  department: Department;
  parentId: number;
  priority: Priority;
  isProtocol: ProtocolStatus;
  createdAt: string;
  deadline: string;
  status: TaskStatus;
  is_new?: boolean;
}

export type Priority = "high" | "medium" | "low";

export type ProtocolStatus = "active" | "inactive" | "pending";

export type TaskStatus =
  | "completed"
  | "in_progress"
  | "overdue"
  | "new"
  | "on_verification";
