const fs = require('fs');
const path = require('path');
const glob = require('glob');
const cheerio = require('cheerio');
const acorn = require('acorn');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const LOCALES_PATH = path.join(PROJECT_ROOT, 'locales', 'en-US', 'ui.json');
const RENDERER_PATH = path.join(PROJECT_ROOT, 'renderer');

const readJSON = (filePath) => {
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  }
  return {};
};

const writeJSON = (filePath, data) => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
};

const extractTranslationsFromHTML = (htmlContent) => {
  const $ = cheerio.load(htmlContent);
  const translations = {};

  $('[data-lang]').each((_, elem) => {
    const key = $(elem).attr('data-lang');
    const text = $(elem).text().trim();
    if (key) {
      translations[key] = text;
    }
  });

  return translations;
};

const extractTranslationsFromJS = (jsContent) => {
  const translations = new Set();
  const ast = acorn.parse(jsContent, { ecmaVersion: 'latest', sourceType: 'module' });

  const walk = (node) => {
    if (!node) return;
    switch (node.type) {
      case 'CallExpression':
        if (
          node.callee?.type === 'MemberExpression' &&
          node.callee.object?.name === 'i18next' &&
          node.callee.property?.name === 't'
        ) {
          const [keyArg] = node.arguments;
          if (keyArg?.type === 'Literal' && typeof keyArg.value === 'string') {
            translations.add(keyArg.value);
          }
        }
        node.arguments.forEach(walk);
        walk(node.callee);
        break;
      default:
        for (const prop in node) {
          if (node.hasOwnProperty(prop)) {
            const child = node[prop];
            if (Array.isArray(child)) {
              child.forEach(c => c && typeof c.type === 'string' && walk(c));
            } else if (child?.type) {
              walk(child);
            }
          }
        }
        break;
    }
  };

  walk(ast);
  return translations;
};

// MAIN
const updateSourceTranslations = () => {
  const htmlPattern = path.join(RENDERER_PATH, '**', '*.html').replace(/\\/g, '/');
  const jsPattern = path.join(RENDERER_PATH, '**', '*.js').replace(/\\/g, '/');
  const jsPatternRoot = path.join(PROJECT_ROOT, '**', '*.js').replace(/\\/g, '/');

  const htmlFiles = glob.sync(htmlPattern, { ignore: '**/node_modules/**' });
  const jsFiles = glob.sync(jsPattern, { ignore: '**/node_modules/**' })
                      .concat(glob.sync(jsPatternRoot, { ignore: '**/node_modules/**' }));

  let extractedTranslations = {};

  // HTML
  htmlFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    Object.assign(extractedTranslations, extractTranslationsFromHTML(content));
  });

  // JS
  const extractedJSKeys = new Set();
  jsFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const jsTranslations = extractTranslationsFromJS(content);
    jsTranslations.forEach(key => extractedJSKeys.add(key));
  });

  const sourceTranslations = readJSON(LOCALES_PATH);

  extractedJSKeys.forEach(key => {
    if (!extractedTranslations.hasOwnProperty(key) && !sourceTranslations.hasOwnProperty(key)) {
      extractedTranslations[key] = '';
    }
  });

  let hasChanges = false;

  Object.keys(extractedTranslations).forEach(key => {
    const newValue = extractedTranslations[key];
    if (!sourceTranslations.hasOwnProperty(key)) {
      sourceTranslations[key] = newValue;
      hasChanges = true;
    } else if (sourceTranslations[key] !== newValue && newValue !== '') {
      sourceTranslations[key] = newValue;
      hasChanges = true;
    }
  });

  const extractedKeys = new Set([...Object.keys(extractedTranslations), ...extractedJSKeys]);
  Object.keys(sourceTranslations).forEach(key => {
    if (!extractedKeys.has(key)) {
      delete sourceTranslations[key];
      hasChanges = true;
    }
  });

  if (hasChanges) {
    writeJSON(LOCALES_PATH, sourceTranslations);
  }

  console.log('completed updating translations');
};

updateSourceTranslations();
