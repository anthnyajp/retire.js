#!/usr/bin/env node

const crypto = require("crypto");
const testCases = require("./testcases.json");
const fs = require("fs");
const retire = require("../node/lib/retire.js");
const repo = require("../node/lib/repo.js");
const reporting = require("../node/lib/reporting.js");
const deepScan = require("../node/lib/deepscan.js").deepScan;
const queries = require("./jsrepository-ast.js").queries;
const options = {
  log: reporting.open({}),
};

const limit = process.argv[2];

const hash = {
  sha1: function (data) {
    let shasum = crypto.createHash("sha1");
    shasum.update(data);
    return shasum.digest("hex");
  },
};
if (!fs.existsSync("tmp")) {
  fs.mkdirSync("tmp")
}
function readIfExists(path) {
  return new Promise((resolve,reject) => {
    const p = "tmp/" + path;
    fs.access(p, fs.constants.F_OK, (err) => {
      if (err) return resolve(undefined);
      const data = fs.readFileSync(p, "utf-8");
      return resolve(data);
    });
  })
}

const https = require("https");
const dlCache = {};
async function dl(uri) {
  process.stdout.write(`  Downloading ${uri} `);
  const uriFixed = uri.replace(/[^a-z0-9.]/gi, "_");
  const data = await readIfExists(uriFixed);
  if (data) {
    console.log("(cached)");
    return Promise.resolve(data);
  }
  const start = Date.now();
  return new Promise((resolve, reject) => {
    if (dlCache[uri]) return resolve(dlCache[uri]);
    let d = https.get(uri, (res) => {
      if (res.statusCode != 200)
        return reject(
          "Could not download: " +
            uri +
            " - status: " +
            res.statusCode +
            " " +
            res.statusMessage
        );
      let d = [];
      res.on("data", (data) => d.push(data));
      res.on("end", () => {
        const finish = Date.now();
        console.log(`(${finish - start}ms)`);
        if (res.statusCode != 200) {
          return reject("Failed to download " + uri + ": " + res.statusCode);
        }
        dlCache[uri] = Buffer.concat(d);
        fs.writeFileSync("tmp/" + uriFixed, dlCache[uri]);
        resolve(dlCache[uri]);
      });
    });
    d.on("error", (err) => {
      failure(err);
      return reject("Failed to download " + uri);
    });
  });
}

function exitWithError(...msg) {
  failure(...msg);
  process.exit(1);
}
const colors = {
  Reset: "\x1b[0m",
  Green: "\x1b[32m",
  Red: "\x1b[31m",
};

function success(...msg) {
  console.log(colors.Green, ...msg, colors.Reset);
}
function failure(...msg) {
  console.warn(colors.Red, ...msg, colors.Reset);
}

async function runTests(jsRepo) {
  for (let [name, content] of Object.entries(testCases)) {
    if (limit && limit != name) continue;
    console.log(`Testing ${name}`);
    await testComponent(name, content, jsRepo);
    success(" Successfully tested uri/filename and content detection!");
  }
}

async function testComponent(name, content, jsRepo) {
  for (let [template, tcontent] of Object.entries(content)) {
    let {
      versions,
      subversions,
      contentOnly,
      additionalVersions,
      allowedOtherComponents,
      allowAstMiss,
      allowContentMiss,
    } = tcontent;
    if (limit) {
      versions = Array.from(
        new Set(versions.concat(additionalVersions || []))
      );
    }
    subversions = subversions || [""];
    for (let version of versions) {
      for (let sub of subversions) {
        let t = template
          .replace(/§§version§§/g, version)
          .replace(/§§subversion§§/g, sub);
        await testVersion(name, version, sub, t, jsRepo, { contentOnly, allowedOtherComponents, allowAstMiss, allowContentMiss });
      }
    }
  }
}

async function testVersion(name, version, sub, t, jsRepo, options) {
  const { contentOnly, allowedOtherComponents, allowAstMiss, allowContentMiss } = options;
  if (!contentOnly) {
    testUriAndFilename(name, version, t, jsRepo);
  }
  let content = await fetchContent(t, sub);
  if (!content) return;
  testContent(name, version, t, jsRepo, content, allowedOtherComponents, allowContentMiss);
  if (queries[name]) {
    testAst(name, version, t, jsRepo, content, allowedOtherComponents, allowAstMiss);
  }
}

function testUriAndFilename(name, version, t, jsRepo) {
  let resultsUri = retire.scanUri(t, jsRepo);
  let resultsFilename = retire.scanFileName(t.split("/").pop(), jsRepo);
  let results = resultsUri.concat(resultsFilename);
  validateResults(name, version, t, results, "uri or filename");
}

async function fetchContent(t, sub) {
  try {
    return await dl(t);
  } catch (e) {
    if (e.message && e.message.includes("Failed to download")) {
      console.log("Failed to download, ignoring");
      return null;
    }
    if (sub == ".min") {
      console.log("Ignoring missing minified version", e);
      return null;
    }
    exitWithError(`Failed to download ${t}: ${e}`);
  }
}

function testContent(name, version, t, jsRepo, content, allowedOtherComponents, allowContentMiss) {
  const cRs = Date.now();
  let contentResults = retire.scanFileContent(content, jsRepo, hash);
  const cRt = Date.now() - cRs;
  if (allowedOtherComponents)
    contentResults = contentResults.filter(
      (x) => !allowedOtherComponents.includes(x.component)
    );
  validateResults(name, version, t, contentResults, "content", allowContentMiss);
  success(`  - ${name} @ ${version}  C: ${cRt}ms`);
}

function testAst(name, version, t, jsRepo, content, allowedOtherComponents, allowAstMiss) {
  const bRs = Date.now();
  let astResults = unique(deepScan(content.toString(), jsRepo));
  const bRt = Date.now() - bRs;
  if (allowedOtherComponents)
    astResults = astResults.filter(
      (x) => !allowedOtherComponents.includes(x.component)
    );
  validateResults(name, version, t, astResults, "ast", allowAstMiss);
  success(`  - ${name} @ ${version}  B: ${bRt}ms`);
}

function validateResults(name, version, t, results, method, allowMiss = []) {
  const canSkip = allowMiss && allowMiss.includes(version);
  if (results.length == 0 && !canSkip) {
    exitWithError(`Did not detect ${version} of ${name} using ${method} on ${t}`);
  }
  if (results.length > 1) {
    exitWithError(`Detect multiple components in ${name} using ${method} on ${t} : ${results.map((a) => a.component).join(", ")}`);
  }
  if (!canSkip && results[0].component != name) {
    exitWithError(`Wrong component for ${version} of ${name} using ${method} on ${t}: ${results[0].component}`);
  }
  if (!canSkip && !results[0].version.startsWith(version)) {
    exitWithError(`Wrong version for ${version} of ${name} using ${method} on ${t}: ${results[0].version}`);
  }
}

function unique(a) {
  return a.reduce((p, c) => {
    const existing = p.find((x) => x.component == c.component);
    if (existing) {
      if (existing.version.split("-")[0] == c.version.split("-")[0]) {
        existing.version = existing.version.split("-")[0];
        return p;
      }
    }
    p.push(c);
    return p;
  }, []);
}

repo
  .loadrepositoryFromFile("./jsrepository-v2.json", options)
  .then((jsRepo) => runTests(jsRepo))
  .then(() => console.log("Done!"))
  .catch((err) => console.warn("Failed!", err));
