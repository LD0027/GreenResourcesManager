<template>
  <div v-if="visible" class="modal-overlay" @mousedown="handleOverlayMouseDown">
    <div class="modal-wrapper">
      <div class="modal-content" @mousedown.stop>
        <div class="modal-header">
          <h3>添加音频文件</h3>
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
            placeholder="音频名称（可选，将自动从文件名获取）"
          />
          
          <FormField
            label="艺术家"
            type="text"
            v-model="formData.artist"
            placeholder="艺术家"
          />
          
          <FormField
            label="演员（用逗号分隔）"
            type="text"
            v-model="actorsInput"
            placeholder="例如: 张三, 李四, 王五"
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
            tag-placeholder="输入标签后按回车或逗号添加"
          />
          
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
          <button class="btn-confirm" @click="handleConfirm">添加</button>
        </div>
      </div>
      <!-- Tag 选择面板 -->
      <TagSelectionPanel
        :visible="showTagPanel"
        :current-tags="formData.tags"
        :available-tags="availableTags"
        @select-tag="handleSelectTag"
        @mouse-enter="handleTagPanelMouseEnter"
        @mouse-leave="handleTagPanelMouseLeave"
      />
    </div>
  </div>
</template>

<script lang="ts">
import FormField from '../FormField.vue'
import TagSelectionPanel from '../TagSelectionPanel.vue'
import { useTagPanel } from '../../composables/useTagPanel'

export default {
  name: 'AddAudioDialog',
  components: {
    FormField,
    TagSelectionPanel
  },
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    isElectronEnvironment: {
      type: Boolean,
      default: false
    },
    initialFilePath: {
      type: String,
      default: ''
    },
    initialName: {
      type: String,
      default: ''
    },
    initialDuration: {
      type: Number,
      default: 0
    }
  },
  emits: ['close', 'confirm', 'browse-audio-file'],
  setup() {
    const tagPanel = useTagPanel()
    return {
      ...tagPanel
    }
  },
  data() {
    return {
      formData: {
        name: '',
        artist: '',
        filePath: '',
        tags: [],
        notes: '',
        duration: 0
      },
      actorsInput: '',
      tagInput: '',
      availableTags: [] // 可以从 props 或外部传入常用标签列表
    }
  },
  watch: {
    visible(newVal) {
      if (newVal) {
        this.resetForm()
      }
    },
    initialFilePath(newVal) {
      if (newVal) {
        this.formData.filePath = newVal
      }
    },
    initialName(newVal) {
      if (newVal && !this.formData.name) {
        this.formData.name = newVal
      }
    },
    initialDuration(newVal) {
      if (newVal) {
        this.formData.duration = newVal
      }
    }
  },
  methods: {
    resetForm() {
      this.formData = {
        name: '',
        artist: '',
        filePath: '',
        tags: [],
        notes: ''
      }
      this.actorsInput = ''
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
    handleSelectTag(tag: string) {
      if (tag && !this.formData.tags.includes(tag)) {
        this.formData.tags.push(tag)
      }
    },
    handleConfirm() {
      const audioData = {
        ...this.formData,
        actors: this.actorsInput ? this.actorsInput.split(',').map(actor => actor.trim()).filter(actor => actor) : []
      }
      this.$emit('confirm', audioData)
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
}
</style>

