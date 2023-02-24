const core = require("@actions/core");
const { context } = require("@actions/github");
const parse = require("./parser");
const { sendByBotToken, sendByWebhookUrl } = require("./slack");
const { getStepLogs, getPlanStepUrl, initOctokit } = require("./github");
const createMessage = require("./slack_message");

const main = async () => {
  const jobName = core.getInput("plan-job", { required: true });
  const stepName = core.getInput("plan-step", { required: true });
  const workspace = core.getInput("workspace");
  let githubToken = core.getInput("github-token");
  const defaultGithubToken = core.getInput("default-github-token");
  const channel = core.getInput("channel");
  let slackBotToken = core.getInput("slack-bot-token");
  let slackWebhookUrl = core.getInput("slack-webhook-url");

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

  core.setOutput("outside", JSON.stringify(result.outside));
  core.setOutput("action", JSON.stringify(result.action));
  core.setOutput("output", JSON.stringify(result.output));
  core.setOutput("warning", JSON.stringify(result.warning));
  core.setOutput("summary", JSON.stringify(result.summary));
  core.setOutput("should-apply", result.shouldApply);
};

module.exports = main;
