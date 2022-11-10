# slack-log

record all messages to Google Spread sheet

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

## Create log once a day

time trigger to "updateAll"(once a day)

## evety 5 minutes logging

1. Deploy as web app + time trigger "processTasks"(every 5 minutes)
2. set Event subscription in slack
    - message.channels
    - team_join

