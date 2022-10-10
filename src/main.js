const core = require('@actions/core');
const { context } = require('@actions/github');
const parse = require('./parser');
const send = require('./slack');
const { jsonString } = require('./util');
const { getStepLogs, getPlanStepUrl, initOctokit } = require('./job');
const createMessage = require('./slack_message');

const main = async () => {
  let jobName = core.getInput('plan-job-name').trim();
  const stepName = core.getInput('plan-step-name').trim();
  const workspace = core.getInput('workspace').trim();
  const channel = core.getInput('channel').trim();
  let githubToken = core.getInput('github-token').trim();
  let slackBotToken = core.getInput('slack-bot-token').trim();

  // github token can be also given via env
  githubToken = githubToken || process.env.GITHUB_TOKEN;
  if (githubToken === '') {
    throw new Error('Need to provide one of github-token or GITHUB_TOKEN environment variable');
  }

  // slack bot token can be also given via env
  slackBotToken = slackBotToken || process.env.SLACK_BOT_TOKEN;
  if (slackBotToken === '') {
    throw new Error('Need to provide one of slack-bot-token or SLACK_BOT_TOKEN environment variable');
  }

  initOctokit(githubToken)

  const input = await getStepLogs(jobName, stepName, context);

  const result = parse(input);

  const planUrl = await getPlanStepUrl(jobName, stepName, context, result.summary.offset);

  const message = createMessage(result, workspace, planUrl);

  await send(channel, slackBotToken, message);

  core.setOutput('outside', jsonString(result.output));
  core.setOutput('action', jsonString(result.action));
  core.setOutput('output', jsonString(result.output));
  core.setOutput('warning', jsonString(result.warning));
  core.setOutput('summary', jsonString(result.summary));
  core.setOutput('should-apply', result.shouldApply);
};

module.exports = main;
