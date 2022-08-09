const electron = require('electron');
const { app, Menu, BrowserWindow } = electron;

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win;
let homePage = "http://127.0.0.1:12345/index.html";
var template = [{
  label: '视图',
  submenu: [
    {
      label: '刷新',
      click: function (item, focusedWindow) {
        if (focusedWindow)
          focusedWindow.reload();
      }
    },
    {
      label: '打开开发者工具',
      click: function (item, focusedWindow) {
        if (focusedWindow)
          focusedWindow.toggleDevTools();
      }
    },
    {
      label: '返回首页',
      click: function (item, focusedWindow) {
        if (focusedWindow)
          focusedWindow.loadURL(homePage);
      }
    }
  ]
}];
var menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);

function createWindow() {
  // Create the browser window.
  win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      webSecurity: false,
      contextIsolation: false,
      nodeIntegration: true,
      nodeIntegrationInWorker: true,
      allowRunningInsecureContent: true,
      enableRemoteModule:true
    }
  });

  // and load the index.html of the app.
  // http://h5tools.client.jy/index.html
  win.loadURL(homePage);
  let contents = win.webContents;
  // Open the DevTools.
  contents.openDevTools();

  // Emitted when the window is closed.
  win.on('closed', () => {
    if (process.platform !== 'darwin') {
      isquit = true;
    }
    if (isquit) {
      win = null;
    } else {
      e.preventDefault();
      win.hide();
    }
  });

  if (process.platform === "darwin") {
    const localShortcut = require('electron-localshortcut');
    localShortcut.register(contents, "CommandOrControl+A", () => {
      contents.selectAll();
    });
    localShortcut.register(contents, "CommandOrControl+C", () => {
      contents.copy();
    });
    localShortcut.register(contents, "CommandOrControl+V", () => {
      contents.paste();
    });
    process.env.PATH = [
      './node_modules/.bin',
      '/.nodebrew/current/bin',
      '/usr/local/bin',
      process.env.PATH
    ].join(':');
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow();
  }
});
