<template>
  <div v-if="visible" class="modal-overlay" @mousedown="handleOverlayMouseDown">
    <div class="modal-wrapper">
      <div class="modal-content" @mousedown.stop>
      <div class="modal-header">
        <h3>{{ mode === 'add' ? '添加文件夹' : '编辑文件夹' }}</h3>
        <button class="btn-close" @click="handleClose">✕</button>
      </div>
      <div class="modal-body">
        <FormField
          label="文件夹名称"
          type="text"
          v-model="localFormData.name"
          placeholder="如：复仇者联盟系列"
        />
        
        <FormField
          v-if="fieldMode !== 'anime'"
          label="系列名"
          type="text"
          v-model="localFormData.series"
          placeholder="如：复仇者联盟"
        />

        <FormField
          v-if="fieldMode !== 'anime'"
          label="演员"
          type="text"
          v-model="localActorsInput"
          placeholder="用逗号分隔多个演员"
          @blur="parseActors"
        />

        <FormField
          v-if="fieldMode === 'anime'"
          label="声优"
          type="text"
          v-model="localVoiceActorsInput"
          placeholder="用逗号分隔多个声优"
          @blur="parseVoiceActors"
        />

        <FormField
          v-if="fieldMode === 'anime'"
          label="制作组"
          type="text"
          v-model="localProductionTeamInput"
          placeholder="用逗号分隔多个制作组"
          @blur="parseProductionTeam"
        />

        <FormField
          label="标签"
          type="tags"
          v-model="localFormData.tags"
          v-model:tagInput="localTagsInput"
          @add-tag="addTag"
          @remove-tag="removeTag"
          @tag-input-focus="handleTagInputFocus"
          @tag-input-blur="handleTagInputBlur"
        />

        <FormField
          label="描述"
          type="textarea"
          v-model="localFormData.description"
          placeholder="文件夹描述..."
          :rows="3"
        />

        <FormField
          label="文件夹路径"
          type="file"
          v-model="localFormData.folderPath"
          placeholder="选择包含视频的文件夹"
          @browse="handleBrowseFolder"
        />

        <div class="form-group">
          <label>缩略图</label>
          <div class="file-input-group">
            <input type="text" v-model="localFormData.thumbnail" readonly>
            <button 
              type="button" 
              class="btn-select-file" 
              @click="handleSelectFromCovers" 
              :disabled="!localFormData.folderPath"
            >
              从封面文件夹选择
            </button>
            <button type="button" class="btn-select-file" @click="handleBrowseThumbnailFile">
              自定义选择
            </button>
          </div>
          <div class="thumb-preview-wrapper">
            <img 
              v-if="localFormData.thumbnail"
              class="thumb-preview"
              :src="getThumbnailUrl(localFormData.thumbnail)"
              :alt="localFormData.name || 'thumbnail'"
              @error="(event: Event) => handleThumbnailPreviewError(event)"
              @load="handleThumbnailPreviewLoad ? (event: Event) => handleThumbnailPreviewLoad(event) : undefined"
            >
            <div v-else class="thumb-placeholder">无缩略图</div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" @click="handleClose" class="btn-cancel">取消</button>
        <button 
          type="button" 
          @click="handleSubmit" 
          class="btn-confirm"
          :disabled="!canSubmit"
        >
          {{ mode === 'add' ? '添加文件夹' : '保存' }}
        </button>
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
import { ref, computed, watch } from 'vue'
import FormField from '../FormField.vue'
import type { FolderForm } from '../../types/video'

export default {
  name: 'FolderFormDialog',
  components: {
    FormField
  },
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    mode: {
      type: String as () => 'add' | 'edit',
      default: 'add',
      validator: (value: string) => ['add', 'edit'].includes(value)
    },
    formData: {
      type: Object as () => FolderForm,
      required: true
    },
    actorsInput: {
      type: String,
      default: ''
    },
    tagsInput: {
      type: String,
      default: ''
    },
    getThumbnailUrl: {
      type: Function,
      required: true
    },
    handleThumbnailPreviewError: {
      type: Function,
      required: true
    },
    handleThumbnailPreviewLoad: {
      type: Function,
      default: () => {}
    },
    fieldMode: {
      type: String as () => 'default' | 'anime',
      default: 'default',
      validator: (value: string) => ['default', 'anime'].includes(value)
    },
    voiceActorsInput: {
      type: String,
      default: ''
    },
    productionTeamInput: {
      type: String,
      default: ''
    }
  },
  emits: ['update:visible', 'update:formData', 'update:actorsInput', 'update:tagsInput', 'update:voiceActorsInput', 'update:productionTeamInput', 'submit', 'close', 'browse-folder', 'select-from-covers', 'browse-thumbnail-file', 'parse-actors', 'parse-voice-actors', 'parse-production-team', 'add-tag', 'remove-tag'],
  setup(props, { emit }) {
    const localFormData = ref({ ...props.formData })
    const localActorsInput = ref(props.actorsInput)
    const localTagsInput = ref(props.tagsInput)
    const localVoiceActorsInput = ref(props.voiceActorsInput)
    const localProductionTeamInput = ref(props.productionTeamInput)
    const showTagPanel = ref(false)
    let tagPanelBlurTimer: ReturnType<typeof setTimeout> | null = null
    const isTagPanelHovered = ref(false)

    // 只在 visible 变化时初始化数据，避免双向绑定导致的递归更新
    watch(() => props.visible, (newVal) => {
      if (newVal) {
        // 对话框打开时，初始化本地数据
        localFormData.value = { ...props.formData }
        localActorsInput.value = props.actorsInput
        localTagsInput.value = props.tagsInput
        localVoiceActorsInput.value = props.voiceActorsInput
        localProductionTeamInput.value = props.productionTeamInput
      }
    })

    // 监听外部 formData 变化（仅在编辑模式下，当外部数据更新时同步）
    watch(() => props.formData, (newVal) => {
      // 只在对话框可见时同步，避免不必要的更新
      if (props.visible) {
        localFormData.value = { ...newVal }
      }
    }, { deep: true })

    watch(() => props.actorsInput, (newVal) => {
      if (props.visible) {
        localActorsInput.value = newVal
      }
    })

    watch(() => props.tagsInput, (newVal) => {
      if (props.visible) {
        localTagsInput.value = newVal
      }
    })

    watch(() => props.voiceActorsInput, (newVal) => {
      if (props.visible) {
        localVoiceActorsInput.value = newVal
      }
    })

    watch(() => props.productionTeamInput, (newVal) => {
      if (props.visible) {
        localProductionTeamInput.value = newVal
      }
    })

    const canSubmit = computed(() => {
      return localFormData.value.folderPath && localFormData.value.folderPath.trim()
    })

    const handleClose = () => {
      emit('update:visible', false)
      emit('close')
    }

    /**
     * 处理 overlay 区域的 mousedown 事件
     * 使用 mousedown 而不是 click，避免在复制文字时（鼠标在外部区域释放）误关闭
     * 这样只有在外部区域按下鼠标时才会关闭，符合常见软件的交互习惯
     */
    const handleOverlayMouseDown = (event: MouseEvent) => {
      // 只在 overlay 背景上按下鼠标时才关闭（不是 content 区域）
      // event.target 是 overlay 本身，而不是 content
      if (event.target === event.currentTarget) {
        handleClose()
      }
    }

    const handleSubmit = () => {
      if (canSubmit.value) {
        // 提交时使用本地数据，并确保相关字段已解析
        const submitData = { ...localFormData.value }
        
        if (props.fieldMode === 'anime') {
          // 番剧模式：解析声优和制作组
          if (localVoiceActorsInput.value && localVoiceActorsInput.value.trim()) {
            submitData.voiceActors = localVoiceActorsInput.value.split(',').map(s => s.trim()).filter(Boolean)
          } else if (!submitData.voiceActors || !Array.isArray(submitData.voiceActors)) {
            submitData.voiceActors = []
          }
          
          if (localProductionTeamInput.value && localProductionTeamInput.value.trim()) {
            submitData.productionTeam = localProductionTeamInput.value.split(',').map(s => s.trim()).filter(Boolean)
          } else if (!submitData.productionTeam || !Array.isArray(submitData.productionTeam)) {
            submitData.productionTeam = []
          }
        } else {
          // 默认模式：解析演员
          if (localActorsInput.value && localActorsInput.value.trim()) {
            submitData.actors = localActorsInput.value.split(',').map(s => s.trim()).filter(Boolean)
          } else if (!submitData.actors || !Array.isArray(submitData.actors)) {
            submitData.actors = []
          }
        }
        
        emit('submit', submitData)
      }
    }

    const parseActors = () => {
      emit('parse-actors')
    }

    const parseVoiceActors = () => {
      emit('parse-voice-actors')
    }

    const parseProductionTeam = () => {
      emit('parse-production-team')
    }

    const addTag = () => {
      // 直接在组件内部处理标签添加，使用本地数据
      const tag = localTagsInput.value.trim()
      if (tag && !localFormData.value.tags.includes(tag)) {
        localFormData.value.tags.push(tag)
        localTagsInput.value = ''
      }
      // 仍然发出事件，以便父组件可以执行额外逻辑（如果需要）
      emit('add-tag')
    }

    const removeTag = (index: number) => {
      // 直接在组件内部处理标签移除，使用本地数据
      if (index >= 0 && index < localFormData.value.tags.length) {
        localFormData.value.tags.splice(index, 1)
      }
      // 仍然发出事件，以便父组件可以执行额外逻辑（如果需要）
      emit('remove-tag', index)
    }

    const handleBrowseFolder = () => {
      emit('browse-folder')
    }

    const handleSelectFromCovers = () => {
      emit('select-from-covers')
    }

    const handleBrowseThumbnailFile = () => {
      emit('browse-thumbnail-file')
    }

    const handleTagInputFocus = () => {
      // 清除可能存在的延迟隐藏定时器
      if (tagPanelBlurTimer) {
        clearTimeout(tagPanelBlurTimer)
        tagPanelBlurTimer = null
      }
      // 显示面板
      showTagPanel.value = true
    }

    const handleTagInputBlur = () => {
      // 延迟隐藏面板，以便用户可以点击面板内容
      // 如果鼠标在面板上，则不隐藏
      tagPanelBlurTimer = setTimeout(() => {
        if (!isTagPanelHovered.value) {
          showTagPanel.value = false
        }
      }, 200)
    }

    const handleTagPanelMouseEnter = () => {
      isTagPanelHovered.value = true
      // 清除隐藏定时器
      if (tagPanelBlurTimer) {
        clearTimeout(tagPanelBlurTimer)
        tagPanelBlurTimer = null
      }
    }

    const handleTagPanelMouseLeave = () => {
      isTagPanelHovered.value = false
      // 延迟隐藏面板
      tagPanelBlurTimer = setTimeout(() => {
        showTagPanel.value = false
      }, 200)
    }

    return {
      localFormData,
      localActorsInput,
      localTagsInput,
      localVoiceActorsInput,
      localProductionTeamInput,
      showTagPanel,
      canSubmit,
      handleClose,
      handleOverlayMouseDown,
      handleSubmit,
      parseActors,
      parseVoiceActors,
      parseProductionTeam,
      addTag,
      removeTag,
      handleBrowseFolder,
      handleSelectFromCovers,
      handleBrowseThumbnailFile,
      handleTagInputFocus,
      handleTagInputBlur,
      handleTagPanelMouseEnter,
      handleTagPanelMouseLeave
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
  background: var(--bg-primary, #fff);
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  flex-shrink: 0;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color, #e0e0e0);
}

.modal-header h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary, #333);
}


.modal-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid var(--border-color, #e0e0e0);
}

.btn-cancel,
.btn-confirm {
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-cancel {
  background: var(--bg-secondary, #f5f5f5);
  color: var(--text-primary, #333);
}

.btn-cancel:hover {
  background: var(--bg-hover, #e0e0e0);
}

.btn-confirm {
  background: var(--primary-color, #007bff);
  color: white;
}

.btn-confirm:hover:not(:disabled) {
  background: var(--primary-hover, #0056b3);
}

.btn-confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: var(--text-primary, #333);
}

.file-input-group {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.file-input-group input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 4px;
  font-size: 14px;
}

.btn-select-file {
  padding: 8px 16px;
  border: 1px solid var(--border-color, #e0e0e0);
  background: var(--bg-secondary, #f5f5f5);
  color: var(--text-primary, #333);
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.btn-select-file:hover:not(:disabled) {
  background: var(--bg-hover, #e0e0e0);
}

.btn-select-file:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.thumb-preview-wrapper {
  margin-top: 12px;
}

.thumb-preview {
  max-width: 100%;
  max-height: 200px;
  border-radius: 4px;
  border: 1px solid var(--border-color, #e0e0e0);
}

.thumb-placeholder {
  padding: 40px;
  text-align: center;
  color: var(--text-tertiary, #999);
  border: 1px dashed var(--border-color, #e0e0e0);
  border-radius: 4px;
}

/* Tag 选择面板样式 */
.tag-panel {
  background: var(--bg-primary, #fff);
  border-radius: 12px;
  width: 300px;
  max-width: 90vw;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
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
  border-bottom: 1px solid var(--border-color, #e0e0e0);
}

.tag-panel-header h4 {
  color: var(--text-primary, #333);
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
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

