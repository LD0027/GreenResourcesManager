<template>
  <div v-if="visible" class="modal-overlay" @mousedown="handleOverlayMouseDown">
    <div class="modal-wrapper">
      <div class="modal-content" @mousedown.stop>
        <div class="modal-header">
          <h3>编辑小说</h3>
          <button class="btn-close" @click="handleClose">✕</button>
        </div>
        <div class="modal-body">
          <FormField
            label="小说名称"
            type="text"
            v-model="formData.name"
            placeholder="输入小说名称"
          />
          <FormField
            label="作者"
            type="text"
            v-model="formData.author"
            placeholder="输入作者名称"
          />
          <FormField
            label="类型"
            type="text"
            v-model="formData.genre"
            placeholder="如：玄幻、都市、历史等"
          />
          <FormField
            label="小说简介"
            type="textarea"
            v-model="formData.description"
            placeholder="输入小说简介或描述..."
            :rows="3"
          />
          <FormField
            label="小说标签"
            type="tags"
            v-model="formData.tags"
            v-model:tagInput="tagInput"
            @add-tag="handleAddTag"
            @remove-tag="handleRemoveTag"
            @tag-input-focus="handleTagInputFocus"
            @tag-input-blur="handleTagInputBlur"
          />
          <FormField
            label="阅读进度 (%)"
            type="number"
            v-model.number="formData.readProgress"
            placeholder="0-100"
          />
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="handleClose">取消</button>
          <button class="btn-confirm" @click="handleConfirm">保存修改</button>
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
  name: 'EditNovelDialog',
  components: {
    FormField
  },
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    novel: {
      type: Object,
      default: null
    }
  },
  emits: ['close', 'confirm'],
  data() {
    return {
      formData: {
        id: '',
        name: '',
        author: '',
        genre: '',
        description: '',
        tags: [],
        readProgress: 0
      },
      tagInput: '',
      showTagPanel: false,
      tagPanelBlurTimer: null as ReturnType<typeof setTimeout> | null,
      isTagPanelHovered: false
    }
  },
  watch: {
    visible(newVal) {
      if (newVal && this.novel) {
        this.loadNovelData()
      }
    },
    novel: {
      handler(newVal) {
        if (newVal && this.visible) {
          this.loadNovelData()
        }
      },
      immediate: true
    }
  },
  methods: {
    loadNovelData() {
      if (!this.novel) return
      this.formData = {
        id: this.novel.id || '',
        name: this.novel.name || '',
        author: this.novel.author || '',
        genre: this.novel.genre || '',
        description: this.novel.description || '',
        tags: Array.isArray(this.novel.tags) ? [...this.novel.tags] : [],
        readProgress: this.novel.readProgress || 0
      }
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

