import { createSlice } from "@reduxjs/toolkit";

import { set } from "../common";

const initialState: ViewHistoryState = { value: [] };

const slice = createSlice({
  name: "view-history",
  initialState,
  reducers: { setViewHistory: set<ViewHistoryState> },
});

export const { setViewHistory } = slice.actions;
export default slice.reducer;

export interface ViewHistoryState {
  value?: ViewHistory;
}

export type ViewHistory = HistoryItem[];
export type HistoryItem = "task" | "task history";
