<template>
  <div v-if="visible" class="modal-overlay" @mousedown="handleOverlayMouseDown">
    <div class="modal-wrapper">
      <div class="modal-content" @mousedown.stop>
        <div class="modal-header">
          <h3>编辑音频信息</h3>
          <button class="btn-close" @click="handleClose">×</button>
        </div>
        
        <div class="modal-body">
          <FormField
            label="音频文件"
            type="file"
            v-model="formData.filePath"
            placeholder="选择音频文件..."
            @browse="handleBrowseAudioFile"
          />
          
          <FormField
            label="音频名称"
            type="text"
            v-model="formData.name"
            placeholder="音频名称"
          />
          
          <FormField
            label="艺术家"
            type="text"
            v-model="formData.artist"
            placeholder="艺术家"
          />
          
          <FormField
            label="演员"
            type="tags"
            v-model="formData.actors"
            v-model:tagInput="actorInput"
            @add-tag="handleAddActor"
            @remove-tag="handleRemoveActor"
            tag-placeholder="输入演员名称，按回车或逗号添加"
          />
          
          <FormField
            label="标签"
            type="tags"
            v-model="formData.tags"
            v-model:tagInput="tagInput"
            @add-tag="handleAddTag"
            @remove-tag="handleRemoveTag"
            @tag-input-focus="handleTagInputFocus"
            @tag-input-blur="handleTagInputBlur"
            tag-placeholder="输入标签，按回车或逗号添加"
          />
          
          <FormField
            label="缩略图"
            type="file"
            v-model="formData.thumbnailPath"
            placeholder="选择缩略图文件..."
            @browse="handleBrowseThumbnailFile"
          />
          <div v-if="formData.thumbnailPath" class="thumbnail-preview">
            <img :src="getThumbnailUrl(formData.thumbnailPath)" alt="缩略图预览" class="preview-image">
          </div>
          
          <FormField
            label="备注"
            type="textarea"
            v-model="formData.notes"
            placeholder="音频备注..."
            :rows="3"
          />
        </div>
        
        <div class="modal-footer">
          <button class="btn-cancel" @click="handleClose">取消</button>
          <button class="btn-confirm" @click="handleConfirm">保存</button>
        </div>
      </div>
      <!-- Tag 选择面板 -->
      <div 
        v-if="showTagPanel" 
        class="tag-panel" 
        @mousedown.stop
        @mouseenter="handleTagPanelMouseEnter"
        @mouseleave="handleTagPanelMouseLeave"
      >
        <div class="tag-panel-header">
          <h4>Tag选择面板</h4>
        </div>
        <div class="tag-panel-body">
          <!-- 面板内容将在后续实现 -->
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import FormField from '../FormField.vue'

export default {
  name: 'EditAudioDialog',
  components: {
    FormField
  },
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    audio: {
      type: Object,
      default: null
    },
    isElectronEnvironment: {
      type: Boolean,
      default: false
    },
    getThumbnailUrl: {
      type: Function,
      required: true
    }
  },
  emits: ['close', 'confirm', 'browse-audio-file', 'browse-thumbnail-file'],
  data() {
    return {
      formData: {
        id: '',
        name: '',
        artist: '',
        filePath: '',
        thumbnailPath: '',
        actors: [],
        tags: [],
        notes: ''
      },
      actorInput: '',
      tagInput: '',
      showTagPanel: false,
      tagPanelBlurTimer: null as ReturnType<typeof setTimeout> | null,
      isTagPanelHovered: false
    }
  },
  watch: {
    visible(newVal) {
      if (newVal && this.audio) {
        this.loadAudioData()
      }
    },
    audio: {
      handler(newVal) {
        if (newVal && this.visible) {
          this.loadAudioData()
        }
      },
      immediate: true
    }
  },
  methods: {
    loadAudioData() {
      if (!this.audio) return
      this.formData = {
        id: this.audio.id || '',
        name: this.audio.name || '',
        artist: this.audio.artist || '',
        filePath: this.audio.filePath || '',
        thumbnailPath: this.audio.thumbnailPath || '',
        actors: Array.isArray(this.audio.actors) ? [...this.audio.actors] : [],
        tags: Array.isArray(this.audio.tags) ? [...this.audio.tags] : [],
        notes: this.audio.notes || ''
      }
      this.actorInput = ''
      this.tagInput = ''
    },
    handleClose() {
      this.$emit('close')
    },
    handleOverlayMouseDown(event: MouseEvent) {
      if (event.target === event.currentTarget) {
        this.handleClose()
      }
    },
    handleBrowseAudioFile() {
      this.$emit('browse-audio-file')
    },
    handleBrowseThumbnailFile() {
      this.$emit('browse-thumbnail-file')
    },
    handleAddActor() {
      const actor = this.actorInput.trim()
      if (actor && !this.formData.actors.includes(actor)) {
        this.formData.actors.push(actor)
        this.actorInput = ''
      }
    },
    handleRemoveActor(index: number) {
      this.formData.actors.splice(index, 1)
    },
    handleAddTag() {
      const tag = this.tagInput.trim()
      if (tag && !this.formData.tags.includes(tag)) {
        this.formData.tags.push(tag)
        this.tagInput = ''
      }
    },
    handleRemoveTag(index: number) {
      this.formData.tags.splice(index, 1)
    },
    handleTagInputFocus() {
      if (this.tagPanelBlurTimer) {
        clearTimeout(this.tagPanelBlurTimer)
        this.tagPanelBlurTimer = null
      }
      this.showTagPanel = true
    },
    handleTagInputBlur() {
      this.tagPanelBlurTimer = setTimeout(() => {
        if (!this.isTagPanelHovered) {
          this.showTagPanel = false
        }
      }, 200)
    },
    handleTagPanelMouseEnter() {
      this.isTagPanelHovered = true
      if (this.tagPanelBlurTimer) {
        clearTimeout(this.tagPanelBlurTimer)
        this.tagPanelBlurTimer = null
      }
    },
    handleTagPanelMouseLeave() {
      this.isTagPanelHovered = false
      this.tagPanelBlurTimer = setTimeout(() => {
        this.showTagPanel = false
      }, 200)
    },
    handleConfirm() {
      this.$emit('confirm', { ...this.formData })
    }
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-wrapper {
  display: flex;
  align-items: flex-start;
  gap: 20px;
  position: relative;
}

.modal-content {
  background: var(--bg-secondary);
  border-radius: 12px;
  width: 500px;
  max-width: 90vw;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 40px var(--shadow-medium);
  transition: background-color 0.3s ease;
  flex-shrink: 0;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
  color: var(--text-primary);
  margin: 0;
  transition: color 0.3s ease;
}

.modal-body {
  padding: 20px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 20px;
  border-top: 1px solid var(--border-color);
}

.btn-cancel {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-cancel:hover {
  background: var(--bg-secondary);
}

.btn-confirm {
  background: var(--accent-color);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: background 0.3s ease;
}

.btn-confirm:hover:not(:disabled) {
  background: var(--accent-hover);
}

.btn-close {
  background: none;
  border: none;
  color: var(--text-primary);
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background 0.3s ease;
}

.btn-close:hover {
  background: var(--bg-tertiary);
}

.thumbnail-preview {
  margin-top: 10px;
}

.preview-image {
  max-width: 200px;
  max-height: 200px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
}

/* Tag 选择面板样式 */
.tag-panel {
  background: var(--bg-secondary);
  border-radius: 12px;
  width: 300px;
  max-width: 90vw;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 40px var(--shadow-medium);
  transition: all 0.3s ease;
  flex-shrink: 0;
  animation: slideInRight 0.3s ease;
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.tag-panel-header {
  padding: 20px;
  border-bottom: 1px solid var(--border-color);
}

.tag-panel-header h4 {
  color: var(--text-primary);
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  transition: color 0.3s ease;
}

.tag-panel-body {
  padding: 20px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .modal-wrapper {
    flex-direction: column;
    width: 95vw;
    max-width: 95vw;
  }

  .modal-content {
    width: 100%;
    margin: 20px;
  }

  .tag-panel {
    width: 100%;
    margin: 0 20px 20px 20px;
  }
}
</style>

