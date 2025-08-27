import { createSlice } from "@reduxjs/toolkit";

import { set, State } from "../common";

// This state stores the title that appears in the
// middle of the mobile applicaion header
const initialState: HeaderTitleState = { value: "Личный кабинет" };

const slice = createSlice({
  name: "header-title",
  initialState,
  reducers: { setHeaderTitle: set<HeaderTitleState> },
});

export const { setHeaderTitle } = slice.actions;
export default slice.reducer;

export interface HeaderTitleState extends State {
  value?: HeaderTitle;
}

export type HeaderTitle =
  | "Личный кабинет"
  | "Поручения"
  | "Поручение"
  | "Новое поручение"
  | "Календарь"
  | "Уведомления";
