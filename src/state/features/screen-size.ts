import { createSlice } from "@reduxjs/toolkit";

import { store } from "../store";
import { set, State } from "../common";

const initialState: ScreenSizeState = { value: undefined };

const slice = createSlice({
  name: "screen-size",
  initialState,
  reducers: { setScreenSize: set<ScreenSizeState> },
});

export const { setScreenSize } = slice.actions;
export default slice.reducer;

export interface ScreenSizeState extends State {
  value?: ScreenSize;
}

export type ScreenSize = "desktop" | "tablet" | "mobile";

export function listenToScreenSize() {
  updateScreenSizeFromWindow();
  window.addEventListener("resize", updateScreenSizeFromWindow);
  return () => window.removeEventListener("resize", updateScreenSizeFromWindow);
}

export function updateScreenSizeFromWindow() {
  if (window.innerWidth <= BREAKPOINTS.mobile)
    store.dispatch(setScreenSize("mobile"));
  else if (window.innerWidth <= BREAKPOINTS.tablet)
    store.dispatch(setScreenSize("tablet"));
  else store.dispatch(setScreenSize("desktop"));
}

export const BREAKPOINTS = {
  mobile: 640,
  tablet: 1024,
} as const;
