import https from 'https';

function req(url, hdrs, method = 'GET') {
  return new Promise((resolve, reject) => {
    const r = https.request(url, { method, headers: hdrs }, resp => {
      let d = ''; resp.on('data', c => d += c); resp.on('end', () => resolve({ status: resp.statusCode, body: d }));
    });
    r.on('error', reject);
    r.setTimeout(10000, () => { r.destroy(); reject(new Error('timeout')); });
    r.end();
  });
}

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const apiHdrs = { 'User-Agent': UA, 'Referer': 'https://leituramanga.net/', 'Accept': 'application/json' };
const cdnHdrs = { 'User-Agent': UA, 'Referer': 'https://leituramanga.net/' };

const chapId = '6a3ff923cb4e660f8416aff7';
const slug = 'o-neto-do-imperador-sagrado-e-um-necromante';

// Testar endpoints da API com _id do capítulo
const endpoints = [
  `https://api.leituramanga.net/api/chapter/${chapId}`,
  `https://api.leituramanga.net/api/chapter/images/${chapId}`,
  `https://api.leituramanga.net/api/chapter/get-images?chapterId=${chapId}`,
  `https://api.leituramanga.net/api/chapter/read/${chapId}`,
];
console.log('=== API endpoints com _id ===');
for (const ep of endpoints) {
  const r = await req(ep, apiHdrs);
  console.log(`${r.status} ${ep.split('/api/')[1].slice(0,50)} | ${r.body.slice(0, 120)}`);
}

// Padrões de CDN com _id
const cdnPatterns = [
  `https://cdn.leituramanga.net/chapters/${chapId}/page-1.webp`,
  `https://cdn.leituramanga.net/${chapId}/page-1.webp`,
  `https://cdn.leituramanga.net/chapter/${chapId}/page-1.webp`,
];
console.log('\n=== CDN com _id ===');
for (const url of cdnPatterns) {
  const r = await req(url, cdnHdrs, 'HEAD');
  console.log(`${r.status} ${url.split('net/')[1]}`);
}

// Página HTML do capítulo
console.log('\n=== HTML da página do capítulo ===');
const rPage = await req(`https://leituramanga.net/manga/${slug}/chapter/1`, {
  'User-Agent': UA, 'Accept': 'text/html',
});
console.log('Status:', rPage.status, '| Size:', rPage.body.length);
const imgs = [...new Set(rPage.body.match(/https:\/\/cdn\.leituramanga\.net\/[^"'\s\)\\]+/gi) ?? [])];
console.log('CDN refs:', imgs.slice(0, 5));
// Qualquer URL parecida com imagem de capítulo
const anyImgs = [...new Set(rPage.body.match(/https:\/\/[^"'\s<>]+\.(webp|jpg|jpeg|png)/gi) ?? [])].filter(u => !u.includes('cover'));
console.log('Outras imgs:', anyImgs.slice(0, 5));
// Procurar fetch/axios calls no HTML
const apiCalls = rPage.body.match(/["'](\/api\/[^"']+)["']/g) ?? [];
console.log('API calls no HTML:', [...new Set(apiCalls)].slice(0, 10));
