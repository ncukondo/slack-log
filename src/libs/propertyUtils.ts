const load = (key: string) =>
  PropertiesService.getScriptProperties().getProperty(key);

const save = (key: string, value: string) =>
  PropertiesService.getScriptProperties().setProperty(key, value);

const loadTaskList = <T>(key: string) => {
  try {
    const list = JSON.parse(load(key)) as T[];
    if (!Array.isArray(list)) throw new Error(`${list} is not Array`);
    return list;
  } catch (e) {
    console.error(e);
    return [] as T[];
  }
};
const saveTaskList = <T>(key: string, list: T[]) => {
  save(key, JSON.stringify(list));
};
const popTask = <T>(key: string) => {
  const list = loadTaskList<T>(key);
  const task: T | undefined = list.pop();
  saveTaskList(key, list);
  return task;
};

const addTasks = <T>(key: string, tasks: T[]) => {
  const list = loadTaskList<T>(key);
  saveTaskList(key, [...tasks, ...list]);
};

const addTask = <T>(key: string, task: T) => addTasks(key, [task]);

function* iterTask<T>(key: string) {
  let task: T | undefined;
  do {
    task = popTask(key);
    if (task !== undefined) yield task;
  } while (task !== undefined);
}

export { save, load, addTasks, addTask, iterTask };
