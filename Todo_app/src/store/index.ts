import AsyncStorage from "@react-native-async-storage/async-storage"
import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"
import * as SQLite from 'react-native-sqlite-storage';
/**
 * 1. Interface IGlobalStore
 * 2. create
 * 3. persist with async from react-native-async-storage
 */

SQLite.DEBUG(true); // Optional for debugging
SQLite.enablePromise(true); // Use promises for async operations

const db = SQLite.openDatabase({
  name: 'todos.db',
  location: 'default',
});

db.transaction((tx) => {
  tx.executeSql(
    'CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT)',
    []
  );
  tx.executeSql(
    'CREATE TABLE IF NOT EXISTS tasks (id INTEGER PRIMARY KEY AUTOINCREMENT, categoryId INTEGER, title TEXT, description TEXT, completed INTEGER)',
    []
  );
});

interface IGlobalStore {
  categories: ICategory[]
  tasks: ITask[]
  addTask: (task: ITask) => void
  addCategory: (category: ICategory) => void
  updateTasks: (tasks: ITask[]) => void
  selectedCategory: null | ICategory
  updateSelectedCategory: (category: ICategory) => void
  toggleTaskStatus: (task: ITask) => void
}

const useGlobalStore = create<IGlobalStore>()(
  persist(
    (set, get) => ({
      categories: [],
      tasks: [],
      selectedCategory: null,
      addTask: async (task: ITask) => {
        await db.executeSql(
          'INSERT INTO tasks (categoryId, title, description, completed) VALUES (?, ?, ?, ?)',
          [task.categoryId, task.title, task.description, task.completed ? 1 : 0]
        );
        const { tasks } = get();
        const newTasks = [...tasks, task];
        set({ tasks: newTasks });
      },
      updateTasks: async (updatedTasks: ITask[]) => {
        await db.executeSql('DELETE FROM tasks');
        for (const task of updatedTasks) {
          await db.executeSql(
            'INSERT INTO tasks (categoryId, title, description, completed) VALUES (?, ?, ?, ?)',
            [task.categoryId, task.title, task.description, task.completed ? 1 : 0]
          );
        }
        set({ tasks: updatedTasks });
      },
      updateSelectedCategory: (category: ICategory) => {
        set({ selectedCategory: category });
      },
      addCategory: async (category: ICategory) => {
        await db.executeSql('INSERT INTO categories (name) VALUES (?)', [category.name]);
        const { categories } = get();
        const newCategories = [...categories, category];
        set({ categories: newCategories });
      },
      toggleTaskStatus: async (task: ITask) => {
        await db.executeSql(
          'UPDATE tasks SET completed = ? WHERE id = ?',
          [task.completed ? 0 : 1, task.id]
        );
        const { tasks } = get();
        const updatedTasks = tasks.map((taskItem) => {
          if (taskItem.id === task.id) {
            return { ...task, completed: !task.completed };
          } else {
            return taskItem;
          }
        });
        set({ tasks: updatedTasks });
      },
      initStore: async () => {
        const categories = await db.all('SELECT * FROM categories');
        const tasks = await db.all('SELECT * FROM tasks');
        set({ categories, tasks });
      },
    }),
    {
      name: 'todos-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)

export default useGlobalStore
