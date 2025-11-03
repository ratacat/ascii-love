import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined
declare const MAIN_WINDOW_VITE_NAME: string

type SaveExportPayload = {
  defaultPath?: string
  filters?: Array<{ name: string; extensions: string[] }>
  content: string
  encoding?: BufferEncoding
}

type SaveExportResult = {
  canceled: boolean
  filePath?: string
}

let mainWindow: BrowserWindow | null = null

const getPreloadPath = () => {
  const appPath = app.getAppPath()
  return resolve(appPath, '.vite', 'build', 'preload.js')
}

const getRendererPath = () => {
  const appPath = app.getAppPath()
  const windowName = MAIN_WINDOW_VITE_NAME ?? 'main_window'
  return resolve(appPath, '.vite', 'renderer', windowName, 'index.html')
}

const createMainWindow = async () => {
  const preloadPath = getPreloadPath()

  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 640,
    backgroundColor: '#0b0d10',
    show: false,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      sandbox: false,
      nodeIntegration: false,
      spellcheck: false,
    },
  })

  window.on('ready-to-show', () => {
    if (!window.isDestroyed()) {
      window.show()
      window.focus()
    }
  })

  window.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url).catch(() => {
      // Ignore errors when the system cannot open the URL.
    })
    return { action: 'deny' }
  })

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    await window.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL)
  } else {
    await window.loadFile(getRendererPath())
  }

  return window
}

const focusMainWindow = () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore()
    }
    mainWindow.focus()
  }
}

const ensureParentDirectory = async (targetPath: string) => {
  const directory = dirname(targetPath)
  await mkdir(directory, { recursive: true })
}

const registerIpcHandlers = () => {
  ipcMain.handle('desktop:export:save', async (event, payload: SaveExportPayload): Promise<SaveExportResult> => {
    const browserWindow = BrowserWindow.fromWebContents(event.sender) ?? mainWindow ?? undefined
    const defaultPath = payload.defaultPath ?? undefined
    const filters = payload.filters?.length ? payload.filters : undefined

    const result = await dialog.showSaveDialog(browserWindow, {
      defaultPath,
      filters,
    })

    if (result.canceled || !result.filePath) {
      return { canceled: true }
    }

    const filePath = result.filePath
    const encoding = payload.encoding ?? 'utf8'

    await ensureParentDirectory(filePath)
    await writeFile(filePath, payload.content, { encoding })

    focusMainWindow()

    return {
      canceled: false,
      filePath,
    }
  })
}

const createApplication = async () => {
  if (!app.isPackaged) {
    process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true'
  }

  app.on('browser-window-created', (_event, window) => {
    window.setMenuBarVisibility(false)
  })

  registerIpcHandlers()

  await app.whenReady()

  mainWindow = await createMainWindow()

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = await createMainWindow()
    } else {
      focusMainWindow()
    }
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })
}

createApplication().catch((error) => {
  console.error('Failed to start Electron app', error)
  app.quit()
})
