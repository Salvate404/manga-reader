const js = require("fs").readFileSync("scripts/_flextv_bundle.js", "utf8");

const i = js.indexOf('hmacSha256(m,"FifZlSY4nb0eg6k8oDG2xC3UIMOwdBru")');
console.log(js.slice(i - 2000, i + 1500));

console.log("\n\n==== httpGet function ====");
const j = js.indexOf("function httpGet");
console.log(js.slice(j, j + 800));

console.log("\n\n==== httpRequest / request wrapper ====");
const k = js.indexOf("async function httpRequest");
console.log(k >= 0 ? js.slice(k, k + 2500) : "no httpRequest");

// find function that builds signature
const s = js.lastIndexOf("function", i);
console.log("\n\n==== enclosing ====", js.slice(s, i + 200));
