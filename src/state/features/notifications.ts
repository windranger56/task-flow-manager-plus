import { createAsyncThunk, createSlice, GetThunkAPI } from "@reduxjs/toolkit";

import { addThunkCases, AsyncState, set } from "../common";
import { User } from "./user";
import { RootState } from "../store";
import { Task } from "./selected-task";
import { updateTasksInDB, shapeTaskForApp, SupabaseTask } from "./tasks";

import { supabase } from "@/supabase/client";

const initialState: NotificationsState = {
  value: { tasksWithNewStatus: [], tasksWithNewMessages: [] },
  loading: true,
  error: null,
};

const slice = createSlice({
  name: "notifications",
  initialState,
  reducers: { setNotifications: set<NotificationsState> },
  extraReducers: (builder) => {
    addThunkCases(builder, fetchNotifications);
    addThunkCases(builder, markNotificationsWithTypeAsRead);
  },
});

export const { setNotifications } = slice.actions;
export default slice.reducer;

export interface NotificationsState extends AsyncState {
  value: Notifications;
}

export const fetchNotifications = createAsyncThunk<Notifications, void>(
  "notifications/fetch",
  (_, thunkAPI) => handleNotificationsFetch(thunkAPI),
);

async function handleNotificationsFetch(
  thunkAPI: GetThunkAPI<{ state: RootState }>,
) {
  const user = thunkAPI.getState().user.value;

  const [tasksWithNewStatus, tasksWithNewMessages] = await Promise.all([
    fetchTasksWithNewStatus(user),
    fetchTasksWithNewMessages(user),
  ]);

  return { tasksWithNewStatus, tasksWithNewMessages };
}

async function fetchTasksWithNewStatus(user: User) {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("is_new", true)
    .or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`);

  if (error) throw error;

  return data.map((task: SupabaseTask) => shapeTaskForApp(task));
}

async function fetchTasksWithNewMessages(user: User) {
  const { data, error } = await supabase
    .from("tasks")
    .select("*, messages!inner(*)")
    .eq("messages.is_new", true)
    .neq("messages.sent_by", user.id)
    .or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`);

  if (error) throw error;

  return data.map((task: SupabaseTask) => shapeTaskForApp(task));
}

export const markNotificationsWithTypeAsRead = createAsyncThunk<
  Notifications,
  NotificationType
>("notifications/mark-all-as-read", (type, thunkAPI) =>
  handleTypeAsReadMarking(type, thunkAPI),
);

async function handleTypeAsReadMarking(
  type: NotificationType,
  thunkAPI: GetThunkAPI<{ state: RootState }>,
) {
  const notifications = thunkAPI.getState().notifications.value;

  if (type === "messages")
    return await markTasksWithNewMessagesAsRead(notifications);
  else if (type === "status")
    return await markTasksWithNewStatusAsRead(notifications);

  throw new Error("Incorrect notification type");
}

async function markTasksWithNewMessagesAsRead(notifications: Notifications) {
  await updateTasksInDB(notifications.tasksWithNewMessages, { is_new: false });
  notifications.tasksWithNewMessages = [];
  return notifications;
}

async function markTasksWithNewStatusAsRead(notifications: Notifications) {
  await updateTasksInDB(notifications.tasksWithNewStatus, { is_new: false });
  notifications.tasksWithNewStatus = [];
  return notifications;
}

export interface Notifications {
  tasksWithNewStatus: Task[];
  tasksWithNewMessages: Task[];
}

export type NotificationType = "messages" | "status";
