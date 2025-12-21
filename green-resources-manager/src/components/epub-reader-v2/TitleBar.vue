<template>
   <transition name="slide-down">
            <div class="title-wrapper" v-show="ifTitleAndMenuShow">
                <div class="left">
                    <span class="icon-back icon" @click="handleBack"></span>
                </div>
                <div class="right">
                    <div class="icon-wrapper">
                        <span class="icon-cart icon"></span>
                    </div>
                    <div class="icon-wrapper">
                        <span class="icon-person icon"></span>
                    </div>
                    <div class="icon-wrapper">
                        <span class="icon-more icon"></span>
                    </div>
                </div>
            </div>
     </transition>
</template>
<script>
export default {
    props:{
        ifTitleAndMenuShow :{
            type:Boolean,
            default:false
        }
    },
    methods: {
        handleBack() {
            this.$emit('close')
        }
    }
}
</script>

<style scoped lang='scss'>
@import '../../styles/epub-reader-v2/global';
     .title-wrapper{
        position: absolute;
        display: flex;
        top: 0;
        left: 0;
        width: 100%;
        height:px2rem(48);
        z-index: 10;
        background: white;
        box-shadow: 0 px2rem(8) px2rem(8) rgba(0,0,0,.15);
        .left{
            flex:0 0 px2rem(60);
            @include center;
            cursor: pointer;
        }
        .right{
            flex: 1;
            display: flex;
            justify-content: flex-end;
            .icon-wrapper{
                flex: 0 0 px2rem(48);
                @include center;
                cursor: pointer;
                .icon {
                    font-size: px2rem(28);
                }
                .icon-Cart{
                    font-size: px2rem(28);
                }
            }
        }
    }
</style>

