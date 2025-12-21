<template>
  <div class="epub-reader" ref="epubReaderContainer">
    <!-- 标题栏 -->
    <div class="reader-title-bar" v-show="showTitleAndMenu" @click.stop>
      <div class="title-left">
        <button class="btn-back" @click="$emit('close')" title="返回">
          <span>←</span>
        </button>
      </div>
      <div class="title-center">
        <h3>{{ novelName }}</h3>
        <p class="author">{{ author }}</p>
      </div>
      <div class="title-right"></div>
    </div>

    <!-- 阅读区域 -->
    <div class="reader-wrapper" @click="toggleTitleAndMenu">
      <div id="epub-read" ref="renderArea"></div>
      
      <!-- 左右翻页区域 -->
      <div class="page-mask">
        <div class="page-left" @click.stop="prevPage"></div>
        <div class="page-center" @click.stop="toggleTitleAndMenu"></div>
        <div class="page-right" @click.stop="nextPage"></div>
      </div>
    </div>

    <!-- 菜单栏 -->
    <div class="reader-menu-bar" v-show="showTitleAndMenu" @click.stop>
      <div class="menu-icons">
        <button class="menu-icon" @click="showSetting('font')" title="字体大小">
          <span>A</span>
        </button>
        <button class="menu-icon" @click="showSetting('theme')" title="主题">
          <span>🎨</span>
        </button>
        <button class="menu-icon" @click="showSetting('progress')" title="进度">
          <span>📊</span>
        </button>
        <button class="menu-icon" @click="showSetting('catalog')" title="目录">
          <span>📑</span>
        </button>
      </div>

      <!-- 设置面板 -->
      <transition name="slide-up">
        <div class="setting-panel" v-show="showSettingPanel">
          <!-- 字体大小设置 -->
          <div class="setting-font-size" v-if="currentSetting === 'font'">
            <div class="font-preview small">A</div>
            <div class="font-slider">
              <div 
                class="font-option" 
                v-for="(size, index) in fontSizeList" 
                :key="index"
                @click="setFontSize(size.fontSize)"
              >
                <div class="font-line"></div>
                <div class="font-point-wrapper">
                  <div class="font-point" v-show="defaultFontSize === size.fontSize">
                    <div class="font-point-inner"></div>
                  </div>
                </div>
                <div class="font-line"></div>
              </div>
            </div>
            <div class="font-preview large">A</div>
          </div>

          <!-- 主题设置 -->
          <div class="setting-theme" v-else-if="currentSetting === 'theme'">
            <div 
              class="theme-item" 
              v-for="(theme, index) in themeList" 
              :key="index"
              @click="setTheme(index)"
            >
              <div 
                class="theme-preview" 
                :style="{ background: theme.style.body.background }"
                :class="{ 'selected': defaultTheme === index }"
              ></div>
              <div class="theme-name" :class="{ 'selected': defaultTheme === index }">
                {{ theme.name }}
              </div>
            </div>
          </div>

          <!-- 进度设置 -->
          <div class="setting-progress" v-else-if="currentSetting === 'progress'">
            <div class="progress-slider-wrapper">
              <input 
                type="range" 
                class="progress-slider"
                min="0" 
                max="100" 
                step="1"
                :value="progress"
                :disabled="!bookAvailable"
                @input="onProgressInput(($event.target as HTMLInputElement).value)"
                @change="onProgressChange(($event.target as HTMLInputElement).value)"
              />
            </div>
            <div class="progress-text">
              {{ bookAvailable ? progress + '%' : '加载中...' }}
            </div>
          </div>
        </div>
      </transition>

      <!-- 目录面板 -->
      <transition name="slide-right">
        <div class="catalog-panel" v-show="currentSetting === 'catalog'">
          <div class="catalog-header">
            <h4>目录</h4>
            <button class="btn-close-catalog" @click="hideSetting">✕</button>
          </div>
          <div class="catalog-content" v-if="bookAvailable && navigation">
            <div 
              class="catalog-item" 
              v-for="(item, index) in navigation.toc" 
              :key="index"
              @click="jumpTo(item.href)"
            >
              <span class="catalog-text">{{ item.label }}</span>
            </div>
          </div>
          <div class="catalog-loading" v-else>
            加载中...
          </div>
        </div>
      </transition>
    </div>

    <!-- 目录遮罩 -->
    <div 
      class="catalog-mask" 
      v-show="currentSetting === 'catalog'"
      @click="hideSetting"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import ePub from 'epubjs'

const props = defineProps<{
  filePath: string
  novelName?: string
  author?: string
  initialCfi?: string
}>()

const emit = defineEmits<{
  close: []
  'progress-changed': [progress: number]
}>()

// 参考 vue-epub-reader 的实现
let book: any = null
let rendition: any = null
let themes: any = null
let locations: any = null
let currentBlobUrl: string | null = null

const showTitleAndMenu = ref(false)
const showSettingPanel = ref(false)
const currentSetting = ref<string>('')
const bookAvailable = ref(false)
const progress = ref(0)
const navigation = ref<any>(null)

// 字体大小设置（参考 vue-epub-reader）
const fontSizeList = [
  { fontSize: 12 },
  { fontSize: 14 },
  { fontSize: 16 },
  { fontSize: 18 },
  { fontSize: 20 },
  { fontSize: 22 },
  { fontSize: 24 }
]
const defaultFontSize = ref(16)

// 主题设置（参考 vue-epub-reader）
const themeList = [
  {
    name: 'default',
    style: {
      body: {
        color: '#000',
        background: '#fff'
      }
    }
  },
  {
    name: 'eye',
    style: {
      body: {
        color: '#000',
        background: '#ceeaba'
      }
    }
  },
  {
    name: 'night',
    style: {
      body: {
        color: '#fff',
        background: '#000'
      }
    }
  },
  {
    name: 'gold',
    style: {
      body: {
        color: '#000',
        background: 'rgb(238, 232, 170)'
      }
    }
  }
]
const defaultTheme = ref(0)

// 切换标题和菜单显示
const toggleTitleAndMenu = () => {
  showTitleAndMenu.value = !showTitleAndMenu.value
  if (!showTitleAndMenu.value) {
    hideSetting()
  }
}

// 显示设置面板
const showSetting = (type: string) => {
  if (currentSetting.value === type) {
    hideSetting()
  } else {
    currentSetting.value = type
    showSettingPanel.value = type !== 'catalog'
  }
}

// 隐藏设置面板
const hideSetting = () => {
  showSettingPanel.value = false
  currentSetting.value = ''
}

// 设置字体大小（参考 vue-epub-reader）
const setFontSize = (fontSize: number) => {
  defaultFontSize.value = fontSize
  if (themes) {
    themes.fontSize(fontSize + 'px')
  }
}

// 设置主题（参考 vue-epub-reader）
const setTheme = (index: number) => {
  if (themes) {
    themes.select(themeList[index].name)
  }
  defaultTheme.value = index
}

// 注册主题（参考 vue-epub-reader）
const registerTheme = () => {
  if (!themes) return
  themeList.forEach(theme => {
    themes.register(theme.name, theme.style)
  })
}

// 更新阅读进度（参考 vue-epub-reader）
const showProgress = () => {
  if (!rendition || !locations) return
  try {
    const currentLocation = rendition.currentLocation()
    if (currentLocation && currentLocation.start) {
      const percentage = locations.percentageFromCfi(currentLocation.start.cfi)
      progress.value = bookAvailable.value ? Math.round(percentage * 100) : 0
      emit('progress-changed', progress.value)
    }
  } catch (error) {
    console.warn('更新阅读进度失败:', error)
  }
}

// 进度条输入
const onProgressInput = (value: string) => {
  progress.value = parseInt(value)
}

// 进度条变化（跳转）（参考 vue-epub-reader）
const onProgressChange = (value: string) => {
  const percentage = parseFloat(value) / 100
  if (locations && rendition) {
    const location = percentage > 0 ? locations.cfiFromPercentage(percentage) : 0
    rendition.display(location)
  }
  hideSetting()
}

// 上一页（参考 vue-epub-reader）
const prevPage = () => {
  if (rendition) {
    rendition.prev().then(() => {
      showProgress()
    })
  }
}

// 下一页（参考 vue-epub-reader）
const nextPage = () => {
  if (rendition) {
    rendition.next().then(() => {
      showProgress()
    })
  }
}

// 跳转到章节（参考 vue-epub-reader）
const jumpTo = (href: string) => {
  if (rendition) {
    rendition.display(href).then(() => {
      showProgress()
    })
  }
  hideSetting()
}

// 加载 EPUB（参考 EpubParser.ts 的实现，使用 Blob URL）
const showEpub = async () => {
  try {
    await nextTick()
    
    console.log('开始加载 EPUB 文件:', props.filePath)
    
    // 参考 EpubParser.ts 的实现，优先使用 Blob URL
    let epubSource: string | ArrayBuffer = props.filePath
    let blobUrl: string | null = null
    
    // 在 Electron 环境中，尝试使用 Blob URL（这样可以避免中文路径问题）
    if (window.electronAPI && window.electronAPI.readFileAsDataUrl) {
      try {
        // 方法1: 尝试使用 fetch 读取文件为 Blob，然后创建 Blob URL
        const fileUrl = props.filePath.startsWith('file://') 
          ? props.filePath 
          : `file:///${props.filePath.replace(/\\/g, '/')}`
        
        let blob: Blob | null = null
        
        try {
          const response = await fetch(fileUrl)
          if (response.ok) {
            blob = await response.blob()
            // 验证 Blob 是否是有效的 EPUB 文件
            const view = new Uint8Array(await blob.slice(0, 4).arrayBuffer())
            const isValidEpub = view[0] === 0x50 && view[1] === 0x4B && view[2] === 0x03 && view[3] === 0x04
            if (isValidEpub) {
              // 优先尝试 Blob URL（可以避免中文路径问题）
              blobUrl = URL.createObjectURL(blob)
              currentBlobUrl = blobUrl
              epubSource = blobUrl
              console.log('成功使用 Blob URL 方式加载，文件大小:', blob.size, 'bytes')
            } else {
              throw new Error('文件不是有效的 EPUB 格式（不是 ZIP 文件）')
            }
          } else {
            throw new Error(`fetch 失败: ${response.status} ${response.statusText}`)
          }
        } catch (fetchError) {
          console.warn('fetch 方法失败，尝试使用 Data URL 转换:', fetchError)
          
          // 方法2: 使用 Data URL 转换为 Blob
          const dataUrl = await window.electronAPI.readFileAsDataUrl(props.filePath)
          if (dataUrl) {
            // 将 Data URL 转换为 Blob
            const response = await fetch(dataUrl)
            blob = await response.blob()
            // 验证 EPUB 文件格式
            const view = new Uint8Array(await blob.slice(0, 4).arrayBuffer())
            const isValidEpub = view[0] === 0x50 && view[1] === 0x4B && view[2] === 0x03 && view[3] === 0x04
            if (isValidEpub) {
              blobUrl = URL.createObjectURL(blob)
              currentBlobUrl = blobUrl
              epubSource = blobUrl
              console.log('成功使用 Data URL 转换为 Blob URL，文件大小:', blob.size, 'bytes')
            } else {
              throw new Error('文件不是有效的 EPUB 格式（不是 ZIP 文件）')
            }
          } else {
            throw new Error('无法读取文件为 Data URL')
          }
        }
        
      } catch (blobError) {
        console.warn('Blob URL 方法失败，尝试 ArrayBuffer 方式:', blobError)
        
        // 方法3: 尝试直接使用 ArrayBuffer
        try {
          const fileUrl = props.filePath.startsWith('file://') 
            ? props.filePath 
            : `file:///${props.filePath.replace(/\\/g, '/')}`
          
          const response = await fetch(fileUrl)
          if (response.ok) {
            const arrayBuffer = await response.arrayBuffer()
            const view = new Uint8Array(arrayBuffer.slice(0, 4))
            const isValidEpub = view[0] === 0x50 && view[1] === 0x4B && view[2] === 0x03 && view[3] === 0x04
            if (isValidEpub) {
              epubSource = arrayBuffer
              console.log('成功使用 ArrayBuffer 方式加载，文件大小:', arrayBuffer.byteLength, 'bytes')
            } else {
              throw new Error('文件不是有效的 EPUB 格式')
            }
          }
        } catch (arrayBufferError) {
          console.warn('ArrayBuffer 方法也失败，将使用 file:// URL 方式:', arrayBufferError)
          // 如果都失败，使用文件路径转换为 file:// URL（编码处理）
          const normalizedPath = props.filePath.replace(/\\/g, '/')
          if (normalizedPath.match(/^[A-Za-z]:/)) {
            // 对路径进行编码处理，特别是中文字符
            const encodedPath = normalizedPath.split('/').map(segment => 
              encodeURIComponent(segment)
            ).join('/')
            epubSource = `file:///${normalizedPath.split(':')[0]}:${encodedPath.substring(encodedPath.indexOf('/') + 1)}`
          } else {
            epubSource = `file://${normalizedPath}`
          }
          console.log('回退到 file:// URL 方式:', epubSource)
        }
      }
    } else {
      // 非 Electron 环境，使用 URL
      if (!props.filePath.startsWith('file://') && !props.filePath.startsWith('http://') && !props.filePath.startsWith('https://')) {
        const normalizedPath = props.filePath.replace(/\\/g, '/')
        if (normalizedPath.match(/^[A-Za-z]:/)) {
          epubSource = `file:///${normalizedPath}`
        } else {
          epubSource = `file://${normalizedPath}`
        }
        console.log('使用 file:// URL 方式加载:', epubSource)
      } else {
        epubSource = props.filePath
        console.log('使用提供的 URL 方式加载:', epubSource)
      }
    }
    
    console.log('最终使用的 EPUB 源:', typeof epubSource === 'string' ? epubSource : 'ArrayBuffer')
    
    // 参考 vue-epub-reader: this.book = new Epub(DOWNLOAD_URL)
    // epubjs 0.3.x 使用 ePub() 而不是 new ePub()
    book = ePub(epubSource)
    
    // 等待渲染区域准备好
    const renderElement = document.getElementById('epub-read')
    if (!renderElement) {
      throw new Error('渲染区域未找到')
    }
    
    // 参考 vue-epub-reader: this.rendition = this.book.renderTo('read', {...})
    rendition = book.renderTo('epub-read', {
      width: window.innerWidth,
      height: window.innerHeight
    })
    
    // 参考 vue-epub-reader: this.rendition.display()
    rendition.display()
    
    // 参考 vue-epub-reader: this.themes = this.rendition.themes
    themes = rendition.themes
    
    // 参考 vue-epub-reader: this.setFontSize(this.defaultFontSize)
    setFontSize(defaultFontSize.value)
    
    // 参考 vue-epub-reader: this.registerTheme()
    registerTheme()
    
    // 参考 vue-epub-reader: this.setTheme(this.defaultTheme)
    setTheme(defaultTheme.value)
    
    // 参考 vue-epub-reader: this.book.ready.then(...)
    book.ready.then(() => {
      navigation.value = book.navigation
      
      return book.locations.generate()
    }).then(() => {
      locations = book.locations
      bookAvailable.value = true
      showProgress()
    }).catch((error: any) => {
      console.error('EPUB 加载失败:', error)
      alert(`加载 EPUB 文件失败: ${error.message || error}`)
    })
    
    // 监听翻页事件
    if (rendition) {
      rendition.on('relocated', () => {
        showProgress()
      })
    }
    
  } catch (error: any) {
    console.error('初始化 EPUB 失败:', error)
    alert(`初始化 EPUB 失败: ${error.message || error}`)
  }
}

// 清理资源
const cleanup = () => {
  if (rendition) {
    try {
      rendition.destroy()
    } catch (e) {
      console.warn('销毁 rendition 失败:', e)
    }
    rendition = null
  }
  if (book) {
    try {
      book.destroy()
    } catch (e) {
      console.warn('销毁 book 失败:', e)
    }
    book = null
  }
  // 清理 Blob URL
  if (currentBlobUrl) {
    URL.revokeObjectURL(currentBlobUrl)
    currentBlobUrl = null
  }
  themes = null
  locations = null
  navigation.value = null
  bookAvailable.value = false
}

// 监听窗口大小变化
const handleResize = () => {
  if (rendition) {
    try {
      rendition.resize(window.innerWidth, window.innerHeight)
    } catch (e) {
      console.warn('调整大小失败:', e)
    }
  }
}

onMounted(() => {
  showEpub()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  cleanup()
  window.removeEventListener('resize', handleResize)
})

// 监听文件路径变化
watch(() => props.filePath, () => {
  cleanup()
  showEpub()
})
</script>

<style scoped>
.epub-reader {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;
  overflow: hidden;
}

.reader-title-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  padding: 0 20px;
  z-index: 100;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.title-left {
  flex: 0 0 60px;
}

.btn-back {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--text-primary, #333);
  padding: 8px;
  border-radius: 4px;
  transition: background 0.2s;
}

.btn-back:hover {
  background: rgba(0, 0, 0, 0.05);
}

.title-center {
  flex: 1;
  text-align: center;
}

.title-center h3 {
  margin: 0;
  font-size: 16px;
  color: var(--text-primary, #333);
  font-weight: 600;
}

.title-center .author {
  margin: 4px 0 0 0;
  font-size: 12px;
  color: var(--text-secondary, #666);
}

.title-right {
  flex: 0 0 60px;
}

.reader-wrapper {
  flex: 1;
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

#epub-read {
  width: 100%;
  height: 100%;
}

.page-mask {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  z-index: 10;
  pointer-events: none;
}

.page-left,
.page-right {
  flex: 0 0 100px;
  pointer-events: auto;
  cursor: pointer;
}

.page-center {
  flex: 1;
  pointer-events: auto;
  cursor: pointer;
}

.reader-menu-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  z-index: 100;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
}

.menu-icons {
  display: flex;
  height: 48px;
  align-items: center;
  justify-content: space-around;
  padding: 0 20px;
}

.menu-icon {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  padding: 8px 16px;
  border-radius: 4px;
  transition: background 0.2s;
  color: var(--text-primary, #333);
}

.menu-icon:hover {
  background: rgba(0, 0, 0, 0.05);
}

.setting-panel {
  background: rgba(255, 255, 255, 0.98);
  padding: 20px;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
}

.setting-font-size {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 60px;
}

.font-preview {
  flex: 0 0 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-primary, #333);
}

.font-preview.small {
  font-size: 12px;
}

.font-preview.large {
  font-size: 24px;
}

.font-slider {
  flex: 1;
  display: flex;
  align-items: center;
  height: 100%;
}

.font-option {
  flex: 1;
  display: flex;
  align-items: center;
  height: 100%;
  position: relative;
}

.font-line {
  flex: 1;
  height: 1px;
  background: #ccc;
}

.font-point-wrapper {
  position: relative;
  width: 0;
  height: 7px;
}

.font-point {
  position: absolute;
  top: -8px;
  left: -10px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: white;
  border: 1px solid #ccc;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
}

.font-point-inner {
  width: 5px;
  height: 5px;
  background: black;
  border-radius: 50%;
}

.setting-theme {
  display: flex;
  gap: 15px;
  padding: 10px 0;
}

.theme-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.theme-preview {
  width: 100%;
  height: 40px;
  border: 1px solid #ccc;
  border-radius: 4px;
  transition: all 0.2s;
}

.theme-preview.selected {
  border: 2px solid var(--accent-color, #66c0f4);
  box-shadow: 0 0 0 2px rgba(102, 192, 244, 0.2);
}

.theme-name {
  font-size: 12px;
  color: #999;
  transition: color 0.2s;
}

.theme-name.selected {
  color: var(--text-primary, #333);
  font-weight: 600;
}

.setting-progress {
  padding: 10px 0;
}

.progress-slider-wrapper {
  margin-bottom: 10px;
}

.progress-slider {
  width: 100%;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: linear-gradient(to right, #66c0f4 0%, #66c0f4 var(--progress, 0%), #ddd var(--progress, 0%), #ddd 100%);
  outline: none;
  border-radius: 2px;
}

.progress-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: white;
  border: 1px solid #ddd;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
  cursor: pointer;
}

.progress-slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: white;
  border: 1px solid #ddd;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
  cursor: pointer;
}

.progress-slider:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.progress-text {
  text-align: center;
  font-size: 14px;
  color: var(--text-primary, #333);
}

.catalog-panel {
  position: absolute;
  top: 0;
  left: 0;
  width: 80%;
  height: 100%;
  background: white;
  z-index: 101;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
}

.catalog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.catalog-header h4 {
  margin: 0;
  font-size: 18px;
  color: var(--text-primary, #333);
}

.btn-close-catalog {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--text-secondary, #666);
  padding: 4px 8px;
  border-radius: 4px;
  transition: background 0.2s;
}

.btn-close-catalog:hover {
  background: rgba(0, 0, 0, 0.05);
}

.catalog-content {
  flex: 1;
  overflow-y: auto;
  padding: 10px 0;
}

.catalog-item {
  padding: 15px 20px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  cursor: pointer;
  transition: background 0.2s;
}

.catalog-item:hover {
  background: rgba(0, 0, 0, 0.02);
}

.catalog-text {
  font-size: 14px;
  color: var(--text-primary, #333);
  line-height: 1.6;
}

.catalog-loading {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary, #666);
}

.catalog-mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 100;
}

/* 过渡动画 */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.3s ease;
}

.slide-up-enter-from {
  transform: translateY(100%);
}

.slide-up-leave-to {
  transform: translateY(100%);
}

.slide-right-enter-active,
.slide-right-leave-active {
  transition: transform 0.3s ease;
}

.slide-right-enter-from {
  transform: translateX(-100%);
}

.slide-right-leave-to {
  transform: translateX(-100%);
}
</style>
