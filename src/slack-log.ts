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

  set scriptproprrties SHEET_ID, SLACK_ACCESS_TOKEN
  Deploy as web app + time trigger to updateMessages & updateMembers
***** */
const SHEET_ID = PropertiesService.getScriptProperties().getProperty(
  "SHEET_ID"
);

const getMessageSheet_ = () => {
  const { getSheet } = import_sheetUtil_();
  return getSheet(SHEET_ID, "slack", [
    "timestamp",
    "id",
    "email",
    "channel",
    "data",
  ]);
};

const getMemberSheet_ = () => {
  const { getSheet } = import_sheetUtil_();
  return getSheet(SHEET_ID, "slack-member", [
    "updated",
    "id",
    "email",
    "name",
    "rawData",
  ]);
};

const messageToRow_ = (message) => {
  const { timestamp, id, email, channelName, text } = message;
  return [timestamp, id, email, channelName, text];
};

const memberToRow_ = (member) => {
  const { updated, id, email, name, raw } = member;
  return [updated, id, email, name, raw];
};

const updateMessages = async () => {
  const { insertRows } = import_sheetUtil_();
  const { getUnrecordedMessages } = import_unrecordedList_();

  const data = getUnrecordedMessages().map(messageToRow_);
  if (data.length > 0) {
    const sheet = getMessageSheet_();
    insertRows(sheet, data, 2);
  }
};

const updateMessagesInChannel = (channel, exclude = "") => {
  const { insertRows } = import_sheetUtil_();
  const { getUnrecordedMessagesInChannel } = import_unrecordedList_();

  const data = getUnrecordedMessagesInChannel(channel)
    .filter(({ id }) => id !== exclude)
    .map(messageToRow_);
  if (data.length > 0) {
    const sheet = getMessageSheet_();
    insertRows(sheet, data, 2);
  }
};

const updateMembers = (exclude = "") => {
  const { insertRows } = import_sheetUtil_();
  const { getUnrecordedMembers } = import_unrecordedList_();

  const data = getUnrecordedMembers()
    .filter(({ id }) => id !== exclude)
    .map(memberToRow_);
  if (data.length > 0) {
    const sheet = getMemberSheet_();
    insertRows(sheet, data, 2);
  }
};

function doPost(e) {
  const { proccessWebhook, getWebhookResponse } = import_slack_();
  const { insertRow } = import_sheetUtil_();
  proccessWebhook(e).then(({ action, data }) => {
    if (action === "message") {
      const sheet = getMessageSheet_();
      const row = messageToRow_(data);
      insertRow(sheet, row, 2);
    }
    if (action === "member") {
      const sheet = getMemberSheet_();
      const row = memberToRow_(data);
      insertRow(sheet, row, 2);
    }
  });
  return getWebhookResponse(e);
}

function import_unrecordedList_() {
  const getRecordedMessageIds = () => {
    const sheet = getMessageSheet_();
    return sheet
      .getDataRange()
      .getValues()
      .map((row) => row[1]);
  };

  const getRecordedMemberIds = () => {
    const sheet = getMemberSheet_();
    return sheet
      .getDataRange()
      .getValues()
      .map((row) => row[1]);
  };

  const getUnrecordedMessages = () => {
    const { getAllMessages, proccessMessage } = import_slack_();
    const allMessages = getAllMessages();
    const recorded = getRecordedMessageIds();
    const notRecorded = (message) => !recorded.includes(message.id);
    return allMessages.filter(notRecorded).map(proccessMessage);
  };

  const getUnrecordedMessagesInChannel = (channel) => {
    const { getMessagesInChannel, proccessMessage } = import_slack_();
    const allMessages = getMessagesInChannel(channel);
    const recorded = getRecordedMessageIds();
    const notRecorded = (message) => !recorded.includes(message.id);
    return allMessages.filter(notRecorded).map(proccessMessage);
  };

  const getUnrecordedMembers = () => {
    const { getMemberList, proccessMember } = import_slack_();
    const allMembers = getMemberList();
    const recorded = getRecordedMemberIds();
    const notRecorded = (member) => !recorded.includes(member.id);
    return allMembers.filter(notRecorded).map(proccessMember);
  };

  return {
    getUnrecordedMessages,
    getUnrecordedMembers,
    getUnrecordedMessagesInChannel,
  };
}
