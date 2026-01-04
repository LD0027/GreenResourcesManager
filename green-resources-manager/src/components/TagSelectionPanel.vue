<template>
  <div
    v-if="visible"
    class="tag-selection-panel"
    @mousedown.stop
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <div class="tag-panel-header">
      <h4>{{ title || '标签选择' }}</h4>
    </div>
    <div class="tag-panel-body">
      <!-- 搜索框（可选） -->
      <div v-if="showSearch" class="tag-search">
        <input
          type="text"
          v-model="searchQuery"
          :placeholder="searchPlaceholder || '搜索标签...'"
          class="tag-search-input"
        />
      </div>

      <!-- 常用标签列表 -->
      <div v-if="availableTags && availableTags.length > 0" class="tag-list-section">
        <div class="tag-list-title">常用标签</div>
        <div class="tag-list">
          <button
            v-for="tag in filteredAvailableTags"
            :key="tag"
            class="tag-item-btn"
            :class="{ 'tag-item-selected': currentTags.includes(tag) }"
            @click="handleTagClick(tag)"
          >
            {{ tag }}
            <span v-if="currentTags.includes(tag)" class="tag-check">✓</span>
          </button>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else class="tag-empty-state">
        <p>{{ emptyMessage || '暂无可用标签' }}</p>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, ref } from 'vue'

export default {
  name: 'TagSelectionPanel',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    title: {
      type: String,
      default: '标签选择'
    },
    currentTags: {
      type: Array as () => string[],
      default: () => []
    },
    availableTags: {
      type: Array as () => string[],
      default: () => []
    },
    showSearch: {
      type: Boolean,
      default: true
    },
    searchPlaceholder: {
      type: String,
      default: '搜索标签...'
    },
    emptyMessage: {
      type: String,
      default: '暂无可用标签'
    }
  },
  emits: ['select-tag', 'mouse-enter', 'mouse-leave'],
  setup(props, { emit }) {
    const searchQuery = ref('')

    // 过滤可用标签
    const filteredAvailableTags = computed(() => {
      if (!props.availableTags || props.availableTags.length === 0) {
        return []
      }
      if (!searchQuery.value.trim()) {
        return props.availableTags
      }
      const query = searchQuery.value.toLowerCase().trim()
      return props.availableTags.filter(tag =>
        tag.toLowerCase().includes(query)
      )
    })

    // 处理标签点击
    const handleTagClick = (tag: string) => {
      emit('select-tag', tag)
    }

    // 处理鼠标进入
    const handleMouseEnter = () => {
      emit('mouse-enter')
    }

    // 处理鼠标离开
    const handleMouseLeave = () => {
      emit('mouse-leave')
    }

    return {
      searchQuery,
      filteredAvailableTags,
      handleTagClick,
      handleMouseEnter,
      handleMouseLeave
    }
  }
}
</script>

<style scoped>
.tag-selection-panel {
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
  position: sticky;
  top: 0;
  background: var(--bg-secondary);
  z-index: 1;
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

.tag-search {
  margin-bottom: 16px;
}

.tag-search-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.875rem;
  transition: all 0.3s ease;
}

.tag-search-input:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 2px rgba(var(--accent-color-rgb, 59, 130, 246), 0.1);
}

.tag-list-section {
  margin-bottom: 16px;
}

.tag-list-title {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin-bottom: 12px;
  font-weight: 500;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-item-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tag-item-btn:hover {
  background: var(--bg-secondary);
  border-color: var(--accent-color);
  transform: translateY(-1px);
}

.tag-item-selected {
  background: var(--accent-color);
  color: white;
  border-color: var(--accent-color);
}

.tag-item-selected:hover {
  background: var(--accent-hover);
}

.tag-check {
  font-size: 0.75rem;
  font-weight: bold;
}

.tag-empty-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-secondary);
}

.tag-empty-state p {
  margin: 0;
  font-size: 0.875rem;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .tag-selection-panel {
    width: 100%;
    max-width: 100%;
    margin: 0;
  }
}
</style>

