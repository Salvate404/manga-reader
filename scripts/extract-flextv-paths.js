const js = require("fs").readFileSync("scripts/_flextv_bundle.js", "utf8");
const paths = new Set();
for (const m of js.matchAll(/httpGet\(\s*["']([^"']+)["']/g)) paths.add("GET " + m[1]);
for (const m of js.matchAll(/httpPost\(\s*["']([^"']+)["']/g)) paths.add("POST " + m[1]);
console.log([...paths].sort().join("\n"));

const i = js.indexOf("getHotList:async");
console.log("\nSEARCH FN\n", js.slice(i, i + 3000));

const j = js.indexOf("webSearch");
console.log("\nwebSearch around\n", j >= 0 ? js.slice(j - 80, j + 400) : "none");

const k = js.indexOf('"/web');
console.log("\n/web hits");
let idx = 0,
  n = 0;
while ((idx = js.indexOf('"/web', idx)) >= 0 && n < 40) {
  console.log(js.slice(idx, idx + 60));
  idx += 5;
  n++;
}
