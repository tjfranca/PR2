/* Wrapper desktop (Electron): carrega o jogo compilado (dist/index.html)
   numa janela nativa. Tudo funciona offline — sprites e sons são embutidos. */
const { app, BrowserWindow, Menu } = require("electron");
const path = require("path");

function createWindow() {
  const win = new BrowserWindow({
    width: 1024,
    height: 800,
    minWidth: 640,
    minHeight: 480,
    title: "Power Rangers: Batalha de Angel Grove",
    autoHideMenuBar: true,
    backgroundColor: "#0a0a14",
    icon: path.join(__dirname, "build", "icon.png"),
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
    },
  });
  win.loadFile(path.join(__dirname, "dist", "index.html"));
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
