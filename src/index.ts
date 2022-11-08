/** *****
  slack-log
  Event subscription
    message.channels
    team_join
  OAuth permission
    users:read
    users:read.email
    channels:history
    channels:read
    usergroups:read
    groups:history
    groups:read
    im:history
    im:read
    mipim:history
    mpim:read

  set scriptproprrties SHEET_ID, SLACK_ACCESS_TOKEN
  Deploy as web app + time trigger to updateAll & processTasks
***** */
import {
  doPost as postMethod,
  updateAll as doUpdateAll,
  processTasks as doProcessTasks,
} from "./slack-log";

export function doPost(e) {
  return postMethod(e);
}

export function updateAll() {
  doUpdateAll();
}

export function processTasks() {
  doProcessTasks();
}

export function logger(text: string) {
  SpreadsheetApp.getActiveSpreadsheet().getSheetByName("log").appendRow([text]);
}
