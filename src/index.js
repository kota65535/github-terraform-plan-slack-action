const core = require("@actions/core");
const { context } = require("@actions/github");
const main = require("./main");
const { logJson } = require("../src/util");

logJson("context", context);
logJson("env", process.env);
try {
  main();
} catch (error) {
  core.setFailed(error.message);
}
