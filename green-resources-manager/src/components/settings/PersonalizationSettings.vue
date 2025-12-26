<template>
  <div class="settings-section">
    <div class="settings-grid">
      <SettingInput
        title="自定义软件标题"
        description="设置软件在侧边栏显示的标题"
        :model-value="localCustomAppTitle"
        placeholder="例如：绿色资源管理器"
        @update:model-value="onCustomAppTitleInput"
        @blur="onCustomAppTitleBlur"
      />
      
      <SettingInput
        title="自定义软件副标题"
        description="设置软件在侧边栏显示的副标题"
        :model-value="localCustomAppSubtitle"
        placeholder="例如：绿色、全能的资源管理器"
        @update:model-value="onCustomAppSubtitleInput"
        @blur="onCustomAppSubtitleBlur"
      />
      
      <SettingFilePicker
        title="页面背景图片"
        description="为所有页面设置自定义背景图片"
        :model-value="settings.backgroundImagePath"
        placeholder="选择背景图片..."
        picker-type="image"
        browse-button-text="选择图片"
        @update:model-value="onBackgroundImageChange"
      />
      
      <div v-if="settings.backgroundImagePath" class="setting-item">
        <label class="setting-label">
          <span class="setting-title">清除背景图片</span>
          <span class="setting-desc">移除当前设置的背景图片</span>
        </label>
        <div class="setting-control">
          <button class="btn-clear-background" @click="clearBackgroundImage">
            <span class="btn-icon">🗑️</span>
            清除
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import notify from '../../utils/NotificationService'
import SettingFilePicker from './SettingFilePicker.vue'
import SettingInput from './SettingInput.vue'

export default {
  name: 'PersonalizationSettings',
  components: {
    SettingFilePicker,
    SettingInput
  },
  props: {
    settings: {
      type: Object,
      required: true
    }
  },
  emits: ['update:settings'],
  data() {
    return {
      localCustomAppTitle: '',
      localCustomAppSubtitle: ''
    }
  },
  watch: {
    'settings.customAppTitle'(newValue) {
      this.localCustomAppTitle = newValue || ''
    },
    'settings.customAppSubtitle'(newValue) {
      this.localCustomAppSubtitle = newValue || ''
    }
  },
  mounted() {
    // 初始化本地值
    this.localCustomAppTitle = this.settings.customAppTitle || ''
    this.localCustomAppSubtitle = this.settings.customAppSubtitle || ''
  },
  methods: {
    updateSetting(key: string, value: any) {
      this.$emit('update:settings', { key, value })
    },
    
    onCustomAppTitleInput(newTitle: string) {
      this.localCustomAppTitle = newTitle
    },
    
    onCustomAppSubtitleInput(newSubtitle: string) {
      this.localCustomAppSubtitle = newSubtitle
    },
    
    onCustomAppTitleBlur() {
      const newTitle = this.localCustomAppTitle || ''
      this.updateSetting('customAppTitle', newTitle)
      // 触发自定义事件，通知 App.vue 更新标题
      try {
        const event = new CustomEvent('custom-app-title-changed', {
          detail: { title: newTitle }
        })
        window.dispatchEvent(event)
        console.log('已触发 custom-app-title-changed 事件')
      } catch (error) {
        console.error('触发标题变化事件失败:', error)
      }
      notify.success('软件标题已更新', '标题已设置为: ' + (newTitle || '默认标题'))
    },
    
    onCustomAppSubtitleBlur() {
      const newSubtitle = this.localCustomAppSubtitle || ''
      this.updateSetting('customAppSubtitle', newSubtitle)
      // 触发自定义事件，通知 App.vue 更新副标题
      try {
        const event = new CustomEvent('custom-app-subtitle-changed', {
          detail: { subtitle: newSubtitle }
        })
        window.dispatchEvent(event)
        console.log('已触发 custom-app-subtitle-changed 事件')
      } catch (error) {
        console.error('触发副标题变化事件失败:', error)
      }
      notify.success('软件副标题已更新', '副标题已设置为: ' + (newSubtitle || '默认副标题'))
    },
    
    onBackgroundImageChange(newPath: string) {
      this.updateSetting('backgroundImagePath', newPath)
      // 触发自定义事件，通知 App.vue 更新背景图片
      try {
        const event = new CustomEvent('background-image-changed', {
          detail: { path: newPath }
        })
        window.dispatchEvent(event)
        console.log('已触发 background-image-changed 事件')
      } catch (error) {
        console.error('触发背景图片变化事件失败:', error)
      }
      notify.success('背景图片已更新', '页面背景图片已设置为: ' + newPath)
    },
    
    clearBackgroundImage() {
      this.updateSetting('backgroundImagePath', '')
      // 触发自定义事件，通知 App.vue 清除背景图片
      try {
        const event = new CustomEvent('background-image-changed', {
          detail: { path: '' }
        })
        window.dispatchEvent(event)
        console.log('已触发 background-image-changed 事件（清除）')
      } catch (error) {
        console.error('触发背景图片清除事件失败:', error)
      }
      notify.success('背景图片已清除', '已移除页面背景图片')
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

.btn-clear-background {
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

.btn-clear-background:hover {
  background: #dc2626;
  transform: translateY(-1px);
}

.btn-icon {
  font-size: 1rem;
}
</style>

