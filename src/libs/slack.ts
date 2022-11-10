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

let SLACK_TOKEN: undefined | string;
const initSlack = (token: string) => {
  SLACK_TOKEN = token;
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
  thead_ts?: string;
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

type MessageWithDetail = Message & {
  timestamp: Date;
  email: string;
  channelName: string;
  id: string;
  raw: string;
};

type MemberWithDetail = Member & {
  email: string;
  updated: Date;
  raw: string;
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

const apiMap = {
  "users.info": "user",
  "conversations.info": "channel",
  "users.lookupByEmail": "user",
};
type ApiEntries = keyof typeof apiMap;

type ApiTypes = {
  "users.info": Member;
  "conversations.info": Conversation;
  "users.lookupByEmail": Member;
};

const pagedApiMap = {
  "conversations.list": "channels",
  "users.list": "members",
  "conversations.history": "messages",
  "conversations.replies": "messages",
};
type PagedApiEntries = keyof typeof pagedApiMap;

type PagedApiTypes = {
  "conversations.list": Conversation;
  "users.list": Member;
  "conversations.history": Message;
  "conversations.replies": Message;
};

const doApi = <T>(entry: string, paramObj: Record<string, string> = {}) => {
  if (!SLACK_TOKEN) throw new Error("Call initSlack before call api.");
  const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
    method: "get",
    headers: { Authorization: `Bearer ${SLACK_TOKEN}` },
    contentType: "application/x-www-form-urlencoded",
  };
  const params = Object.entries(paramObj)
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  const tail = params ? `?${params}` : "";
  const response = UrlFetchApp.fetch(
    encodeURI(`https://slack.com/api/${entry}${tail}`),
    options
  );
  const content = response.getContentText("UTF-8");
  return JSON.parse(content) as Response<T>;
};

const getInfo = <E extends ApiEntries>(
  entry: E,
  paramObj: Record<string, string> = {}
) => {
  const data = doApi<{ [P in typeof apiMap[typeof entry]]: ApiTypes[E] }>(
    entry,
    paramObj
  );
  if (data.ok === false) throw new Error(`Error: ${data.error}`);
  return data[apiMap[entry]] as ApiTypes[E];
};

function* getPagedInfo<E extends PagedApiEntries>(
  entry: E,
  paramObj: Record<string, string> = {}
) {
  let cursor: any = null;
  do {
    const nextData = doApi<
      { [P in typeof pagedApiMap[typeof entry]]: PagedApiTypes[E][] }
    >(entry, cursor ? { ...paramObj, cursor } : paramObj);
    if (nextData.ok === false) throw new Error(`Error: ${nextData.error}`);
    // eslint-disable-next-line no-restricted-syntax
    for (const data of nextData[pagedApiMap[entry]]) {
      yield data as PagedApiTypes[E];
    }
    cursor = nextData?.response_metadata?.next_cursor;
  } while (cursor);
}

const isJoinMessage = (msg: { text: string }) => {
  const reg = /^<@[0-9a-zA-Z]+> has joined the channel$/i;
  return !reg.test(msg.text);
};

const getChannelList = () => {
  const option = {
    types: "public_channel,private_channel",
  };
  return [...getPagedInfo("conversations.list", option)].filter(
    ({ is_channel }) => is_channel
  );
};

const getMemberList = () => {
  return [...getPagedInfo("users.list")].filter(({ is_bot }) => !is_bot);
};

const getMessageId = (message: Message, channel: string) =>
  `${message.ts}-${channel}`;

const expandReplies = (channel: string, message: Message) => {
  const opt = { channel, ts: message.ts };
  return message.thead_ts !== undefined
    ? [...getPagedInfo("conversations.replies", opt)].reverse()
    : [message];
};

const getMessagesInChannel = (channel: string) => {
  return [...getPagedInfo("conversations.history", { channel })]
    .map((message) => expandReplies(channel, message))
    .flat()
    .filter(
      ({ type, subtype }) => type === "message" && subtype !== "bot_message"
    )
    .filter((msg) => !isJoinMessage(msg))
    .map((message) => {
      const id = getMessageId(message, channel);
      return { ...message, channel, id };
    });
};

const getAllMessages = () =>
  getChannelList()
    .map(({ id }) => getMessagesInChannel(id))
    .flat();

const userInfoCache = makeCache<Member>();
const getUserInfo = (id: string) =>
  userInfoCache(id, (user) => getInfo("users.info", { user }));

const channelInfoCache = makeCache<Conversation>();
const getChannelInfo = (id: string) =>
  channelInfoCache(id, (channel) => getInfo("conversations.info", { channel }));

const getUserByEmail = (email: string) =>
  getInfo("users.lookupByEmail", { email });

const proccessMessage = (message: Message & { channel: string }) => {
  const { ts, user: userId, channel: channelId, text } = message;
  const id = getMessageId(message, channelId);
  const timestamp = new Date(parseFloat(ts) * 1000);
  const {
    profile: { email },
  } = getUserInfo(userId);
  const { name: channelName } = getChannelInfo(channelId);
  const raw = JSON.stringify(message);
  return {
    ...message,
    timestamp,
    email,
    channelName,
    id,
    text,
    raw,
  } as MessageWithDetail;
};

const proccessMember = (user: Member & { updated: string }) => {
  const email = user.profile && user.profile.email;
  const name = user.profile.real_name;
  const updated = new Date(parseFloat(user.updated) * 1000);
  const raw = JSON.stringify(user);
  return { ...user, email, name, updated, raw } as MemberWithDetail;
};

const proccessWebhook = (postEvent: PostEvent): WebhookAction => {
  const postData = JSON.parse(postEvent.postData.getDataAsString());
  if (postData.type !== "event_callback") return { action: "none" };
  const { event } = postData;
  const { type } = event;
  if (type === "message") {
    if (isJoinMessage(event)) return { action: "none" };
    return { action: "message", data: event as Message & { channel: string } };
  }
  if (type === "team_join") {
    const { user } = event;
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
  initSlack,
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
export type {
  // eslint-disable-next-line no-undef
  Member,
  // eslint-disable-next-line no-undef
  Message,
  // eslint-disable-next-line no-undef
  MessageWithDetail,
  // eslint-disable-next-line no-undef
  MemberWithDetail,
  // eslint-disable-next-line no-undef
  WebhookAction,
};
