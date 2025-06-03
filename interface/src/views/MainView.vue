<template>
  <el-container class="wechat-container">
    <!-- 左侧功能区 -->
    <el-aside class="function-panel" width="80px">
      <!-- 用户头像和信息 -->
      <div class="user-profile" @click="openUserPanel">
        <el-avatar
          icon="el-icon-user-solid"
          size="large"
          shape="circle"
          :src="fullAvatarUrl"
          fit="fill"
        ></el-avatar>

        <div class="user-info">
          <div class="user-name">{{ user.nickname }}</div>
          <div class="user-status">
            {{ isOnline }}
            <span
              class="status-indicator"
              :class="status ? 'online' : 'offline'"
            ></span>
          </div>
        </div>
      </div>

      <!-- 功能菜单 -->
      <el-menu
        class="function-menu"
        background-color="#2f4f7f"
        active-text-color="#ffffff"
        text-color="#ffffff"
      >
        <el-tooltip content="联系人" placement="right">
          <el-menu-item index="1" @click="switchToContacts">
            <i class="el-icon-user menu-icon"></i>
          </el-menu-item>
        </el-tooltip>

        <el-tooltip content="聊天" placement="right">
          <el-menu-item index="2" @click="switchToChats">
            <i class="el-icon-chat-line-square menu-icon"></i>
          </el-menu-item>
        </el-tooltip>

        <!-- 退出按钮放置到底部 -->
        <el-menu-item index="4" @click="logout" style="margin-top: auto">
          <i class="el-icon-switch-button menu-icon"></i>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <!-- 主内容区 -->
    <el-main class="main-content">
      <!-- 路由视图 -->
      <router-view></router-view>
    </el-main>
  </el-container>
</template>

<script>
import store from "@/store";
import api from "@/api";
import stompService from "@/stompService";
import Formatter from "@/format/index.js";
export default {
// MainView.vue
async created() {
  try {
    // 创建STOMP连接
    await stompService.connect(store.state.user.id);
    // 订阅用户状态更新
    stompService.subscribe("/topic/status", (message) => {
      console.log(message);
      this.$bus.$emit("user-status-updated",JSON.parse(message.body))
});
    // 订阅用户信息更新
    stompService.subscribe("/topic/user-info", (message) => {
      console.log(message);
      this.$bus.$emit("user-info-updated",JSON.parse(message.body))
    })
  } catch (error) {
    console.error("STOMP连接或订阅失败:", error);
  }
},

  // 初始化事件监听
  beforeDestroy() {
    stompService.unsubscribe("/topic/status")
    // 组件销毁时移除监听
    this.$bus.$off("user-info-updated");
    this.$bus.$off("user-status-updated")
  },
  data() {
    return {
      // 用户信息
      status: store.state.isAuthenticated,

      // 当前选中的聊天
      currentChat: null,
    };
  },
  computed: {
    user(){
      return store.state.user
    },
    // 获取完整路径
    fullAvatarUrl() {
      return Formatter.fullFileUrl(this.user.avatar);
    },
    // 判断是否在线
    isOnline() {
      return this.status ? "在线" : "离线";
    },
  },
  methods: {
    // 切换到联系人视图
    switchToContacts() {
      if (this.$route.path !== "/contacts") {
        this.$router.push("/contacts");
      }
    },

    // 切换到聊天视图
    switchToChats() {
      if (this.$route.path !== "/chat") {
        this.$router.push("/chat");
      }
    },
    // 退出登录
    logout() {
      this.$confirm("确定要退出登录吗？", "提示", {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      })
        .then(() => {
          // 发送退出请求
          api
            .post("/auth/logout")
            .then(() => {
              console.log("用户已退出");
              stompService.disconnect();
            })
            .catch((error) => {
              console.error("退出失败:", error);
              // 根据需要处理退出失败的逻辑
            });
          // 清除 Vuex 状态和本地缓存
          store.commit("CLEAR_USER_INFO");
          // 重定向到登录页面
          this.$router.push("/login");
        })
        .catch(() => {
          console.log("取消退出");
        });
    },
    // 打开用户信息面板
    openUserPanel() {
      if (this.$route.path !== "/me") {
        this.$router.push("/me");
      }
    },
  },
};
</script>

<style scoped>
.wechat-container {
  height: 100vh;
}

/* 左侧功能区样式 */
.function-panel {
  background-color: #2f4f7f;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 20px;
  position: relative; /* 为绝对定位的用户面板提供定位上下文 */
}

.user-profile {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 20px;
  width: 80%; /* 设置用户信息区域的宽度 */
  cursor: pointer; /* 添加鼠标悬停效果，表示可点击 */
}

.user-avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  margin-bottom: 10px;
}

.user-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%; /* 用户信息区域占满父容器 */
}

.user-name {
  font-size: 12px;
  margin: 0;
  color: white;
  white-space: nowrap; /* 防止换行 */
  overflow: hidden; /* 隐藏溢出内容 */
  text-overflow: ellipsis; /* 超出部分用省略号表示 */
  width: 80%; /* 用户名不超过外框的80% */
  text-align: center; /* 居中对齐 */
}

.user-status {
  font-size: 10px;
  color: #ccc;
  display: flex;
  align-items: center;
  justify-content: center; /* 水平居中对齐 */
  width: 100%; /* 状态栏占满父容器 */
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-left: 5px;
}

.status-indicator.online {
  background-color: #4caf50;
}

.status-indicator.offline {
  background-color: #f44336;
}

.function-menu {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  border: none; /* 去除边框 */
  padding: 0;
  margin: 0;
}

.el-menu-item {
  margin-bottom: 5px;
  background-color: transparent !important;
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  border: none; /* 去除边框 */
}

.menu-icon {
  font-size: 20px;
  color: white;
}

.el-menu-item:hover {
  background-color: rgba(255, 255, 255, 0.1) !important;
  border: none; /* 去除边框 */
}

/* 主内容区样式 */
.main-content {
  display: flex;
  height: 100%;
  padding: 0;
}
</style>