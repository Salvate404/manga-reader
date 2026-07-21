# MangáReader

Leitor de mangá com busca em várias fontes, histórico de leitura e interface sem anúncios.

## Rodar localmente

```bash
npm install
npm run dev -- --webpack
```

Abra [http://localhost:3000](http://localhost:3000).

> Use `--webpack` no dev: o Turbopack (padrão do Next 16) pode travar o PC em alguns ambientes Windows.

### Mangá e Anime

Na home, use o filtro **Mangá | Anime**.

| Modo | Fontes | O que faz |
|------|--------|-----------|
| Mangá | Leitura Manga, Nexus, MangaLix, MangaDex | Busca + leitura de páginas |
| Anime | **AnimeFire** (PT-BR dublado/legendado) e **AniList** (catálogo) | Sinopse em português + player |

Arquitetura paralela: `src/lib/scrapers/` (mangá) e `src/lib/anime/` (anime).

## Publicar na internet (site funcionando de verdade)

**GitHub Pages não serve este projeto.** O Pages só mostra arquivos estáticos (por isso aparece o README com texto do create-next-app). O MangáReader precisa de servidor Node para as APIs de busca, capítulos e proxy de imagens.

A forma mais simples é a **Vercel** (grátis, feita pelos criadores do Next.js):

1. Envie o código para o GitHub (`Salvate404/manga-reader`)
2. Acesse [vercel.com/new](https://vercel.com/new) e faça login com GitHub
3. Importe o repositório `manga-reader`
4. Clique em **Deploy** (não precisa mudar nenhuma configuração)
5. Em ~1 minuto você recebe um link tipo `https://manga-reader-xxx.vercel.app`

Cada push na branch `master` atualiza o site automaticamente.

### GitHub Pages

Pode manter o Pages só para documentação do repositório, ou desativar em **Settings → Pages**. O site ao vivo deve ficar no link da Vercel.
