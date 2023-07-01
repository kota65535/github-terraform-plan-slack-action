const { initOctokit, getWorkflow, getJob, getContent, getNumActionsOfSteps } = require("../src/github");
const assert = require("chai").assert;
require("dotenv").config();

describe("github", () => {
  before(async () => {
    const token = process.env.GITHUB_TOKEN;
    initOctokit(token);
  });

  it("gets a workflow", async () => {
    const workflow = await getWorkflow({
      repo: {
        owner: "kota65535",
        repo: "github-terraform-plan-comment-action",
      },
      workflow: "Test",
    });
    assert.isNotNull(workflow);
    assert.isNotNull(workflow.name === "Test");
  });

  it("gets a job", async () => {
    const job = await getJob("plan", {
      repo: {
        owner: "kota65535",
        repo: "github-terraform-plan-comment-action",
      },
      runId: "4625781242",
    });
    assert.isNotNull(job);
    assert.isNotNull(job.name === "plan");
  });

  it("gets a repository file", async () => {
    const file = await getContent(".github/actions/setup-tools/action.yml", {
      repo: {
        owner: "kota65535",
        repo: "github-terraform-plan-comment-action",
      },
    });
    assert.isNotNull(file);
    assert.isObject(file);
    assert.isString(file.content);
  });

  it("gets repository files", async () => {
    const files = await getContent(".github/workflows", {
      repo: {
        owner: "kota65535",
        repo: "github-terraform-plan-comment-action",
      },
      ref: "main",
    });
    assert.isNotNull(files);
    assert.isArray(files);
    files.forEach((f) => assert.isString(f.content));
  });

  it("get numbers of each steps", async () => {
    const numActions = await getNumActionsOfSteps("plan", {
      repo: {
        owner: "kota65535",
        repo: "github-terraform-plan-comment-action",
      },
      workflow: "Test",
    });
    assert.deepEqual(numActions, [1, 1, 6, 1, 1, 1, 1, 1]);
  });
});
