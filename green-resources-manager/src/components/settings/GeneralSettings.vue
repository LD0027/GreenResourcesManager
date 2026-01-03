<template>
  <div class="settings-section">
    <div class="settings-grid">
      <SettingSelect
        title="主题模式"
        description="选择应用的主题外观"
        :model-value="settings.theme"
        :options="themeOptions"
        @update:model-value="onThemeChange"
      />
      
      <SettingToggle
        title="开机自启"
        description="应用启动时自动运行"
        :model-value="settings.autoStart"
        @update:model-value="onAutoStartChange"
      />
      
      <SettingToggle
        title="关闭窗口时最小化到系统托盘"
        description="点击关闭按钮时最小化到系统托盘，普通最小化仍会显示在任务栏"
        :model-value="settings.minimizeToTray"
        @update:model-value="onMinimizeToTrayChange"
      />
      
      <SettingToggle
        title="伪装模式"
        description="开启后，图片封面会随机替换为disguise文件夹中的图片，提供隐私保护"
        :model-value="settings.disguiseMode"
        @update:model-value="onDisguiseModeChange"
      />
      
      <SettingToggle
        title="安全键"
        description="按下ESC键时快速最小化并打开安全网页"
        :model-value="settings.safetyKeyEnabled"
        @update:model-value="onSafetyKeyChange"
      />
      
      <SettingInput
        v-if="settings.safetyKeyEnabled"
        title="安全网页URL"
        description="按下ESC键时打开的网页地址"
        :model-value="settings.safetyKeyUrl"
        placeholder="输入网页URL"
        :input-style="{ minWidth: '400px' }"
        @update:model-value="onSafetyKeyUrlChange"
      />
      
      <SettingSelect
        title="存档文件夹位置"
        description="选择存档文件夹的保存位置"
        :model-value="settings.saveDataLocation"
        :options="saveDataLocationOptions"
        @update:model-value="onSaveDataLocationChange"
      />
      
      <SettingFilePicker
        v-if="settings.saveDataLocation === 'custom'"
        title="自定义存档目录"
        description="选择自定义的存档保存目录"
        :model-value="settings.saveDataPath"
        placeholder="选择存档保存目录"
        picker-type="saveData"
        @update:model-value="updateSetting('saveDataPath', $event)"
        @browse="handleSaveDataBrowse"
      />
      
      <SettingToggle
        title="开启自动备份"
        description="开启后，系统会按设定的时间间隔自动备份整个存档目录"
        :model-value="settings.autoBackupEnabled"
        @update:model-value="onAutoBackupEnabledChange"
      />
      
      <SettingSlider
        v-if="settings.autoBackupEnabled"
        title="自动备份时间间隔"
        description="设置自动备份整个存档的时间间隔"
        :model-value="settings.autoBackupInterval"
        :min="5"
        :max="60"
        :step="5"
        unit="分钟"
        @update:model-value="onAutoBackupIntervalChange"
      />
      
      <SettingSlider
        v-if="settings.autoBackupEnabled"
        title="保留备份数量"
        description="设置自动备份时保留的备份数量，超出数量的旧备份会被自动删除"
        :model-value="maxBackupCountValue"
        :min="3"
        :max="10"
        :step="1"
        unit="个"
        @update:model-value="onMaxBackupCountChange"
      />
      
      <div class="setting-item">
        <label class="setting-label">
          <span class="setting-title">打开存档文件夹</span>
          <span class="setting-desc">在文件管理器中打开应用存档文件夹</span>
        </label>
        <div class="setting-control">
          <button class="btn-open-save-data-folder" @click="openSaveDataFolder">
            <span class="btn-icon">📁</span>
            打开文件夹
          </button>
        </div>
      </div>
      
      <div class="setting-item">
        <label class="setting-label">
          <span class="setting-title">重置所有设置</span>
          <span class="setting-desc">将所有设置恢复为默认值，此操作不可撤销</span>
        </label>
        <div class="setting-control">
          <button class="btn-reset-settings" @click="resetSettings">
            <span class="btn-icon">🔄</span>
            重置设置
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import saveManager from '../../utils/SaveManager'
import notify from '../../utils/NotificationService'
import alertService from '../../utils/AlertService'
import confirmService from '../../utils/ConfirmService'
import SettingToggle from './SettingToggle.vue'
import SettingSelect from './SettingSelect.vue'
import SettingInput from './SettingInput.vue'
import SettingSlider from './SettingSlider.vue'
import SettingFilePicker from './SettingFilePicker.vue'

export default {
  name: 'GeneralSettings',
  components: {
    SettingToggle,
    SettingSelect,
    SettingInput,
    SettingSlider,
    SettingFilePicker
  },
  props: {
    settings: {
      type: Object,
      required: true
    }
  },
  emits: ['update:settings', 'theme-changed', 'action'],
  data() {
    return {
      themeOptions: [
        { value: 'light', label: '亮色模式' },
        { value: 'dark', label: '暗色模式' },
        { value: 'ukiyoe', label: '浮世绘主题' },
        { value: 'chinese', label: '中国古风' },
        { value: 'forest', label: '森林主题' },
        { value: 'ocean', label: '海洋主题' },
        { value: 'auto', label: '跟随系统' }
      ],
      saveDataLocationOptions: [
        { value: 'default', label: '默认目录 (根目录/SaveData)' },
        { value: 'custom', label: '自定义目录' }
      ]
    }
  },
  computed: {
    maxBackupCountValue() {
      // 使用默认值 5（与 SettingsView.vue 中的 DEFAULT_MAX_BACKUP_COUNT 保持一致）
      return this.settings.maxBackupCount ?? 5
    }
  },
  methods: {
    updateSetting(key: string, value: any) {
      this.$emit('update:settings', { key, value })
    },
    
    onThemeChange(newTheme: string) {
      this.updateSetting('theme', newTheme)
      // 实时应用主题变化
      this.applyTheme(newTheme)
    },
    
    applyTheme(theme: string) {
      // 处理跟随系统主题
      let actualTheme = theme
      if (theme === 'auto') {
        // 检测系统主题偏好
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        actualTheme = prefersDark ? 'dark' : 'light'
      }
      
      // 应用主题
      document.documentElement.setAttribute('data-theme', actualTheme)
      localStorage.setItem('butter-manager-theme', theme)
      
      // 通知父组件主题变化
      this.$emit('theme-changed', actualTheme)
    },
    
    async onAutoStartChange(newValue: boolean) {
      this.updateSetting('autoStart', newValue)
      // 实时更新开机自启设置
      try {
        if (window.electronAPI && window.electronAPI.setAutoStart) {
          const result = await window.electronAPI.setAutoStart(newValue)
          if (result.success) {
            console.log('开机自启设置更新成功:', result.enabled)
            this.showNotification(
              '开机自启设置已更新', 
              result.enabled ? '应用将在系统启动时自动运行' : '应用已取消开机自启'
            )
          } else {
            console.error('开机自启设置更新失败:', result.error)
            alertService.error(`开机自启设置失败: ${result.error}`)
            // 恢复开关状态
            this.updateSetting('autoStart', !newValue)
          }
        } else {
          console.warn('当前环境不支持开机自启功能')
          alertService.warning('当前环境不支持开机自启功能')
          // 恢复开关状态
          this.updateSetting('autoStart', !newValue)
        }
      } catch (error: any) {
        console.error('更新开机自启设置失败:', error)
        alertService.error('更新开机自启设置失败: ' + error.message)
        // 恢复开关状态
        this.updateSetting('autoStart', !newValue)
      }
    },
    
    async onMinimizeToTrayChange(newValue: boolean) {
      this.updateSetting('minimizeToTray', newValue)
      // 实时更新最小化到托盘设置
      try {
        if (window.electronAPI && window.electronAPI.setMinimizeToTray) {
          const result = await window.electronAPI.setMinimizeToTray(newValue)
          if (result.success) {
            console.log('最小化到托盘设置更新成功:', result.enabled)
            this.showNotification(
              '关闭窗口行为设置已更新', 
              result.enabled ? '关闭窗口时将最小化到系统托盘，普通最小化仍显示在任务栏' : '关闭窗口时将直接退出应用'
            )
          } else {
            console.error('最小化到托盘设置更新失败:', result.error)
            notify.error('设置失败', `最小化到托盘设置失败: ${result.error}`)
            // 恢复开关状态
            this.updateSetting('minimizeToTray', !newValue)
          }
        } else {
          console.warn('当前环境不支持最小化到托盘功能')
          notify.warning('功能不可用', '当前环境不支持最小化到托盘功能')
          // 恢复开关状态
          this.updateSetting('minimizeToTray', !newValue)
        }
      } catch (error: any) {
        console.error('更新最小化到托盘设置失败:', error)
        notify.error('设置失败', `更新最小化到托盘设置失败: ${error.message}`)
        // 恢复开关状态
        this.updateSetting('minimizeToTray', !newValue)
      }
    },
    
    async onDisguiseModeChange(newValue: boolean) {
      this.updateSetting('disguiseMode', newValue)
      // 伪装模式设置变化时的处理
      console.log('伪装模式设置已更新:', newValue)
      
      // 清除伪装图片缓存
      try {
        const disguiseManager = await import('../../utils/DisguiseManager.js')
        disguiseManager.default.clearCache()
        console.log('伪装图片缓存已清除')
      } catch (error) {
        console.error('清除伪装图片缓存失败:', error)
      }
      
      // 触发自定义事件，通知所有 MediaCard 组件更新状态
      try {
        const event = new CustomEvent('disguise-mode-changed', {
          detail: { enabled: newValue }
        })
        window.dispatchEvent(event)
        console.log('已触发 disguise-mode-changed 事件')
      } catch (error) {
        console.error('触发伪装模式变化事件失败:', error)
      }
      
      notify.success(
        '伪装模式设置已更新', 
        newValue ? '已开启伪装模式，图片封面和标签将随机替换' : '已关闭伪装模式，显示原始封面和标签'
      )
    },
    
    async onSafetyKeyChange(newValue: boolean) {
      this.updateSetting('safetyKeyEnabled', newValue)
      // 安全键设置变化时的处理
      console.log('安全键设置已更新:', newValue)
      
      // 直接更新全局快捷键
      if (window.electronAPI && window.electronAPI.setSafetyKey) {
        try {
          const result = await window.electronAPI.setSafetyKey(
            newValue, 
            this.settings.safetyKeyUrl
          )
          if (result.success) {
            console.log('✅ 安全键全局快捷键已', newValue ? '启用' : '禁用')
          } else {
            console.warn('设置安全键失败:', result.error)
            notify.error(
              '安全键设置失败', 
              result.error || '无法注册ESC全局快捷键，可能被其他应用占用'
            )
            // 恢复开关状态
            this.updateSetting('safetyKeyEnabled', !newValue)
            return
          }
        } catch (error: any) {
          console.error('设置安全键失败:', error)
          notify.error('安全键设置失败', error.message)
          // 恢复开关状态
          this.updateSetting('safetyKeyEnabled', !newValue)
          return
        }
      }
      
      // 触发自定义事件，通知 App.vue 更新安全键设置
      try {
        const event = new CustomEvent('safety-key-changed', {
          detail: { 
            enabled: newValue,
            url: this.settings.safetyKeyUrl
          }
        })
        window.dispatchEvent(event)
        console.log('已触发 safety-key-changed 事件')
      } catch (error) {
        console.error('触发安全键变化事件失败:', error)
      }
      
      notify.success(
        '安全键设置已更新', 
        newValue ? '已开启安全键功能，按下ESC键将快速最小化应用和游戏窗口并打开安全网页' : '已关闭安全键功能'
      )
    },
    
    async onSafetyKeyUrlChange(newUrl: string) {
      this.updateSetting('safetyKeyUrl', newUrl)
      // 当安全键URL变化时，更新全局快捷键设置
      if (this.settings.safetyKeyEnabled && window.electronAPI && window.electronAPI.setSafetyKey) {
        try {
          const result = await window.electronAPI.setSafetyKey(true, newUrl)
          if (result.success) {
            console.log('✅ 安全键URL已更新')
          } else {
            console.warn('更新安全键URL失败:', result.error)
          }
        } catch (error) {
          console.error('更新安全键URL失败:', error)
        }
      }
      
      // 触发自定义事件，通知 App.vue
      if (this.settings.safetyKeyEnabled) {
        try {
          const event = new CustomEvent('safety-key-changed', {
            detail: { 
              enabled: this.settings.safetyKeyEnabled,
              url: newUrl
            }
          })
          window.dispatchEvent(event)
        } catch (error) {
          console.error('触发安全键URL变化事件失败:', error)
        }
      }
    },
    
    onSaveDataLocationChange(newLocation: string) {
      this.updateSetting('saveDataLocation', newLocation)
      // 当选择默认目录时，不清空自定义路径，保留用户之前的设置
      if (newLocation === 'default') {
        console.log('已切换到默认存档目录')
        notify.success('存档位置已更新', '已切换到默认存档目录 (根目录/SaveData)')
      }
    },
    
    onAutoBackupEnabledChange(newValue: boolean) {
      this.updateSetting('autoBackupEnabled', newValue)
      // 自动备份开关变化时的处理
      console.log('自动备份开关已更新:', newValue)
      
      // 如果关闭，将时间间隔设置为0
      if (!newValue) {
        this.updateSetting('autoBackupInterval', 0)
      } else {
        // 如果开启，确保时间间隔至少为5分钟
        if (this.settings.autoBackupInterval < 5) {
          this.updateSetting('autoBackupInterval', 5)
        }
      }
      
      // 触发自定义事件，通知 App.vue 更新自动备份定时器
      try {
        const event = new CustomEvent('auto-backup-interval-changed', {
          detail: { 
            interval: newValue ? this.settings.autoBackupInterval : 0
          }
        })
        window.dispatchEvent(event)
        console.log('已触发 auto-backup-interval-changed 事件')
      } catch (error) {
        console.error('触发自动备份时间间隔变化事件失败:', error)
      }
      
      if (newValue) {
        notify.success('自动备份已开启', `自动备份时间间隔已设置为 ${this.settings.autoBackupInterval} 分钟`)
      } else {
        notify.success('自动备份已禁用', '已禁用自动备份功能')
      }
    },
    
    onAutoBackupIntervalChange(newInterval: number) {
      this.updateSetting('autoBackupInterval', newInterval)
      // 自动备份时间间隔变化时，通知 App.vue 更新定时器
      console.log('自动备份时间间隔已更新:', newInterval, '分钟')
      
      // 触发自定义事件，通知 App.vue 更新自动备份定时器
      try {
        const event = new CustomEvent('auto-backup-interval-changed', {
          detail: { 
            interval: this.settings.autoBackupEnabled ? newInterval : 0
          }
        })
        window.dispatchEvent(event)
        console.log('已触发 auto-backup-interval-changed 事件')
      } catch (error) {
        console.error('触发自动备份时间间隔变化事件失败:', error)
      }
      
      notify.success('自动备份设置已更新', `自动备份时间间隔已设置为 ${newInterval} 分钟`)
    },
    
    onMaxBackupCountChange(newCount: number) {
      this.updateSetting('maxBackupCount', newCount)
      // 保留备份数量变化时的处理
      console.log('保留备份数量已更新:', newCount, '个')
      notify.success('备份设置已更新', `将保留最近的 ${newCount} 个备份`)
    },
    
    async handleSaveDataBrowse({ result }: { result: any }) {
      if (result && result.success) {
        // 更新设置
        this.updateSetting('saveDataPath', result.directory)
        this.updateSetting('saveDataLocation', 'custom')
        
        // 更新SaveManager的数据目录
        const newSaveDataPath = result.directory + '/SaveData'
        const saveManagerUpdated = saveManager.setDataDirectory(newSaveDataPath)
        if (saveManagerUpdated) {
          console.log('SaveManager数据目录已更新为:', newSaveDataPath)
        }
        
        // 手动保存设置（绕过自动保存机制）
        const success = await saveManager.saveSettings(this.settings)
        if (success) {
          console.log('存档目录设置已保存')
        }
        
        // 显示成功通知
        const message = result.message || '存档目录已更新'
        let detailMessage = `已设置自定义存档目录: ${result.directory}`
        
        if (result.copiedFiles && result.copiedFiles > 0) {
          // 复制数据的情况
          detailMessage += `\n\n成功复制 ${result.copiedFiles} 个文件`
          detailMessage += `\n${message}`
        } else {
          detailMessage += `\n\n${message}`
        }
        
        // 使用 toast 通知显示成功消息
        notify.success('存档目录设置成功', detailMessage)
        
        // 如果有复制文件，显示更详细的信息
        if (result.copiedFiles && result.copiedFiles > 0) {
          console.log('存档数据复制完成:', {
            directory: result.directory,
            copiedFiles: result.copiedFiles,
            message: result.message
          })
        }
      } else if (result && !result.success) {
        // 显示错误通知
        const errorMessage = result.error || '未知错误'
        notify.error('存档目录设置失败', errorMessage)
        console.error('设置存档目录失败:', result.error)
      }
    },
    
    async openSaveDataFolder() {
      try {
        if (window.electronAPI && window.electronAPI.openFolder) {
          // 获取存档文件夹路径
          let saveDataPath = ''
          
          if (this.settings.saveDataLocation === 'default') {
            // 使用默认路径
            saveDataPath = 'SaveData'
          } else if (this.settings.saveDataLocation === 'custom') {
            // 使用自定义路径
            saveDataPath = this.settings.saveDataPath
          }
          
          // 如果自定义路径为空，回退到默认路径
          if (!saveDataPath || saveDataPath.trim() === '') {
            saveDataPath = 'SaveData'
          }
          
          console.log('尝试打开存档文件夹:', saveDataPath)
          
          // 确保目录存在
          try {
            if (window.electronAPI.ensureDirectory) {
              const ensureResult = await window.electronAPI.ensureDirectory(saveDataPath)
              if (ensureResult.success) {
                console.log('存档目录已确保存在:', saveDataPath)
              }
            }
          } catch (error) {
            console.warn('创建存档目录失败:', error)
          }
          
          const result = await window.electronAPI.openFolder(saveDataPath)
          if (result.success) {
            console.log('存档文件夹已打开')
            notify.success('文件夹已打开', `已打开存档文件夹: ${saveDataPath}`)
          } else {
            console.error('打开存档文件夹失败:', result.error)
            notify.error('打开失败', `打开存档文件夹失败: ${result.error}`)
          }
        } else {
          // 降级处理：在浏览器中显示路径信息
          const saveDataPath = this.settings.saveDataLocation === 'default' 
            ? 'SaveData' 
            : (this.settings.saveDataPath || 'SaveData')
          notify.info('存档文件夹路径', `${saveDataPath}\n\n在浏览器环境中无法直接打开文件夹，请手动导航到该路径`)
        }
      } catch (error: any) {
        console.error('打开存档文件夹失败:', error)
        notify.error('打开失败', `打开存档文件夹失败: ${error.message}`)
      }
    },
    
    async resetSettings() {
      if (await confirmService.confirm('确定要重置所有设置吗？此操作不可撤销！')) {
        try {
          // 触发重置事件，让父组件处理
          this.$emit('action', { type: 'reset-settings' })
        } catch (error: any) {
          console.error('重置设置失败:', error)
          notify.error('重置设置失败', '重置设置时发生错误: ' + error.message)
        }
      }
    },
    
    async showNotification(title: string, message: string) {
      // 简单的通知实现
      if (window.electronAPI && window.electronAPI.showNotification) {
        window.electronAPI.showNotification(title, message)
      } else {
        // 降级处理：使用浏览器通知
        if (Notification.permission === 'granted') {
          new Notification(title, { body: message })
        } else if (Notification.permission !== 'denied') {
          Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
              new Notification(title, { body: message })
            }
          })
        }
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

.setting-select {
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.9rem;
  transition: all 0.3s ease;
}

.setting-select:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 3px rgba(102, 192, 244, 0.1);
}

.setting-input {
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.9rem;
  min-width: 200px;
  transition: all 0.3s ease;
}

.setting-input:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 3px rgba(102, 192, 244, 0.1);
}

.setting-slider {
  width: 150px;
  margin-right: 10px;
}

.setting-value {
  color: #718096;
  font-size: 0.9rem;
  min-width: 50px;
}

.file-input-group {
  display: flex;
  gap: 10px;
  align-items: center;
}

.file-input-group .setting-input {
  flex: 1;
  min-width: 200px;
}

.btn-browse {
  padding: 8px 16px;
  background: var(--accent-color);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.btn-browse:hover {
  background: var(--accent-hover);
  transform: translateY(-1px);
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

.btn-open-save-data-folder {
  background: #10b981;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.3s ease;
}

.btn-open-save-data-folder:hover {
  background: #059669;
  transform: translateY(-1px);
}

.btn-reset-settings {
  background: #ef4444;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.3s ease;
}

.btn-reset-settings:hover {
  background: #dc2626;
  transform: translateY(-1px);
}

.btn-icon {
  font-size: 1rem;
}
</style>

