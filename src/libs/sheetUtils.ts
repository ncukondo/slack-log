type Sheet = GoogleAppsScript.Spreadsheet.Sheet;
type CellValue = string | boolean | Date | number;

const toConcurrentsafe = <F extends (...args: unknown[]) => unknown>(fn: F) => (
  ...args: Parameters<F>
) => {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    return fn(...args) as ReturnType<F>;
  } finally {
    lock.releaseLock();
  }
};

const insertRow = toConcurrentsafe(
  (sheet: Sheet, rowData: CellValue[], index: number = 1) => {
    sheet
      .insertRowBefore(index)
      .getRange(index, 1, 1, rowData.length)
      .setValues([rowData]);
    SpreadsheetApp.flush();
  }
);

const insertRows = toConcurrentsafe(
  (sheet: Sheet, rowsData: CellValue[][], index: number = 1) => {
    sheet
      .insertRowsBefore(index, rowsData.length)
      .getRange(index, 1, rowsData.length, rowsData[0].length)
      .setValues(rowsData);
    SpreadsheetApp.flush();
  }
);

const insertDict = (
  sheet: Sheet,
  dict: Record<string, CellValue>,
  index: number = 1
) => {
  const [header] = sheet.getDataRange().getValues();
  const newHeader = [
    ...header,
    Object.keys(dict).filter((key) => !header.includes(key)),
  ];
  const valueList = newHeader.map((key) => dict[key]);
  if (newHeader.length > header.length)
    sheet.getRange(1, 1, 1, newHeader.length).setValues([newHeader]);
  insertRow(sheet, valueList, index);
};

const insertDictList = (
  sheet: Sheet,
  dictList: Record<string, CellValue>[],
  index: number = 1
) => {
  const [header] = sheet.getDataRange().getValues();
  const newHeader = dictList.reduce((curr, dict) => {
    return [...curr, Object.keys(dict).filter((key) => !header.includes(key))];
  }, header);
  const valueList = dictList.map((dict) =>
    newHeader.map((key) => dict[key] ?? "")
  );
  if (newHeader.length > header.length)
    sheet.getRange(1, 1, 1, newHeader.length).setValues([newHeader]);
  insertRows(sheet, valueList, index);
};

const columnValues = (sheet: Sheet, key: string) => {
  const [header, ...values] = sheet.getDataRange().getValues();
  const index = header.indexOf(key);
  if (index === -1) return [] as string[];
  return values.map((row) => row[index]);
};

const getSheet = (
  id: string,
  name: string,
  header = [] as readonly string[]
) => {
  const spreadsheet = SpreadsheetApp.openById(id);
  const sheet = spreadsheet.getSheetByName(name);
  if (sheet) return sheet;
  const newSheet = spreadsheet.insertSheet(name);
  if (header.length > 0) {
    newSheet.appendRow(header as string[]);
  }
  return newSheet;
};

export {
  insertRow,
  insertRows,
  getSheet,
  insertDict,
  insertDictList,
  columnValues,
};
