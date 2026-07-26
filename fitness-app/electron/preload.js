// MyWorkOut speichert seinen Zustand über localStorage im Renderer und
// benötigt daher aktuell keine IPC-Brücke. Die Datei besteht bewusst als
// leerer Preload, damit contextIsolation/nodeIntegration-Absicherung greift
// und künftige native Fähigkeiten (z. B. Dateisystem-Export) hier ergänzt
// werden können, ohne nodeIntegration im Renderer freizugeben.
