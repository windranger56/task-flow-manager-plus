import { createSlice } from "@reduxjs/toolkit";
import { set } from "../common";

// This state stores the application view history
const slice = createSlice({
  name: "view-history",
  initialState: initialState(),
  reducers: { setViewHistory: set },
});

export const { setViewHistory } = slice.actions;
export default slice.reducer;

function initialState(): ViewHistoryState {
  return { value: [] };
}

export interface ViewHistoryState {
  value?: ViewHistory;
}

export type ViewHistory = HistoryItem[];
export type HistoryItem = "task"; // Could add more items in the future
