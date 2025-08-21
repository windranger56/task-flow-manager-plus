import { createSlice } from "@reduxjs/toolkit";
import { set } from "../common";

// This state stores the screen size
const slice = createSlice({
  name: "screen-size",
  initialState: initialState(),
  reducers: { setScreenSize: set },
});

export const { setScreenSize } = slice.actions;
export default slice.reducer;

function initialState(): ScreenSizeState {
  return { value: undefined };
}

export interface ScreenSizeState {
  value?: "desktop" | "tablet" | "mobile";
}
