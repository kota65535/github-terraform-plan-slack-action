const core = require("@actions/core");
const { context } = require("@actions/github");
const parse = require("./parser");
const { getStepLogs, getStepUrl } = require("./github");
const { sendByBotToken, sendByWebhookUrl, uploadByBotToken } = require("./slack");
const createMessage = require("./slack_message");
const { getInputs } = require("./input");
const { logJson } = require("./util");

const getPlanStepLogs = async (jobName, index, context) => {
  const stepLogs = await getStepLogs(jobName, context);
  let curIndex = 0;
  for (const lines of stepLogs) {
    const parsed = parse(lines, true);
    if (parsed.summary.offset >= 0) {
      if (curIndex === index) {
        return lines;
      }
      curIndex++;
    }
  }
  throw new Error(
    "Terraform Plan output not found. This may be due to the format change of the recent Terraform version",
  );
};

const main = async () => {
  const inputs = getInputs();
  logJson("inputs", inputs);

  const lines = await getPlanStepLogs(inputs.jobName, inputs.index, context);
  logJson(`${lines.length} lines of logs found`, lines);

  const parsed = parse(lines);
  logJson("Parsed logs", parsed);

  const planUrl = await getStepUrl(inputs.jobName, inputs.stepName, context, parsed.summary.offset);

  const [message, omitted] = createMessage(parsed, inputs.workspace, planUrl, inputs.slackBotToken);

  if (inputs.slackBotToken) {
    await sendByBotToken(inputs.slackBotToken, inputs.channel, message);
    if (omitted) {
      await uploadByBotToken(inputs.slackBotToken, inputs.channel, omitted);
    }
  }
  if (inputs.slackWebhookUrl) {
    await sendByWebhookUrl(inputs.slackWebhookUrl, message);
  }

  core.setOutput("outside", JSON.stringify(parsed.outside));
  core.setOutput("action", JSON.stringify(parsed.action));
  core.setOutput("output", JSON.stringify(parsed.output));
  core.setOutput("warning", JSON.stringify(parsed.warning));
  core.setOutput("summary", JSON.stringify(parsed.summary));
  core.setOutput("should-apply", parsed.shouldApply);
  core.setOutput("should-refresh", parsed.shouldRefresh);
};

module.exports = {
  main,
  getPlanStepLogs,
};
