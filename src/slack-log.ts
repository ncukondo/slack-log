import { addTask, iterTask } from "./libs/propertyUtils";
import {
  getAllMessages,
  getMemberList,
  getWebhookResponse,
  initSlack,
  proccessMember,
  proccessMessage,
  proccessWebhook,
} from "./libs/slack";
import type {
  // eslint-disable-next-line no-unused-vars
  MemberWithDetail,
  // eslint-disable-next-line no-unused-vars
  MessageWithDetail,
  // eslint-disable-next-line no-unused-vars
  WebhookAction,
} from "./libs/slack";
import {
  columnValues,
  getSheet,
  insertDict,
  insertDictList,
} from "./libs/sheetUtils";

let SHEET_ID = "";
const TASK_KEY = "SLACK_TASK_KEY";
const messageHeaders = [
  "timestamp",
  "id",
  "email",
  "channelName",
  "text",
  "raw",
] as const;
const memberHeaders = ["updated", "id", "email", "name", "raw"] as const;

let loader: null | ((key: string) => string) = null;
let saver: null | ((key: string, value: string) => void) = null;

type InitInfo = {
  slackAccessToken: string;
  sheetID: string;
  loader: (key: string) => string;
  saver: (key: string, value: string) => void;
};

const init = (info: InitInfo) => {
  initSlack(info.slackAccessToken);
  SHEET_ID = info.sheetID;
  loader = info.loader;
  saver = info.saver;
};

const getMessageSheet = () => {
  return getSheet(SHEET_ID, "slack", messageHeaders);
};

const getMemberSheet = () => {
  return getSheet(SHEET_ID, "slack-member", memberHeaders);
};

const pick = <T, K extends keyof T>(source: T, keys: readonly K[]) => {
  return Object.fromEntries(keys.map((key) => [key, source[key]])) as Pick<
    T,
    K
  >;
};

const messageToRow = (message: MessageWithDetail) =>
  pick(message, messageHeaders);

const memberToRow = (member: MemberWithDetail) => pick(member, memberHeaders);

const updateMessages = () => {
  const sheet = getMessageSheet();
  const existingIDs = columnValues(sheet, "id");
  const allMessages = getAllMessages();
  const messages = allMessages
    .filter(({ id }) => !existingIDs.includes(id))
    .map(proccessMessage)
    .map(messageToRow);

  if (messages.length > 0) insertDictList(sheet, messages, 2);
};

const updateMembers = (exclude = "") => {
  const sheet = getMemberSheet();
  const existingIDs = columnValues(sheet, "id");
  const members = getMemberList()
    .filter(({ id }) => id !== exclude && !existingIDs.includes(id))
    .map(proccessMember)
    .map(memberToRow);
  if (members.length > 0) insertDictList(sheet, members, 2);
};

type PostEvent = {
  postData: {
    getDataAsString: () => string;
  };
};

const doPost = (e: PostEvent) => {
  const action = proccessWebhook(e);
  if (saver === null || loader === null)
    throw new Error("Do init and set loader and saver before call API");
  if (action.action !== "none") addTask(TASK_KEY, action, loader, saver);
  return getWebhookResponse(e);
};

const processTasks = () => {
  if (saver === null || loader === null)
    throw new Error("Do init and set loader and saver before call API");
  const gen = iterTask<WebhookAction>(TASK_KEY, loader, saver);
  // eslint-disable-next-line no-restricted-syntax
  for (const task of gen) {
    switch (task.action) {
      case "member": {
        const member = proccessMember(task.data);
        insertDict(getMemberSheet(), memberToRow(member), 2);
        // eslint-disable-next-line no-continue
        continue;
      }
      case "message": {
        const message = proccessMessage(task.data);
        insertDict(getMessageSheet(), messageToRow(message), 2);
        // eslint-disable-next-line no-continue
        continue;
      }
      default:
        // eslint-disable-next-line no-continue
        continue;
    }
  }
};

const updateAll = () => {
  processTasks();
  updateMembers();
  updateMessages();
};

export { doPost, updateAll, processTasks, init };
export type { InitInfo };
