#!/usr/bin/env node
/*
 * Quick helper to bootstrap a new portfolio project.
 *
 * Usage:
 *   npm run add:project -- --slug latent_facade --title "Latent Facade"
 *
 * What it does:
 *   1. Reads all images inside  src/project-drafts/<slug>/
 *      (create the folder and drop your originals there-–any size).
 *   2. Optimises them with Sharp → docs/assets/images/projects/<slug>-<width>.<ext>
 *      Widths generated: 540, 1000, 1920.
 *   3. Copies the HTML template  src/html/portfolio-single-style-1.html  to  src/html/<slug>.html
 *      and swaps the document title.
 *   4. Inserts a navigation entry into  src/html/data/global.json  so the page shows up in the site menu.
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// ---------------- helpers ----------------
const log = (msg) => console.log(`\x1b[32m✔︎\x1b[0m ${msg}`);
const error = (msg) => {
  console.error(`\x1b[31m✘ ${msg}\x1b[0m`);
  process.exit(1);
};
const parseArgs = () => {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace(/^--?/, '');
    out[key] = args[i + 1];
  }
  if (!out.slug || !out.title) error('Please provide --slug and --title');
  return out;
};

(async () => {
  const { slug, title } = parseArgs();

  // Paths
  const ROOT = path.resolve(__dirname, '..');
  const draftDir = path.join(ROOT, 'src', 'project-drafts', slug);
  const outputImgDir = path.join(ROOT, 'docs', 'assets', 'images', 'projects');
  const htmlTemplateSrc = path.join(ROOT, 'src', 'html', 'portfolio-single-style-1.html');
  const htmlDest = path.join(ROOT, 'src', 'html', `${slug}.html`);
  const globalJsonPath = path.join(ROOT, 'src', 'html', 'data', 'global.json');

  // ------------- step 1: images -------------
  if (!fs.existsSync(draftDir)) error(`No images found. Create folder ${draftDir} and drop some pictures.`);
  if (!fs.existsSync(outputImgDir)) fs.mkdirSync(outputImgDir, { recursive: true });

  const widths = [540, 1000, 1920];
  const imageFiles = fs.readdirSync(draftDir).filter((f) => /\.(jpe?g|png)$/i.test(f));
  if (imageFiles.length === 0) error('No jpg/png images inside the draft folder.');

  const tasks = [];
  imageFiles.forEach((file) => {
    const ext = path.extname(file);
    const base = path.basename(file, ext);
    widths.forEach((w) => {
      const dest = path.join(outputImgDir, `${base}-${w}${ext}`);
      tasks.push(
        sharp(path.join(draftDir, file))
          .resize({ width: w })
          .withMetadata()
          .toFile(dest)
      );
    });
  });
  await Promise.all(tasks);
  log('Images optimised');

  // ------------- step 2: html ---------------
  if (fs.existsSync(htmlDest)) {
    log(`HTML ${htmlDest} already exists, skipping creation.`);
  } else {
    const galleryImgs = imageFiles.map((file) => {
      const ext = path.extname(file);
      const base = path.basename(file, ext);
      return `assets/images/projects/${base}-1000${ext}`; // medium size for page
    });

    const nunjucksPage = `{% raw %}{% extends 'layouts/layout-1.html' %}
{% set page_title = '${title}' %}
{% block content %}
<section class="py-100">
  <div class="container">
    <h1 class="mb-60">${title}</h1>
    ${galleryImgs
      .map((src) => `<img src="${src}" class="img-fluid mb-40 rounded-3" alt="${title}">`)
      .join('\n    ')}
  </div>
</section>
{% endblock %}{% endraw %}`;

    fs.writeFileSync(htmlDest, nunjucksPage);
    log(`Created simple page ${htmlDest}`);
  }

  // ------------- step 3: add tile to home page --------
  const homePath = path.join(ROOT, 'src', 'html', 'index.html');
  let homeContent = fs.readFileSync(homePath, 'utf-8');
  const cardLine = `            {{ card_project_col('${slug}', 'installation', '50') }}`;
  if (!homeContent.includes(cardLine)) {
    const insertPos = homeContent.lastIndexOf('{{ card_project_col');
    const nextLinePos = homeContent.indexOf('\n', insertPos);
    homeContent =
      homeContent.slice(0, nextLinePos + 1) +
      cardLine +
      '\n' +
      homeContent.slice(nextLinePos + 1);
    fs.writeFileSync(homePath, homeContent);
    log('Home page grid updated');
  } else {
    log('Home page already had a tile – skipped');
  }

  // ------------- step 4: navigation ---------
  const globalData = JSON.parse(fs.readFileSync(globalJsonPath, 'utf-8'));

  // ---- add portfolio entry ----
  if (!globalData.portfolio) globalData.portfolio = {};
  if (!globalData.portfolio[slug]) {
    const firstImg = imageFiles[0];
    const ext = path.extname(firstImg);
    const base = path.basename(firstImg, ext);
    const imgPath = `assets/images/projects/${base}-1000${ext}`;
    globalData.portfolio[slug] = {
      href: `${slug}.html`,
      title: title,
      category: [
        "installation",
        "#"
      ],
      image: {
        lg: imgPath,
        md: imgPath
      }
    };
    log('Added portfolio entry');
  }

  if (
    globalData.navigation &&
    globalData.navigation['#'] &&
    globalData.navigation['#'].sub
  ) {
    const nav = globalData.navigation['#'].sub;
    const pageFile = `${slug}.html`;
    if (nav[pageFile]) {
      log('Navigation already contained entry – skipped');
    } else {
      nav[pageFile] = { name: title };
      fs.writeFileSync(globalJsonPath, JSON.stringify(globalData, null, 4));
      log('Added project to navigation');
    }
  } else {
    error('navigation.#.sub path not found in global.json');
  }

  log('All done ✨  Run  npm run dev  and check your new page.');
})(); 