const js = require("fs").readFileSync("scripts/_flextv_bundle.js", "utf8");

// Find decrypt / AES usage
for (const n of [
  "AES.decrypt",
  "is_encrypt",
  "decrypt",
  "encUtf8",
  "CryptoJS",
  "aesKey",
  "AES_KEY",
  "secretKey",
  "FifZlSY",
]) {
  let idx = 0,
    c = 0;
  while ((idx = js.indexOf(n, idx)) >= 0 && c < 4) {
    console.log(`\n=== ${n} @${idx} ===`);
    console.log(js.slice(Math.max(0, idx - 150), idx + 400).replace(/\n/g, " "));
    idx += n.length;
    c++;
  }
}
