<template>
  <div class="ebook">
      <title-bar :ifTitleAndMenuShow="ifTitleAndMenuShow" @close="handleClose"></title-bar>
      <div class="read-wrapper">
          <div id="read"></div>
          <div class="mask">
              <div class="left" @click="prevPage"></div>
              <div class="center" @click="toggleTitleAndMenu"></div>
              <div class="right" @click="nextPage"></div>
          </div>
      </div>
        <menu-bar :ifTitleAndMenuShow="ifTitleAndMenuShow" 
                @getCurrentLocation="getCurrentLocation"
                :fontSizeList = "fontSizeList" 
                :defaultFontSize="defaultFontSize"
                @setFontSize="setFontSize" 
                :themeList="themeList" 
                :defaultTheme="defaultTheme"
                @setTheme = "setTheme" 
                :bookAvailable = "bookAvailable" 
                @onProgressChange = "onProgressChange"
                @jumpTo="jumpTo"
                :navigation = "navigation"
                :parentProgress = "progress"
                ref="menuBar">
        </menu-bar>
  </div>
</template>
<script>
import TitleBar from './TitleBar.vue'
import MenuBar from './MenuBar.vue'
import ePub from 'epubjs'

export default {
    components:{
        TitleBar,
        MenuBar
    },
    props: {
        filePath: {
            type: String,
            required: true
        }
    },
    data(){
        return{
            ifTitleAndMenuShow:false,
            fontSizeList:[
                {
                    fontSize:12
                },
                {
                    fontSize:14
                },
                {
                    fontSize:16
                },
                {
                    fontSize:18
                },
                {
                    fontSize:20
                },
                {
                    fontSize:22
                },
                {
                    fontSize:24
                }
            ],
            defaultFontSize:16,
            themeList:[{
                name:'default',
                style:{
                    body:{
                        'color':'#000',
                        'background':'#fff'
                    }
                }
            },{
                name:'eye',
                style:{
                    body:{
                        'color':'#000',
                        'background':'#ceeaba'
                    }
                }
            },{
                name:'night',
                style:{
                    body:{
                        'color':'#fff',
                        'background':'#000'
                    }
                }
            },{
                name:'gold',
                style:{
                    body:{
                        'color':'#000',
                        'background': 'rgb(238, 232, 170)'
                    }
                }
            }],
            defaultTheme: 0,
            bookAvailable :false,
            navigation: null,
            progress:0,
            book: null,
            rendition: null,
            themes: null,
            locations: null
        }
    },
    methods:{
        handleClose() {
            this.$emit('close')
        },
        getCurrentLocation(){
            if(this.rendition){
                this.showProgress()
            }
        },
        // 进度条跳转更新
        showProgress(){
            // 获取当前位置信息
            const currentLoction = this.rendition.currentLocation()
            // 获取当前位置进度百分比
            this.progress = this.bookAvailable ? this.locations.percentageFromCfi(currentLoction.start.cfi) : 0
            // 转化成0-100的数字
            this.progress = Math.round(this.progress*100)
        },
        // 根据链接跳转到指定位置
        jumpTo(href){
            this.rendition.display(href).then(()=>{
                this.showProgress()
            })
            this.hideTitleAndMenu()
        },
        hideTitleAndMenu(){
            // 隐藏标题栏和菜单栏
            this.ifTitleAndMenuShow = false
            // 隐藏菜单栏弹出的设置栏
            this.$refs.menuBar.hideSetting()
            // 隐藏目录
            this.$refs.menuBar.hideContent()
        },
        onProgressChange(progress){
            const percentage = progress / 100
            const location = percentage > 0 ? this.locations.cfiFromPercentage(percentage) : 0
            this.rendition.display(location)
        },
        setTheme(index){
             this.themes.select(this.themeList[index].name);
             this.defaultTheme = index;
        },
        registerTheme(){
            this.themeList.forEach(theme=>{
                this.themes.register(theme.name,theme.style)
            })
        },
        setFontSize(fontSize){
            this.defaultFontSize = fontSize
            if(this.themes){
                this.themes.fontSize(fontSize + 'px')
            }
        },
        toggleTitleAndMenu(){
            this.ifTitleAndMenuShow = !this.ifTitleAndMenuShow
            if(!this.ifTitleAndMenuShow){
                this.$refs.menuBar.hideSetting()
            }
        },
        prevPage(){
            // Rendition.prev
            if(this.rendition){
                this.rendition.prev().then(()=>{
                   this.showProgress()
                })
            }
        },
        nextPage(){
            // Rendition.next
            if(this.rendition){
                this.rendition.next().then(()=>{
                   this.showProgress()
                })
            }
        },
        // 电子书的解析和渲染
        async showEpub(){
            try {
                // 使用传入的文件路径
                let epubUrl = this.filePath
                
                // 在 Electron 环境中，epubjs 可以直接使用文件路径
                // 如果路径已经是 URL 格式（file://, http://, https://），直接使用
                // 否则，尝试转换为 file:// URL
                if (epubUrl && !epubUrl.startsWith('http://') && !epubUrl.startsWith('https://') && !epubUrl.startsWith('file://')) {
                    // 转换为 file:// URL (Windows 路径处理)
                    epubUrl = epubUrl.replace(/\\/g, '/')
                    if (epubUrl.startsWith('/')) {
                        epubUrl = 'file://' + epubUrl
                    } else {
                        epubUrl = 'file:///' + epubUrl
                    }
                }
                
                console.log('加载 EPUB 文件:', epubUrl)
                
                // 生成book,Rendition,
                this.book = new ePub(epubUrl)
                this.rendition = this.book.renderTo('read',{
                    width:window.innerWidth,
                    height:window.innerHeight
                })
                // 通过Rendition.display渲染电子书
                this.rendition.display()
                // 获取Theme对象
                this.themes = this.rendition.themes
                // 设置默认字体
                this.setFontSize(this.defaultFontSize)
                // this.themes.register(name,styles)
                this.registerTheme()
                // this.themes.select(name)
                this.setTheme(this.defaultTheme)
                // 获取locations对象 epubjs的钩子函数实现
                this.book.ready.then(()=>{
                    this.navigation = this.book.navigation
                   
                    return this.book.locations.generate()
                }).then(result=>{
                    // console.log(result);
                    this.locations = this.book.locations
                    this.bookAvailable = true
                }).catch(error => {
                    console.error('加载 EPUB 失败:', error)
                })
            } catch (error) {
                console.error('初始化 EPUB 阅读器失败:', error)
            }
        }
    },
    mounted(){
        this.showEpub()
    },
    beforeUnmount() {
        // 清理资源
        if (this.rendition) {
            this.rendition.destroy()
        }
        if (this.book) {
            this.book.destroy()
        }
    }
}
</script>

<style scoped lang='scss'>
@import '../../styles/epub-reader-v2/global';
.ebook{
    position: relative;
    width: 100%;
    height: 100%;
    .read-wrapper{
        width: 100%;
        height: 100%;
        position: relative;
        .mask{
            position: absolute;
            display: flex;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 9;
            .left{
                flex: 0 0 px2rem(100);
                cursor: pointer;
            }
            .center{
                flex: 1;
                cursor: pointer;
            }
            .right{
                flex: 0 0 px2rem(100);
                cursor: pointer;
            }
        }
    }
}
</style>

