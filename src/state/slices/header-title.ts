import { createSlice } from "@reduxjs/toolkit";
import { set } from "../common";

// This state stores the title that appears in the
// middle of the mobile applicaion header
const slice = createSlice({
  name: "header-title",
  initialState: initialState(),
  reducers: { setHeaderTitle: set<HeaderTitleState> },
});

export const { setHeaderTitle } = slice.actions;
export default slice.reducer;

function initialState(): HeaderTitleState {
  return { value: "Личный кабинет" };
}

export interface HeaderTitleState {
  value?: HeaderTitle;
}

export type HeaderTitle =
  | "Личный кабинет"
  | "Поручения"
  | "Поручение"
  | "Новое поручение"
  | "Календарь"
  | "Уведомления";
