/**
 * Design reminder — 藍圖工作桌：雙語資訊應像工作台上的對照卡，清楚、可掃讀，且不取代原始程式碼。
 */

export type BilingualGuide = {
  explanation: string;
  checkpoint: string;
  terms: Array<{ zh: string; en: string }>;
};

export const bilingualGuides: Record<string, BilingualGuide> = {
  "開始使用": {
    explanation: "先用中文掌握方向，再把英文術語當作日後查文件的座標。",
    checkpoint: "Name the next step in English: environment, source code, or workspace.",
    terms: [
      { zh: "學習環境", en: "development environment" },
      { zh: "原始碼", en: "source code" },
      { zh: "工作區", en: "workspace" },
    ],
  },
  "Java 基礎": {
    explanation: "Java 先理解型別與結構，再記住它們在英文文件中的固定名稱。",
    checkpoint: "Can you explain what a variable, condition, and method do?",
    terms: [
      { zh: "變數", en: "variable" },
      { zh: "基本型別", en: "primitive type" },
      { zh: "條件判斷", en: "conditional statement" },
      { zh: "迴圈", en: "loop" },
      { zh: "方法", en: "method" },
    ],
  },
  "Java 開發": {
    explanation: "Java 開發不只寫 class；要能讀懂 package boundary、dependency、build tool、runtime evidence、test 與 version history。",
    checkpoint: "Can you trace a Java change from source and dependency to test, build output, and Git history?",
    terms: [
      { zh: "套件與匯入", en: "package and import" },
      { zh: "存取修飾子", en: "access modifier" },
      { zh: "相等契約", en: "object contract" },
      { zh: "建置工具", en: "build tool" },
      { zh: "相依套件", en: "dependency" },
      { zh: "日誌記錄器", en: "logger" },
      { zh: "除錯器", en: "debugger" },
      { zh: "單元測試", en: "unit test" },
      { zh: "版本控制", en: "version control" },
    ],
  },
  "Python 基礎": {
    explanation: "Python 的縮排與物件名稱很重要；讀英文文件時先認出 name、iterable 與 slice。",
    checkpoint: "Explain why input returns a string and range excludes its stop value.",
    terms: [
      { zh: "名稱繫結", en: "name binding" },
      { zh: "可迭代物件", en: "iterable" },
      { zh: "縮排", en: "indentation" },
      { zh: "迴圈", en: "loop" },
      { zh: "切片", en: "slice" },
    ],
  },
  "C 語言基礎": {
    explanation: "C 語言學習要同時掌握 syntax、compiler 與 memory model；中文建立概念，英文術語用來閱讀 compiler、GDB 與標準函式庫文件。",
    checkpoint: "Can you trace a C program from source and compiler warnings to its memory ownership and runtime behavior?",
    terms: [
      { zh: "編譯器", en: "compiler" },
      { zh: "標頭檔", en: "header" },
      { zh: "指標", en: "pointer" },
      { zh: "解參照", en: "dereference" },
      { zh: "動態記憶體", en: "dynamic memory" },
      { zh: "陣列邊界", en: "array boundary" },
      { zh: "結構", en: "struct" },
      { zh: "未定義行為", en: "undefined behavior" },
      { zh: "原生開發", en: "native development" },
      { zh: "所有權契約", en: "ownership contract" },
      { zh: "清理路徑", en: "cleanup path" },
      { zh: "預處理器", en: "preprocessor" },
      { zh: "字串化", en: "stringizing" },
      { zh: "記號拼接", en: "token pasting" },
      { zh: "未定義行為消毒器", en: "UndefinedBehaviorSanitizer" },
    ],
  },
  "物件導向": {
    explanation: "把資料與行為放在一起時，中文理解關係，英文認出 class 與 encapsulation。",
    checkpoint: "Describe the difference between a class and an object in one sentence.",
    terms: [
      { zh: "類別", en: "class" },
      { zh: "物件", en: "object" },
      { zh: "建構子", en: "constructor" },
      { zh: "封裝", en: "encapsulation" },
    ],
  },
  "桌面工具": {
    explanation: "桌面程式會把畫面元件與使用者操作連起來；英文文件常以 component 與 event 描述它們。",
    checkpoint: "Find the component that receives the user action.",
    terms: [
      { zh: "圖形使用者介面", en: "graphical user interface (GUI)" },
      { zh: "元件", en: "component" },
      { zh: "事件監聽器", en: "event listener" },
    ],
  },
  "後端 API": {
    explanation: "後端的核心是請求與回應；英文文件中的 request、response 與 endpoint 必須能立即辨認。",
    checkpoint: "Trace one HTTP request from endpoint to response.",
    terms: [
      { zh: "請求", en: "request" },
      { zh: "回應", en: "response" },
      { zh: "端點", en: "endpoint" },
      { zh: "應用程式介面", en: "application programming interface (API)" },
    ],
  },
  "Minecraft 共通": {
    explanation: "模組共通概念先以遊戲內容與識別碼理解，再對照 registry、resource identifier 等原始術語。",
    checkpoint: "Identify the resource identifier for one registered game item.",
    terms: [
      { zh: "模組", en: "mod" },
      { zh: "註冊", en: "registry / registration" },
      { zh: "資源識別碼", en: "resource identifier" },
      { zh: "遊戲物品", en: "game item" },
    ],
  },
  Fabric: {
    explanation: "Fabric 的教學保留 API 原名，先把初始化與註冊流程的英文讀順。",
    checkpoint: "Locate the mod initializer and explain when it runs.",
    terms: [
      { zh: "進入點", en: "entrypoint" },
      { zh: "模組初始化器", en: "mod initializer" },
      { zh: "註冊表", en: "registry" },
    ],
  },
  NeoForge: {
    explanation: "NeoForge 的事件與延遲註冊有固定英文 API 名稱，閱讀時不要翻譯程式碼。",
    checkpoint: "Find the event bus and the deferred register in the example.",
    terms: [
      { zh: "事件匯流排", en: "event bus" },
      { zh: "延遲註冊", en: "deferred register" },
      { zh: "註冊表", en: "registry" },
    ],
  },
};

export const bilingualSearchTerms = Object.fromEntries(
  Object.entries(bilingualGuides).map(([category, guide]) => [
    category,
    [guide.checkpoint, ...guide.terms.flatMap((term) => [term.zh, term.en])],
  ]),
) as Record<string, string[]>;

export function guideForCategory(category: string): BilingualGuide {
  return bilingualGuides[category] ?? bilingualGuides["開始使用"];
}
