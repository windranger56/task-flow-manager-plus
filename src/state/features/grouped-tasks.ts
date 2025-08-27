import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { State } from "../common";
import { Task, TaskStatus } from "./selected-task";
import { TasksFilter } from "./tasks-filter";
import { Department } from "./departments";

const initialState: GroupedTasksState = { value: undefined };

const slice = createSlice({
  name: "task-filter",
  initialState,
  reducers: {
    groupTasks: handleTasksGrouping,
  },
});

export const { groupTasks } = slice.actions;
export default slice.reducer;

export interface GroupedTasksState extends State {
  value?: GroupedTasks;
}

export interface GroupedTasks {
  byStatus: { [status in TaskStatus]: Task[] };
  byDepartment: TasksOfDepartment[];
}

export interface TasksOfDepartment {
  department: Department;
  tasks: Task[];
}

function handleTasksGrouping(
  state: GroupedTasksState,
  action: PayloadAction<GroupingData>,
) {
  const { filter } = action.payload;
  let tasks = filterTasksByUser(action.payload.tasks, filter);
  tasks = filterTasksByArchived(tasks, filter);

  state.value = {
    byStatus: {
      completed: filterTasksByStatus(tasks, "completed"),
      in_progress: filterTasksByStatus(tasks, "in_progress"),
      overdue: filterTasksByStatus(tasks, "overdue"),
      new: filterTasksByStatus(tasks, "new"),
      on_verification: filterTasksByStatus(tasks, "on_verification"),
    },
    byDepartment: groupTasksByDepartments(tasks),
  };
}

function filterTasksByUser(tasks: Task[], filter: TasksFilter) {
  if (filter.role == "assignee")
    return tasks.filter((task) => task.assignedTo == filter.user.id);

  if (filter.role == "author")
    return tasks.filter((task) => task.createdBy == filter.user.id);

  return tasks.filter(
    (task) =>
      task.createdBy == filter.user.id || task.assignedTo == filter.user.id,
  );
}

function filterTasksByArchived(tasks: Task[], filter: TasksFilter) {
  // Выполненная задача считается архивированной
  if (filter.archived) return filterTasksByStatus(tasks, "completed");
  else return filterTasksByStatus(tasks, "completed", true);
}

export function filterTasksByStatus(
  tasks: Task[],
  status: TaskStatus,
  except: boolean = false,
) {
  return tasks.filter((task) =>
    !except ? task.status == status : task.status != status,
  );
}

function groupTasksByDepartments(tasks: Task[]) {
  const map = new Map();

  for (const task of tasks) {
    if (!map.has(task.department.id))
      map.set(task.departmentId, {
        department: task.department,
        tasks: [task],
      });
    else (map.get(task.departmentId) as TasksOfDepartment).tasks.push(task);
  }

  return Array.from(map.values()) as TasksOfDepartment[];
}

export interface GroupingData {
  tasks: Task[];
  filter: TasksFilter;
}
