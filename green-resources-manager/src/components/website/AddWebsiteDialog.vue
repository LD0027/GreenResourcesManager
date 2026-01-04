<template>
  <div v-if="visible" class="modal-overlay" @mousedown="handleOverlayMouseDown">
    <div class="modal-content" @mousedown.stop>
      <div class="modal-header">
        <h3>添加网站收藏</h3>
        <button class="btn-close" @click="handleClose">×</button>
      </div>
      
      <div class="modal-body">
        <FormField
          label="网站名称"
          type="text"
          v-model="formData.name"
          placeholder="网站名称（可选）"
        />
        
        <FormField
          label="网站URL *"
          type="text"
          v-model="formData.url"
          placeholder="https://example.com"
        />
        <div v-if="urlError" class="error-message">{{ urlError }}</div>
        
        <FormField
          label="网站描述"
          type="textarea"
          v-model="formData.description"
          placeholder="网站描述（可选）..."
          :rows="3"
        />
      </div>
      
      <div class="modal-footer">
        <button class="btn-cancel" @click="handleClose">取消</button>
        <button class="btn-confirm" @click="handleConfirm" :disabled="!isFormValid">添加</button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import FormField from '../FormField.vue'

export default {
  name: 'AddWebsiteDialog',
  components: {
    FormField
  },
  props: {
    visible: {
      type: Boolean,
      default: false
    }
  },
  emits: ['close', 'confirm'],
  data() {
    return {
      formData: {
        name: '',
        url: '',
        description: ''
      },
      urlError: ''
    }
  },
  computed: {
    isFormValid() {
      return this.formData.url && this.formData.url.trim() && !this.urlError
    }
  },
  watch: {
    'formData.url'(newVal) {
      this.validateUrl(newVal)
    },
    visible(newVal) {
      if (newVal) {
        this.resetForm()
      }
    }
  },
  methods: {
    resetForm() {
      this.formData = {
        name: '',
        url: '',
        description: ''
      }
      this.urlError = ''
    },
    validateUrl(url: string) {
      if (!url || !url.trim()) {
        this.urlError = ''
        return
      }
      try {
        new URL(url)
        this.urlError = ''
      } catch {
        this.urlError = '请输入有效的URL（例如：https://example.com）'
      }
    },
    handleClose() {
      this.$emit('close')
    },
    handleOverlayMouseDown(event: MouseEvent) {
      if (event.target === event.currentTarget) {
        this.handleClose()
      }
    },
    handleConfirm() {
      if (this.isFormValid) {
        this.$emit('confirm', { ...this.formData })
      }
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

.modal-content {
  background: var(--bg-secondary);
  border-radius: 12px;
  width: 500px;
  max-width: 90vw;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 40px var(--shadow-medium);
  transition: background-color 0.3s ease;
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

.btn-confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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

.error-message {
  color: #ef4444;
  font-size: 0.875rem;
  margin-top: -10px;
  margin-bottom: 10px;
}
</style>

