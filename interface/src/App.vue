<template>
  <router-view/>
</template>

<script>
import store from './store';
export default {

  
  created() {

    // 添加页面关闭或刷新时的处理程序
    window.addEventListener('beforeunload', this.handleBeforeUnload);
    // 添加 visibilitychange 事件监听器
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    
    // 初始化页面可见状态
    this.isPageVisible = true;
  },
  beforeDestroy() {
    // 移除事件监听器
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  },
  data() {
    return {
      isPageVisible: true
    };
  },
  mounted(){
  },
  methods: {
    handleVisibilityChange() {
      // 当页面隐藏时（可能是切换标签页或最小化浏览器）
      this.isPageVisible = !document.hidden;
    },
    handleBeforeUnload(event) {
      // 如果页面不可见，说明是关闭而不是刷新
      if (!this.isPageVisible) {
        // 在页面关闭时清除 Vuex 和 localStorage 中的用户信息
        store.commit('CLEAR_USER_INFO');
      }
      
      // 注意：现代浏览器需要设置 returnValue 才能显示确认对话框
      // 如果你不需要显示确认对话框，可以移除下面这行
      event.returnValue = '';
    }
  }
}
</script>

<style>
body {
  height: 100vh;
  width: 100vw;
}
* {
  padding: 0;
  margin: 0;
}
</style>