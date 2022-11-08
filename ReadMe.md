# slack-log

record all messages to Google Spread sheet

- Event subscription
    - message.channels
    - team_join
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

set scriptproprrties SHEET_ID, SLACK_ACCESS_TOKEN

Deploy as web app + time trigger to updateAll & processTasks
