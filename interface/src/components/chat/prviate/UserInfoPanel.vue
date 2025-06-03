<template>
  <div :class="['user-info-sidebar', { active: isUserInfoVisible }]">
    <!-- 遮罩层 -->
    <div class="overlay-mask" v-if="isFormDisabled" @click.stop></div>

    <!-- 加载指示器 -->
    <div class="loading-indicator" v-if="isFormDisabled">
      <div class="loading-icon">⏳</div>
      <span>处理中...</span>
    </div>

    <div class="user-info-content">
      <div class="user-info-header">
        <div class="avatar">
          <img
            v-if="user.avatar"
            :src="fullAvatarUrl(user.avatar)"
            alt="用户头像"
          />
          <div v-else class="avatar-placeholder">👤</div>
        </div>

        <div class="user-info-actions">
          <button
            class="create-group-btn"
            @click="showCreateGroupDialog"
            :disabled="isFormDisabled"
          >
            ➕ 创建群组
          </button>
        </div>

        <button
          class="user-info-close-btn"
          @click="closeUserInfo"
          :disabled="isFormDisabled"
        >
          ✕
        </button>
      </div>

      <div class="user-info-body">
        <div class="user-info-section">
          <h3 class="section-title">基本信息</h3>
          <div class="info-item">
            <span class="info-label">用户名:</span>
            <span class="info-value">{{ user.username || "未设置" }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">昵称:</span>
            <span class="info-value">{{ user.nickname || "未设置" }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">状态:</span>
            <span class="info-value">{{ userStatusMap[user.status] }}</span>
          </div>
        </div>

        <div class="user-info-section">
          <h3 class="section-title">联系信息</h3>
          <div class="info-item">
            <span class="info-label">邮箱:</span>
            <span class="info-value">{{ user.email || "未设置" }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">手机:</span>
            <span class="info-value">{{
              user.phone ? formatPhone(user.phone) : "未设置"
            }}</span>
          </div>
        </div>

        <div class="user-info-section" v-if="commonGroups.length > 0">
          <h3 class="section-title">共同群组({{ commonGroups.length }})</h3>
          <div class="group-list">
            <div
              class="group-item"
              v-for="group in commonGroups"
              :key="group.id"
              @click="!isFormDisabled && goToGroup(group.id)"
            >
              <div class="group-avatar">
                <img
                  v-if="group.avatar"
                  :src="fullAvatarUrl(group.avatar)"
                  alt="群组头像"
                />
                <div v-else class="avatar-placeholder">👥</div>
              </div>
              <span class="group-name">{{ group.name }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 创建群组对话框组件 -->
      <CreateGroupDialog
        :visible="createGroupDialogVisible"
        :currentUserId="id"
        :isFormDisabled="isFormDisabled"
        @update:visible="updateCreateGroupDialogVisibility"
        @submit="handleCreateGroup"
      />
    </div>
  </div>
</template>

<script>
import api from "@/api";
import Formatter from "@/format";
import CreateGroupDialog from "@/components/chat/prviate/CreateGroupDialog.vue";

export default {
  components: {
    CreateGroupDialog,
  },
  props: {
    id: {
      type: Number,
      required: true,
    },
    isUserInfoVisible: {
      type: Boolean,
      required: true,
    },
  },
  data() {
    return {
      user: {
        id: null,
        username: "",
        nickname: "",
        email: "",
        phone: "",
        avatar: "",
        status: 1,
      },
      userStatusMap: {
        0: "已禁用",
        1: "正常",
      },
      commonGroups: [],
      isFormDisabled: false,
      createGroupDialogVisible: false,
      isDataLoaded: false, // 是否已加载数据
      isLoading: false, // 请求锁
    };
  },
  methods: {
    // 拼接完整的头像URL地址
    fullAvatarUrl(url) {
      return Formatter.fullFileUrl(url);
    },

    // 格式化手机号码（隐藏中间四位）
    formatPhone(phone) {
      return phone.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2");
    },

    // 获取用户详细信息
    async getUserInfo(id) {
      try {
        const response = await api.get(`/users/${id}`);
        this.user = response.data.data || {};
      } catch (error) {
        console.error("获取用户信息失败:", error);
        this.$notify({
          title: "错误",
          message: "获取用户信息失败",
          type: "error",
        });
      }
    },

    // 显示创建群组对话框
    showCreateGroupDialog() {
      this.createGroupDialogVisible = true;
    },

    // 更新创建群组对话框的显示状态
    updateCreateGroupDialogVisibility(value) {
      this.createGroupDialogVisible = value;
    },

    // 处理创建群组提交
    async handleCreateGroup(groupData) {
      this.isFormDisabled = true;

      try {
        // 创建群组
        const groupResponse = await api.post("/rooms", groupData);
        const groupId = groupResponse.data.data.group_id;

        // 创建会话
        const sessionResponse = await api.post("/sessions", {
          type: "group",
          targetId: groupId
        });

        this.createGroupDialogVisible = false;
        this.$emit("group-created", sessionResponse.data.data);
        this.$notify({
          title: "成功",
          message: "群组和会话创建成功",
          type: "success",
        });
      } catch (error) {
        console.error("创建群组或会话失败:", error);
        const errorMsg = error.response?.data?.message || error.message || "创建失败";
        this.$notify({
          title: "错误",
          message: errorMsg,
          type: "error",
        });
      } finally {
        this.isFormDisabled = false;
      }
    },

    // 跳转到指定群组
    goToGroup(groupId) {
      this.$emit("navigate-to-group", groupId);
      this.closeUserInfo();
    },

    // 关闭用户信息侧边栏
    closeUserInfo() {
      if (!this.isFormDisabled) {
        this.$emit("update:isUserInfoVisible", false);
      }
    },
  },
  watch: {
    id: {
      immediate: true,
      handler(newId) {
        if (newId && !this.isDataLoaded) {
          this.isLoading = true;
          Promise.all([this.getUserInfo(newId)])
            .then(() => {
              this.isDataLoaded = true;
            })
            .finally(() => {
              this.isLoading = false;
            });
        }
      },
    },
    isUserInfoVisible: {
      handler(newVal) {
        if (newVal) {
          this.isDataLoaded = false;
        }
      },
    },
  },
};
</script>

<style scoped>
.user-info-sidebar {
  position: fixed;
  top: 0;
  right: -320px;
  width: 320px;
  height: 100%;
  background-color: white;
  box-shadow: -2px 0 10px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  transition: right 0.3s ease;
}

.user-info-sidebar.active {
  right: 0;
}

.overlay-mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.7);
  z-index: 1001;
  cursor: not-allowed;
}

.loading-indicator {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1002;
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #409eff;
}

.loading-icon {
  font-size: 32px;
  margin-bottom: 8px;
  animation: rotating 2s linear infinite;
}

@keyframes rotating {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.user-info-content {
  height: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  position: relative;
}

.user-info-header {
  display: flex;
  align-items: center;
  padding: 15px;
  border-bottom: 1px solid #e4e7ed;
  position: relative;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 4px;
  overflow: hidden;
  background-color: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  font-size: 24px;
}

.user-info-actions {
  margin-left: 15px;
}

.create-group-btn {
  padding: 7px 10px;
  background-color: #409eff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.create-group-btn:disabled {
  background-color: #a0cfff;
  cursor: not-allowed;
}

.user-info-body {
  padding: 15px;
  flex: 1;
  overflow-y: auto;
}

.user-info-section {
  margin-bottom: 20px;
}

.section-title {
  font-size: 16px;
  color: #303133;
  margin-bottom: 12px;
  padding-bottom: 5px;
  border-bottom: 1px solid #f0f0f0;
}

.info-item {
  display: flex;
  margin-bottom: 10px;
  font-size: 14px;
}

.info-label {
  color: #909399;
  width: 70px;
  flex-shrink: 0;
}

.info-value {
  color: #606266;
  word-break: break-word;
}

.group-list {
  margin-top: 10px;
}

.group-item {
  display: flex;
  align-items: center;
  padding: 8px 0;
  cursor: pointer;
  transition: background-color 0.2s;
}

.group-item:hover {
  background-color: #f5f7fa;
}

.group-avatar {
  width: 32px;
  height: 32px;
  border-radius: 4px;
  overflow: hidden;
  margin-right: 10px;
  background-color: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
}

.group-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.group-name {
  font-size: 14px;
}

.user-info-close-btn {
  position: absolute;
  right: 15px;
  top: 15px;
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #606266;
}

.user-info-close-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
</style>