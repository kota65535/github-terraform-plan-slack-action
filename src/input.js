const core = require("@actions/core");
const { initOctokit } = require("./github");

const getInputs = () => {
  const jobName = core.getInput("plan-job", { required: true });
  const stepName = core.getInput("plan-step", { required: true });
  const index = Number(core.getInput("plan-index"));
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
  return {
    jobName,
    stepName,
    index,
    workspace,
    githubToken,
    channel,
    slackBotToken,
    slackWebhookUrl,
  };
};

module.exports = {
  getInputs,
};
