import { createSlice } from "@reduxjs/toolkit";

import { set } from "../common";

const initialState: ViewHistoryState = { value: [] };

const slice = createSlice({
  name: "view-history",
  initialState,
  reducers: { setViewHistory: set },
});

export const { setViewHistory } = slice.actions;
export default slice.reducer;

export interface ViewHistoryState {
  value?: ViewHistory;
}

export type ViewHistory = HistoryItem[];
export type HistoryItem = "task"; // Could add more items in the future
