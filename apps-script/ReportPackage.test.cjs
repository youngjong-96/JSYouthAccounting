const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, 'ReportPackage.html'), 'utf8');
const moduleMatch = html.match(/<script type="module">([\s\S]*?)<\/script>/);

if (!moduleMatch) {
  throw new Error('ReportPackage.html module script not found');
}

new vm.Script(moduleMatch[1]);

const requiredFragments = [
  'buildPrintPackageData()',
  'PDF 열기·인쇄',
  'PNG 다운로드',
  'enableScripting: false',
  'pdfjs-dist@${PDFJS_VERSION}',
  '자료 만들고 메일 발송하기',
  'sendPreparedReportFromDialog(preparedPackage)',
];

requiredFragments.forEach((fragment) => {
  if (!html.includes(fragment)) {
    throw new Error(`ReportPackage.html missing fragment: ${fragment}`);
  }
});

const forbiddenFragments = ['html2canvas', 'splitCanvasIntoA4Pages('];

forbiddenFragments.forEach((fragment) => {
  if (html.includes(fragment)) {
    throw new Error(`ReportPackage.html still contains direct HTML image flow: ${fragment}`);
  }
});

console.log('ReportPackage.html PDF-to-PNG and combined-send checks passed');
