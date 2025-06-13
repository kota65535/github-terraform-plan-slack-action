/* eslint-disable no-irregular-whitespace */

const GOOD = {
  color: "#2EB886",
  icon: ":white_check_mark:",
};
const WARNING = {
  color: "#DAA038",
  icon: ":warning:",
};

const LIMIT = 1000;

const createMessage = (plan, env, planUrl) => {
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

  const sections = [];
  if (plan.action.sections.create.length > 0) {
    const names = plan.action.sections.create.map((a) => `• \`${a.name}\``).join("\n");
    sections.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Create*\n${names}\n`,
      },
    });
  }
  if (plan.action.sections.update.length > 0) {
    const names = plan.action.sections.update.map((a) => `• \`${a.name}\``).join("\n");
    sections.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Update*\n${names}\n`,
      },
    });
  }
  if (plan.action.sections.replace.length > 0) {
    const names = plan.action.sections.replace.map((a) => `• \`${a.name}\``).join("\n");
    sections.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Replace*\n${names}\n`,
      },
    });
  }
  if (plan.action.sections.destroy.length > 0) {
    const names = plan.action.sections.destroy.map((a) => `• \`${a.name}\``).join("\n");
    sections.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Destroy*\n${names}\n`,
      },
    });
  }

  if (JSON.stringify(ret.attachments[0]).length + JSON.stringify(sections).length > LIMIT) {
    ret.attachments[0].blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `Plan summary is omitted due to the length limit.`,
      },
    });
    const omitted =
      `## Create\n${plan.action.sections.create.map((a) => a.name).join("\n")}\n\n` +
      `## Update\n${plan.action.sections.update.map((a) => a.name).join("\n")}\n\n` +
      `## Replace\n${plan.action.sections.replace.map((a) => a.name).join("\n")}\n\n` +
      `## Replace\n${plan.action.sections.destroy.map((a) => a.name).join("\n")}\n`;
    return [ret, omitted];
  } else {
    ret.attachments[0].blocks = ret.attachments[0].blocks.concat(sections);
    return [ret, null];
  }
};

module.exports = createMessage;
