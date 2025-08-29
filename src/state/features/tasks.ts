import { createAsyncThunk, createSlice, GetThunkAPI } from "@reduxjs/toolkit";

import { addThunkCases, AsyncState, set } from "../common";
import {
  Priority,
  ProtocolStatus,
  setSelectedTask,
  Task,
  TaskStatus,
} from "./selected-task";
import { User } from "./user";
import { RootState } from "../store";
import { Department } from "./departments";

import { supabase } from "@/supabase/client";

const initialState: TasksState = {
  value: [],
  loading: true,
  error: null,
};

const slice = createSlice({
  name: "tasks",
  initialState,
  reducers: {
    setTasks: set<TasksState>,
  },
  extraReducers: (builder) => {
    addThunkCases(builder, fetchTasks);
    addThunkCases(builder, refreshOverdueTasks);
    addThunkCases(builder, createTask);
    addThunkCases(builder, updateTask);
    addThunkCases(builder, deleteTask);
  },
});

export const { setTasks } = slice.actions;
export default slice.reducer;

export interface TasksState extends AsyncState {
  value: Task[];
}

export const fetchTasks = createAsyncThunk<Task[], void>(
  "tasks/fetch",
  (_, thunkAPI) => handleTasksFetching(thunkAPI),
);

async function handleTasksFetching(
  thunkAPI: GetThunkAPI<{ state: RootState }>,
) {
  const user = thunkAPI.getState().user.value;

  const { data, error } = await supabase
    .from("tasks")
    .select(
      "*, assignee:users!tasks_assigned_to_fkey(*), department:departments(*)",
    )
    .or(`created_by.eq.${user.id},assigned_to.eq.${user.id}`)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const tasks = data.map((task: SupabaseTask) => shapeTaskForApp(task));
  return tasks;
}

export const refreshOverdueTasks = createAsyncThunk<Task[]>(
  "tasks/checkAndUpdateOverdue",
  (_, thunkAPI) => handleOverdueTasksRefresh(thunkAPI),
);

async function handleOverdueTasksRefresh(
  thunkAPI: GetThunkAPI<{ state: RootState }>,
) {
  const tasks = thunkAPI.getState().tasks.value;
  return await Promise.all(tasks.map(refreshOverdueTask));
}

async function refreshOverdueTask(task: Task) {
  if (!isTaskOverdue(task)) return task;

  const [newTask] = await Promise.all([
    updateTaskStatus(task.id, "overdue"),
    sendSystemMessage(task.id, SYSTEMMESSAGE.overdue),
  ]);

  return newTask;
}

function isTaskOverdue(task: Task) {
  const now = new Date();
  const deadline = new Date(task.deadline);

  return (
    deadline < now && task.status !== "completed" && task.status !== "overdue"
  );
}

async function updateTaskStatus(id: number, status: TaskStatus) {
  const { data, error } = await supabase
    .from("tasks")
    .update({ status })
    .eq("id", id)
    .select()
    .single<Task>();

  if (error) throw error;
  return data;
}

async function sendSystemMessage(id: number, content: string) {
  const { error } = await supabase
    .from("messages")
    .insert([{ content, task_id: id, is_system: 1 }]);
  if (error) throw error;
}

export const SYSTEMMESSAGE = {
  overdue: "Поручение просрочено",
};

export const createTask = createAsyncThunk<Task[], TaskCreationData>(
  "tasks/new",
  (data, thunkAPI) => handleTaskCreation(data, thunkAPI),
);

async function handleTaskCreation(
  data: TaskCreationData,
  thunkAPI: GetThunkAPI<{ state: RootState }>,
) {
  if (data.assignees.length == 0)
    throw new Error("Выберите хотя бы одного исполнителя");

  const template = getNewTaskWithoutAssignee(data);

  const tasksToCreate: SupabaseTaskToCreate[] = data.assignees.map((assignee) =>
    getNewAssignedTask(template, assignee),
  );

  const supabaseTasks = await createTasksInDB(tasksToCreate);
  const newTasks: Task[] = supabaseTasks.map((task) => shapeTaskForApp(task));

  const tasks = thunkAPI.getState().tasks.value;
  return [...tasks, ...newTasks];
}

function getNewTaskWithoutAssignee(data: TaskCreationData) {
  return {
    title: data.title,
    description: data.description,
    created_by: data.author.id,
    priority: data.priority,
    is_protocol: data.isProtocol,
    created_at: new Date().toISOString(),
    deadline: data.deadline,
    status: "new",
  } as const;
}

function getNewAssignedTask(
  task: ReturnType<typeof getNewTaskWithoutAssignee>,
  assignee: User,
): SupabaseTaskToCreate {
  return {
    ...task,
    assigned_to: assignee.id,
    departmentId: assignee.departmentId,
  };
}

export interface TaskCreationData {
  author: User;
  title: string;
  description: string;
  priority: Priority;
  isProtocol: ProtocolStatus;
  deadline: string;
  assignees: User[];
}

async function createTasksInDB(tasks: SupabaseTaskToCreate[]) {
  const { data, error } = await supabase.from("tasks").insert(tasks).select();
  if (error) throw error;
  return data as SupabaseTask[];
}

export function shapeTaskForApp(task: SupabaseTask): Task {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    assignedTo: task.assigned_to,
    assignee: task.assignee,
    createdBy: task.created_by,
    departmentId: task.departmentId,
    department: task.department,
    parentId: task.parent_id,
    priority: task.priority,
    isProtocol: task.is_protocol,
    createdAt: task.created_at,
    deadline: task.deadline,
    status: task.status,
    is_new: task.is_new || false,
  };
}

export const updateTask = createAsyncThunk<
  Task[],
  Partial<SupabaseTask> & { id: number }
>("tasks/update", (data, thunkAPI) => handleTaskUpdate(data, thunkAPI));

async function handleTaskUpdate(
  dataToUpdate: Partial<SupabaseTask> & { id: number },
  thunkAPI: GetThunkAPI<{ state: RootState }>,
) {
  const state = thunkAPI.getState();

  const task = getTaskById(state.tasks.value, dataToUpdate.id);
  if (!task) throw new Error("Задача недоступна для обновления");

  if (dataToUpdate.status)
    authorizeStatusChange(task, state.user.value, dataToUpdate.status);

  const updatedTask = await updateTaskInDB(dataToUpdate);
  const updatedTasks = replaceTask(state.tasks.value, updatedTask);

  return updatedTasks;
}

export function getTaskById(tasks: Task[], id: number) {
  return tasks.filter((task) => task.id == id)[0];
}

function authorizeStatusChange(task: Task, user: User, newStatus: TaskStatus) {
  if (newStatus === "on_verification" && user.id === task.assignedTo)
    throw new Error("Недостаточно привилегий");
  if (newStatus === "completed")
    throw new Error(
      "Невозможно изменить статус поручения так как оно уже завершено",
    );
  if (newStatus === "new" && user.id !== task.assignedTo)
    throw new Error("Только исполнитель может взять поручение в работу");
  if (newStatus === "in_progress" && user.id !== task.assignedTo)
    throw new Error("Только исполнитель может отправить поручение на проверку");
  if (newStatus === "overdue" && user.id !== task.createdBy) {
    throw new Error(
      "Только создатель может перевести просроченное поручение в работу или на проверку",
    );
  }
}

async function updateTaskInDB(
  dataToUpdate: Partial<SupabaseTask> & { id: number },
) {
  const { data, error } = await supabase
    .from("tasks")
    .update(dataToUpdate)
    .eq("id", dataToUpdate.id)
    .select(
      "*, assignee:users!tasks_assigned_to_fkey(*), department:departments(*)",
    )
    .single<SupabaseTask>();

  if (error) throw error;
  return shapeTaskForApp(data);
}

export async function updateTasksInDB(
  tasks: Task[],
  dataToUpdate: Partial<SupabaseTask>,
) {
  const { data, error } = await supabase
    .from("tasks")
    .update(dataToUpdate)
    .in(
      "id",
      tasks.map((task) => task.id),
    )
    .select();

  if (error) throw error;
  return data.map((task: SupabaseTask) => shapeTaskForApp(task));
}

function replaceTask(tasks: Task[], newTask: Task): Task[] {
  return tasks.map((task) => {
    if (task.id != newTask.id) return task;
    else return newTask;
  });
}

export const deleteTask = createAsyncThunk<Task[], number>(
  "tasks/delete",
  (data, thunkAPI) => handleTaskDeletion(data, thunkAPI),
);

async function handleTaskDeletion(
  id: number,
  thunkAPI: GetThunkAPI<{ state: RootState }>,
) {
  await deleteTaskInDB(id);
  const state = thunkAPI.getState();

  const selectedTask = state.selectedTask.value;
  if (selectedTask?.id === id) setSelectedTask(null);

  return state.tasks.value.filter((task) => task.id != id);
}

async function deleteTaskInDB(id: number) {
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw error;
}

export const reassignTask = createAsyncThunk<Task[], TaskReassignmentData>(
  "tasks/reassign",
  (data, thunkAPI) => handleTaskReassignment(data, thunkAPI),
);

async function handleTaskReassignment(
  data: TaskReassignmentData,
  thunkAPI: GetThunkAPI<{ state: RootState }>,
) {
  const state = thunkAPI.getState();

  const authorized = authorizeTaskReassignment(data, state);
  if (!authorized)
    throw new Error(
      "Недостаточно прав для переназначения поручения на выбранного сотрудника.",
    );

  const newTaskData = getReassignedTaskData(data, state.user.value);
  const taskToCreate = shapeTaskForSupabase(newTaskData);
  const newTask = await createTaskInDB(taskToCreate);
  const task = shapeTaskForApp(newTask);

  return [...state.tasks.value, task];
}

function authorizeTaskReassignment(
  data: TaskReassignmentData,
  state: RootState,
): boolean {
  const departments = state.departments.value;
  const user = state.user.value;

  const managedDepartments = departments.filter(
    (dept) => dept.manager.id === user.id,
  );

  const createdDepartments = departments.filter(
    (dept) => dept.created_by === user.id,
  );

  if (userIsTaskCreator(user, data.task)) return true;

  if (
    taskIsAssignedToSomeOfDepartments(data.task, managedDepartments) &&
    userIsInDepartment(data.newAssignee, data.task.departmentId)
  )
    return true;

  if (
    userIsTaskExecutor(user, data.task) &&
    (userIsInSomeOfDepartments(data.newAssignee, managedDepartments) ||
      userIsManagerInSomeOfDepartments(data.newAssignee, createdDepartments))
  )
    return true;

  return false;
}

function userIsTaskCreator(user: User, task: Task) {
  return task.createdBy == user.id;
}

function userIsTaskExecutor(user: User, task: Task) {
  return task.assignedTo == user.id;
}

function taskIsAssignedToSomeOfDepartments(
  task: Task,
  departments: Department[],
) {
  return departments.some((department) => department.id === task.departmentId);
}

function userIsInSomeOfDepartments(user: User, departments: Department[]) {
  return departments.some((department) =>
    userIsInDepartment(user, department.id),
  );
}

function userIsInDepartment(user: User, departmentId: number) {
  return user.departmentId === departmentId;
}

function userIsManagerInSomeOfDepartments(
  user: User,
  createdDepartments: Department[],
) {
  return createdDepartments.some((department) =>
    isDepartmentManager(user, department),
  );
}

function isDepartmentManager(user: User, department: Department) {
  return department.manager.id == user.id;
}

function shapeTaskForSupabase(task: TaskToCreate): SupabaseTaskToCreate {
  return {
    title: task.title,
    description: task.description,
    assigned_to: task.assignedTo,
    created_by: task.createdBy,
    departmentId: task.departmentId,
    parent_id: task.parentId,
    priority: task.priority,
    is_protocol: task.isProtocol,
    deadline: task.deadline,
    status: task.status,
  };
}

function getReassignedTaskData(
  data: TaskReassignmentData,
  user: User,
): TaskToCreate {
  return {
    title: data.newTitle || `[Переназначено] ${data.task.title}`,
    description: data.newDescription || data.task.description || "",
    assignedTo: data.newAssignee.id,
    createdBy: user.id,
    departmentId: data.newAssignee.departmentId,
    parentId: data.task.id,
    priority: data.task.priority,
    isProtocol: data.task.isProtocol,
    deadline: data.newDeadline || data.task.deadline,
    status: "new",
  };
}

async function createTaskInDB(task: SupabaseTaskToCreate) {
  const { data, error } = await supabase
    .from("tasks")
    .insert(task)
    .select()
    .single<SupabaseTask>();

  if (error) throw error;
  return data;
}

export interface TaskReassignmentData {
  task: Task;
  newAssignee: User;
  newTitle?: string;
  newDescription?: string;
  newDeadline?: string;
}

export interface SupabaseTask {
  id?: number;
  title: string;
  description: string;
  assigned_to: number;
  assignee: User;
  created_by: number;
  departmentId: number;
  department: Department;
  parent_id?: number;
  priority: Priority;
  is_protocol: ProtocolStatus;
  created_at: string;
  deadline: string;
  status: TaskStatus;
  is_new?: boolean;
}

export type TaskToCreate = Omit<
  Task,
  "id" | "createdAt" | "assignee" | "department"
>;

export type SupabaseTaskToCreate = Omit<
  SupabaseTask,
  "id" | "created_at" | "assignee" | "department"
>;
