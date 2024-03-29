/* eslint-disable no-irregular-whitespace */

const GOOD = {
  color: "#2EB886",
  icon: ":white_check_mark:",
};
const WARNING = {
  color: "#DAA038",
  icon: ":warning:",
};

const LIMIT = 900;

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
        ],
      },
    ],
  };

  ret.attachments[0].blocks.push({
    type: "section",
    text: {
      type: "mrkdwn",
      text: `<${planUrl}|Click here> to see full logs.`,
    },
  });

  if (plan.summary.add > 0) {
    const added = plan.action.sections.create.concat(plan.action.sections.replace);
    // Use U+2007 (FIGURE SPACE) to prevent line breaks right after bullet points
    // cf. https://unicode-explorer.com/c/2007
    let names = added.map((a) => `• \`${a.name}\``).join("\n");
    if (names.length > LIMIT) {
      names = `${names.substring(0, LIMIT)} ...(omitted)`;
    }
    ret.attachments[0].blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Add*\n${names}\n`,
      },
    });
  }

  if (plan.summary.change > 0) {
    let names = plan.action.sections.update.map((a) => `• \`${a.name}\``).join("\n");
    if (names.length > LIMIT) {
      names = `${names.substring(0, LIMIT)} ...(omitted)`;
    }
    ret.attachments[0].blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Change*\n${names}\n`,
      },
    });
  }

  if (plan.summary.destroy > 0) {
    const destroyed = plan.action.sections.destroy.concat(plan.action.sections.replace);
    let names = destroyed.map((a) => `• \`${a.name}\``).join("\n");
    if (names.length > LIMIT) {
      names = `${names.substring(0, LIMIT)} ...(omitted)`;
    }
    ret.attachments[0].blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Destroy*\n${names}\n`,
      },
    });
  }

  return ret;
};

module.exports = createMessage;
