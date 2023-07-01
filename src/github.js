const { getOctokit } = require("@actions/github");
const axios = require("axios");
const yaml = require("yaml");
const npath = require("path");

let octokit;

const initOctokit = (token) => {
  return (octokit = getOctokit(token));
};

const getWorkflows = async (context) => {
  let ret = [];
  let page = 1;
  let total = 0;
  do {
    const res = await octokit.rest.actions.listRepoWorkflows({
      owner: context.repo.owner,
      repo: context.repo.repo,
      per_page: 100,
      page,
    });
    ret = ret.concat(res.data.workflows);
    total = res.data.total_count;
    page += 1;
  } while (ret.length < total);
  return ret;
};

const getWorkflow = async (context) => {
  const workflows = await getWorkflows(context);
  const workflow = workflows.find((w) => w.name === context.workflow);
  if (!workflow) {
    throw new Error(`failed to get workflow with name: ${context.workflow}`);
  }
  return workflow;
};

const getJobs = async (context) => {
  let ret = [];
  let page = 1;
  let total = 0;
  do {
    const res = await octokit.rest.actions.listJobsForWorkflowRun({
      owner: context.repo.owner,
      repo: context.repo.repo,
      run_id: context.runId,
      per_page: 100,
      page,
    });
    ret = ret.concat(res.data.jobs);
    total = res.data.total_count;
    page += 1;
  } while (ret.length < total);
  return ret;
};

const getJob = async (jobName, context) => {
  const jobs = await getJobs(context);
  const job = jobs.find((j) => j.name === jobName);
  if (!job) {
    throw new Error(`failed to get job with name: ${jobName}`);
  }
  return job;
};

const getJobLogs = async (job, context) => {
  // get link for job logs
  const res1 = await octokit.rest.actions.downloadJobLogsForWorkflowRun({
    owner: context.repo.owner,
    repo: context.repo.repo,
    job_id: job.id,
  });

  // get job logs
  const res2 = await axios.get(res1.url);

  // remove CRs if exists before splitting
  return res2.data.replace(/\r/g, "").split("\n");
};

const getContent = async (path, context) => {
  const fileOrDir = await octokit.rest.repos.getContent({
    owner: context.repo.owner,
    repo: context.repo.repo,
    path,
    ref: context.ref,
  });
  let ret;
  if (Array.isArray(fileOrDir.data)) {
    const files = await Promise.all(
      fileOrDir.data
        .filter((d) => d.type === "file")
        .map((d) =>
          octokit.rest.repos.getContent({
            owner: context.repo.owner,
            repo: context.repo.repo,
            path: d.path,
            ref: context.ref,
          })
        )
    );
    ret = files.map((f) => f.data);
    ret.forEach((r) => {
      r.content = Buffer.from(r.content, "base64").toString();
    });
  } else {
    ret = fileOrDir.data;
    ret.content = Buffer.from(ret.content, "base64").toString();
  }
  return ret;
};

const getNumActionsOfStepsRecursive = async (step, context) => {
  let ret = 1;
  if (step.uses) {
    // handle local composite actions
    if (step.uses.startsWith("./.github/actions")) {
      const actionDir = await getContent(npath.normalize(step.uses), context);
      if (!Array.isArray(actionDir)) {
        return ret;
      }
      const actionFile = actionDir.find((d) => d.name.match(/action.ya?ml/));
      const actionYaml = yaml.parse(actionFile.content);
      for (const s of actionYaml.runs.steps) {
        ret += await getNumActionsOfStepsRecursive(s, context);
      }
    }
    // TODO: handle remote composite actions
  }
  return ret;
};

const getNumActionsOfSteps = async (jobName, context) => {
  const workflow = await getWorkflow(context);
  const workflowFile = await getContent(workflow.path, context);
  if (Array.isArray(workflowFile)) {
    throw new Error("workflow should be a file");
  }
  const workflowYaml = yaml.parse(workflowFile.content);
  const steps = workflowYaml.jobs[jobName].steps;
  const numActions = [1];
  for (const s of steps) {
    numActions.push(await getNumActionsOfStepsRecursive(s, context));
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
  const numStepActions = await getNumActionsOfSteps(jobName, context);

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
  getWorkflow,
  getJob,
  getContent,
  getNumActionsOfSteps,
  getStepLogs,
  getPlanStepUrl,
};
