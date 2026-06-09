var SHEET_NAME = "Contacts";
var SPREADSHEET_ID = "YOUR_SPREADSHEET_ID";

var HEADERS = [
  "Name",
  "Headline / Title",
  "Company",
  "Status",
  "Referral",
  "LinkedIn URL",
  "Notes",
  "Date Captured",
];

var STATUS_VALUES = ["Not Connected", "Connection Sent", "Connected", "Message Sent"];
var REFERRAL_VALUES = ["None", "Referral Asked", "Referral Given"];

var STATUS_COLORS = {
  "Connected":       { bg: "#d4edda", font: "#155724" },
  "Not Connected":   { bg: "#f8d7da", font: "#721c24" },
  "Connection Sent": { bg: "#e2e3e5", font: "#383d41" },
  "Message Sent":    { bg: "#cce5ff", font: "#004085" },
};

// Lookup by LinkedIn URL — called on popup open
function doGet(e) {
  try {
    var url = (e.parameter.url || "").replace(/\/$/, "").toLowerCase();
    if (!url) return jsonResponse({ found: false });

    var sheet = getOrCreateSheet();
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return jsonResponse({ found: false });

    var data = sheet.getRange(2, 1, lastRow - 1, 8).getValues();
    for (var i = 0; i < data.length; i++) {
      var rowUrl = (data[i][5] || "").replace(/\/$/, "").toLowerCase();
      if (rowUrl === url) {
        return jsonResponse({
          found: true,
          row: i + 2,
          data: {
            name:     data[i][0],
            headline: data[i][1],
            company:  data[i][2],
            status:   data[i][3],
            referral: data[i][4],
            url:      data[i][5],
            notes:    data[i][6],
            date:     data[i][7],
          }
        });
      }
    }
    return jsonResponse({ found: false });
  } catch (err) {
    return jsonResponse({ found: false, error: err.message });
  }
}

// Insert new row or update existing one
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = getOrCreateSheet();

    // Check if this URL already exists
    var existingRow = findRowByUrl(sheet, data.url);
    if (existingRow) {
      updateRow(sheet, existingRow, data);
    } else {
      appendRow(sheet, data);
    }

    return jsonResponse({ success: true });
  } catch (err) {
    return jsonResponse({ success: false, error: err.message });
  }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function findRowByUrl(sheet, url) {
  if (!url) return null;
  var normalised = url.replace(/\/$/, "").toLowerCase();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;
  var urls = sheet.getRange(2, 6, lastRow - 1, 1).getValues();
  for (var i = 0; i < urls.length; i++) {
    if ((urls[i][0] || "").replace(/\/$/, "").toLowerCase() === normalised) {
      return i + 2;
    }
  }
  return null;
}

function updateRow(sheet, rowNum, data) {
  sheet.getRange(rowNum, 1, 1, 8).setValues([[
    data.name     || "",
    data.headline || "",
    data.company  || "",
    data.status   || "",
    data.referral || "",
    data.url      || "",
    data.notes    || "",
    data.date     || "",
  ]]);
  applyDropdownToRow(sheet, rowNum);
  applyStatusColor(sheet, rowNum, data.status || "");
}

function getOrCreateSheet() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    formatHeaderRow(sheet);
    applyDropdownValidation(sheet);
  }

  return sheet;
}

function appendRow(sheet, data) {
  var lastRow = sheet.getLastRow() + 1;
  sheet.appendRow([
    data.name || "",
    data.headline || "",
    data.company || "",
    data.status || "",
    data.referral || "",
    data.url || "",
    data.notes || "",
    data.date || "",
  ]);
  applyDropdownToRow(sheet, lastRow);
  applyStatusColor(sheet, lastRow, data.status || "");
}

function applyDropdownValidation(sheet) {
  var statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(STATUS_VALUES, true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, 4, 999, 1).setDataValidation(statusRule);

  var referralRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(REFERRAL_VALUES, true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, 5, 999, 1).setDataValidation(referralRule);
}

function applyStatusColor(sheet, row, status) {
  var colors = STATUS_COLORS[status];
  if (!colors) return;
  var cell = sheet.getRange(row, 4);  // Status is now col 4
  cell.setBackground(colors.bg);
  cell.setFontColor(colors.font);
  cell.setFontWeight("bold");
}

function applyDropdownToRow(sheet, row) {
  var statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(STATUS_VALUES, true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(row, 4).setDataValidation(statusRule);

  var referralRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(REFERRAL_VALUES, true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(row, 5).setDataValidation(referralRule);
}

function formatHeaderRow(sheet) {
  var headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
  headerRange.setFontWeight("bold");
  headerRange.setBackground("#0a66c2");
  headerRange.setFontColor("#ffffff");
  sheet.setFrozenRows(1);

  // Col widths: Name, Headline, Company, Status, Referral, LinkedIn URL, Notes, Date
  sheet.setColumnWidth(1, 160);  // Name
  sheet.setColumnWidth(2, 200);  // Headline / Title
  sheet.setColumnWidth(3, 140);  // Company
  sheet.setColumnWidth(4, 130);  // Status
  sheet.setColumnWidth(5, 120);  // Referral
  sheet.setColumnWidth(6, 260);  // LinkedIn URL
  sheet.setColumnWidth(7, 200);  // Notes
  sheet.setColumnWidth(8, 110);  // Date Captured
}

// Reapplies headers, formatting, dropdowns, and status colors without touching data order
function reformatExistingSheet() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) { setupSheet(); return; }

  var lastRow = sheet.getLastRow();

  // Rewrite header row
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  formatHeaderRow(sheet);

  if (lastRow < 2) return;

  // Clear and reapply dropdowns
  sheet.getRange(2, 1, sheet.getMaxRows() - 1, 8).clearDataValidations();
  applyDropdownValidation(sheet);

  // Reapply status colors
  var data = sheet.getRange(2, 1, lastRow - 1, 8).getValues();
  var dataRange = sheet.getRange(2, 1, data.length, 8);
  dataRange.setBackground(null);
  dataRange.setFontColor(null);
  dataRange.setFontWeight("normal");

  data.forEach(function(row, i) {
    applyStatusColor(sheet, i + 2, row[3]); // col 4 = Status
  });
}

function setupSheet() {
  getOrCreateSheet();
}

// Fires automatically when any cell is edited in the spreadsheet
function onEdit(e) {
  var sheet = e.range.getSheet();
  if (sheet.getName() !== SHEET_NAME) return;

  var col = e.range.getColumn();
  var row = e.range.getRow();

  // Column 4 is Status
  if (col === 4 && row > 1) {
    var status = e.range.getValue();
    var colors = STATUS_COLORS[status];
    if (colors) {
      e.range.setBackground(colors.bg);
      e.range.setFontColor(colors.font);
      e.range.setFontWeight("bold");
    } else {
      e.range.setBackground(null);
      e.range.setFontColor(null);
      e.range.setFontWeight("normal");
    }
  }
}

// Run once to install the onEdit trigger permanently
function installTrigger() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  // Remove any existing onEdit triggers to avoid duplicates
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === "onEdit") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("onEdit")
    .forSpreadsheet(ss)
    .onEdit()
    .create();
}