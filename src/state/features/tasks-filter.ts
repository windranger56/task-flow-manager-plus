import { createSlice } from "@reduxjs/toolkit";

import { set, State } from "../common";
import { User } from "./user";

const initialState: TasksFilterState = { value: undefined };

const slice = createSlice({
  name: "task-filter",
  initialState,
  reducers: { setTasksFilter: set<TasksFilterState> },
});

export const { setTasksFilter } = slice.actions;
export default slice.reducer;

export interface TasksFilterState extends State {
  value?: TasksFilter;
}

export interface TasksFilter {
  user?: User;
  role: "all" | "assignee" | "author" | "subordinate";
  archived: boolean;
}
