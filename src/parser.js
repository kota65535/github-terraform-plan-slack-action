const { findLinesBetween, findSections, anyMatch, findLine } = require("./util");
const stripAnsi = require("strip-ansi");

const getOutsideChangeSection = (inputLines) => {
  const { offset, lines } = findLinesBetween(inputLines, /^Note: Objects have changed outside of Terraform$/, /^─+/);

  return {
    offset,
    sections: findSections(lines, /^ {2}# (?<name>.*) has changed/, /^$/),
  };
};

const getResourceActionSection = (inputLines) => {
  const { offset, lines } = findLinesBetween(
    inputLines,
    /^Terraform used the selected providers to generate the following execution$/,
    /^Plan:/
  );

  const patterns = {
    create: /^ {2}# (?<name>.*?) will be created$/,
    update: /^ {2}# (?<name>.*?) will be updated in-place$/,
    replace: /^ {2}# (?<name>.*?) ((is tainted, so )?must be replaced|will be replaced, as requested)$/,
    destroy: /^ {2}# (?<name>.*?) will be destroyed$/,
  };

  let inside = null;
  let groups = {};
  let str = null;
  const sections = {
    create: [],
    update: [],
    replace: [],
    destroy: [],
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (inside) {
      const m = anyMatch(patterns, line);
      if (m) {
        sections[inside].push({
          ...groups,
          str,
        });
        groups = m.match.groups;
        str = line + "\n";
        inside = m.name;
      } else {
        str += line + "\n";
      }
    } else {
      const m = anyMatch(patterns, line);
      if (m) {
        groups = m.match.groups;
        str = line + "\n";
        inside = m.name;
      }
    }
  }
  // add last element
  if (inside) {
    sections[inside].push({
      ...groups,
      str,
    });
  }
  return {
    offset,
    sections,
  };
};

const getOutputChangeSection = (inputLines) => {
  const { offset, lines } = findLinesBetween(inputLines, /^Changes to Outputs:$/, /^[─╷]/);

  return {
    offset,
    sections: findSections(lines, /^\s{2}[+~-]\s(?<name>.*?)\s=/, /(^\s{2}[+~-]\s(?<name>.*?)\s=)|(^$)/, true),
  };
};

const getWarningSection = (inputLines) => {
  const { offset, lines } = findLinesBetween(inputLines, /^╷/, /^$/);

  return {
    offset,
    sections: findSections(lines, /^│ Warning:/, /^╵/),
  };
};

const getSummarySection = (inputLines) => {
  {
    const { offset, match } = findLine(inputLines, /^Plan: (\d+) to add, (\d+) to change, (\d+) to destroy.$/);
    if (match) {
      return {
        offset,
        add: parseInt(match[1]),
        change: parseInt(match[2]),
        destroy: parseInt(match[3]),
        str: match[0],
      };
    }
  }
  {
    const { offset, match } = findLine(inputLines, /^No changes. Your infrastructure matches the configuration.$/);
    return {
      offset,
      add: 0,
      change: 0,
      destroy: 0,
      str: match ? match[0] : "",
    };
  }
};

const parse = (rawLines) => {
  const lines = rawLines.map(stripAnsi);

  const outside = getOutsideChangeSection(lines);
  const action = getResourceActionSection(lines);
  const output = getOutputChangeSection(lines);
  const warning = getWarningSection(lines);
  const summary = getSummarySection(lines);

  const shouldApply = summary.add > 0 || summary.change > 0 || summary.destroy > 0 || output.sections.length > 0;
  let shouldRefresh = false;

  // Handle empty summary string when we have output changes but no resource changes
  if (summary.str === "" && output.sections.length > 0) {
    summary.offset = output.offset;
    summary.str = `Output Changes: ${output.sections.length}`;
    shouldRefresh = true;
  }

  return {
    outside,
    action,
    output,
    warning,
    summary,
    shouldApply,
    shouldRefresh,
  };
};

module.exports = parse;
