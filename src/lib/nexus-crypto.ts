const ORION_SECRET = "OrionNexus2025CryptoKey!Secure";

interface OrionKey {
  key: Uint8Array;
  sbox: Uint8Array;
  rsbox: Uint8Array;
}

function initSBoxForKey(entry: OrionKey): void {
  const t = entry.key;
  for (let r = 0; r < 256; r++) entry.sbox[r] = r;
  let n = 0;
  for (let r = 0; r < 256; r++) {
    n = (n + entry.sbox[r] + t[r % t.length]) % 256;
    [entry.sbox[r], entry.sbox[n]] = [entry.sbox[n], entry.sbox[r]];
  }
  for (let r = 0; r < 256; r++) entry.rsbox[entry.sbox[r]] = r;
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function buildOrionKeys(): Promise<OrionKey[]> {
  const keys: OrionKey[] = [];
  for (let n = 0; n < 5; n++) {
    const keyStr = `_orion_key_${n}_v2_${ORION_SECRET}`;
    const hash = await sha256Hex(keyStr);
    const keyBytes = new Uint8Array(
      (hash.match(/.{1,2}/g) ?? []).map((b) => parseInt(b, 16))
    );
    const entry: OrionKey = {
      key: keyBytes,
      sbox: new Uint8Array(256),
      rsbox: new Uint8Array(256),
    };
    initSBoxForKey(entry);
    keys.push(entry);
  }
  return keys;
}

function rotateRight(e: number, t: number): number {
  const shift = t % 8;
  return 255 & ((e >>> shift) | (e << (8 - shift)));
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function orionDecrypt(keyIndex: number, encrypted: string, keys: OrionKey[]): string {
  const entry = keys[keyIndex];
  const r = entry.key;
  const a = entry.rsbox;
  const l = r.length;
  const o = base64ToBytes(encrypted);
  const s = new Uint8Array(o.length);
  for (let c = o.length - 1; c >= 0; c--) {
    let e = o[c];
    e ^= c > 0 ? o[c - 1] : r[l - 1];
    e = a[e];
    const t = ((r[(c + 3) % l] + (255 & c)) & 255) % 7 + 1;
    e = rotateRight(e, t);
    e ^= r[c % l];
    s[c] = e;
  }
  return new TextDecoder().decode(s);
}

let cachedKeys: OrionKey[] | null = null;

async function getKeys(): Promise<OrionKey[]> {
  if (!cachedKeys) cachedKeys = await buildOrionKeys();
  return cachedKeys;
}

export async function processOrionResponse<T>(data: unknown): Promise<T> {
  if (!data || typeof data !== "object") return data as T;
  const d = data as Record<string, unknown>;
  if (typeof d.d !== "string" || typeof d.k !== "number" || typeof d.v !== "number") {
    return data as T;
  }

  const keys = await getKeys();

  // v=1 usa key 0; v=2 usa key d.k; outras versões também tentam d.k primeiro.
  // Tenta o índice primário e depois todos os outros para garantir robustez.
  const primary = d.v === 1 ? 0 : ((d.k as number) % keys.length);
  const fallbacks = Array.from({ length: keys.length }, (_, i) => i).filter((i) => i !== primary);
  const order = [primary, ...fallbacks];

  for (const keyIndex of order) {
    try {
      const decrypted = orionDecrypt(keyIndex, d.d as string, keys);
      return JSON.parse(decrypted) as T;
    } catch {
      // Tenta próximo índice
    }
  }

  // Não foi possível decriptar — retorna dado bruto
  return data as T;
}
