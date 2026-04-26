const { app, BrowserWindow } = require('electron');
const path = require('node:path');

function createWindow () {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // For development, load the frontend running locally (e.g. Vite server)
  // mainWindow.loadURL('http://localhost:5173');
  
  // Or in production, load the built index.html
  // mainWindow.loadFile('../frontend/dist/index.html');
  mainWindow.loadURL('http://localhost:5173');
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
