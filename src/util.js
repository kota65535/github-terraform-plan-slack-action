const core = require("@actions/core");

function toJson(obj) {
  return JSON.stringify(obj, null, 2);
}

function logJson(message, obj) {
  core.startGroup(message);
  core.info(toJson(obj));
  core.endGroup();
}

const findLine = (lines, pattern) => {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(pattern);
    if (m) {
      return {
        offset: i,
        match: m,
      };
    }
  }
  return {
    offset: -1,
    match: null,
  };
};

const findLinesBetween = (lines, beginPattern, endPattern) => {
  const matched = [];
  let found = false;
  let offset = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (found) {
      if (line.match(endPattern)) {
        break;
      } else {
        matched.push(line);
      }
    } else {
      if (line.match(beginPattern)) {
        matched.push(line);
        offset = i;
        found = true;
      }
    }
  }
  return {
    offset,
    lines: matched,
  };
};

const findSections = (lines, beginPattern, endPattern, includesEndPattern) => {
  const ret = [];
  let groups = {};
  let str = null;
  let inside = false;
  for (const line of lines) {
    if (inside) {
      const m = line.match(endPattern);
      if (m) {
        ret.push({
          ...groups,
          str,
        });
        if (includesEndPattern) {
          const m = line.match(beginPattern);
          if (m) {
            groups = m.groups;
            str = line + "\n";
            inside = true;
            continue;
          }
        }
        groups = {};
        str = null;
        inside = false;
      } else {
        str += line + "\n";
      }
    } else {
      const m = line.match(beginPattern);
      if (m) {
        groups = m.groups;
        str = line + "\n";
        inside = true;
      }
    }
  }
  // add the final section
  if (str) {
    ret.push({
      ...groups,
      str,
    });
  }
  return ret;
};

const anyMatch = (patterns, line) => {
  for (const [k, p] of Object.entries(patterns)) {
    const m = line.match(p);
    if (m) {
      return {
        name: k,
        match: m,
      };
    }
  }
  return null;
};

const toChunks = (strings, limit) => {
  const result = [];
  let currentChunk = [];
  let currentLength = 0;

  for (const str of strings) {
    const strLength = str.length;

    if (strLength > limit) {
      throw new Error(`the string length of each element must be less than ${limit}`);
    }

    if (currentLength + strLength > limit) {
      result.push(currentChunk);
      currentChunk = [str];
      // +1 for new line character
      currentLength = strLength + 1;
    } else {
      currentChunk.push(str);
      // +1 for new line character
      currentLength += strLength + 1;
    }
  }

  if (currentChunk.length > 0) {
    result.push(currentChunk);
  }

  return result;
};

module.exports = {
  logJson,
  findLine,
  findLinesBetween,
  findSections,
  anyMatch,
  toChunks,
};
