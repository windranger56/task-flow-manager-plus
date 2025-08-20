import { createSlice } from "@reduxjs/toolkit";
import { set } from "../common";

// This state stores whether the application should
// show the archived tasks or the active ones
const isShowingArchivedSlice = createSlice({
  name: "is-showing-archived",
  initialState: initialState(),
  reducers: { setIsShowingArchived: set },
});

export const { setIsShowingArchived } = isShowingArchivedSlice.actions;
export default isShowingArchivedSlice.reducer;

function initialState(): IsShowingArchivedState {
  return { value: false };
}

export interface IsShowingArchivedState {
  value?: boolean;
}
