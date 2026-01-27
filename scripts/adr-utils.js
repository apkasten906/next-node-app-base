const fs = require('node:fs');
const path = require('node:path');

function getRepoRoot() {
  return process.cwd();
}

function getAdrDir(repoRoot = getRepoRoot()) {
  return path.join(repoRoot, 'docs', 'adr');
}

function isAdrContentFile(fileName) {
  if (!fileName.endsWith('.md')) return false;
  if (fileName === 'README.md') return false;
  if (fileName === '000-template.md') return false;
  return true;
}

function parseAdrFilename(fileName) {
  const match = /^(\d{3})-([a-z0-9][a-z0-9-]*)\.md$/i.exec(fileName);
  if (!match) return null;

  return {
    number: match[1],
    slug: match[2],
  };
}

function readFileLines(filePath, maxLines = 120) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  return { content, lines: lines.slice(0, maxLines) };
}

function firstNonEmptyLineIndex(lines) {
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index].trim() !== '') return index;
  }
  return -1;
}

function parseAdrHeader(lines) {
  const firstIdx = firstNonEmptyLineIndex(lines);
  if (firstIdx === -1) return null;

  const line = lines[firstIdx].trim();

  // Accept legacy variants for parsing, but adr:check can enforce strict format.
  // Examples:
  // - # ADR 008: Title
  // - # ADR-009: Title
  // - # ADR 0008: Title
  const match = /^#\s+ADR(?:-|\s+)(\d{3,4})\s*:\s*(.+)$/.exec(line);
  if (!match) return null;

  const rawNumber = match[1];
  const number = rawNumber.length === 4 ? rawNumber.slice(-3) : rawNumber;
  const title = match[2].trim();

  return { number, title, rawLine: line, strictLine: `# ADR ${number}: ${title}` };
}

function parseAdrStatus(lines) {
  for (const line of lines.slice(0, 80)) {
    const match = /^Status:\s*(.+)$/.exec(line.trim());
    if (match) return match[1].trim();
  }

  const statusHeaderIdx = lines.findIndex((l) => /^##\s*Status\s*$/.test(l.trim()));
  if (statusHeaderIdx >= 0) {
    for (let i = statusHeaderIdx + 1; i < Math.min(lines.length, statusHeaderIdx + 15); i += 1) {
      const candidate = lines[i].trim();
      if (candidate) return candidate;
    }
  }

  return null;
}

function parseAdrDate(lines) {
  for (const line of lines.slice(0, 80)) {
    const match = /^Date:\s*(\d{4}-\d{2}-\d{2})$/.exec(line.trim());
    if (match) return match[1];
  }

  const dateHeaderIdx = lines.findIndex((l) => /^##\s*Date\s*$/.test(l.trim()));
  if (dateHeaderIdx >= 0) {
    for (let i = dateHeaderIdx + 1; i < Math.min(lines.length, dateHeaderIdx + 15); i += 1) {
      const candidate = lines[i].trim();
      if (!candidate) continue;
      const match = /^(\d{4}-\d{2}-\d{2})$/.exec(candidate);
      if (match) return match[1];
      return null;
    }
  }

  return null;
}

function listAdrEntries(repoRoot = getRepoRoot()) {
  const adrDir = getAdrDir(repoRoot);
  const fileNames = fs.readdirSync(adrDir);

  const entries = [];
  for (const fileName of fileNames) {
    if (!isAdrContentFile(fileName)) continue;

    const parsed = parseAdrFilename(fileName);
    const filePath = path.join(adrDir, fileName);
    const { lines } = readFileLines(filePath);

    const header = parseAdrHeader(lines);
    const status = parseAdrStatus(lines);
    const date = parseAdrDate(lines);

    entries.push({
      fileName,
      filePath,
      filenameNumber: parsed?.number ?? null,
      filenameSlug: parsed?.slug ?? null,
      header,
      status,
      date,
    });
  }

  return entries;
}

function sortByNumberAscending(a, b) {
  const an = Number(a.filenameNumber ?? a.header?.number ?? '0');
  const bn = Number(b.filenameNumber ?? b.header?.number ?? '0');
  return an - bn;
}

function generateIndexTable(entries) {
  const sorted = [...entries].sort(sortByNumberAscending);

  const lines = [];
  lines.push('| ADR | Title | Status | Date |');
  lines.push('| --- | ----- | ------ | ---- |');

  for (const entry of sorted) {
    const number = entry.filenameNumber ?? entry.header?.number ?? '???';
    const title = entry.header?.title ?? 'Unknown';
    const status = entry.status ?? 'Unknown';
    const date = entry.date ?? 'Unknown';

    lines.push(`| [${number}](./${entry.fileName}) | ${title} | ${status} | ${date} |`);
  }

  return lines.join('\n');
}

function updateAdrReadmeIndex(repoRoot = getRepoRoot(), entries) {
  const readmePath = path.join(getAdrDir(repoRoot), 'README.md');
  const readme = fs.readFileSync(readmePath, 'utf8');

  const start = '<!-- adr-index:start -->';
  const end = '<!-- adr-index:end -->';

  const startIdx = readme.indexOf(start);
  const endIdx = readme.indexOf(end);

  if (startIdx < 0 || endIdx < 0 || endIdx <= startIdx) {
    throw new Error(`Could not find adr index markers in ${readmePath}`);
  }

  const before = readme.slice(0, startIdx + start.length);
  const after = readme.slice(endIdx);

  const table = `\n\n${generateIndexTable(entries)}\n\n`;
  const updated = `${before}${table}${after}`;

  fs.writeFileSync(readmePath, updated, 'utf8');
}

module.exports = {
  getRepoRoot,
  getAdrDir,
  listAdrEntries,
  parseAdrFilename,
  parseAdrHeader,
  parseAdrStatus,
  parseAdrDate,
  generateIndexTable,
  updateAdrReadmeIndex,
};
