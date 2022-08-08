const parse = require("../src/parser");
const fs = require("fs");
const chai = require("chai")


describe("merger", () => {
  it("basic test", async () => {
    const file = fs.readFileSync(".github/plan3.stdout", 'utf-8')
    const result = parse(file)

    chai.assert.isNotNull(result)
  })
})
