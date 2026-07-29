const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('officeAPI', {
  loadData: () => ipcRenderer.invoke('load-data'),
  saveData: (data) => ipcRenderer.invoke('save-data', data),

  emailTestConnection: (account) => ipcRenderer.invoke('email-test-connection', account),
  emailListFolders: (account) => ipcRenderer.invoke('email-list-folders', account),
  emailFetchMessages: (account, folder, limit) => ipcRenderer.invoke('email-fetch-messages', { account, folder, limit }),
  emailFetchMessageBody: (account, folder, uid) => ipcRenderer.invoke('email-fetch-message-body', { account, folder, uid }),
  emailSend: (account, mail) => ipcRenderer.invoke('email-send', { account, mail }),

  wordExportDocx: (suggestedName, paragraphs) => ipcRenderer.invoke('word-export-docx', { suggestedName, paragraphs }),
  pptxExport: (suggestedName, slides) => ipcRenderer.invoke('pptx-export', { suggestedName, slides })
});
