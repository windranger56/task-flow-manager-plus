import React, { memo, useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Task, User } from '../types';
import TaskItem from './TaskItem';

interface VirtualizedTaskListProps {
  tasks: Array<Task & { assignee: User | null; creator: User | null }>;
  selectedTask: Task | null;
  onTaskSelect: (task: Task) => void;
  hasNewMessages: (taskId: string) => boolean;
  height: number;
}

const ITEM_HEIGHT = 120; // Высота одного элемента задачи

const TaskRow = memo(({ index, style, data }: any) => {
  const { tasks, selectedTask, onTaskSelect, hasNewMessages } = data;
  const task = tasks[index];
  
  if (!task) return null;

  return (
    <div style={style}>
      <div className="p-2">
        <TaskItem
          task={task}
          assignee={task.assignee}
          creator={task.creator}
          isSelected={selectedTask?.id === task.id}
          hasNewMessages={hasNewMessages(task.id)}
          onClick={onTaskSelect}
        />
      </div>
    </div>
  );
});

TaskRow.displayName = 'TaskRow';

const VirtualizedTaskList = memo(({
  tasks,
  selectedTask,
  onTaskSelect,
  hasNewMessages,
  height
}: VirtualizedTaskListProps) => {
  // Мемоизируем данные для передачи в List
  const itemData = useMemo(() => ({
    tasks,
    selectedTask,
    onTaskSelect,
    hasNewMessages
  }), [tasks, selectedTask, onTaskSelect, hasNewMessages]);

  // Если задач мало, используем обычный рендеринг
  if (tasks.length < 20) {
    return (
      <div className="space-y-2 p-2">
        {tasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            assignee={task.assignee}
            creator={task.creator}
            isSelected={selectedTask?.id === task.id}
            hasNewMessages={hasNewMessages(task.id)}
            onClick={onTaskSelect}
          />
        ))}
      </div>
    );
  }

  // Для больших списков используем виртуализацию
  return (
    <List
      height={height}
      itemCount={tasks.length}
      itemSize={ITEM_HEIGHT}
      itemData={itemData}
      overscanCount={5} // Предрендерим 5 элементов сверху и снизу
    >
      {TaskRow}
    </List>
  );
});

VirtualizedTaskList.displayName = 'VirtualizedTaskList';

export default VirtualizedTaskList; 