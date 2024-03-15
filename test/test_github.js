const { initOctokit, getWorkflow, getJob, getContent } = require("../src/github");
const { getPlanStepLogs } = require("../src/main");
const parse = require("../src/parser");
const assert = require("chai").assert;
require("dotenv").config();

describe("github", function () {
  this.timeout(8000);
  before(async function () {
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

  // https://github.com/kota65535/github-terraform-plan-comment-action/actions/runs/8276189769/job/22644332135?pr=35#step:8:1
  it("gets a step logs (1st)", async function () {
    const lines = await getPlanStepLogs("plan", 0, {
      repo: {
        owner: "kota65535",
        repo: "github-terraform-plan-comment-action",
      },
      workflow: "Test",
      runId: "8276189769",
    });
    const parsed = parse(lines);
    assert.notEqual(parsed.warning.offset, -1);
    assert.notEqual(parsed.summary.offset, -1);
  });

  // https://github.com/kota65535/github-terraform-plan-comment-action/actions/runs/8276189769/job/22644332135?pr=35#step:10:1
  it("gets a step logs (2nd)", async function () {
    const lines = await getPlanStepLogs("plan", 1, {
      repo: {
        owner: "kota65535",
        repo: "github-terraform-plan-comment-action",
      },
      workflow: "Test",
      runId: "8276189769",
    });
    const parsed = parse(lines);
    assert.notEqual(parsed.action.offset, -1);
    assert.notEqual(parsed.output.offset, -1);
    assert.notEqual(parsed.warning.offset, -1);
    assert.notEqual(parsed.summary.offset, -1);
  });

  // https://github.com/kota65535/github-terraform-plan-comment-action/actions/runs/8277529775/job/22648177184?pr=35#step:8:1
  it("gets a step logs when debug enabled (1st)", async function () {
    process.env.RUNNER_DEBUG = "1";
    const lines = await getPlanStepLogs("plan", 0, {
      repo: {
        owner: "kota65535",
        repo: "github-terraform-plan-comment-action",
      },
      workflow: "Test",
      runId: "8277529775",
    });
    const parsed = parse(lines);
    assert.notEqual(parsed.warning.offset, -1);
    assert.notEqual(parsed.summary.offset, -1);
  });

  // https://github.com/kota65535/github-terraform-plan-comment-action/actions/runs/8277529775/job/22648177184?pr=35#step:10:1
  it("gets a step logs when debug enabled (2nd)", async function () {
    process.env.RUNNER_DEBUG = "1";
    const lines = await getPlanStepLogs("plan", 1, {
      repo: {
        owner: "kota65535",
        repo: "github-terraform-plan-comment-action",
      },
      workflow: "Test",
      runId: "8277529775",
    });
    const parsed = parse(lines);
    assert.notEqual(parsed.action.offset, -1);
    assert.notEqual(parsed.output.offset, -1);
    assert.notEqual(parsed.warning.offset, -1);
    assert.notEqual(parsed.summary.offset, -1);
  });
});
