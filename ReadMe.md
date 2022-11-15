# Slack-log

record all messages to Google Spread sheet

## Getting started

### 1. Create Slack app

- Access [slack api](https://api.slack.com/apps) and click "Create New App".
- Click "OAuth & Permissions" in side panel and set permission below
  - OAuth permission
    - users:read
    - users:read.email
    - channels:history
    - channels:read
    - usergroups:read
    - groups:history
    - groups:read
    - im:history
    - im:read
    - mipim:history
    - mpim:read
- Install app to your slack workspace
- note "OAuth Token"


### 2. Google apps script

1. Create google apps script project and paste the code below.
2. Add library "173cu6Ema05i0FXsBEVxDpy94vEYIURLThApdI_SNpMLjqfTmine-P1f1" as slack_log.
3. Set script perperty "SHEET_ID"(target google spreadsheet ID) and "SLACK_ACCESS_TOKEN"(OAuth Token above).
4. Run updateAll and permit permissions.
5. time trigger to "updateAll"(once a day)
6. Deploy as web app + time trigger "processTasks"(every 5 minutes)
7. "New Deploy" from Deploy button and note web app url. 

```js
const SHEET_ID = PropertiesService.getScriptProperties().getProperty("SHEET_ID");
const SLACK_ACCESS_TOKEN = PropertiesService.getScriptProperties().getProperty("SLACK_ACCESS_TOKEN");
const apiLib = slack_log;

const srciptProperty = PropertiesService.getScriptProperties();
const loader = (key)=> srciptProperty.getProperty(key);
const saver = (key,value) => srciptProperty.setProperty(key,value);

apiLib.init({
  sheetID:SHEET_ID,
  slackAccessToken:SLACK_ACCESS_TOKEN,
  loader,
  saver
})

function doPost(e) {
  return apiLib.doPost(e);
}

function updateAll(){
  apiLib.updateAll();
}

function processTasks(){
  apiLib.processTasks();
}

```

### 3. Event subscription

1. Move to [slack api](https://api.slack.com/apps) again.
2. Click "Event Subscriptions" and set "Request URL" as google apps script app url noted above. 
3. Subscribe events below
    - message.channels
    - team_join

