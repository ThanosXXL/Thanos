const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("dashboardAPI", {
  loadData: () => ipcRenderer.invoke("load-data"),
  saveData: (data) => ipcRenderer.invoke("save-data", data),
  notify: (title, body) => ipcRenderer.invoke("notify", title, body),
  openExternal: (url) => ipcRenderer.invoke("open-external", url),
  saveDocument: (filename, byteArray) => ipcRenderer.invoke("save-document", filename, byteArray),
});
