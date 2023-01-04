const core = require("@actions/core");
const { getOctokit } = require("@actions/github");
const axios = require("axios");
const yaml = require("yaml");
const fs = require("fs");

let octokit;

const initOctokit = (token) => {
  octokit = getOctokit(token);
};

const getWorkflow = async (context) => {
  const res = await octokit.rest.actions.listRepoWorkflows({
    owner: context.repo.owner,
    repo: context.repo.repo,
    per_page: 100,
  });
  return res.data.workflows.find((w) => w.name === context.workflow);
};

const getJob = async (jobName, context) => {
  // get job ID and step number
  const res = await octokit.rest.actions.listJobsForWorkflowRun({
    owner: context.repo.owner,
    repo: context.repo.repo,
    run_id: context.runId,
  });
  const job = res.data.jobs.find((j) => j.name === jobName);
  if (!job) {
    throw new Error(`failed to get job with name: ${jobName}`);
  }
  return job;
};

const getJobLogs = async (job, context) => {
  // get link for job logs
  const res = await octokit.rest.actions.downloadJobLogsForWorkflowRun({
    owner: context.repo.owner,
    repo: context.repo.repo,
    job_id: job.id,
  });

  // get job logs
  const res2 = await axios.get(res.url);

  return res2.data.split("\r\n");
};

const getNumActionsOfStepRecursive = (step) => {
  let ret = 1;
  if (step.uses && fs.existsSync(step.uses)) {
    const actionFile = fs.readFileSync(`${step.uses}/action.yml`, { encoding: "utf-8" });
    const actionYaml = yaml.parse(actionFile);
    for (const s of actionYaml.runs.steps) {
      ret += getNumActionsOfStepRecursive(s);
    }
  }
  return ret;
};

const getNumStepActions = async (jobName, context) => {
  const workflow = await getWorkflow(context);
  const workflowFile = fs.readFileSync(workflow.path, { encoding: "utf-8" });
  const workflowYaml = yaml.parse(workflowFile);
  const steps = workflowYaml.jobs[jobName].steps;
  const numActions = [1];
  for (const s of steps) {
    numActions.push(getNumActionsOfStepRecursive(s));
  }
  return numActions;
};

const getStepLogs = async (jobName, stepName, context) => {
  const job = await getJob(jobName, context);
  const step = job.steps.find((s) => s.name === stepName);
  if (!step) {
    throw new Error(`failed to get step with name: ${stepName}`);
  }

  const logs = await getJobLogs(job, context);
  const numStepActions = await getNumStepActions(jobName, context);

  // divide logs by each step
  const stepsLogs = [];
  let lines = [];
  let curStep = 0;
  for (const l of logs) {
    // trim ISO8601 date string
    const m1 = l.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d+Z) (.*)$/);
    if (!m1) {
      continue;
    }
    const body = m1[2];
    // each step begins with this pattern for now
    const m2 = body.match(/^##\[group\]Run /);
    if (m2) {
      numStepActions[curStep] -= 1;
      if (numStepActions[curStep] === 0) {
        stepsLogs.push(lines);
        lines = [body];
        curStep += 1;
      } else {
        lines.push(body);
      }
    } else {
      lines.push(body);
    }
  }
  stepsLogs.push(lines);

  core.info(JSON.stringify(stepsLogs));
  return stepsLogs[step.number - 1];
};

const getPlanStepUrl = async (jobName, stepName, context, offset) => {
  const job = await getJob(jobName, context);
  const step = job.steps.find((s) => s.name === stepName);
  if (!step) {
    return null;
  }
  return `${job.html_url}#step:${step.number}:${offset + 1}`;
};

module.exports = {
  initOctokit,
  getStepLogs,
  getPlanStepUrl,
};
