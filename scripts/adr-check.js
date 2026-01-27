const fs = require('node:fs');
const path = require('node:path');

const { getAdrDir, listAdrEntries, parseAdrFilename, generateIndexTable } = require('./adr-utils');

function fail(errors) {
  console.error('\nADR check failed:\n');
  for (const error of errors) {
    console.error(`- ${error}`);
  }

  console.error('\nFix suggestions:');

  console.error('- Run: pnpm adr:index (to regenerate docs/adr/README.md index)');

  console.error('- Use: pnpm adr:new "Your Title" (to create new ADRs)');
  process.exit(1);
}

function main() {
  const errors = [];

  const adrDir = getAdrDir(process.cwd());
  const entries = listAdrEntries(process.cwd());

  // Filename validation
  const numberToFile = new Map();
  for (const entry of entries) {
    const parsed = parseAdrFilename(entry.fileName);
    if (!parsed) {
      errors.push(
        `Invalid ADR filename (expected NNN-kebab-case-title.md): ${path.relative(process.cwd(), entry.filePath)}`
      );
      continue;
    }

    if (!numberToFile.has(parsed.number)) numberToFile.set(parsed.number, []);
    numberToFile.get(parsed.number).push(entry.fileName);

    if (!entry.header) {
      errors.push(
        `Missing or invalid first header line in ${path.relative(process.cwd(), entry.filePath)} (expected: # ADR ${parsed.number}: Title)`
      );
      continue;
    }

    // Enforce strict header format on the first non-empty line
    if (entry.header.strictLine !== entry.header.rawLine) {
      errors.push(
        `Non-standard ADR header in ${path.relative(process.cwd(), entry.filePath)} (expected: "${entry.header.strictLine}")`
      );
    }

    if (entry.header.number !== parsed.number) {
      errors.push(
        `ADR number mismatch in ${path.relative(process.cwd(), entry.filePath)} (filename ${parsed.number}, header ${entry.header.number})`
      );
    }

    if (!entry.status) {
      errors.push(
        `Missing Status in ${path.relative(process.cwd(), entry.filePath)} (add: Status: Accepted|Proposed|Deprecated|Superseded)`
      );
    }

    if (!entry.date) {
      errors.push(
        `Missing Date in ${path.relative(process.cwd(), entry.filePath)} (add: Date: YYYY-MM-DD)`
      );
    }
  }

  // Duplicate number validation
  for (const [number, files] of numberToFile.entries()) {
    if (files.length > 1) {
      errors.push(
        `Duplicate ADR number ${number}: ${files.map((f) => path.join('docs', 'adr', f)).join(', ')}`
      );
    }
  }

  // Index validation (must match generated table)
  const readmePath = path.join(adrDir, 'README.md');
  const readme = fs.readFileSync(readmePath, 'utf8');
  const start = '<!-- adr-index:start -->';
  const end = '<!-- adr-index:end -->';

  const startIdx = readme.indexOf(start);
  const endIdx = readme.indexOf(end);
  if (startIdx < 0 || endIdx < 0 || endIdx <= startIdx) {
    errors.push(
      'docs/adr/README.md is missing index markers (<!-- adr-index:start --> / <!-- adr-index:end -->).'
    );
  } else {
    const currentBlock = readme.slice(startIdx + start.length, endIdx);
    const expectedTable = `\n\n${generateIndexTable(entries)}\n\n`;

    if (currentBlock !== expectedTable) {
      errors.push('docs/adr/README.md index table is out of date (run pnpm adr:index).');
    }
  }

  if (errors.length) fail(errors);

  // eslint-disable-next-line no-console
  console.log(`ADR check passed (${entries.length} ADRs).`);
}

main();
