const findLine = (lines, pattern) => {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(pattern);
    if (m) {
      return {
        offset: i,
        match: m
      };
    }
  }
  return {
    offset: -1,
    match: null
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
    lines: matched
  };
};

const findSections = (lines, beginPattern, endPattern, includeEndPattern) => {
  let ret = [];
  let groups = {};
  let str = null;
  let inside = false;
  for (const line of lines) {
    if (inside) {
      const m = line.match(endPattern);
      if (m) {
        ret.push({
          ...groups,
          str
        });
        if (includeEndPattern) {
          const m = line.match(beginPattern);
          if (m) {
            groups = m.groups;
            str = line + '\n';
            inside = true;
            continue
          }
        }
        groups = {};
        str = null;
        inside = false;
      } else {
        str += line + '\n';
      }
    } else {
      const m = line.match(beginPattern);
      if (m) {
        groups = m.groups;
        str = line + '\n';
        inside = true;
      }
    }
  }
  return ret;
};

const anyMatch = (patterns, line) => {
  for (const [k, p] of Object.entries(patterns)) {
    const m = line.match(p);
    if (m) {
      return {
        name: k,
        match: m
      };
    }
  }
  return null;
};

const jsonEscape = (key, val) => {
  if (typeof (val) != 'string') {
    return val;
  }
  return val
    .replace(/[\\]/g, '\\\\')
    .replace(/[\"]/g, '\\"')
    .replace(/[\/]/g, '\\/')
    .replace(/[\b]/g, '\\b')
    .replace(/[\f]/g, '\\f')
    .replace(/[\n]/g, '\\n')
    .replace(/[\r]/g, '\\r')
    .replace(/[\t]/g, '\\t');
};

const jsonString = (obj) => {
  return JSON.stringify(obj, jsonEscape);
};

module.exports = {
  findLine,
  findLinesBetween,
  findSections,
  anyMatch,
  jsonString
};
