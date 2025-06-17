/* eslint-disable no-irregular-whitespace */

const { toChunks } = require("./util");

const GOOD = {
  color: "#2EB886",
  icon: ":white_check_mark:",
};
const WARNING = {
  color: "#DAA038",
  icon: ":warning:",
};

const LIMIT = 3000;

const createMessage = (plan, env, planUrl, isBot) => {
  let props = GOOD;
  if (plan.summary.destroy > 0) {
    props = WARNING;
  }
  const ret = {
    text: `Succeeded Terraform Plan${env ? ` for ${env}` : ""}`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `:construction: Succeeded Terraform Plan${env ? ` for *\`${env}\`*` : ""}`,
        },
      },
    ],
    attachments: [
      {
        color: props.color,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `${props.icon} *${plan.summary.str}*`,
            },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `<${planUrl}|Click here> to see full logs.`,
            },
          },
        ],
      },
    ],
  };

  if (plan.action.sections.create.length > 0) {
    const names = plan.action.sections.create.map((a) => `• \`${a.name}\``).join("\n");
    const chunks = toChunks(names, LIMIT);
    for (let i = 0; i < chunks.length; i++) {
      ret.attachments[0].blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `${i === 0 ? "*Create*\n" : ""}${chunks[i]}\n`,
        },
      });
    }
  }
  if (plan.action.sections.update.length > 0) {
    const names = plan.action.sections.update.map((a) => `• \`${a.name}\``).join("\n");
    const chunks = toChunks(names, LIMIT);
    for (let i = 0; i < chunks.length; i++) {
      ret.attachments[0].blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `${i === 0 ? "*Update*\n" : ""}${chunks[i]}\n`,
        },
      });
    }
  }
  if (plan.action.sections.replace.length > 0) {
    const names = plan.action.sections.replace.map((a) => `• \`${a.name}\``).join("\n");
    const chunks = toChunks(names, LIMIT);
    for (let i = 0; i < chunks.length; i++) {
      ret.attachments[0].blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `${i === 0 ? "*Replace*\n" : ""}${chunks[i]}\n`,
        },
      });
    }
  }
  if (plan.action.sections.destroy.length > 0) {
    const names = plan.action.sections.destroy.map((a) => `• \`${a.name}\``).join("\n");
    const chunks = toChunks(names, LIMIT);
    for (let i = 0; i < chunks.length; i++) {
      ret.attachments[0].blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `${i === 0 ? "*Destroy*\n" : ""}${chunks[i]}\n`,
        },
      });
    }
  }

  return ret;
};

module.exports = createMessage;
