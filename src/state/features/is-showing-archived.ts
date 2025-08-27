import { createSlice } from "@reduxjs/toolkit";

import { set, State } from "../common";

const initialState: IsShowingArchivedState = { value: false };

const slice = createSlice({
  name: "is-showing-archived",
  initialState,
  reducers: { setIsShowingArchived: set<IsShowingArchivedState> },
});

export const { setIsShowingArchived } = slice.actions;
export default slice.reducer;

export interface IsShowingArchivedState extends State {
  value?: boolean;
}
