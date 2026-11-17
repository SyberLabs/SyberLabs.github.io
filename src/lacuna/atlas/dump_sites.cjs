// Prints the site list as JSON, for the share-page builder.
const fs = require("fs"), path = require("path");
const src = fs.readFileSync(path.join(__dirname, "sites.js"), "utf8");
const out = new Function(src + "\nreturn {LIC, SITES};")();
process.stdout.write(JSON.stringify(out));
