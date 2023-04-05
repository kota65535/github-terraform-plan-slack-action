const { getNumActionsOfSteps, initOctokit, getWorkflow, getJob } = require("../src/github");
const assert = require("chai").assert;
require("dotenv").config();

describe("github", () => {
  before(async () => {
    const token = process.env.GITHUB_TOKEN;
    initOctokit(token);
  });
  it("get numbers of each steps", async () => {
    const numActions = await getNumActionsOfSteps("plan", {
      repo: {
        owner: "kota65535",
        repo: "github-terraform-plan-slack-action",
      },
      workflow: "Test",
    });
    assert.deepEqual(numActions, [1, 1, 5, 1, 1, 1, 1, 1]);
  });

  it("get workflow", async () => {
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

  it("get job", async () => {
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
});
