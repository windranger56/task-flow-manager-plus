import { createSlice } from "@reduxjs/toolkit";

import { set, State } from "../common";

// This state stores the tab in mobile interface
const initialState: MobileTabState = { value: "account" };

const slice = createSlice({
  name: "header-title",
  initialState,
  reducers: { setMobileTab: set<MobileTabState> },
});

export const { setMobileTab } = slice.actions;
export default slice.reducer;

export interface MobileTabState extends State {
  value?: MobileTab;
}

export type MobileTab =
  | "account"
  | "tasks"
  | "add"
  | "calendar"
  | "notifications";
