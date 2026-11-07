// Transforme dist-artifact/index.html en contenu de page pour claude.ai :
// le titre, les styles, la racine React et le script, sans <html>/<head>/<body>.
import { readFileSync, writeFileSync } from 'node:fs';

const html = readFileSync('dist-artifact/index.html', 'utf8');
const pick = (re) => [...html.matchAll(re)].map((m) => m[0]);
const styles = pick(/<style[^>]*>[\s\S]*?<\/style>/g);
const scripts = pick(/<script[^>]*>[\s\S]*?<\/script>/g);
if (!styles.length || !scripts.length) throw new Error('Styles ou script introuvables');

const page = [
  '<title>La retenue</title>',
  '<meta name="description" content="Comprendre la retenue dans l\'addition, avec des animations.">',
  ...styles,
  '<div id="root"></div>',
  ...scripts,
].join('\n');

writeFileSync('dist-artifact/la-retenue.html', page);
console.log(`dist-artifact/la-retenue.html : ${(page.length / 1024).toFixed(0)} Ko`);
