<template>
  <div class="settings-section">
    <div class="settings-grid">
      <div class="setting-item">
        <label class="setting-label">
          <span class="setting-title">当前版本</span>
          <span class="setting-desc">应用当前安装的版本号</span>
        </label>
        <div class="setting-control">
          <span class="version-info">{{ currentVersion }}</span>
        </div>
      </div>

      <SettingToggle
        title="自动检查更新"
        description="应用启动时自动检查是否有新版本"
        :model-value="autoCheckUpdatesValue"
        @update:model-value="updateSetting('autoCheckUpdates', $event)"
      />

      <div class="setting-item">
        <label class="setting-label">
          <span class="setting-title">更新检查</span>
          <span class="setting-desc">手动检查是否有新版本可用</span>
        </label>
        <div class="setting-control">
          <button 
            class="btn btn-primary" 
            @click="checkForUpdates"
            :disabled="isCheckingUpdates"
          >
            <span v-if="isCheckingUpdates">检查中...</span>
            <span v-else>检查更新</span>
          </button>
        </div>
      </div>

      <!-- 更新状态显示 -->
      <div v-if="updateStatus" class="update-status">
        <div class="status-item" v-if="updateStatus.checking">
          <div class="status-icon">🔄</div>
          <div class="status-text">正在检查更新...</div>
        </div>
        
        <div class="status-item" v-if="updateStatus.notAvailable">
          <div class="status-icon">✅</div>
          <div class="status-content">
            <div class="status-text">当前已是最新版本</div>
            <div class="status-actions">
              <button class="btn btn-info" @click="openGitHubPage">
                <span class="btn-icon">🌐</span>
                查看GitHub发布页
              </button>
            </div>
          </div>
        </div>
        
        <div class="status-item" v-if="updateStatus.available">
          <div class="status-icon">✨</div>
          <div class="status-content">
            <div class="status-text">
              发现新版本 {{ updateStatus.version }}
              <span v-if="updateStatus.manualDownload" class="manual-download-hint">
                （需要手动下载）
              </span>
            </div>
            <div class="status-actions">
              <button class="btn btn-info" @click="openGitHubPage">
                <span class="btn-icon">🌐</span>
                手动下载
              </button>
            </div>
          </div>
        </div>
        
        <div class="status-item" v-if="updateStatus.error && !updateStatus.checksumError">
          <div class="status-icon">❌</div>
          <div class="status-content">
            <div class="status-text">更新检查失败: {{ updateStatus.error }}</div>
            <div class="status-actions">
              <button class="btn btn-info" @click="openGitHubPage">
                <span class="btn-icon">🌐</span>
                手动下载
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import SettingToggle from './SettingToggle.vue'
import { GITHUB_REPO } from '../../utils/constants'

export default {
  name: 'UpdateSettings',
  components: {
    SettingToggle
  },
  props: {
    settings: {
      type: Object,
      required: true
    },
    currentVersion: {
      type: String,
      default: '0.4.0'
    }
  },
  emits: ['update:settings'],
  computed: {
    // 确保 autoCheckUpdates 始终是布尔值
    autoCheckUpdatesValue(): boolean {
      return this.settings.autoCheckUpdates ?? true
    }
  },
  data() {
    return {
      isCheckingUpdates: false,
      updateStatus: null as any,
      checkTimeout: null as any // 用于存储超时定时器的引用
    }
  },
  mounted() {
    this.setupUpdateListeners()
  },
  beforeUnmount() {
    // 清理超时定时器
    if (this.checkTimeout) {
      clearTimeout(this.checkTimeout)
      this.checkTimeout = null
    }
    
    // 注意：不清理事件监听器，因为 App.vue 中的全局监听器需要保持活动
    // 组件卸载不会导致内存泄漏，因为事件监听器是在 window.electronAPI 上的
  },
  methods: {
    updateSetting(key: string, value: any) {
      this.$emit('update:settings', { key, value })
    },
    
    async checkForUpdates() {
      try {
        // 清理之前的超时定时器
        if (this.checkTimeout) {
          clearTimeout(this.checkTimeout)
          this.checkTimeout = null
        }
        
        this.isCheckingUpdates = true
        this.updateStatus = { checking: true }
        
        console.log('[UpdateSettings] 开始检查更新...')
        
        if (window.electronAPI && window.electronAPI.checkForUpdates) {
          const result = await window.electronAPI.checkForUpdates()
          console.log('[UpdateSettings] IPC调用结果:', result)
          
          if (result.success) {
            console.log('[UpdateSettings] 更新检查已启动，等待事件响应...')
            
            // 设置超时机制：30秒内如果没有收到任何事件，则显示错误
            this.checkTimeout = setTimeout(() => {
              console.warn('[UpdateSettings] 更新检查超时（30秒），可能网络问题或更新服务器无法访问')
              if (this.isCheckingUpdates) {
                this.updateStatus = { 
                  error: '更新检查超时，可能是网络问题或更新服务器无法访问。请稍后重试或手动下载。' 
                }
                this.isCheckingUpdates = false
                this.checkTimeout = null
              }
            }, 30000) // 30秒超时
          } else {
            console.error('[UpdateSettings] IPC调用失败:', result.error)
            this.updateStatus = { error: result.error || '更新检查启动失败' }
            this.isCheckingUpdates = false
          }
        } else {
          console.error('[UpdateSettings] electronAPI.checkForUpdates 不可用')
          this.updateStatus = { error: '自动更新功能不可用（当前环境不支持）' }
          this.isCheckingUpdates = false
        }
      } catch (error: any) {
        console.error('[UpdateSettings] 检查更新异常:', error)
        this.updateStatus = { error: error.message || '检查更新时发生未知错误' }
        this.isCheckingUpdates = false
        if (this.checkTimeout) {
          clearTimeout(this.checkTimeout)
          this.checkTimeout = null
        }
      }
    },
    
    openGitHubPage() {
      try {
        if (window.electronAPI && window.electronAPI.openExternal) {
          window.electronAPI.openExternal(GITHUB_REPO.latestReleaseUrl)
        } else {
          // 降级处理：在浏览器中打开
          window.open(GITHUB_REPO.latestReleaseUrl, '_blank')
        }
      } catch (error) {
        console.error('打开GitHub页面失败:', error)
        // 最后的降级处理
        window.open(GITHUB_REPO.latestReleaseUrl, '_blank')
      }
    },
    
    // 清除超时并更新状态的辅助方法
    clearCheckTimeout() {
      if (this.checkTimeout) {
        clearTimeout(this.checkTimeout)
        this.checkTimeout = null
      }
    },
    
    // 监听自动更新事件（仅用于更新组件状态，不显示 toast，因为 App.vue 已经全局处理了）
    setupUpdateListeners() {
      if (window.electronAPI) {
        console.log('[UpdateSettings] 正在注册更新事件监听器...')
        
        // 注意：不清理 App.vue 中注册的全局监听器，因为它负责显示 toast
        // 这里只监听事件来更新组件内部状态
        
        // 监听更新检查事件
        window.electronAPI.onUpdateChecking(() => {
          console.log('[UpdateSettings] 收到 update-checking 事件')
          this.updateStatus = { checking: true }
          this.isCheckingUpdates = true
        })

        // 监听发现新版本事件
        window.electronAPI.onUpdateAvailable((event: any, info: any) => {
          console.log('[UpdateSettings] 收到 update-available 事件:', info)
          this.clearCheckTimeout() // 清除超时定时器
          this.updateStatus = { 
            available: true, 
            version: info.version,
            releaseNotes: info.releaseNotes 
          }
          this.isCheckingUpdates = false
          
          // 注意：不在这里显示 toast，因为 App.vue 已经全局处理了
        })

        // 监听没有新版本事件
        window.electronAPI.onUpdateNotAvailable((event: any, info: any) => {
          console.log('[UpdateSettings] 收到 update-not-available 事件:', info)
          this.clearCheckTimeout() // 清除超时定时器
          this.updateStatus = { notAvailable: true, version: info.version || this.currentVersion }
          this.isCheckingUpdates = false
        })

        // 监听更新错误事件
        window.electronAPI.onUpdateError((event: any, error: any) => {
          console.error('[UpdateSettings] 收到 update-error 事件:', error)
          this.clearCheckTimeout() // 清除超时定时器
          
          // 处理不同类型的错误
          let errorMessage = error
          let is404Error = false
          let errorVersion = null
          
          if (typeof error === 'object') {
            errorMessage = error.message || '未知错误'
            is404Error = error.is404Error || false
            errorVersion = error.version || null
            
            // 如果是需要手动下载的错误（404），显示为可用更新而不是错误
            if (error.code === 'MANUAL_DOWNLOAD_REQUIRED' || is404Error) {
              this.updateStatus = { 
                available: true, 
                version: errorVersion || '未知版本',
                manualDownload: true // 标记为需要手动下载
              }
              this.isCheckingUpdates = false
              
              // 注意：不在这里显示 toast，因为 App.vue 已经全局处理了
              return
            }
            
            if (error.code) {
              errorMessage += ` (错误代码: ${error.code})`
            }
          }
          
          this.updateStatus = { error: errorMessage }
          this.isCheckingUpdates = false
        })
        
        console.log('[UpdateSettings] 更新事件监听器注册完成')
      } else {
        console.error('[UpdateSettings] window.electronAPI 不可用，无法注册事件监听器')
      }
    }
  }
}
</script>

<style scoped>
.settings-section {
  border-bottom: 1px solid var(--border-color);
  padding: 30px;
  transition: border-color 0.3s ease;
}

.settings-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 0;
  border-bottom: 1px solid var(--bg-tertiary);
  transition: border-color 0.3s ease;
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-label {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.setting-title {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 1rem;
  transition: color 0.3s ease;
}

.setting-desc {
  color: var(--text-secondary);
  font-size: 0.9rem;
  transition: color 0.3s ease;
}

.setting-control {
  display: flex;
  align-items: center;
  gap: 10px;
}

.version-info {
  font-family: 'Courier New', monospace;
  font-weight: bold;
  color: var(--accent-color);
  background: var(--bg-secondary);
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid var(--border-color);
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 24px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: 0.3s;
  border-radius: 24px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}

input:checked + .toggle-slider {
  background-color: var(--accent-color);
}

input:checked + .toggle-slider:before {
  transform: translateX(26px);
}

.update-status {
  margin-top: 20px;
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.status-item {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.status-item:last-child {
  margin-bottom: 0;
}

.status-icon {
  font-size: 20px;
  width: 24px;
  text-align: center;
}

.status-content {
  flex: 1;
}

.status-text {
  font-weight: 500;
  margin-bottom: 8px;
}

.status-actions {
  display: flex;
  gap: 8px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--accent-color);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--accent-hover);
  transform: translateY(-1px);
}

.btn-info {
  background: #17a2b8;
  color: white;
}

.btn-info:hover:not(:disabled) {
  background: #138496;
  transform: translateY(-1px);
}

.btn-icon {
  font-size: 1rem;
}

.manual-download-hint {
  color: var(--text-secondary);
  font-size: 0.85em;
  font-weight: normal;
  margin-left: 8px;
}
</style>

