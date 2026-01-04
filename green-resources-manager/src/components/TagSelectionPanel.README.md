# TagSelectionPanel 使用指南

## 概述

`TagSelectionPanel` 是一个可复用的标签选择面板组件，配合 `useTagPanel` composable 使用，可以在所有对话框中轻松添加标签选择功能。

## 快速开始

### 1. 在组件中导入

```vue
<script>
import TagSelectionPanel from '../TagSelectionPanel.vue'
import { useTagPanel } from '../../composables/useTagPanel'

export default {
  components: {
    TagSelectionPanel
  },
  setup() {
    const tagPanel = useTagPanel()
    return {
      ...tagPanel
    }
  }
}
</script>
```

### 2. 在模板中使用

```vue
<template>
  <div class="modal-wrapper">
    <div class="modal-content">
      <!-- 表单内容 -->
      <FormField
        label="标签"
        type="tags"
        v-model="formData.tags"
        v-model:tagInput="tagInput"
        @add-tag="handleAddTag"
        @remove-tag="handleRemoveTag"
        @tag-input-focus="handleTagInputFocus"
        @tag-input-blur="handleTagInputBlur"
      />
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
</template>
```

### 3. 添加标签选择处理

```javascript
methods: {
  handleSelectTag(tag) {
    if (tag && !this.formData.tags.includes(tag)) {
      this.formData.tags.push(tag)
    }
  }
}
```

## Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `visible` | Boolean | `false` | 控制面板显示/隐藏 |
| `title` | String | `'标签选择'` | 面板标题 |
| `currentTags` | Array | `[]` | 当前已选中的标签列表 |
| `availableTags` | Array | `[]` | 可用的标签列表 |
| `showSearch` | Boolean | `true` | 是否显示搜索框 |
| `searchPlaceholder` | String | `'搜索标签...'` | 搜索框占位符 |
| `emptyMessage` | String | `'暂无可用标签'` | 空状态提示信息 |

## Events

| 事件名 | 参数 | 说明 |
|--------|------|------|
| `select-tag` | `tag: string` | 当用户点击标签时触发 |
| `mouse-enter` | - | 鼠标进入面板时触发 |
| `mouse-leave` | - | 鼠标离开面板时触发 |

## useTagPanel Composable

`useTagPanel` 提供了面板显示/隐藏的逻辑：

```typescript
const {
  showTagPanel,              // 响应式布尔值，控制面板显示
  handleTagInputFocus,       // 处理输入框获得焦点
  handleTagInputBlur,        // 处理输入框失去焦点
  handleTagPanelMouseEnter,  // 处理鼠标进入面板
  handleTagPanelMouseLeave,  // 处理鼠标离开面板
  closeTagPanel              // 手动关闭面板
} = useTagPanel()
```

## 样式要求

确保对话框容器使用 `modal-wrapper` 类，并且使用 flex 布局：

```css
.modal-wrapper {
  display: flex;
  align-items: flex-start;
  gap: 20px;
  position: relative;
}
```

## 完整示例

参考 `AddAudioDialog.vue` 的完整实现。

