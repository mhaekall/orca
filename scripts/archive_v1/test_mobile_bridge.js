const { parse } = require('node-html-parser');
async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    }
  });
  return await response.text();
}

async function run() {
  const url = 'https://komikindo.ch/?s=The+Regressed+Mercenary';
  const html = await fetchHtml(url);
  const root = parse(html);
  const list = root.querySelectorAll('.animepost');
  console.log('Search results:', list.length);
  if (list.length > 0) {
     const link = list[0].querySelector('a').getAttribute('href');
     console.log('Link:', link);
     const html2 = await fetchHtml(link);
     const root2 = parse(html2);
     const chapters = root2.querySelectorAll('#chapter_list .lchx a');
     console.log('Chapters:', chapters.length);
  }
}
run();
