const { listAdrEntries, updateAdrReadmeIndex } = require('./adr-utils');

function main() {
  const entries = listAdrEntries();
  updateAdrReadmeIndex(process.cwd(), entries);
  // eslint-disable-next-line no-console
  console.log(`Updated docs/adr/README.md index (${entries.length} ADRs).`);
}

main();
