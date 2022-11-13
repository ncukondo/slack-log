import * as slackLog from "./slack-log";

export function doPost(e) {
  return slackLog.doPost(e);
}

export function updateAll() {
  slackLog.updateAll();
}

export function processTasks() {
  slackLog.processTasks();
}

export function logger(text: string) {
  SpreadsheetApp.getActiveSpreadsheet().getSheetByName("log").appendRow([text]);
}

export function init(info: slackLog.InitInfo) {
  slackLog.init(info);
}
