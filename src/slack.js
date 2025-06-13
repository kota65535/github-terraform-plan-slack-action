const axios = require("axios");

const SLACK_API_URL_BASE = "https://slack.com/api";
const SLACK_API_CONVERSATIONS = `${SLACK_API_URL_BASE}/conversations.list`;
const SLACK_API_POST_MESSAGE = `${SLACK_API_URL_BASE}/chat.postMessage`;
const SLACK_API_GET_UPLOAD_URL = `${SLACK_API_URL_BASE}/files.getUploadURLExternal`;
const SLACK_API_COMPLETE_UPLOAD = `${SLACK_API_URL_BASE}/files.completeUploadExternal`;

async function getChannelIdByName(token, channelName) {
  if (channelName.startsWith("C")) {
    return channelName;
  }

  let cursor = null;
  while (true) {
    let res;
    try {
      res = await axios.get(SLACK_API_CONVERSATIONS, {
        params: {
          exclude_archived: true,
          limit: 1000,
          cursor,
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (e) {
      if (e.response) {
        throw new Error(
          `failed to get channels of Slack: url=${SLACK_API_CONVERSATIONS}, status=${e.response.status}, data=${JSON.stringify(e.response.data)}`,
        );
      } else {
        throw new Error(`failed to get channels of Slack: url=${SLACK_API_CONVERSATIONS}, no response.`);
      }
    }

    if (!(res.status === 200 && res.data && res.data.ok)) {
      throw new Error(
        `failed to send to Slack: url=${SLACK_API_CONVERSATIONS}, status=${res.status}, data=${JSON.stringify(res.data)}`,
      );
    }

    const channel = res.data.channels.find((ch) => ch.name === channelName);

    if (channel) {
      return channel.id;
    }

    cursor = res.data.response_metadata?.next_cursor;
    if (!cursor) {
      break;
    }
  }
  return null;
}

const uploadByBotToken = async (token, channelNameOrId, message) => {
  const channel = await getChannelIdByName(token, channelNameOrId);
  if (!channel) {
    throw new Error(`channel not found: ${channelNameOrId}`);
  }
  const bytes = Buffer.from(message);

  let res;
  try {
    res = await axios.get(SLACK_API_GET_UPLOAD_URL, {
      params: { filename: "Plan summary", length: bytes.length },
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (e) {
    if (e.response) {
      throw new Error(
        `failed to upload to Slack: url=${SLACK_API_GET_UPLOAD_URL}, status=${e.response.status}, data=${JSON.stringify(e.response.data)}`,
      );
    } else {
      throw new Error(`failed to upload to Slack: url=${SLACK_API_GET_UPLOAD_URL}, no response.`);
    }
  }
  if (!(res.status === 200 && res.data && res.data.ok)) {
    throw new Error(
      `failed to upload to Slack: url=${SLACK_API_GET_UPLOAD_URL}, status=${res.status}, data=${JSON.stringify(res.data)}`,
    );
  }
  const fileId = res.data.file_id;
  try {
    res = await axios.post(res.data.upload_url, bytes);
  } catch (e) {
    if (e.response) {
      throw new Error(
        `failed to send to Slack: url=${res.data.upload_url}, status=${e.response.status}, data=${JSON.stringify(e.response.data)}`,
      );
    } else {
      throw new Error(`failed to send to Slack: url=${res.data.upload_url}, no response.`);
    }
  }

  try {
    res = await axios.post(
      SLACK_API_COMPLETE_UPLOAD,
      { files: [{ id: fileId }], channel_id: channel, initial_comment: "hi" },
      {
        headers: {
          "Content-Type": "application/json; charset=UTF-8",
          Authorization: `Bearer ${token}`,
        },
      },
    );
  } catch (e) {
    if (e.response) {
      throw new Error(
        `failed to send to Slack: url=${SLACK_API_COMPLETE_UPLOAD}, status=${e.response.status}, data=${JSON.stringify(e.response.data)}`,
      );
    } else {
      throw new Error(`failed to send to Slack: url=${SLACK_API_COMPLETE_UPLOAD}, no response.`);
    }
  }
  if (!(res.status === 200 && res.data && res.data.ok)) {
    throw new Error(
      `failed to send to Slack: url=${SLACK_API_COMPLETE_UPLOAD}, status=${res.status}, data=${JSON.stringify(res.data)}`,
    );
  }
};

const sendByBotToken = async (token, channel, message) => {
  message.channel = channel;
  let res;
  try {
    res = await axios.post(SLACK_API_POST_MESSAGE, message, {
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (e) {
    if (e.response) {
      throw new Error(`failed to send to Slack: status=${e.response.status}, data=${JSON.stringify(e.response.data)}`);
    } else {
      throw new Error(`failed to send to Slack: no response.`);
    }
  }
  if (!(res.status === 200 && res.data && res.data.ok)) {
    throw new Error(`failed to send to Slack: status=${res.status}, data=${JSON.stringify(res.data)}`);
  }
  return res.data;
};

const sendByWebhookUrl = async (url, message) => {
  let res;
  try {
    res = await axios.post(url, message);
  } catch (e) {
    if (e.response) {
      throw new Error(`failed to send to Slack: status=${e.response.status}, data=${JSON.stringify(e.response.data)}`);
    } else {
      throw new Error(`failed to send to Slack: no response`);
    }
  }
  if (!(res.status === 200 && res.data === "ok")) {
    throw new Error(`failed to send to Slack: status=${res.status}, data=${JSON.stringify(res.data)}`);
  }
  return res.data;
};

module.exports = {
  uploadByBotToken,
  sendByBotToken,
  sendByWebhookUrl,
};
