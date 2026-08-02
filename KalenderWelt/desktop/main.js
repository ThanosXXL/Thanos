const { app, BrowserWindow, ipcMain, Notification, shell, dialog, safeStorage } = require("electron");
const fs = require("fs");
const path = require("path");

const DATA_FILE = () => path.join(app.getPath("userData"), "kalenderwelt-data.json");
const PASSWORD_MARKER = "encrypted:";

function encryptPassword(plain) {
  if (!plain || !safeStorage.isEncryptionAvailable()) return plain || "";
  return PASSWORD_MARKER + safeStorage.encryptString(plain).toString("base64");
}

function decryptPassword(stored) {
  if (!stored || !stored.startsWith(PASSWORD_MARKER)) return stored || "";
  if (!safeStorage.isEncryptionAvailable()) return "";
  try {
    return safeStorage.decryptString(Buffer.from(stored.slice(PASSWORD_MARKER.length), "base64"));
  } catch (err) {
    return "";
  }
}

function loadData() {
  try {
    const raw = fs.readFileSync(DATA_FILE(), "utf-8");
    const data = JSON.parse(raw);
    if (data.mailAccount && data.mailAccount.password) {
      data.mailAccount.password = decryptPassword(data.mailAccount.password);
    }
    return data;
  } catch (err) {
    return null;
  }
}

function saveData(data) {
  const toWrite = JSON.parse(JSON.stringify(data));
  if (toWrite.mailAccount && toWrite.mailAccount.password) {
    toWrite.mailAccount.password = encryptPassword(toWrite.mailAccount.password);
  }
  fs.mkdirSync(path.dirname(DATA_FILE()), { recursive: true });
  fs.writeFileSync(DATA_FILE(), JSON.stringify(toWrite, null, 2), "utf-8");
}

function appDir() {
  return app.isPackaged ? path.join(process.resourcesPath, "app") : path.join(__dirname, "..", "app");
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    backgroundColor: "#b6f2a4",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.loadFile(path.join(appDir(), "index.html"));
}

ipcMain.handle("load-data", () => loadData());
ipcMain.handle("save-data", (event, data) => saveData(data));

ipcMain.handle("notify", (event, title, body) => {
  if (Notification.isSupported()) {
    new Notification({ title, body }).show();
  }
});

ipcMain.handle("open-external", (event, url) => shell.openExternal(url));

ipcMain.handle("save-document", async (event, filename, byteArray) => {
  const win = BrowserWindow.getFocusedWindow();
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    defaultPath: path.join(app.getPath("downloads"), filename),
    filters: [{ name: "Word-Dokument", extensions: ["docx"] }],
  });
  if (canceled || !filePath) return { path: null };
  fs.writeFileSync(filePath, Buffer.from(byteArray));
  shell.showItemInFolder(filePath);
  return { path: filePath };
});

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
