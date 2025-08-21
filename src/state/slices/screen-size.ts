import { createSlice } from "@reduxjs/toolkit";
import { set } from "../common";

// This state stores the screen size
const screenSizeSlice = createSlice({
  name: "screen-size",
  initialState: initialState(),
  reducers: { setScreenSize: set },
});

export const { setScreenSize } = screenSizeSlice.actions;
export default screenSizeSlice.reducer;

function initialState(): ScreenSizeState {
  return { value: undefined };
}

export interface ScreenSizeState {
  value?: "desktop" | "tablet" | "mobile";
}
