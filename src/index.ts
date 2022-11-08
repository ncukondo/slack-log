import { SheetService } from "./sheet.service";

export function createNewFile() {
  const ss = SheetService.createInitialFile(`New file`);
  ss.getRange("A2").setValue("Happy gas!");
}

const test = "test";
export const test2 = "test2";
export { test };
