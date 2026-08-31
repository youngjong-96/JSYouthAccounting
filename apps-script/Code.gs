/**
 * 청년부 회계 Google Sheets 메일 발송 자동화
 *
 * 이 파일은 대상 Google Sheets의 `확장 프로그램 > Apps Script`에 연결되는
 * 컨테이너 바인딩 스크립트로 사용합니다.
 */

const CONFIG = Object.freeze({
  TIME_ZONE: 'Asia/Seoul',
  MAIL_SHEET_NAME: '메일발송',
  WEEKLY_SHEET_NAME: '주간보고서',
  MONTHLY_SHEET_NAME: '월간보고서',
  WEEKLY_NAMED_RANGE: 'MAIL_WEEKLY_REPORT',
  MONTHLY_NAMED_RANGE: 'MAIL_MONTHLY_REPORT',
  WEEKLY_FALLBACK_RANGE: 'A1:H115',
  MONTHLY_FALLBACK_RANGE: 'A1:H70',
  HEADER_SEARCH_ROWS: 5,
  LAST_CONFIG_ROW: 1000,
  LOCK_TIMEOUT_MS: 5000,
  FORMULA_WAIT_MS: 1200,
  TEMP_COPY_WAIT_MS: 1500,
  SENDER_NAME: '청년부 회계팀',
  EXCLUDED_XLSX_SHEETS: ['메일발송', '분석'],
});

const REPORT_TYPE = Object.freeze({
  WEEKLY: '주간',
  MONTHLY: '월간',
  BOTH: '주간+월간',
});

const MAIL_HEADER = Object.freeze({
  REPORT_DATE: Object.freeze({ canonical: '발송일', aliases: ['발송일', '보고서기준일'] }),
  SENDER: Object.freeze({ canonical: '발송메일', aliases: ['발송메일', '발신메일', '발신자메일'] }),
  SUBJECT: Object.freeze({ canonical: '메일제목', aliases: ['메일제목', '제목'] }),
  BODY: Object.freeze({ canonical: '메일본문', aliases: ['메일본문', '본문'] }),
  STATUS: Object.freeze({ canonical: '성공여부', aliases: ['성공여부', '발송결과', '발송상태', '상태'] }),
  REPORT_TYPE: Object.freeze({ canonical: '보고서종류', aliases: ['보고서종류', '보고서유형'] }),
  SELECTED: Object.freeze({ canonical: '발송선택', aliases: ['발송선택', '선택'] }),
});

/**
 * 시트를 열 때 상단 메뉴를 추가합니다.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('📧 회계보고')
    .addItem('메일 제목/본문 작성 안내', 'showMailTemplateGuide')
    .addSeparator()
    .addItem('권한 확인/재승인', 'authorizeReportAutomation')
    .addItem('초기 설정', 'setupReportAutomation')
    .addSeparator()
    .addItem('테스트 발송', 'sendTestReport')
    .addItem('실제 발송', 'sendSelectedReport')
    .addToUi();
}

/**
 * 시트 공동 사용자가 제목·본문 치환자를 바로 확인할 수 있도록 안내합니다.
 */
function showMailTemplateGuide() {
  SpreadsheetApp.getUi().alert(
    '메일 제목/본문 작성 안내',
    [
      '메일제목과 메일본문은 선택한 행의 셀 내용을 발송 시점에 읽습니다.',
      '',
      '제목·본문 공통 치환자',
      '{발송일}  예: 2026년 8월 23일',
      '{발송일ISO}  예: 2026-08-23',
      '{연도}  {월}  {주차}',
      '',
      '본문 전용 보고서 치환자',
      '{주간보고} 또는 {주간보고 캡처 이미지}',
      '{월간보고} 또는 {월간보고 캡처 이미지}',
      '',
      '보고서 치환자는 PNG가 아니라 HTML 표로 바뀌며 PDF도 첨부됩니다.',
      '본문에 보고서 치환자가 없어도 선택한 보고서는 본문 끝에 자동 추가됩니다.',
      '',
      '예시 제목: [{주차}] {발송일} 청년부 회계보고',
      '예시 본문: {발송일} 기준 보고서입니다.\n\n{주간보고}',
    ].join('\n'),
    SpreadsheetApp.getUi().ButtonSet.OK,
  );
}

/**
 * 세분화 권한 승인 화면에서 빠진 권한이 없는지 확인하고 다시 요청합니다.
 * 최초 설치 후 또는 권한 오류가 발생했을 때 Apps Script 편집기에서 실행합니다.
 */
function authorizeReportAutomation() {
  requireAllProjectScopes_();
  SpreadsheetApp.getActiveSpreadsheet().toast(
    '필요한 Google Sheets, Drive, 외부 요청, 메일 발송 권한이 승인되었습니다.',
    '권한 확인 완료',
    8,
  );
  console.log('회계보고 자동화에 필요한 모든 권한이 승인되었습니다.');
}

/**
 * `메일발송` 탭의 보고서 종류/선택 열과 보고서 출력 이름 범위를 준비합니다.
 * 최초 1회 실행하면 되고, 다시 실행해도 기존 이름 범위는 유지합니다.
 */
function setupReportAutomation() {
  requireAllProjectScopes_();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const mailSheet = getRequiredSheet_(ss, CONFIG.MAIL_SHEET_NAME);
  const weeklySheet = getRequiredSheet_(ss, CONFIG.WEEKLY_SHEET_NAME);
  const monthlySheet = getRequiredSheet_(ss, CONFIG.MONTHLY_SHEET_NAME);

  if (mailSheet.getMaxRows() < CONFIG.LAST_CONFIG_ROW) {
    mailSheet.insertRowsAfter(
      mailSheet.getMaxRows(),
      CONFIG.LAST_CONFIG_ROW - mailSheet.getMaxRows(),
    );
  }

  const headerRow = findMailHeaderRow_(mailSheet);
  ensureAutomationHeader_(mailSheet, MAIL_HEADER.STATUS, headerRow);
  ensureAutomationHeader_(mailSheet, MAIL_HEADER.REPORT_TYPE, headerRow);
  ensureAutomationHeader_(mailSheet, MAIL_HEADER.SELECTED, headerRow);
  const mailColumns = getMailColumnMap_(mailSheet, headerRow);

  const rowCount = CONFIG.LAST_CONFIG_ROW - mailColumns.firstDataRow + 1;
  const typeRange = mailSheet.getRange(
    mailColumns.firstDataRow,
    mailColumns.reportType,
    rowCount,
    1,
  );
  const typeValidation = SpreadsheetApp.newDataValidation()
    .requireValueInList(
      [REPORT_TYPE.WEEKLY, REPORT_TYPE.MONTHLY, REPORT_TYPE.BOTH],
      true,
    )
    .setAllowInvalid(false)
    .setHelpText('주간, 월간, 주간+월간 중 하나를 선택하세요.')
    .build();
  typeRange.setDataValidation(typeValidation);

  if (!String(mailSheet.getRange(mailColumns.firstDataRow, mailColumns.reportType).getDisplayValue()).trim()) {
    mailSheet
      .getRange(mailColumns.firstDataRow, mailColumns.reportType)
      .setValue(REPORT_TYPE.WEEKLY);
  }

  const selectionRange = mailSheet.getRange(
    mailColumns.firstDataRow,
    mailColumns.selected,
    rowCount,
    1,
  );
  const previousSelections = selectionRange
    .getValues()
    .map((row) => [row[0] === true]);
  selectionRange.insertCheckboxes();
  selectionRange.setValues(previousSelections);

  mailSheet
    .getRange(mailColumns.headerRow, mailColumns.reportType)
    .setNote('주간, 월간, 주간+월간 중 선택합니다. 비어 있으면 주간으로 처리됩니다.');
  mailSheet
    .getRange(mailColumns.headerRow, mailColumns.selected)
    .setNote('발송할 행 하나만 체크한 뒤 테스트 또는 실제 발송을 실행합니다.');
  mailSheet
    .getRange(mailColumns.headerRow, mailColumns.status)
    .setNote('테스트/실제 발송 결과와 시각이 자동으로 기록됩니다.');
  mailSheet
    .getRange(mailColumns.headerRow, mailColumns.subject)
    .setNote(
      '발송 시 이 셀의 제목을 사용합니다. 사용 가능: {발송일}, {발송일ISO}, {연도}, {월}, {주차}',
    );
  mailSheet
    .getRange(mailColumns.headerRow, mailColumns.body)
    .setNote(
      '발송 시 이 셀의 본문을 사용합니다. 날짜 치환자와 {주간보고}, {월간보고}를 사용할 수 있습니다. 자세한 내용은 📧 회계보고 메뉴의 작성 안내를 확인하세요.',
    );

  ensureNamedRange_(
    ss,
    CONFIG.WEEKLY_NAMED_RANGE,
    weeklySheet.getRange(CONFIG.WEEKLY_FALLBACK_RANGE),
  );
  ensureNamedRange_(
    ss,
    CONFIG.MONTHLY_NAMED_RANGE,
    monthlySheet.getRange(CONFIG.MONTHLY_FALLBACK_RANGE),
  );

  SpreadsheetApp.flush();
  ss.toast(
    '초기 설정 완료: “보고서종류”를 선택하고 “발송선택”에서 발송할 행 하나를 체크하세요.',
    '회계보고 자동화',
    8,
  );
  console.log('초기 설정이 완료되었습니다. 시트를 새로고침한 뒤 📧 회계보고 메뉴를 사용하세요.');
}

/**
 * 체크된 행의 발송자 이메일로만 테스트 메일을 보냅니다.
 */
function sendTestReport() {
  requireAllProjectScopes_();
  sendReport_(true);
}

/**
 * 체크된 행의 실제 수신자/참조 주소로 메일을 보냅니다.
 */
function sendSelectedReport() {
  requireAllProjectScopes_();
  sendReport_(false);
}

function requireAllProjectScopes_() {
  ScriptApp.requireAllScopes(ScriptApp.AuthMode.FULL);
}

function sendReport_(isTest) {
  const ui = SpreadsheetApp.getUi();
  const lock = LockService.getDocumentLock();
  if (!lock.tryLock(CONFIG.LOCK_TIMEOUT_MS)) {
    ui.alert('다른 발송 작업이 진행 중입니다. 잠시 후 다시 시도해 주세요.');
    return;
  }

  let mailSheet = null;
  let mailColumns = null;
  let selectedRow = null;

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    mailSheet = getRequiredSheet_(ss, CONFIG.MAIL_SHEET_NAME);
    mailColumns = getMailColumnMap_(mailSheet);
    selectedRow = findSelectedMailRow_(mailSheet, mailColumns);
    const mailConfig = readMailConfig_(mailSheet, selectedRow, mailColumns);
    const executorEmail = validateMailConfig_(mailConfig, isTest);
    const period = getReportPeriod_(mailConfig.reportDate, mailConfig.reportDateDisplay);
    const subject = replacePeriodTokens_(mailConfig.subject, period);

    if (subject.length > 250) {
      throw new Error('메일 제목은 날짜 치환 후 250자 이하여야 합니다.');
    }

    if (!isTest && isActuallySent_(mailConfig.status)) {
      throw new Error('이미 실제 발송에 성공한 행입니다. 새 행을 만들어 발송해 주세요.');
    }

    const actualTo = isTest ? [mailConfig.sender || executorEmail] : mailConfig.to;
    const actualCc = isTest ? [] : mailConfig.cc;
    const confirmation = ui.alert(
      isTest ? '테스트 발송 확인' : '실제 발송 확인',
      [
        `발송 기준일: ${period.dateKorean}`,
        `보고서: ${mailConfig.reportType}`,
        `받는 사람: ${actualTo.length}명`,
        `참조: ${actualCc.length}명`,
        `제목: ${subject}`,
        '',
        isTest
          ? '테스트 메일은 발송자 이메일 한 곳으로만 전송됩니다.'
          : '확인을 누르면 실제 수신자에게 메일이 전송됩니다.',
      ].join('\n'),
      ui.ButtonSet.YES_NO,
    );
    if (confirmation !== ui.Button.YES) {
      return;
    }

    updateStatus_(
      mailSheet,
      selectedRow,
      `${isTest ? '테스트' : '실제'} 처리 중 | ${formatNow_()}`,
      mailColumns,
    );

    const selectorSnapshot = captureReportSelectors_(ss);
    let reportArtifacts;
    let workbookBlob;
    try {
      applyReportPeriod_(ss, period);
      SpreadsheetApp.flush();
      Utilities.sleep(CONFIG.FORMULA_WAIT_MS);

      reportArtifacts = buildReportArtifacts_(ss, mailConfig.reportType, period);
      workbookBlob = createSanitizedWorkbookXlsx_(ss, period);
    } finally {
      restoreReportSelectors_(ss, selectorSnapshot);
    }

    const messageBodies = buildMessageBodies_(mailConfig.body, period, reportArtifacts);
    const attachments = reportArtifacts
      .map((artifact) => artifact.pdfBlob)
      .concat([workbookBlob]);

    const recipientCount = actualTo.length + actualCc.length;
    const remainingQuota = MailApp.getRemainingDailyQuota();
    if (recipientCount > remainingQuota) {
      throw new Error(
        `메일 수신자 잔여 한도가 부족합니다. 필요 ${recipientCount}명, 잔여 ${remainingQuota}명`,
      );
    }

    const mailMessage = {
      to: actualTo.join(','),
      subject: isTest ? `[테스트] ${subject}` : subject,
      body: messageBodies.plainText,
      htmlBody: messageBodies.html,
      attachments,
      name: CONFIG.SENDER_NAME,
      replyTo: mailConfig.sender,
    };
    if (actualCc.length > 0) {
      mailMessage.cc = actualCc.join(',');
    }

    MailApp.sendEmail(mailMessage);

    updateStatus_(
      mailSheet,
      selectedRow,
      `${isTest ? '테스트 성공' : '실제 성공'} | ${formatNow_()}`,
      mailColumns,
    );
    if (!isTest) {
      mailSheet.getRange(selectedRow, mailColumns.selected).setValue(false);
    }

    SpreadsheetApp.flush();
    SpreadsheetApp.getActiveSpreadsheet().toast(
      isTest ? '테스트 메일을 발송했습니다.' : '실제 메일을 발송했습니다.',
      '회계보고 자동화',
      5,
    );
    ui.alert(isTest ? '테스트 발송 완료' : '실제 발송 완료');
  } catch (error) {
    const message = getErrorMessage_(error);
    console.error(error && error.stack ? error.stack : error);
    if (mailSheet && mailColumns && selectedRow) {
      updateStatus_(
        mailSheet,
        selectedRow,
        `${isTest ? '테스트 실패' : '실제 실패'} | ${formatNow_()} | ${message}`,
        mailColumns,
      );
    }
    ui.alert('발송 실패', message, ui.ButtonSet.OK);
  } finally {
    lock.releaseLock();
  }
}

/**
 * 자동화에서 관리하는 헤더가 없으면 현재 표의 마지막 열에 추가합니다.
 * 이미 존재하면 현재 위치를 그대로 사용하므로 열 순서를 자유롭게 바꿀 수 있습니다.
 */
function ensureAutomationHeader_(sheet, definition, headerRow) {
  const headers = getMailHeaders_(sheet, headerRow);
  const matches = findHeaderColumnsByAliases_(headers, definition.aliases);
  if (matches.length > 1) {
    throw new Error(
      `“${definition.canonical}”로 인식되는 헤더가 ${headerRow}행에 여러 개 있습니다. 하나만 남겨 주세요.`,
    );
  }
  if (matches.length === 1) {
    return matches[0];
  }

  const column = Math.max(sheet.getLastColumn() + 1, 1);
  if (sheet.getMaxColumns() < column) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), column - sheet.getMaxColumns());
  }
  sheet.getRange(headerRow, column).setValue(definition.canonical);
  return column;
}

function getMailColumnMap_(sheet, knownHeaderRow) {
  const headerRow = knownHeaderRow || findMailHeaderRow_(sheet);
  const mailColumns = buildMailColumnMapFromHeaders_(
    getMailHeaders_(sheet, headerRow),
    headerRow,
  );
  mailColumns.headerRow = headerRow;
  mailColumns.firstDataRow = headerRow + 1;
  return mailColumns;
}

function getMailHeaders_(sheet, headerRow) {
  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  return sheet
    .getRange(headerRow, 1, 1, lastColumn)
    .getDisplayValues()[0];
}

/**
 * 버튼/안내 행의 유무와 관계없이 상단 1~5행에서 메일 표 헤더를 찾습니다.
 */
function findMailHeaderRow_(sheet) {
  const rowCount = Math.min(CONFIG.HEADER_SEARCH_ROWS, sheet.getMaxRows());
  const columnCount = Math.max(sheet.getLastColumn(), 1);
  const rows = sheet.getRange(1, 1, rowCount, columnCount).getDisplayValues();

  for (let index = 0; index < rows.length; index += 1) {
    const headers = rows[index];
    const hasReportDate = findHeaderColumnsByAliases_(headers, MAIL_HEADER.REPORT_DATE.aliases).length === 1;
    const hasSender = findHeaderColumnsByAliases_(headers, MAIL_HEADER.SENDER.aliases).length === 1;
    const hasSubject = findHeaderColumnsByAliases_(headers, MAIL_HEADER.SUBJECT.aliases).length === 1;
    const hasBody = findHeaderColumnsByAliases_(headers, MAIL_HEADER.BODY.aliases).length === 1;
    const hasRecipient = headers.some((header) => isRecipientHeader_(normalizeHeader_(header)));

    if (hasReportDate && hasSender && hasSubject && hasBody && hasRecipient) {
      return index + 1;
    }
  }

  throw new Error(
    '메일발송 탭 1~5행에서 헤더 행을 찾을 수 없습니다. 발송일, 발송메일, 수신자1, 메일제목, 메일본문 헤더를 확인해 주세요.',
  );
}

/**
 * 감지한 `메일발송` 헤더 행의 이름을 실제 열 번호로 변환합니다.
 * 수신자/참조 열은 숫자 접미사를 허용하며 여러 개를 사용할 수 있습니다.
 */
function buildMailColumnMapFromHeaders_(headers, headerRow) {
  const resolvedHeaderRow = headerRow || 1;
  const reportDate = requireUniqueHeaderColumn_(headers, MAIL_HEADER.REPORT_DATE, resolvedHeaderRow);
  const sender = requireUniqueHeaderColumn_(headers, MAIL_HEADER.SENDER, resolvedHeaderRow);
  const subject = requireUniqueHeaderColumn_(headers, MAIL_HEADER.SUBJECT, resolvedHeaderRow);
  const body = requireUniqueHeaderColumn_(headers, MAIL_HEADER.BODY, resolvedHeaderRow);
  const status = requireUniqueHeaderColumn_(headers, MAIL_HEADER.STATUS, resolvedHeaderRow);
  const reportType = requireUniqueHeaderColumn_(headers, MAIL_HEADER.REPORT_TYPE, resolvedHeaderRow);
  const selected = requireUniqueHeaderColumn_(headers, MAIL_HEADER.SELECTED, resolvedHeaderRow);
  const recipients = [];
  const cc = [];

  headers.forEach((header, index) => {
    const normalized = normalizeHeader_(header);
    if (isRecipientHeader_(normalized)) {
      recipients.push(index + 1);
    } else if (isCcHeader_(normalized)) {
      cc.push(index + 1);
    }
  });

  if (recipients.length === 0) {
    throw new Error(
      `메일발송 탭 ${resolvedHeaderRow}행에서 “수신자” 헤더를 찾을 수 없습니다. 수신자1, 수신자2처럼 입력해 주세요.`,
    );
  }

  return {
    reportDate,
    sender,
    recipients,
    cc,
    subject,
    body,
    status,
    reportType,
    selected,
  };
}

function requireUniqueHeaderColumn_(headers, definition, headerRow) {
  const matches = findHeaderColumnsByAliases_(headers, definition.aliases);
  if (matches.length === 0) {
    throw new Error(
      `메일발송 탭 ${headerRow}행에서 “${definition.canonical}” 헤더를 찾을 수 없습니다.`,
    );
  }
  if (matches.length > 1) {
    throw new Error(
      `“${definition.canonical}”로 인식되는 헤더가 ${headerRow}행에 여러 개 있습니다. 하나만 남겨 주세요.`,
    );
  }
  return matches[0];
}

function findHeaderColumnsByAliases_(headers, aliases) {
  const normalizedAliases = aliases.map((alias) => normalizeHeader_(alias));
  const matches = [];
  headers.forEach((header, index) => {
    if (normalizedAliases.indexOf(normalizeHeader_(header)) !== -1) {
      matches.push(index + 1);
    }
  });
  return matches;
}

function normalizeHeader_(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_.·-]+/g, '');
}

function isRecipientHeader_(normalizedHeader) {
  return /^(?:수신자|수신자메일|수신메일|받는사람)\d*$/.test(normalizedHeader);
}

function isCcHeader_(normalizedHeader) {
  return /^(?:참조|참조자|참조메일|참조자메일|cc)\d*$/.test(normalizedHeader);
}

function findSelectedMailRow_(sheet, mailColumns) {
  const rowCount = CONFIG.LAST_CONFIG_ROW - mailColumns.firstDataRow + 1;
  const selectedValues = sheet
    .getRange(mailColumns.firstDataRow, mailColumns.selected, rowCount, 1)
    .getValues();
  const selectedRows = [];

  selectedValues.forEach((row, index) => {
    if (row[0] === true) {
      selectedRows.push(mailColumns.firstDataRow + index);
    }
  });

  if (selectedRows.length === 0) {
    throw new Error('“발송선택” 체크박스에서 발송할 행 하나를 선택해 주세요.');
  }
  if (selectedRows.length > 1) {
    throw new Error('한 번에 한 행만 발송할 수 있습니다. 체크박스를 하나만 선택해 주세요.');
  }
  return selectedRows[0];
}

function readMailConfig_(sheet, rowNumber, mailColumns) {
  const allColumns = [
    mailColumns.reportDate,
    mailColumns.sender,
    mailColumns.subject,
    mailColumns.body,
    mailColumns.status,
    mailColumns.reportType,
    mailColumns.selected,
  ].concat(mailColumns.recipients, mailColumns.cc);
  const lastColumn = Math.max.apply(null, allColumns);
  const range = sheet.getRange(rowNumber, 1, 1, lastColumn);
  const raw = range.getValues()[0];
  const display = range.getDisplayValues()[0];
  const to = collectEmails_(display, mailColumns.recipients);
  const toLower = to.map((email) => email.toLowerCase());
  const cc = collectEmails_(display, mailColumns.cc)
    .filter((email) => toLower.indexOf(email.toLowerCase()) === -1);
  const rawAt = (column) => raw[column - 1];
  const displayAt = (column) => display[column - 1];

  return {
    rowNumber,
    reportDate: rawAt(mailColumns.reportDate),
    reportDateDisplay: displayAt(mailColumns.reportDate),
    sender: normalizeEmail_(displayAt(mailColumns.sender)),
    to,
    cc,
    subject: String(displayAt(mailColumns.subject) || '').trim(),
    body: String(rawAt(mailColumns.body) || displayAt(mailColumns.body) || '').trim(),
    status: String(displayAt(mailColumns.status) || '').trim(),
    reportType: normalizeReportType_(displayAt(mailColumns.reportType)),
  };
}

function validateMailConfig_(mailConfig, isTest) {
  const executorEmail = normalizeEmail_(Session.getEffectiveUser().getEmail());

  if (!mailConfig.sender) {
    throw new Error('“발송메일”을 입력해 주세요.');
  }
  validateEmail_(mailConfig.sender, '발송메일');

  if (!executorEmail) {
    throw new Error('현재 실행 계정의 이메일을 확인할 수 없습니다. 발송 계정으로 다시 로그인해 주세요.');
  }
  if (executorEmail.toLowerCase() !== mailConfig.sender.toLowerCase()) {
    throw new Error(
      `발송메일(${mailConfig.sender})과 현재 실행 계정(${executorEmail})이 다릅니다. ` +
      '발송 계정으로 시트를 다시 열어 실행해 주세요.',
    );
  }

  if (!isTest && mailConfig.to.length === 0) {
    throw new Error('“수신자” 열에 실제 수신자를 한 명 이상 입력해 주세요.');
  }
  mailConfig.to.forEach((email) => validateEmail_(email, '수신자'));
  mailConfig.cc.forEach((email) => validateEmail_(email, '참조'));

  if (!mailConfig.subject) {
    throw new Error('“메일제목”을 입력해 주세요.');
  }
  if (!mailConfig.body) {
    throw new Error('“메일본문”을 입력해 주세요.');
  }
  return executorEmail;
}

function getReportPeriod_(rawDate, displayDate) {
  let year;
  let month;
  let day;

  if (Object.prototype.toString.call(rawDate) === '[object Date]' && !Number.isNaN(rawDate.getTime())) {
    year = Number(Utilities.formatDate(rawDate, CONFIG.TIME_ZONE, 'yyyy'));
    month = Number(Utilities.formatDate(rawDate, CONFIG.TIME_ZONE, 'M'));
    day = Number(Utilities.formatDate(rawDate, CONFIG.TIME_ZONE, 'd'));
  } else {
    const matched = String(displayDate || rawDate || '').match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
    if (!matched) {
      throw new Error('“발송일”을 올바른 날짜 형식으로 입력해 주세요.');
    }
    year = Number(matched[1]);
    month = Number(matched[2]);
    day = Number(matched[3]);
  }

  const testDate = new Date(year, month - 1, day, 12, 0, 0);
  if (
    testDate.getFullYear() !== year ||
    testDate.getMonth() + 1 !== month ||
    testDate.getDate() !== day
  ) {
    throw new Error('“발송일”이 유효하지 않습니다.');
  }

  const week = Math.ceil(day / 7);
  return {
    year,
    month,
    day,
    week,
    weekLabel: `${week}주차`,
    dateKey: `${year}-${pad2_(month)}-${pad2_(day)}`,
    dateKorean: `${year}년 ${month}월 ${day}일`,
  };
}

function captureReportSelectors_(ss) {
  return {
    weekly: getRequiredSheet_(ss, CONFIG.WEEKLY_SHEET_NAME).getRange('A3:C3').getValues(),
    monthly: getRequiredSheet_(ss, CONFIG.MONTHLY_SHEET_NAME).getRange('B4:C4').getValues(),
  };
}

function applyReportPeriod_(ss, period) {
  getRequiredSheet_(ss, CONFIG.WEEKLY_SHEET_NAME)
    .getRange('A3:C3')
    .setValues([[period.year, period.month, period.weekLabel]]);
  getRequiredSheet_(ss, CONFIG.MONTHLY_SHEET_NAME)
    .getRange('B4:C4')
    .setValues([[period.year, period.month]]);
}

function restoreReportSelectors_(ss, snapshot) {
  if (!snapshot) {
    return;
  }
  getRequiredSheet_(ss, CONFIG.WEEKLY_SHEET_NAME)
    .getRange('A3:C3')
    .setValues(snapshot.weekly);
  getRequiredSheet_(ss, CONFIG.MONTHLY_SHEET_NAME)
    .getRange('B4:C4')
    .setValues(snapshot.monthly);
  SpreadsheetApp.flush();
}

function buildReportArtifacts_(ss, reportType, period) {
  const includeWeekly = reportType === REPORT_TYPE.WEEKLY || reportType === REPORT_TYPE.BOTH;
  const includeMonthly = reportType === REPORT_TYPE.MONTHLY || reportType === REPORT_TYPE.BOTH;
  const artifacts = [];

  if (includeWeekly) {
    const range = trimTrailingBlankRows_(
      getNamedOrFallbackRange_(
        ss,
        CONFIG.WEEKLY_NAMED_RANGE,
        CONFIG.WEEKLY_SHEET_NAME,
        CONFIG.WEEKLY_FALLBACK_RANGE,
      ),
    );
    assertReportHasNoErrors_(range, '주간보고서');
    artifacts.push({
      key: 'weekly',
      title: '주간보고',
      html: rangeToHtml_(range, '주간보고'),
      pdfBlob: exportRangePdf_(ss, range, `${period.dateKey}_청년부_주간보고.pdf`),
    });
  }

  if (includeMonthly) {
    const range = trimTrailingBlankRows_(
      getNamedOrFallbackRange_(
        ss,
        CONFIG.MONTHLY_NAMED_RANGE,
        CONFIG.MONTHLY_SHEET_NAME,
        CONFIG.MONTHLY_FALLBACK_RANGE,
      ),
    );
    assertReportHasNoErrors_(range, '월간보고서');
    artifacts.push({
      key: 'monthly',
      title: '월간보고',
      html: rangeToHtml_(range, '월간보고'),
      pdfBlob: exportRangePdf_(ss, range, `${period.dateKey}_청년부_월간보고.pdf`),
    });
  }

  return artifacts;
}

function buildMessageBodies_(template, period, artifacts) {
  let plainText = replacePeriodTokens_(template, period);
  let html = replacePeriodTokens_(escapeHtml_(template), period).replace(/\r\n|\r|\n/g, '<br>');

  const reportDefinitions = [
    {
      key: 'weekly',
      tokens: ['{주간보고 캡쳐 이미지}', '{주간보고 캡처 이미지}', '{주간보고}'],
      missingText: '[주간보고는 이번 발송 대상에 포함되지 않았습니다.]',
    },
    {
      key: 'monthly',
      tokens: ['{월간보고 캡쳐 이미지}', '{월간보고 캡처 이미지}', '{월간보고}'],
      missingText: '[월간보고는 이번 발송 대상에 포함되지 않았습니다.]',
    },
  ];

  reportDefinitions.forEach((definition) => {
    const artifact = artifacts.find((item) => item.key === definition.key);
    let inserted = false;

    definition.tokens.forEach((token) => {
      if (plainText.indexOf(token) !== -1 || html.indexOf(token) !== -1) {
        inserted = inserted || Boolean(artifact);
        plainText = replaceAll_(
          plainText,
          token,
          artifact ? `[${artifact.title}: 첨부된 PDF를 확인해 주세요.]` : definition.missingText,
        );
        html = replaceAll_(
          html,
          token,
          artifact ? artifact.html : `<p>${escapeHtml_(definition.missingText)}</p>`,
        );
      }
    });

    if (artifact && !inserted) {
      plainText += `\n\n[${artifact.title}: 첨부된 PDF를 확인해 주세요.]`;
      html += `<br><br>${artifact.html}`;
    }
  });

  return { plainText, html };
}

function rangeToHtml_(range, title) {
  const sheet = range.getSheet();
  const values = range.getDisplayValues();
  const backgrounds = range.getBackgrounds();
  const fontColors = range.getFontColors();
  const fontWeights = range.getFontWeights();
  const fontSizes = range.getFontSizes();
  const horizontalAlignments = range.getHorizontalAlignments();
  const verticalAlignments = range.getVerticalAlignments();
  const rowCount = range.getNumRows();
  const columnCount = range.getNumColumns();
  const mergeStarts = {};
  const mergeCovered = {};

  range.getMergedRanges().forEach((merged) => {
    const localRow = merged.getRow() - range.getRow();
    const localColumn = merged.getColumn() - range.getColumn();
    const rows = Math.min(merged.getNumRows(), rowCount - localRow);
    const columns = Math.min(merged.getNumColumns(), columnCount - localColumn);
    if (localRow < 0 || localColumn < 0 || rows <= 0 || columns <= 0) {
      return;
    }

    mergeStarts[`${localRow}:${localColumn}`] = { rows, columns };
    for (let row = localRow; row < localRow + rows; row += 1) {
      for (let column = localColumn; column < localColumn + columns; column += 1) {
        if (row !== localRow || column !== localColumn) {
          mergeCovered[`${row}:${column}`] = true;
        }
      }
    }
  });

  const widths = [];
  let widthTotal = 0;
  for (let column = 0; column < columnCount; column += 1) {
    const width = Math.max(30, sheet.getColumnWidth(range.getColumn() + column));
    widths.push(width);
    widthTotal += width;
  }

  const html = [];
  html.push('<div style="margin:16px 0;max-width:960px;overflow-x:auto;">');
  html.push(`<h3 style="margin:0 0 8px 0;font-size:18px;color:#111827;">${escapeHtml_(title)}</h3>`);
  html.push('<table role="presentation" style="border-collapse:collapse;width:100%;max-width:960px;table-layout:fixed;font-family:Arial,\'Noto Sans KR\',sans-serif;">');
  html.push('<colgroup>');
  widths.forEach((width) => {
    html.push(`<col style="width:${((width / widthTotal) * 100).toFixed(2)}%;">`);
  });
  html.push('</colgroup><tbody>');

  for (let row = 0; row < rowCount; row += 1) {
    const rowHeight = Math.max(18, sheet.getRowHeight(range.getRow() + row));
    html.push(`<tr style="height:${rowHeight}px;">`);

    for (let column = 0; column < columnCount; column += 1) {
      const key = `${row}:${column}`;
      if (mergeCovered[key]) {
        continue;
      }

      const merge = mergeStarts[key];
      const spanAttributes = merge
        ? `${merge.rows > 1 ? ` rowspan="${merge.rows}"` : ''}${merge.columns > 1 ? ` colspan="${merge.columns}"` : ''}`
        : '';
      const horizontal = normalizeHorizontalAlignment_(horizontalAlignments[row][column]);
      const vertical = normalizeVerticalAlignment_(verticalAlignments[row][column]);
      const value = values[row][column]
        ? escapeHtml_(values[row][column]).replace(/\r\n|\r|\n/g, '<br>')
        : '&nbsp;';
      const style = [
        'border:1px solid #6b7280',
        'padding:4px 6px',
        `background:${backgrounds[row][column] || '#ffffff'}`,
        `color:${fontColors[row][column] || '#000000'}`,
        `font-weight:${fontWeights[row][column] === 'bold' ? '700' : '400'}`,
        `font-size:${fontSizes[row][column] || 10}px`,
        `text-align:${horizontal}`,
        `vertical-align:${vertical}`,
        'white-space:normal',
        'word-break:break-word',
      ].join(';');

      html.push(`<td${spanAttributes} style="${style}">${value}</td>`);
    }
    html.push('</tr>');
  }

  html.push('</tbody></table></div>');
  return html.join('');
}

function exportRangePdf_(ss, range, fileName) {
  const sheet = range.getSheet();
  const rowStart = range.getRow() - 1;
  const columnStart = range.getColumn() - 1;
  const rowEnd = rowStart + range.getNumRows();
  const columnEnd = columnStart + range.getNumColumns();
  const query = [
    'format=pdf',
    'size=A4',
    'portrait=true',
    'fitw=true',
    'sheetnames=false',
    'printtitle=false',
    'pagenumbers=false',
    'gridlines=false',
    'fzr=false',
    'attachment=true',
    `gid=${sheet.getSheetId()}`,
    `r1=${rowStart}`,
    `c1=${columnStart}`,
    `r2=${rowEnd}`,
    `c2=${columnEnd}`,
  ].join('&');
  const url = `https://docs.google.com/spreadsheets/d/${ss.getId()}/export?${query}`;
  const response = UrlFetchApp.fetch(url, {
    method: 'get',
    headers: { Authorization: `Bearer ${ScriptApp.getOAuthToken()}` },
    muteHttpExceptions: true,
  });
  assertSuccessfulExport_(response, 'PDF');
  return response.getBlob().setName(fileName);
}

function createSanitizedWorkbookXlsx_(ss, period) {
  const sourceFile = DriveApp.getFileById(ss.getId());
  const tempFile = sourceFile.makeCopy(
    `[임시] ${period.dateKey} 청년부 회계 ${Utilities.getUuid()}`,
  );

  try {
    const tempSpreadsheet = SpreadsheetApp.openById(tempFile.getId());
    CONFIG.EXCLUDED_XLSX_SHEETS.forEach((sheetName) => {
      const sheet = tempSpreadsheet.getSheetByName(sheetName);
      if (sheet && tempSpreadsheet.getSheets().length > 1) {
        tempSpreadsheet.deleteSheet(sheet);
      }
    });
    SpreadsheetApp.flush();
    Utilities.sleep(CONFIG.TEMP_COPY_WAIT_MS);

    const url = `https://docs.google.com/spreadsheets/d/${tempSpreadsheet.getId()}/export?format=xlsx`;
    const response = UrlFetchApp.fetch(url, {
      method: 'get',
      headers: { Authorization: `Bearer ${ScriptApp.getOAuthToken()}` },
      muteHttpExceptions: true,
    });
    assertSuccessfulExport_(response, 'XLSX');
    return response
      .getBlob()
      .setName(`${period.dateKey}_청년부_회계.xlsx`);
  } finally {
    tempFile.setTrashed(true);
  }
}

function assertSuccessfulExport_(response, type) {
  const status = response.getResponseCode();
  if (status >= 200 && status < 300) {
    return;
  }
  const detail = String(response.getContentText() || '').slice(0, 300);
  throw new Error(`${type} 내보내기에 실패했습니다. HTTP ${status}${detail ? `: ${detail}` : ''}`);
}

function assertReportHasNoErrors_(range, reportName) {
  const errors = [];
  const values = range.getDisplayValues();
  const errorPattern = /^#(?:REF!|N\/A|VALUE!|DIV\/0!|NAME\?|NUM!|NULL!|ERROR!)/i;

  values.forEach((row, rowIndex) => {
    row.forEach((value, columnIndex) => {
      if (errorPattern.test(String(value).trim())) {
        errors.push(range.getCell(rowIndex + 1, columnIndex + 1).getA1Notation());
      }
    });
  });

  if (errors.length > 0) {
    throw new Error(
      `${reportName}에 수식 오류가 있습니다: ${errors.slice(0, 10).join(', ')}` +
        (errors.length > 10 ? ` 외 ${errors.length - 10}개` : ''),
    );
  }
}

function trimTrailingBlankRows_(range) {
  const values = range.getDisplayValues();
  let lastNonEmptyRow = values.length - 1;

  while (
    lastNonEmptyRow > 0 &&
    values[lastNonEmptyRow].every((value) => String(value).trim() === '')
  ) {
    lastNonEmptyRow -= 1;
  }

  return range.offset(0, 0, lastNonEmptyRow + 1, range.getNumColumns());
}

function getNamedOrFallbackRange_(ss, namedRange, sheetName, fallbackA1) {
  const range = ss.getRangeByName(namedRange);
  if (range) {
    return range;
  }
  return getRequiredSheet_(ss, sheetName).getRange(fallbackA1);
}

function ensureNamedRange_(ss, name, fallbackRange) {
  if (!ss.getRangeByName(name)) {
    ss.setNamedRange(name, fallbackRange);
  }
}

function getRequiredSheet_(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error(`필수 시트 “${sheetName}”을 찾을 수 없습니다.`);
  }
  return sheet;
}

function collectEmails_(displayRow, columns) {
  const emails = [];
  columns.forEach((column) => {
    String(displayRow[column - 1] || '')
      .split(/[,;\n]+/)
      .map((email) => normalizeEmail_(email))
      .filter(Boolean)
      .forEach((email) => {
        if (!emails.some((existing) => existing.toLowerCase() === email.toLowerCase())) {
          emails.push(email);
        }
      });
  });
  return emails;
}

function normalizeEmail_(value) {
  return String(value || '').trim();
}

function validateEmail_(email, label) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error(`${label} 이메일 형식이 올바르지 않습니다: ${email}`);
  }
}

function normalizeReportType_(value) {
  const normalized = String(value || '').replace(/\s+/g, '');
  if (!normalized || normalized === REPORT_TYPE.WEEKLY) {
    return REPORT_TYPE.WEEKLY;
  }
  if (normalized === REPORT_TYPE.MONTHLY) {
    return REPORT_TYPE.MONTHLY;
  }
  if (normalized === REPORT_TYPE.BOTH || normalized === '월간+주간') {
    return REPORT_TYPE.BOTH;
  }
  throw new Error('“보고서종류”는 주간, 월간, 주간+월간 중 하나여야 합니다.');
}

function isActuallySent_(status) {
  return String(status || '').indexOf('실제 성공') === 0;
}

function updateStatus_(sheet, rowNumber, message, mailColumns) {
  sheet.getRange(rowNumber, mailColumns.status).setValue(message);
  SpreadsheetApp.flush();
}

function replacePeriodTokens_(text, period) {
  const replacements = {
    '{발송일}': period.dateKorean,
    '{발송일ISO}': period.dateKey,
    '{연도}': String(period.year),
    '{월}': String(period.month),
    '{주차}': period.weekLabel,
  };
  let result = String(text || '');
  Object.keys(replacements).forEach((token) => {
    result = replaceAll_(result, token, replacements[token]);
  });
  return result;
}

function replaceAll_(text, search, replacement) {
  return String(text).split(search).join(String(replacement));
}

function normalizeHorizontalAlignment_(alignment) {
  const value = String(alignment || '').toLowerCase();
  if (value === 'center' || value === 'right' || value === 'justify') {
    return value;
  }
  return 'left';
}

function normalizeVerticalAlignment_(alignment) {
  const value = String(alignment || '').toLowerCase();
  if (value === 'top' || value === 'bottom' || value === 'middle') {
    return value;
  }
  return 'middle';
}

function escapeHtml_(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatNow_() {
  return Utilities.formatDate(new Date(), CONFIG.TIME_ZONE, 'yyyy-MM-dd HH:mm:ss');
}

function pad2_(value) {
  return String(value).padStart(2, '0');
}

function getErrorMessage_(error) {
  const message = error && error.message ? error.message : String(error || '알 수 없는 오류');
  return message.length > 500 ? `${message.slice(0, 500)}…` : message;
}
