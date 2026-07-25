import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEFAULT_TASKS, type TaskId } from '@/lib/tasks';

const STORAGE_KEY = 'roomate_tasks_done';

export interface TaskItem {
  id: TaskId;
  name: string;
  pts: number;
  done: boolean;
}

interface TasksContextValue {
  tasks: TaskItem[];
  percent: number;
  remaining: number;
  nextTask: TaskItem | undefined;
  completeTask: (id: TaskId) => void;
  resetTasks: () => void;
}

const TasksContext = createContext<TasksContextValue | undefined>(undefined);

export function TasksProvider({ children }: { children: React.ReactNode }) {
  const [doneIds, setDoneIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          try {
            setDoneIds(JSON.parse(raw) as string[]);
          } catch {
            setDoneIds([]);
          }
        }
      })
      .finally(() => setReady(true));
  }, []);

  const persist = useCallback(async (ids: string[]) => {
    setDoneIds(ids);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  }, []);

  const tasks = useMemo<TaskItem[]>(
    () =>
      DEFAULT_TASKS.map((t) => ({
        id: t.id,
        name: t.name,
        pts: t.pts,
        done: doneIds.includes(t.id),
      })),
    [doneIds]
  );

  const percent = useMemo(() => tasks.reduce((s, t) => s + (t.done ? t.pts : 0), 0), [tasks]);
  const remaining = useMemo(() => tasks.filter((t) => !t.done).length, [tasks]);
  const nextTask = useMemo(() => tasks.find((t) => !t.done), [tasks]);

  const completeTask = useCallback(
    (id: TaskId) => {
      if (doneIds.includes(id)) return;
      void persist([...doneIds, id]);
    },
    [doneIds, persist]
  );

  const resetTasks = useCallback(() => {
    void persist([]);
  }, [persist]);

  const value = useMemo(
    () => ({ tasks, percent, remaining, nextTask, completeTask, resetTasks }),
    [tasks, percent, remaining, nextTask, completeTask, resetTasks]
  );

  if (!ready) return <>{children}</>;

  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
}

export function useTasks(): TasksContextValue {
  const ctx = useContext(TasksContext);
  if (!ctx) {
    return {
      tasks: DEFAULT_TASKS.map((t) => ({ ...t, done: false })),
      percent: 0,
      remaining: DEFAULT_TASKS.length,
      nextTask: { ...DEFAULT_TASKS[0], done: false },
      completeTask: () => undefined,
      resetTasks: () => undefined,
    };
  }
  return ctx;
}
