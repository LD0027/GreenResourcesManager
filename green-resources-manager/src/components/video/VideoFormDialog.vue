<template>
  <div v-if="visible" class="modal-overlay" @mousedown="handleOverlayMouseDown">
    <div class="modal-wrapper">
      <div class="modal-content" @mousedown.stop>
      <div class="modal-header">
        <h3>{{ mode === 'add' ? '添加视频' : '编辑视频' }}</h3>
        <button class="btn-close" @click="handleClose">✕</button>
      </div>
      <div class="modal-body">
        <FormField
          :label="mode === 'add' ? '视频名称 (可选)' : '名称'"
          type="text"
          v-model="localFormData.name"
          :placeholder="mode === 'add' ? '未填写将自动使用文件名' : '输入视频名称'"
        />
        
        <FormField
          label="系列名"
          type="text"
          v-model="localFormData.series"
          placeholder="如：复仇者联盟"
        />

        <FormField
          label="演员"
          type="text"
          v-model="localActorsInput"
          placeholder="用逗号分隔多个演员"
          @blur="parseActors"
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
          placeholder="视频描述..."
          :rows="3"
        />

        <FormField
          label="视频文件"
          type="file"
          v-model="localFormData.filePath"
          :placeholder="mode === 'add' ? '选择视频文件...' : '选择视频文件'"
          @browse="handleBrowseVideoFile"
        />

        <div class="form-group">
          <label>缩略图</label>
          <div class="file-input-group">
            <input type="text" v-model="localFormData.thumbnail" readonly>
            <button type="button" class="btn-select-file" @click="handleBrowseThumbnailFile">选择图片</button>
            <button 
              type="button" 
              class="btn-select-file" 
              @click="handleRandomizeThumbnail"
              :disabled="!localFormData.filePath"
            >
              随机封面
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

        <div class="form-group">
          <label>时长 (分钟)</label>
          <input type="number" v-model.number="localFormData.duration" min="0">
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" @click="handleClose" class="btn btn-cancel">取消</button>
        <button 
          type="button" 
          @click="handleSubmit" 
          class="btn btn-confirm"
          :disabled="!canSubmit"
        >
          {{ mode === 'add' ? '添加视频' : '保存' }}
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
import type { VideoForm } from '../../types/video'

export default {
  name: 'VideoFormDialog',
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
      type: Object as () => VideoForm,
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
    extractVideoName: {
      type: Function,
      required: true
    },
    getVideoDuration: {
      type: Function,
      required: true
    },
    generateThumbnail: {
      type: Function,
      required: true
    }
  },
  emits: ['update:visible', 'update:formData', 'update:actorsInput', 'update:tagsInput', 'submit', 'close', 'browse-video-file', 'browse-thumbnail-file', 'randomize-thumbnail', 'parse-actors', 'add-tag', 'remove-tag'],
  setup(props, { emit }) {
    const localFormData = ref({ ...props.formData })
    const localActorsInput = ref(props.actorsInput)
    const localTagsInput = ref(props.tagsInput)
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

    const canSubmit = computed(() => {
      if (props.mode === 'add') {
        return localFormData.value.filePath && localFormData.value.filePath.trim()
      }
      return localFormData.value.name && localFormData.value.name.trim()
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
        // 提交时使用本地数据，并确保 actors 已解析
        const submitData = { ...localFormData.value }
        
        // 如果 localActorsInput 有值，解析为数组
        if (localActorsInput.value && localActorsInput.value.trim()) {
          submitData.actors = localActorsInput.value.split(',').map(s => s.trim()).filter(Boolean)
        } else if (!submitData.actors || !Array.isArray(submitData.actors)) {
          submitData.actors = []
        }
        
        emit('submit', submitData)
      }
    }

    const parseActors = () => {
      emit('parse-actors')
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

    const handleBrowseVideoFile = () => {
      emit('browse-video-file')
    }

    const handleBrowseThumbnailFile = () => {
      emit('browse-thumbnail-file')
    }

    const handleRandomizeThumbnail = () => {
      emit('randomize-thumbnail')
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
      showTagPanel,
      canSubmit,
      handleClose,
      handleOverlayMouseDown,
      handleSubmit,
      parseActors,
      addTag,
      removeTag,
      handleBrowseVideoFile,
      handleBrowseThumbnailFile,
      handleRandomizeThumbnail,
      handleTagInputFocus,
      handleTagInputBlur,
      handleTagPanelMouseEnter,
      handleTagPanelMouseLeave
    }
  }
}
</script>

<style scoped>
/* 
  注意：以下样式已移至共享样式文件，可以直接使用：
  - .modal-overlay, .modal-content, .modal-header, .modal-body, .modal-footer, .modal-close (在 styles/components/modal.css)
  - .btn, .btn-cancel, .btn-confirm, .btn-select-file (在 styles/components/button.css)
  - .form-group, .file-input-group (在 styles/components/form.css)
  - .thumb-preview-wrapper, .thumb-preview, .thumb-placeholder (在 styles/components/form.css)
  
  这里只保留组件特定的样式
*/

.modal-wrapper {
  display: flex;
  align-items: flex-start;
  gap: 20px;
  position: relative;
}

.modal-content {
  flex-shrink: 0;
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

