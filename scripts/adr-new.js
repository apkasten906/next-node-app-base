const fs = require('node:fs');
const path = require('node:path');

const { getAdrDir, listAdrEntries, updateAdrReadmeIndex } = require('./adr-utils');

function slugify(input) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
    .replace(/-+/g, '-');
}

function formatDate(date) {
  const yyyy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function parseArgs(argv) {
  const args = { title: '', status: 'Proposed', date: formatDate(new Date()) };

  const parts = argv.slice(2);
  const titleParts = [];

  for (const part of parts) {
    if (part.startsWith('--status=')) {
      args.status = part.slice('--status='.length);
    } else if (part.startsWith('--date=')) {
      args.date = part.slice('--date='.length);
    } else {
      titleParts.push(part);
    }
  }

  args.title = titleParts.join(' ').trim();
  return args;
}

function main() {
  const { title, status, date } = parseArgs(process.argv);

  if (!title) {
    console.error('Usage: pnpm adr:new "Your ADR Title" [--status=Proposed] [--date=YYYY-MM-DD]');
    process.exit(1);
  }

  const entries = listAdrEntries(process.cwd());
  const numbers = entries
    .map((e) => Number(e.filenameNumber ?? e.header?.number ?? '0'))
    .filter((n) => Number.isFinite(n) && n > 0);

  const next = (numbers.length ? Math.max(...numbers) : 0) + 1;
  const number = String(next).padStart(3, '0');

  const slug = slugify(title);
  if (!slug) {
    console.error('Could not derive a slug from the title.');
    process.exit(1);
  }

  const adrDir = getAdrDir(process.cwd());
  const templatePath = path.join(adrDir, '000-template.md');
  const template = fs.readFileSync(templatePath, 'utf8');

  const content = template
    .replace(/\{\{NUMBER\}\}/g, number)
    .replace(/\{\{TITLE\}\}/g, title)
    .replace(/\{\{STATUS\}\}/g, status)
    .replace(/\{\{DATE\}\}/g, date);

  const fileName = `${number}-${slug}.md`;
  const filePath = path.join(adrDir, fileName);

  if (fs.existsSync(filePath)) {
    console.error(`Refusing to overwrite existing ADR: ${fileName}`);
    process.exit(1);
  }

  fs.writeFileSync(filePath, content, 'utf8');

  // Regenerate index
  const updatedEntries = listAdrEntries(process.cwd());
  updateAdrReadmeIndex(process.cwd(), updatedEntries);

  // eslint-disable-next-line no-console
  console.log(`Created ${path.join('docs', 'adr', fileName)}`);
  // eslint-disable-next-line no-console
  console.log('Updated docs/adr/README.md index');
}

main();
