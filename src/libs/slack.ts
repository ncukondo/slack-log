/* eslint-disable camelcase */
const makeCache = <T>() => {
  const cache = new Map<string, T>();
  return (key: string, initFn: (key: string) => T) => {
    if (cache.has(key)) return cache.get(key);
    const data = initFn(key);
    cache.set(key, data);
    return data;
  };
};

type Response<T> =
  | ({
      ok: true;
      response_metadata?: {
        next_cursor?: string;
      };
    } & T)
  | { ok: false; error: string };

type Conversation = {
  id: string;
  name: string;
  is_channel: boolean;
  is_group: boolean;
  is_im: true;
  created: number;
  creator: string;
  is_archived: boolean;
  is_general: boolean;
  unlinked: boolean;
  name_normalized: string;
  is_shared: boolean;
  is_ext_shared: boolean;
  is_org_shared: boolean;
  is_private: boolean;
  is_mpim: boolean;
  topic: {
    value: string;
    creator: string;
    last_set: number;
  };
  purpose: {
    value: string;
    creator: string;
    last_set: number;
  };
  previous_names: string[];
  num_members: number;
};

type Message = {
  type: string;
  user: string;
  text: string;
  subtype?: string;
  attachments?: {
    service_name: string;
    text: string;
    fallback: string;
    thumb_url: string;
    thumb_width: number;
    thumb_height: number;
    id: number;
  }[];
  ts: string;
};

type Member = {
  id: string;
  team_id: string;
  name: string;
  deleted: boolean;
  color: string;
  real_name: string;
  tz: string;
  tz_label: string;
  tz_offset: number;
  profile: {
    avatar_hash: string;
    status_text: string;
    status_emoji: string;
    real_name: string;
    display_name: string;
    real_name_normalized: string;
    display_name_normalized: string;
    email: string;
    image_24: string;
    image_32: string;
    image_48: string;
    image_72: string;
    image_192: string;
    image_512: string;
    team: string;
  };
  is_admin: boolean;
  is_owner: boolean;
  is_primary_owner: boolean;
  is_restricted: boolean;
  is_ultra_restricted: boolean;
  is_bot: boolean;
  updated: number;
  is_app_user: boolean;
  has_2fa: boolean;
};

const doApi = <T>(entry: string, paramObj: Record<string, string> = {}) => {
  const TOKEN = PropertiesService.getScriptProperties().getProperty(
    "SLACK_ACCESS_TOKEN"
  );
  // eslint-disable-next-line camelcase
  const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
    method: "get",
    contentType: "application/x-www-form-urlencoded",
  };
  const params = Object.entries(paramObj)
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  const tail = params ? `&${params}` : "";
  const response = UrlFetchApp.fetch(
    encodeURI(`https://slack.com/api/${entry}?token=${TOKEN}&${tail}`),
    options
  );
  const content = response.getContentText("UTF-8");
  return JSON.parse(content) as Response<T>;
};

function* doPagedApi<T>(entry: string, paramObj: Record<string, string> = {}) {
  let cursor: any = null;
  do {
    const nextData = doApi<T>(entry, { ...paramObj, cursor });
    if (nextData.ok === false) throw new Error(`Error: ${nextData.error}`);
    cursor = nextData?.response_metadata?.next_cursor;
    yield nextData;
  } while (cursor);
}

const isNotJoinMessage = (msg: { text: string }) => {
  const reg = /^<@[0-9a-zA-Z]+> has joined the channel$/i;
  return !reg.test(msg.text);
};

const getChannelList = () => {
  const gen = doPagedApi<{ channels: Conversation[] }>("conversations.list");
  let channels = [] as Conversation[];
  // eslint-disable-next-line no-restricted-syntax
  for (const data of gen) {
    const chs = data.channels.filter(({ is_channel }) => is_channel);
    console.log(`next${JSON.stringify(chs.length, null, 2)}`);
    channels = [...channels, ...chs];
  }
  return channels;
};

const getMemberList = () => {
  const gen = doPagedApi<{ members: Member[] }>("users.list");
  let members = [] as Member[];
  // eslint-disable-next-line no-restricted-syntax
  for (const data of gen) {
    const list = data.members.filter(({ is_bot }) => !is_bot);
    console.log(`next${JSON.stringify(list.length, null, 2)}`);
    members = [...members, ...list];
  }
  return members;
};

const getMessageId = (message: Message, channel: string) =>
  `${message.ts}-${channel}`;

const getMessagesInChannel = (channel) => {
  const gen = doPagedApi<{ messages: Message[] }>("conversations.history", {
    channel,
  });
  // eslint-disable-next-line no-restricted-syntax
  return [...gen].reduce((messages, data) => {
    const mes = data.messages
      .filter(
        ({ type, subtype }) => type === "message" && subtype !== "bot_message"
      )
      .filter(isNotJoinMessage)
      .map((message) => {
        const id = getMessageId(message, channel);
        return { ...message, channel, id };
      });
    return [...messages, ...mes];
  }, [] as (Message & { channel: string; id: string })[]);
};

const getAllMessages = () =>
  getChannelList()
    .map(({ id }) => getMessagesInChannel(id))
    .flat();

const userInfoCache = makeCache<Member>();
const getUserInfo = (id: string) =>
  userInfoCache(id, (initId) => {
    const data = doApi<{ user: Member }>("users.info", { user: initId });
    if (data.ok === false) throw new Error(`Error: ${data.error}`);
    return data.user;
  });

const channelInfoCache = makeCache<Conversation>();
const getChannelInfo = (id: string) =>
  channelInfoCache(id, (inItId) => {
    const data = doApi<{ channel: Conversation }>("conversations.info", {
      channel: inItId,
    });
    if (data.ok === false) throw new Error(`Error: ${data.error}`);
    return data.channel;
  });

const getUserByEmail = (email: string) => {
  const data = doApi<{ user: Member }>("users.lookupByEmail", { email });
  if (data.ok === false) throw new Error(`Error: ${data.error}`);
  return data.user;
};

const proccessMessage = (message: Message & { channel: string }) => {
  const { ts, user: userId, channel: channelId, text } = message;
  const id = getMessageId(message, channelId);
  const timestamp = new Date(parseFloat(ts) * 1000);
  const {
    profile: { email },
  } = getUserInfo(userId);
  const { name: channelName } = getChannelInfo(channelId);
  return { ...message, timestamp, email, channelName, id, text };
};

const proccessMember = (user: Member & { updated: string }) => {
  const email = user.profile && user.profile.email;
  const name = user.profile.real_name;
  const updated = new Date(parseFloat(user.updated) * 1000);
  const raw = JSON.stringify(user);
  return { ...user, email, name, updated, raw };
};

type PostEvent = {
  postData: {
    getDataAsString: () => string;
  };
};

type WebhookAction =
  | { action: "none" }
  | { action: "message"; data: Message & { channel: string } }
  | { action: "member"; data: Member & { updated: string } };

const proccessWebhook = (postEvent: PostEvent): WebhookAction => {
  const postData = JSON.parse(postEvent.postData.getDataAsString());
  if (postData.type !== "event_callback") return { action: "none" };
  const { event } = postData;
  const { type } = event;
  if (type === "message") {
    if (!isNotJoinMessage(event)) return { action: "none" };
    // const data = proccessMessage(event);
    return { action: "message", data: event as Message & { channel: string } };
  }
  if (type === "team_join") {
    const { user } = event;
    // const data = proccessMember(user);
    return { action: "member", data: user as Member & { updated: string } };
  }
  return { action: "none" };
};

const getWebhookResponse = (postEvent) => {
  const postData = JSON.parse(postEvent.postData.getDataAsString());
  if (postData.type === "url_verification") {
    return ContentService.createTextOutput(postData.challenge);
  }
  return ContentService.createTextOutput("");
};

export {
  getWebhookResponse,
  proccessWebhook,
  getUserByEmail,
  getChannelInfo,
  getUserInfo,
  getChannelList,
  getMessagesInChannel,
  getAllMessages,
  getMemberList,
  proccessMember,
  proccessMessage,
};
