const fs = require('fs');
const path = require('path');
const vm = require('vm');

const code = fs.readFileSync(path.join(__dirname, 'Code.gs'), 'utf8');
const tests = String.raw`
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const canonical = [
  '\uBC1C\uC1A1\uC77C',
  '\uBC1C\uC1A1\uBA54\uC77C',
  '\uC218\uC2E0\uC7901',
  '\uC218\uC2E0\uC7902',
  '\uCC38\uC8701',
  '\uBA54\uC77C\uC81C\uBAA9',
  '\uBA54\uC77C\uBCF8\uBB38',
  '\uC131\uACF5\uC5EC\uBD80',
  '\uBCF4\uACE0\uC11C\uC885\uB958',
  '\uBC1C\uC1A1\uC120\uD0DD',
];
const first = buildMailColumnMapFromHeaders_(canonical);
assert(first.reportDate === 1, 'canonical reportDate');
assert(JSON.stringify(first.recipients) === JSON.stringify([3, 4]), 'canonical recipients');
assert(JSON.stringify(first.cc) === JSON.stringify([5]), 'canonical cc');
assert(first.selected === 10, 'canonical selected');

const createSheet = (rows) => ({
  getMaxRows: () => rows.length,
  getLastColumn: () => Math.max.apply(null, rows.map((row) => row.length).concat([1])),
  getRange: (startRow, startColumn, rowCount, columnCount) => ({
    getDisplayValues: () => Array.from({ length: rowCount }, (_, rowOffset) =>
      Array.from({ length: columnCount }, (_, columnOffset) => {
        const row = rows[startRow - 1 + rowOffset] || [];
        return row[startColumn - 1 + columnOffset] || '';
      }),
    ),
  }),
});

const rowOneMap = getMailColumnMap_(createSheet([canonical, []]));
assert(rowOneMap.headerRow === 1 && rowOneMap.firstDataRow === 2, 'row 1 header detection');

const rowTwoMap = getMailColumnMap_(createSheet([['button'], canonical, []]));
assert(rowTwoMap.headerRow === 2 && rowTwoMap.firstDataRow === 3, 'row 2 header detection');

const reordered = [
  '\uBC1C\uC1A1\uC120\uD0DD',
  '\uBCF4\uACE0\uC11C \uC885\uB958',
  '\uBC1C\uC1A1\uC77C',
  '\uBC1C\uC1A1 \uBA54\uC77C',
  '\uC218\uC2E0\uC7902',
  '\uCC38\uC8701',
  '\uBA54\uC77C \uC81C\uBAA9',
  '\uBA54\uC77C \uBCF8\uBB38',
  '\uBC1C\uC1A1 \uACB0\uACFC',
  '\uC218\uC2E0\uC7901',
  'CC2',
];
const second = buildMailColumnMapFromHeaders_(reordered);
assert(second.selected === 1, 'reordered selected');
assert(second.reportType === 2, 'reordered reportType');
assert(second.reportDate === 3, 'reordered reportDate');
assert(second.sender === 4, 'reordered sender');
assert(JSON.stringify(second.recipients) === JSON.stringify([5, 10]), 'reordered recipients');
assert(JSON.stringify(second.cc) === JSON.stringify([6, 11]), 'reordered cc');
assert(second.subject === 7 && second.body === 8 && second.status === 9, 'reordered fields');

const emails = collectEmails_(
  ['', 'a@example.com; b@example.com', '', 'A@example.com\nc@example.com'],
  [2, 4],
);
assert(
  JSON.stringify(emails) === JSON.stringify(['a@example.com', 'b@example.com', 'c@example.com']),
  'email collection and case-insensitive deduplication',
);

const period = {
  dateKorean: '2026\uB144 8\uC6D4 23\uC77C',
  dateKey: '2026-08-23',
  year: 2026,
  month: 8,
  weekLabel: '4\uC8FC\uCC28',
};
assert(
  replacePeriodTokens_('[{\uC8FC\uCC28}] {\uBC1C\uC1A1\uC77C}', period) ===
    '[4\uC8FC\uCC28] 2026\uB144 8\uC6D4 23\uC77C',
  'token replacement',
);

let missingRecipientError = false;
try {
  buildMailColumnMapFromHeaders_(canonical.filter((header) => !header.startsWith('\uC218\uC2E0\uC790')));
} catch (error) {
  missingRecipientError = String(error.message).includes('\uC218\uC2E0\uC790');
}
assert(missingRecipientError, 'missing recipient header validation');

console.log('Code.gs header-row, header-map, email, and token tests passed');
`;

vm.runInNewContext(`${code}\n${tests}`, { console });
