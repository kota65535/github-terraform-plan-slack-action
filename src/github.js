const { getOctokit } = require("@actions/github");
const axios = require("axios");

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

const getContent = async (path, context, pattern) => {
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
        .filter((d) => d.type === "file" && (pattern ? d.name.match(pattern) : true))
        .map((d) =>
          octokit.rest.repos.getContent({
            owner: context.repo.owner,
            repo: context.repo.repo,
            path: d.path,
            ref: context.ref,
          }),
        ),
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

const getStepLogs = async (jobName, context) => {
  const job = await getJob(jobName, context);
  const logs = await getJobLogs(job, context);

  const startPattern =
    process.env.RUNNER_DEBUG === "1" ? /^##\[debug\]Evaluating condition for step: / : /^##\[group\]Run /;

  // divide logs by each step
  const stepsLogs = [];
  let lines = [];
  for (const l of logs) {
    // TODO: handle multiple lines
    const m = l.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d+Z (.*)$/);
    if (!m) {
      continue;
    }
    const body = m[1];
    if (body.match(startPattern)) {
      if (lines.length > 0) {
        stepsLogs.push(lines);
        lines = [];
      }
      lines.push(body);
    } else {
      lines.push(body);
    }
  }
  stepsLogs.push(lines);

  return stepsLogs;
};

const getStepUrl = async (jobName, stepName, context, offset) => {
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
  getStepLogs,
  getStepUrl,
};
