import { createSlice } from "@reduxjs/toolkit";
import { set } from "../common";

// This state stores whether the application should
// show the archived tasks or the active ones
const slice = createSlice({
  name: "is-showing-archived",
  initialState: initialState(),
  reducers: { setIsShowingArchived: set },
});

export const { setIsShowingArchived } = slice.actions;
export default slice.reducer;

function initialState(): IsShowingArchivedState {
  return { value: false };
}

export interface IsShowingArchivedState {
  value?: boolean;
}
