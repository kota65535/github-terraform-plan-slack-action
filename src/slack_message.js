const GOOD = {
  color: '#2EB886',
  icon: ':white_check_mark:'
};
const WARNING = {
  color: '#DAA038',
  icon: ':warning:'
};

const createMessage = (plan, env, planUrl) => {
  let props = GOOD;
  if (plan.summary.destroy > 0) {
    props = WARNING;
  }
  let ret = {
    text: `Succeeded Terraform Plan${env ? ` for ${env}` : ''}`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `:construction: Succeeded Terraform Plan${env ? ` for *\`${env}\`*` : ''}`
        }
      }
    ],
    attachments: [
      {
        color: props.color,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `${props.icon} *${plan.summary.str}*`
            }
          }
        ]
      }
    ]
  };

  if (plan.summary.add > 0) {
    const added = plan.action.sections.create.concat(plan.action.sections.replace);
    const names = added.map(a => a.name).join('\n');
    ret.attachments[0].blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Add*\n\`\`\`${names}\`\`\``
      }
    });
  }

  if (plan.summary.change > 0) {
    const names = plan.action.sections.update.map(a => a.name).join('\n');
    ret.attachments[0].blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Change*\n\`\`\`${names}\`\`\``
      }
    });
  }

  if (plan.summary.destroy > 0) {
    const destroyed = plan.action.sections.destroy.concat(plan.action.sections.replace);
    const names = destroyed.map(a => a.name).join('\n');
    ret.attachments[0].blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Destroy*\n\`\`\`${names}\`\`\``
      }
    });
  }

  ret.attachments[0].blocks.push({
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `<${planUrl}|Click here> to see full logs.`
    }
  });

  return ret;
};

module.exports = createMessage;
