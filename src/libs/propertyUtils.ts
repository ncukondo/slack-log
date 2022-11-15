const loadTaskList = <T>(key: string, loader: (key: string) => string) => {
  try {
    const list = JSON.parse(loader(key)) as T[];
    if (!Array.isArray(list)) throw new Error(`${list} is not Array`);
    return list;
  } catch (e) {
    console.error(e);
    return [] as T[];
  }
};
const saveTaskList = <T>(
  key: string,
  list: T[],
  saver: (key: string, value: string) => void
) => {
  saver(key, JSON.stringify(list));
};
const popTask = <T>(
  key: string,
  loader: (key: string) => string,
  saver: (key: string, value: string) => void
) => {
  const list = loadTaskList<T>(key, loader);
  const task: T | undefined = list.pop();
  saveTaskList(key, list, saver);
  return task;
};

const addTasks = <T>(
  key: string,
  tasks: T[],
  loader: (key: string) => string,
  saver: (key: string, value: string) => void
) => {
  const list = loadTaskList<T>(key, loader);
  saveTaskList(key, [...tasks, ...list], saver);
};

const addTask = <T>(
  key: string,
  task: T,
  loader: (key: string) => string,
  saver: (key: string, value: string) => void
) => addTasks(key, [task], loader, saver);

function* iterTask<T>(
  key: string,
  loader: (key: string) => string,
  saver: (key: string, value: string) => void
) {
  let task: T | undefined;
  do {
    task = popTask(key, loader, saver);
    if (task !== undefined) yield task;
  } while (task !== undefined);
}

export { addTasks, addTask, iterTask };
