const js = require("fs").readFileSync("scripts/_flextv_bundle.js", "utf8");
const i = js.indexOf("function getUUID");
console.log(js.slice(i, i + 600));
const j = js.indexOf("getToken");
console.log("\ngetToken", js.slice(j, j + 400));
const k = js.indexOf("visitorLogin");
console.log("\nvisitorLogin idx", k);
// find async function visitorLogin
let idx = 0,
  n = 0;
while ((idx = js.indexOf("visitorLogin", idx)) >= 0 && n < 5) {
  console.log("\n@", idx, js.slice(idx - 40, idx + 200));
  idx += 12;
  n++;
}

// Find play/detail API paths in other imported chunks - look for webGet in whole string
const webs = new Set([...js.matchAll(/"(\/web[A-Za-z0-9_\/]+)"/g)].map((m) => m[1]));
console.log("\nall /web*", [...webs].sort());
