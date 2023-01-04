const core = require("@actions/core");
const { context } = require("@actions/github");
const parse = require("./parser");
const { sendByBotToken, sendByWebhookUrl } = require("./slack");
const { jsonString } = require("./util");
const { getStepLogs, getPlanStepUrl, initOctokit } = require("./github");
const createMessage = require("./slack_message");

const main = async () => {
  let jobName = core.getInput("plan-job").trim();
  let stepName = core.getInput("plan-step").trim();
  const jobNameDeprecated = core.getInput("plan-job-name").trim();
  const stepNameDeprecated = core.getInput("plan-step-name").trim();
  const workspace = core.getInput("workspace").trim();
  const channel = core.getInput("channel").trim();
  let githubToken = core.getInput("github-token").trim();
  const defaultGithubToken = core.getInput("default-github-token").trim();
  let slackBotToken = core.getInput("slack-bot-token").trim();
  let slackWebhookUrl = core.getInput("slack-webhook-url").trim();

  jobName = jobName || jobNameDeprecated;
  stepName = stepName || stepNameDeprecated;

  githubToken = githubToken || process.env.GITHUB_TOKEN || defaultGithubToken;
  if (!githubToken) {
    throw new Error("No GitHub token provided");
  }

  slackBotToken = slackBotToken || process.env.SLACK_BOT_TOKEN;
  slackWebhookUrl = slackWebhookUrl || process.env.SLACK_WEBHOOK_URL;
  if (!(slackBotToken && channel) && !slackWebhookUrl) {
    throw new Error("Need to specify the Slack bot token and the channel name, or the webhook URL.");
  }

  initOctokit(githubToken);

  const input = await getStepLogs(jobName, stepName, context);

  const result = parse(input);

  const planUrl = await getPlanStepUrl(jobName, stepName, context, result.summary.offset);

  const message = createMessage(result, workspace, planUrl);

  if (slackBotToken) {
    await sendByBotToken(slackBotToken, channel, message);
  }
  if (slackWebhookUrl) {
    await sendByWebhookUrl(slackWebhookUrl, message);
  }

  core.setOutput("outside", jsonString(result.output));
  core.setOutput("action", jsonString(result.action));
  core.setOutput("output", jsonString(result.output));
  core.setOutput("warning", jsonString(result.warning));
  core.setOutput("summary", jsonString(result.summary));
  core.setOutput("should-apply", result.shouldApply);
};

module.exports = main;
