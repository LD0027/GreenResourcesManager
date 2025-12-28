/**
 * @module AutoUpdater
 * @description 管理应用程序的自动更新功能，包括更新检查、更新通知和更新安装。
 *
 * 主要功能:
 * 1. 初始化自动更新服务，配置更新服务器（GitHub）。
 * 2. 应用启动时检查更新（启动后5秒检查一次）。
 * 3. 监听更新事件（检查中、有新版本、无新版本、错误）并通知渲染进程。
 * 4. 显示更新通知（通过系统托盘显示）。
 * 5. 提供手动检查更新和安装更新的功能。
 * 6. 注册与自动更新相关的 IPC 处理器。
 *
 * 导出的函数:
 * - `initAutoUpdater(autoUpdater, getMainWindow, displayBalloon, dialog, isDev)`: 初始化自动更新服务。
 * - `registerIpcHandlers(ipcMain, autoUpdater, isDev)`: 注册 IPC 处理器。
 *
 * 内部函数:
 * - `showUpdateNotification(info, displayBalloon)`: 显示更新通知。
 * - `showUpdateReadyDialog(info, getMainWindow, dialog, autoUpdater)`: 显示更新就绪对话框。
 *
 * IPC 处理器:
 * - `check-for-updates`: 手动触发更新检查。
 * - `quit-and-install`: 立即重启并安装更新。
 *
 * 更新配置:
 * - 更新服务器：GitHub (klsdf/GreenResourcesManager)
 * - 自动下载：禁用（用户需手动下载）
 * - 自动安装：禁用（用户需手动安装）
 * - 检查时机：仅应用启动后5秒检查一次（不进行定时检查，用户可手动检查）
 */

/**
 * 显示更新通知。
 * @param {Object} info - 更新信息对象。
 * @param {Function} displayBalloon - 显示系统托盘通知的函数。
 */
function showUpdateNotification(info, displayBalloon) {
  displayBalloon({
    title: '发现新版本',
    content: `版本 ${info.version} 已发布，点击查看详情`
  })
}

/**
 * 显示更新就绪对话框。
 * @param {Object} info - 更新信息对象。
 * @param {Function} getMainWindow - 获取主窗口的函数。
 * @param {Object} dialog - Electron dialog 对象。
 * @param {Object} autoUpdater - electron-updater 的 autoUpdater 对象。
 */
function showUpdateReadyDialog(info, getMainWindow, dialog, autoUpdater) {
  const options = {
    type: 'info',
    title: '更新就绪',
    message: `新版本 ${info.version} 已下载完成`,
    detail: '应用将在重启后更新到最新版本。是否现在重启？',
    buttons: ['现在重启', '稍后重启'],
    defaultId: 0,
    cancelId: 1
  }

  const mainWindow = getMainWindow()
  dialog.showMessageBox(mainWindow, options).then((result) => {
    if (result.response === 0) {
      // 用户选择现在重启
      autoUpdater.quitAndInstall()
    }
  })
}

/**
 * 初始化自动更新服务。
 * @param {Object} autoUpdater - electron-updater 的 autoUpdater 对象。
 * @param {Function} getMainWindow - 获取主窗口的函数。
 * @param {Function} displayBalloon - 显示系统托盘通知的函数。
 * @param {Object} dialog - Electron dialog 对象。
 * @param {boolean} isDev - 是否为开发环境。
 */
function initAutoUpdater(autoUpdater, getMainWindow, displayBalloon, dialog, isDev) {
  // 开发环境下给出提示，但仍允许尝试检查更新（用于测试）
  if (isDev) {
    console.warn('[AutoUpdater] 开发环境：自动更新功能可能无法正常工作，但允许尝试检查更新')
  }

  // 配置自动更新选项 - 只检查更新，不自动下载
  autoUpdater.autoDownload = false // 禁用自动下载
  autoUpdater.autoInstallOnAppQuit = false // 禁用自动安装

  // 设置更新服务器
  try {
    // GitHub 仓库配置常量
    const GITHUB_OWNER = 'klsdf'
    const GITHUB_REPO = 'GreenResourcesManager'
    
    // 使用正确的 GitHub 配置方式
    autoUpdater.setFeedURL({
      provider: 'github',
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO
    })
    console.log(`[AutoUpdater] 更新服务器已设置为 GitHub: ${GITHUB_OWNER}/${GITHUB_REPO}`)
  } catch (error) {
    console.warn('[AutoUpdater] 设置更新服务器失败，使用默认配置:', error.message)
  }

  // 应用启动时立即检查一次更新
  setTimeout(() => {
    console.log('[AutoUpdater] 应用启动后自动检查更新...')
    autoUpdater.checkForUpdatesAndNotify()
  }, 5000) // 延迟5秒，确保应用完全启动

  // 注意：已取消定时检查，只在应用启动时检查一次
  // 用户可以通过设置页面手动检查更新

  // 监听更新检查事件
  autoUpdater.on('checking-for-update', () => {
    console.log('[AutoUpdater] 事件: checking-for-update')
    const mainWindow = getMainWindow()
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-checking')
    }
  })

  // 跟踪是否已经检测到可用更新
  let hasUpdateAvailable = false
  let availableUpdateVersion = null

  // 监听发现新版本事件
  autoUpdater.on('update-available', (info) => {
    console.log('[AutoUpdater] 事件: update-available, 版本:', info.version)
    hasUpdateAvailable = true
    availableUpdateVersion = info.version
    const mainWindow = getMainWindow()
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-available', info)
    }

    // 显示更新通知
    showUpdateNotification(info, displayBalloon)
  })

  // 监听没有新版本事件
  autoUpdater.on('update-not-available', (info) => {
    console.log('[AutoUpdater] 事件: update-not-available, 版本:', info.version)
    hasUpdateAvailable = false
    availableUpdateVersion = null
    const mainWindow = getMainWindow()
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-not-available', info)
    }
  })

  // 监听更新错误事件
  autoUpdater.on('error', (err) => {
    console.error('[AutoUpdater] 事件: error, 错误信息:', err.message, '错误代码:', err.code)
    const mainWindow = getMainWindow()
    if (mainWindow && !mainWindow.isDestroyed()) {
      const errorMessage = err.message || ''
      const is404Error = errorMessage.includes('404') || errorMessage.includes('Cannot download')
      
      // 如果是 404 错误且之前已经检测到可用更新，则将其标记为需要手动下载
      // 而不是显示为错误（因为我们已经知道有新版本了）
      if (is404Error && hasUpdateAvailable && availableUpdateVersion) {
        console.log(`[AutoUpdater] 检测到新版本 ${availableUpdateVersion}，但更新文件不存在（404），需要手动下载`)
        // 发送特殊的错误信息，标记为需要手动下载
        const errorInfo = {
          message: `新版本 ${availableUpdateVersion} 已发布，但自动更新文件不可用。请前往 GitHub 手动下载。`,
          code: 'MANUAL_DOWNLOAD_REQUIRED',
          version: availableUpdateVersion,
          is404Error: true,
          originalError: err.message
        }
        mainWindow.webContents.send('update-error', errorInfo)
      } else {
        // 其他错误正常处理
        const errorInfo = {
          message: err.message,
          code: err.code || 'UNKNOWN',
          stack: err.stack
        }
        mainWindow.webContents.send('update-error', errorInfo)
      }
    }
  })
}

/**
 * 注册与自动更新相关的 IPC 处理器。
 * @param {Object} ipcMain - Electron 的 ipcMain 对象。
 * @param {Object} autoUpdater - electron-updater 的 autoUpdater 对象。
 * @param {boolean} isDev - 是否为开发环境。
 * @param {Function} getMainWindow - 获取主窗口的函数。
 */
function registerIpcHandlers(ipcMain, autoUpdater, isDev, getMainWindow) {
  // 手动检查更新
  ipcMain.handle('check-for-updates', async () => {
    try {
      console.log('[AutoUpdater] 收到手动检查更新请求, isDev:', isDev)
      
      // 开发环境下给出警告，但仍允许尝试检查更新
      if (isDev) {
        console.warn('[AutoUpdater] 开发环境：尝试检查更新（可能无法正常工作）')
      }
      
      console.log('[AutoUpdater] 调用 autoUpdater.checkForUpdates()...')
      // 不返回 autoUpdater.checkForUpdates() 的结果，因为它包含无法序列化的对象
      // 而是通过事件监听器来处理更新检查结果
      const checkResult = await autoUpdater.checkForUpdates()
      console.log('[AutoUpdater] checkForUpdates() 调用完成，结果:', checkResult ? '有返回值' : 'null')
      
      // 注意：checkForUpdates() 返回一个 Promise，可能返回 null（如果已在检查中）
      // 或者返回 UpdateCheckResult 对象（包含 updateInfo）
      // 事件将通过 autoUpdater 的事件系统异步触发
      return { success: true, message: '更新检查已启动，请等待结果' }
    } catch (error) {
      console.error('[AutoUpdater] 检查更新异常:', error)
      if (getMainWindow) {
        const mainWindow = getMainWindow()
        if (mainWindow && !mainWindow.isDestroyed()) {
          // 发送错误事件
          mainWindow.webContents.send('update-error', {
            message: error.message || '检查更新时发生错误',
            code: error.code || 'UNKNOWN'
          })
        }
      }
      // 如果调用本身失败，立即返回错误
      return { success: false, error: error.message || '检查更新时发生错误' }
    }
  })

  // 立即重启并安装更新
  ipcMain.handle('quit-and-install', async () => {
    try {
      if (!isDev) {
        autoUpdater.quitAndInstall()
        return { success: true }
      } else {
        return { success: false, error: '开发环境不支持自动更新' }
      }
    } catch (error) {
      console.error('安装更新失败:', error)
      return { success: false, error: error.message }
    }
  })
}

module.exports = {
  initAutoUpdater,
  registerIpcHandlers
}

