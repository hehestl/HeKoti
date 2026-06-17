"use strict";

const fs = require("node:fs");
const path = require("node:path");

const fromEnv = process.env.npm_package_version;
const fromPkg = require("../package.json").version;
const version = fromEnv || fromPkg;

if (!version) {
  console.error("npm_package_version and package.json.version are missing");
  process.exit(1);
}

const filePath = path.join(process.cwd(), "VERSION");
fs.writeFileSync(filePath, `${version}\n`, "utf8");
console.log(`VERSION updated to ${version}`);
