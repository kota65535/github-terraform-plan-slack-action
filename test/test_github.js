const { initOctokit, getWorkflow, getJob, getContent, getNumActionsOfSteps, getStepLogs } = require("../src/github");
const assert = require("chai").assert;
require("dotenv").config();

describe("github", function () {
  this.timeout(8000);
  before(async () => {
    const token = process.env.GITHUB_TOKEN;
    initOctokit(token);
  });

  it("gets a workflow", async function () {
    const workflow = await getWorkflow({
      repo: {
        owner: "kota65535",
        repo: "github-terraform-plan-slack-action",
      },
      workflow: "Test",
    });
    assert.isNotNull(workflow);
    assert.isNotNull(workflow.name === "Test");
  });

  it("gets a job", async function () {
    const job = await getJob("plan", {
      repo: {
        owner: "kota65535",
        repo: "github-terraform-plan-slack-action",
      },
      runId: "4570557599",
    });
    assert.isNotNull(job);
    assert.isNotNull(job.name === "plan");
  });

  it("gets a repository file", async function () {
    const file = await getContent(".github/actions/setup-tools/action.yml", {
      repo: {
        owner: "kota65535",
        repo: "github-terraform-plan-slack-action",
      },
    });
    assert.isNotNull(file);
    assert.isObject(file);
    assert.isString(file.content);
  });

  it("gets repository files", async function () {
    const files = await getContent(".github/workflows", {
      repo: {
        owner: "kota65535",
        repo: "github-terraform-plan-slack-action",
      },
      ref: "main",
    });
    assert.isNotNull(files);
    assert.isArray(files);
    files.forEach((f) => assert.isString(f.content));
  });

  it("get numbers of each steps", async function () {
    const numActions = await getNumActionsOfSteps("plan", {
      repo: {
        owner: "kota65535",
        repo: "github-terraform-plan-slack-action",
      },
      workflow: "Test",
    });
    assert.deepEqual(numActions, [1, 1, 6, 1, 1, 1, 1, 1]);
  });

  // https://github.com/kota65535/github-terraform-plan-comment-action/actions/runs/5429707815/jobs/9881735654
  it("gets a step logs", async function () {
    const lines = await getStepLogs("plan", "Run terraform plan for dev", {
      repo: {
        owner: "kota65535",
        repo: "github-terraform-plan-comment-action",
      },
      workflow: "Test",
      runId: "5429707815",
    });
    assert.equal(lines.length, 13);
  });

  // https://github.com/kota65535/github-terraform-plan-comment-action/actions/runs/5433757045/jobs/9881689538
  it("gets a step logs when debug enabled", async function () {
    process.env.RUNNER_DEBUG = "1";
    const lines = await getStepLogs("plan", "Run terraform plan for dev", {
      repo: {
        owner: "kota65535",
        repo: "github-terraform-plan-comment-action",
      },
      workflow: "Test",
      runId: "5433882732",
    });
    assert.equal(lines.length, 84);
  });
});
