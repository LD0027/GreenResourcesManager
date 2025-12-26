/**
 * ============================================================================
 * 桌宠窗口管理模块 (Desktop Pet Window Manager)
 * ============================================================================
 * 
 * 功能说明：
 * 本模块负责管理桌宠窗口，包括窗口的创建、生命周期管理、窗口状态控制等。
 * 
 * 主要功能：
 * 1. 创建和管理桌宠窗口（单例模式）
 * 2. 无边框、透明背景、始终置顶
 * 3. 支持显示/隐藏桌宠
 * 4. 注册桌宠相关的 IPC 处理器
 * 
 * 导出的函数：
 * - createPetWindow()         创建桌宠窗口
 * - getPetWindow()            获取桌宠窗口实例
 * - showPetWindow()           显示桌宠窗口
 * - hidePetWindow()           隐藏桌宠窗口
 * - togglePetWindow()         切换桌宠显示/隐藏
 * - registerIpcHandlers()      注册桌宠相关的 IPC 处理器
 * 
 * IPC 处理器：
 * - show-pet-window            显示桌宠
 * - hide-pet-window            隐藏桌宠
 * - toggle-pet-window          切换桌宠显示/隐藏
 * - is-pet-window-visible      检查桌宠是否可见
 * 
 * ============================================================================
 */

const { BrowserWindow, app, screen } = require('electron')
const path = require('path')
const fs = require('fs')
const fileUtils = require('../utils/file-utils')

// 桌宠窗口实例
let petWindow = null

/**
 * 创建桌宠窗口
 * @param {boolean} isDev - 是否为开发环境
 * @returns {BrowserWindow} 桌宠窗口实例
 */
function createPetWindow(isDev) {
  // 如果窗口已存在，直接返回
  if (petWindow && !petWindow.isDestroyed()) {
    return petWindow
  }

  // 获取应用路径（在打包后也能正确工作）
  const appPath = app.getAppPath()
  
  // 确定 preload.js 路径
  let preloadPath
  if (isDev) {
    preloadPath = path.join(__dirname, '../../preload.js')
  } else {
    const fs = require('fs')
    const possiblePaths = [
      path.join(appPath, 'preload.js'),
      path.join(appPath, 'public', 'preload.js'),
      path.join(__dirname, '../../preload.js')
    ]
    preloadPath = possiblePaths.find(p => fs.existsSync(p)) || possiblePaths[0]
  }

  // 获取主显示器信息
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize

  // 创建桌宠窗口
  petWindow = new BrowserWindow({
    width: 1000,  // 桌宠窗口大小（300px 菜单 + 300px 主区域）
    height: 700,  // 增大高度以显示对话框
    frame: false,  // 无边框
    transparent: true,  // 透明背景
    alwaysOnTop: true,  // 始终置顶
    skipTaskbar: true,  // 不在任务栏显示
    resizable: true,  // 允许调整大小
    movable: true,  // 可移动（通过前端实现拖动）
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: preloadPath,
      webSecurity: false
    },
    show: false  // 先不显示，等加载完成后再显示
  })

  // 加载桌宠页面
  if (isDev) {
    // 开发环境：加载 Vite 开发服务器（public 目录下的文件会被 Vite 提供）
    petWindow.loadURL('http://localhost:5173/html/pet.html').catch(err => {
      console.error('❌ 加载桌宠页面失败:', err)
      throw new Error(`无法加载桌宠页面: ${err.message}`)
    })
  } else {
    // 生产环境：加载构建后的文件
    const fs = require('fs')
    const possiblePaths = [
      path.join(appPath, 'dist', 'html', 'pet.html'),
      path.join(appPath, 'html', 'pet.html'),
      path.join(__dirname, '../../html/pet.html')
    ]
    
    const petHtmlPath = possiblePaths.find(p => fs.existsSync(p))
    if (!petHtmlPath) {
      const errorMsg = `找不到 pet.html 文件。尝试的路径: ${possiblePaths.join(', ')}`
      console.error('❌', errorMsg)
      throw new Error(errorMsg)
    }
    
    petWindow.loadFile(petHtmlPath)
  }

  // 窗口准备好后显示
  petWindow.once('ready-to-show', () => {
    if (petWindow && !petWindow.isDestroyed()) {
      // 默认显示在屏幕右下角（窗口大小600x400）
      const x = screenWidth - 630 // 窗口宽度(600) + 30px 边距
      const y = screenHeight - 430 // 窗口高度(400) + 30px 边距
      petWindow.setPosition(x, y)
      petWindow.show()
    }
  })

  // 当窗口被关闭时触发
  petWindow.on('closed', () => {
    petWindow = null
  })

  return petWindow
}

/**
 * 获取桌宠窗口实例
 * @returns {BrowserWindow|null} 桌宠窗口实例
 */
function getPetWindow() {
  return petWindow
}

/**
 * 显示桌宠窗口
 * @param {boolean} isDev - 是否为开发环境
 */
function showPetWindow(isDev) {
  if (!petWindow || petWindow.isDestroyed()) {
    createPetWindow(isDev)
  } else {
    petWindow.show()
  }
}

/**
 * 隐藏桌宠窗口
 */
function hidePetWindow() {
  if (petWindow && !petWindow.isDestroyed()) {
    petWindow.hide()
  }
}

/**
 * 切换桌宠显示/隐藏
 * @param {boolean} isDev - 是否为开发环境
 */
function togglePetWindow(isDev) {
  if (!petWindow || petWindow.isDestroyed()) {
    showPetWindow(isDev)
  } else if (petWindow.isVisible()) {
    hidePetWindow()
  } else {
    showPetWindow(isDev)
  }
}

/**
 * 检查桌宠是否可见
 * @returns {boolean} 是否可见
 */
function isPetWindowVisible() {
  return petWindow && !petWindow.isDestroyed() && petWindow.isVisible()
}

/**
 * 注册桌宠相关的 IPC 处理器
 * @param {IpcMain} ipcMain - Electron IPC Main 对象
 * @param {boolean} isDev - 是否为开发环境
 */
function registerIpcHandlers(ipcMain, isDev) {
  // 显示桌宠
  ipcMain.handle('show-pet-window', () => {
    showPetWindow(isDev)
    return { success: true }
  })

  // 隐藏桌宠
  ipcMain.handle('hide-pet-window', () => {
    hidePetWindow()
    return { success: true }
  })

  // 切换桌宠显示/隐藏
  ipcMain.handle('toggle-pet-window', () => {
    togglePetWindow(isDev)
    return { success: true, visible: isPetWindowVisible() }
  })

  // 检查桌宠是否可见
  ipcMain.handle('is-pet-window-visible', () => {
    return { visible: isPetWindowVisible() }
  })

  // 获取桌宠窗口位置
  ipcMain.handle('get-pet-window-position', () => {
    if (petWindow && !petWindow.isDestroyed()) {
      const position = petWindow.getPosition()
      return { success: true, x: position[0], y: position[1] }
    }
    return { success: false, error: '窗口不存在' }
  })

  // 移动桌宠窗口
  ipcMain.handle('move-pet-window', (event, x, y) => {
    if (petWindow && !petWindow.isDestroyed()) {
      petWindow.setPosition(x, y)
      return { success: true }
    }
    return { success: false, error: '窗口不存在' }
  })

  // 获取桌宠数据（包括好感度、食欲、睡眠欲、性欲）
  ipcMain.handle('get-pet-data', async () => {
    try {
      // 获取应用路径
      const appPath = app.getAppPath()
      const possiblePaths = [
        path.join(appPath, 'SaveData', 'Settings', 'pet-data.json'),
        path.join(appPath, '..', 'SaveData', 'Settings', 'pet-data.json'),
        path.join(process.cwd(), 'SaveData', 'Settings', 'pet-data.json')
      ]
      
      const petDataPath = possiblePaths.find(p => fs.existsSync(p))
      
      if (petDataPath) {
        const result = await fileUtils.readJsonFile(petDataPath)
        if (result.success && result.data) {
          return {
            success: true,
            affection: result.data.affection || 0,
            appetite: result.data.appetite || 0,
            sleepiness: result.data.sleepiness || 0,
            libido: result.data.libido || 0
          }
        }
      }
      
      // 如果文件不存在，返回默认值
      return {
        success: true,
        affection: 0,
        appetite: 0,
        sleepiness: 0,
        libido: 0
      }
    } catch (error) {
      console.error('获取桌宠数据失败:', error)
      return {
        success: false,
        error: error.message,
        affection: 0,
        appetite: 0,
        sleepiness: 0,
        libido: 0
      }
    }
  })

  // 获取桌宠好感度（保持向后兼容）
  ipcMain.handle('get-pet-affection', async () => {
    try {
      // 获取应用路径
      const appPath = app.getAppPath()
      const possiblePaths = [
        path.join(appPath, 'SaveData', 'Settings', 'pet-data.json'),
        path.join(appPath, '..', 'SaveData', 'Settings', 'pet-data.json'),
        path.join(process.cwd(), 'SaveData', 'Settings', 'pet-data.json')
      ]
      
      const petDataPath = possiblePaths.find(p => fs.existsSync(p))
      
      if (petDataPath) {
        const result = await fileUtils.readJsonFile(petDataPath)
        if (result.success && result.data) {
          return { success: true, affection: result.data.affection || 0 }
        }
      }
      
      // 如果文件不存在，返回默认值
      return { success: true, affection: 0 }
    } catch (error) {
      console.error('获取桌宠好感度失败:', error)
      return { success: false, error: error.message, affection: 0 }
    }
  })

  // 调整桌宠窗口大小
  ipcMain.handle('resize-pet-window', (event, width, height) => {
    if (petWindow && !petWindow.isDestroyed()) {
      petWindow.setSize(width, height)
      return { success: true }
    }
    return { success: false, error: '窗口不存在' }
  })

  // 保存桌宠数据（包括好感度、食欲、睡眠欲、性欲）
  ipcMain.handle('save-pet-data', async (event, data) => {
    try {
      // 获取应用路径
      const appPath = app.getAppPath()
      const possiblePaths = [
        path.join(appPath, 'SaveData', 'Settings', 'pet-data.json'),
        path.join(appPath, '..', 'SaveData', 'Settings', 'pet-data.json'),
        path.join(process.cwd(), 'SaveData', 'Settings', 'pet-data.json')
      ]
      
      // 确保目录存在
      const settingsDir = path.dirname(possiblePaths[0])
      if (!fs.existsSync(settingsDir)) {
        fs.mkdirSync(settingsDir, { recursive: true })
      }
      
      // 读取现有数据
      let petData = {
        affection: 0,
        appetite: 0,
        sleepiness: 0,
        libido: 0
      }
      const existingPath = possiblePaths.find(p => fs.existsSync(p))
      if (existingPath) {
        const result = await fileUtils.readJsonFile(existingPath)
        if (result.success && result.data) {
          petData = result.data
        }
      }
      
      // 更新数据（限制在 0-100 之间）
      if (data.affection !== undefined) {
        petData.affection = Math.max(0, Math.min(100, data.affection))
      }
      if (data.appetite !== undefined) {
        petData.appetite = Math.max(0, Math.min(100, data.appetite))
      }
      if (data.sleepiness !== undefined) {
        petData.sleepiness = Math.max(0, Math.min(100, data.sleepiness))
      }
      if (data.libido !== undefined) {
        petData.libido = Math.max(0, Math.min(100, data.libido))
      }
      
      // 保存数据
      const result = await fileUtils.writeJsonFile(possiblePaths[0], petData)
      if (result.success) {
        return {
          success: true,
          affection: petData.affection,
          appetite: petData.appetite,
          sleepiness: petData.sleepiness,
          libido: petData.libido
        }
      } else {
        return { success: false, error: result.error || '保存失败' }
      }
    } catch (error) {
      console.error('保存桌宠数据失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 保存桌宠好感度（保持向后兼容）
  ipcMain.handle('save-pet-affection', async (event, affection) => {
    try {
      // 获取应用路径
      const appPath = app.getAppPath()
      const possiblePaths = [
        path.join(appPath, 'SaveData', 'Settings', 'pet-data.json'),
        path.join(appPath, '..', 'SaveData', 'Settings', 'pet-data.json'),
        path.join(process.cwd(), 'SaveData', 'Settings', 'pet-data.json')
      ]
      
      // 确保目录存在
      const settingsDir = path.dirname(possiblePaths[0])
      if (!fs.existsSync(settingsDir)) {
        fs.mkdirSync(settingsDir, { recursive: true })
      }
      
      // 读取现有数据
      let petData = {
        affection: 0,
        appetite: 0,
        sleepiness: 0,
        libido: 0
      }
      const existingPath = possiblePaths.find(p => fs.existsSync(p))
      if (existingPath) {
        const result = await fileUtils.readJsonFile(existingPath)
        if (result.success && result.data) {
          petData = result.data
        }
      }
      
      // 更新好感度
      petData.affection = Math.max(0, Math.min(100, affection)) // 限制在 0-100 之间
      
      // 保存数据
      const result = await fileUtils.writeJsonFile(possiblePaths[0], petData)
      if (result.success) {
        return { success: true, affection: petData.affection }
      } else {
        return { success: false, error: result.error || '保存失败' }
      }
    } catch (error) {
      console.error('保存桌宠好感度失败:', error)
      return { success: false, error: error.message }
    }
  })
}

module.exports = {
  createPetWindow,
  getPetWindow,
  showPetWindow,
  hidePetWindow,
  togglePetWindow,
  isPetWindowVisible,
  registerIpcHandlers
}

