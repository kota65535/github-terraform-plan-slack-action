const core = require("@actions/core");
const { context } = require("@actions/github");
const parse = require("./parser");
const { sendByBotToken, sendByWebhookUrl } = require("./slack");
const { getStepLogs, getPlanStepUrl } = require("./github");
const createMessage = require("./slack_message");
const { getInputs } = require("./input");
const { logJson } = require("./util");

const main = async () => {
  const inputs = getInputs();
  logJson("inputs", inputs);

  const lines = await getStepLogs(inputs.jobName, inputs.stepName, context);
  core.info(`Found ${lines.length} lines of logs`);

  const result = parse(lines);
  logJson("Parsed logs", result);

  const planUrl = await getPlanStepUrl(inputs.jobName, inputs.stepName, context, result.summary.offset);

  const message = createMessage(result, inputs.workspace, planUrl);

  if (inputs.slackBotToken) {
    await sendByBotToken(inputs.slackBotToken, inputs.channel, message);
  }
  if (inputs.slackWebhookUrl) {
    await sendByWebhookUrl(inputs.slackWebhookUrl, message);
  }

  core.setOutput("outside", JSON.stringify(result.outside));
  core.setOutput("action", JSON.stringify(result.action));
  core.setOutput("output", JSON.stringify(result.output));
  core.setOutput("warning", JSON.stringify(result.warning));
  core.setOutput("summary", JSON.stringify(result.summary));
  core.setOutput("should-apply", result.shouldApply);
  core.setOutput("should-refresh", result.shouldRefresh);
};

module.exports = main;
