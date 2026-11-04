import { LocalizedError, translator } from "./i18n";
interface Native {
  removeEventListener: (name: "message", fn: (e: MessageEvent) => void) => void;
  postMessage: (request: unknown) => void;
  addEventListener: (name: "message", fn: (e: MessageEvent) => void) => void;
}
declare global {
  interface Window {
    chrome?: { webview?: Native };
  }
}
const pending = new Map<
  string,
  { resolve: (value: any) => void; reject: (err: Error) => void }
>();
const native = window.chrome?.webview;
native?.addEventListener("message", (e) => {
  const msg = e.data,
    p = pending.get(msg.id);
  if (!p) return;
  pending.delete(msg.id);
  if (msg.ok) p.resolve(msg.result);
  else
    p.reject(
      new LocalizedError((lang) =>
        lang === "zh-CN" && msg.chinese ? msg.chinese : msg.error,
      ),
    );
});
export function call<T>(
  method: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  if (!native)
    return Promise.reject(
      new LocalizedError((lang) =>
        translator(lang)("Start the desktop workbench using OnePageBI.exe."),
      ),
    );
  const id = crypto.randomUUID();
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    try {
      native.postMessage({
        id,
        method,
        language: document.documentElement.lang,
        ...args,
      });
    } catch (e) {
      pending.delete(id);
      reject(e);
    }
  });
}
export const resultDragType = "application/x-onepagebi-result";
export function watchInventory(listener: (inventory: Inventory) => void) {
  const handle = (event: MessageEvent) => {
    if (event.data.kind === "inventoryChanged") listener(event.data.inventory);
  };
  native?.addEventListener("message", handle);
  return () => native?.removeEventListener("message", handle);
}
export interface Inventory {
  folder: string;
  isExamples: boolean;
  files: {
    kind: "data" | "report";
    name: string;
    size: number;
    modified: string;
  }[];
}
export interface Snapshot {
  sha256: string;
  name: string;
  bytes: string;
  token: string;
}
export interface History {
  folder: string;
  skipped: number;
  items: {
    id: string;
    recipe?: import("./recipes").RecipeId | "payout";
    source: string;
    editable?:boolean;
    created: string;
    rows: number;
    sheet: string;
  }[];
}
