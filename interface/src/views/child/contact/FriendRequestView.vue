<!-- ChatListView.vue -->
<template>
  <div class="friend-requests-container">
    <!-- 添加新的朋友标题块 -->
    <div class="friend-requests-title">新的朋友</div>

    <!-- 使用标签页切换显示发送的申请和收到的申请 -->
    <el-row>
      <el-col :span="4">
        <!-- 标签页 -->
        <el-tabs v-model="activeTab" tab-position="left" class="demo-tabs">
          <el-tab-pane label="我发送的申请" name="sent"> </el-tab-pane>
          <el-tab-pane label="我收到的申请" name="received"> </el-tab-pane>
        </el-tabs>
      </el-col>
      <el-col :span="20">
        <!-- 我发送的卡片展示区域 -->
        <div v-if="activeTab === 'sent'">
          <el-card
            v-for="request in sentRequests"
            :key="request.id"
            class="friend-request-card"
          >
            <div class="card-content">
              <!-- 用户信息和备注 -->
              <div class="user-info-container">
                <el-avatar
                  :src="fullAvatarUrl(request.to_user.avatar)"
                  size="large"
                  shape="square"
                  class="user-avatar"
                />
                <div class="user-info">
                  <div class="request-name">{{ request.to_user.nickname }}</div>
                  <div class="request-message" :title="request.message">
                    {{ request.message }}
                  </div>
                </div>
              </div>

              <!-- 状态 -->
              <div
                class="request-status"
                :class="getStatusClass(request.status)"
              >
                {{ request.status_display }}
              </div>
            </div>
          </el-card>
        </div>
        <!-- 我收到的申请 -->
        <div v-else>
          <el-card
            v-for="request in receivedRequests"
            :key="request.id"
            class="friend-request-card"
            @click.native="navigateToRequestDetail(request)"
          >
            <div class="card-content">
              <!-- 用户信息和备注 -->
              <div class="user-info-container">
                <el-avatar
                  :src="fullAvatarUrl(request.from_user.avatar)"
                  size="medium"
                  class="user-avatar"
                />
                <div class="user-info">
                  <div class="request-name">
                    {{ request.from_user.nickname }}
                  </div>
                  <div class="request-message" :title="request.message">
                    {{ request.message }}
                  </div>
                </div>
              </div>
              <!-- TODO 需要通过websocket通知修改状态 -->
              <!-- 状态 -->
              <div
                class="request-status"
                :class="getStatusClass(request.status)"
              >
                {{ request.status_display }}
              </div>
            </div>
          </el-card>
        </div>
      </el-col>
    </el-row>
  </div>
</template>
<script>
import api from "@/api";
import Formatter from "@/format";

export default {
  data() {
    return {
      // 当前选中的标签页
      activeTab: "received", // 默认显示收到的申请

      // 好友申请列表
      friends: [],
      receivedRequests: [],
      sentRequests: [],
    };
  },

  mounted() {
    // 调用 API 获取好友申请
    this.fetchSentRequests();
    this.fetchReceivedRequests();
  },

  methods: {
    // 获取发送的申请
    fetchSentRequests() {
      api
        .get("/friends/request?type=sent")
        .then((response) => {
          if (response.data.code === 0) {
            this.sentRequests = response.data.data.requests;
          } else {
            console.error("获取发送的申请失败:", response.data.message);
          }
        })
        .catch((error) => {
          console.error("获取发送的申请失败:", error);
        });
    },

    // 获取收到的申请
    fetchReceivedRequests() {
      api
        .get("/friends/request?type=received")
        .then((response) => {
          if (response.data.code === 0) {
            this.receivedRequests = response.data.data.requests;
          } else {
            console.error("获取收到的申请失败:", response.data.message);
          }
        })
        .catch((error) => {
          console.error("获取收到的申请失败:", error);
        });
    },

    // 拼接头像全路径
    fullAvatarUrl(url) {
      
      return Formatter.fullFileUrl(url)
    },

    // 导航到好友申请详情页面
    navigateToRequestDetail(request) {
      if (request.status === 0) {
        this.$router.push({
          name: "handleFriendRequest",
          params: { id: request.id ,data: JSON.stringify(request)}, // 注意参数名与路由配置匹配
        });
      }
    },

    // 根据申请状态获取对应的状态类名
    getStatusClass(status) {
      if (status === 0) {
        // 假设0代表待处理
        return "status-pending";
      } else if (status === 1) {
        // 假设1代表已通过
        return "status-approved";
      } else {
        return "status-declined";
      }
    },
  },
};
</script>

<style scoped>
/* 添加新的朋友标题的样式 */
.friend-requests-title {
  margin: 0 0 20px;
  font-size: 22px;
  font-weight: bold;
  color: #333;
  text-align: left;
  padding: 15px 40px;
  border-bottom: 2px solid #ddd;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* 标签页样式 */
.demo-tabs {
  height: 100%;
}

/* 卡片展示区域样式 */
.friend-requests-container {
  width: 100%;
}

.friend-request-card {
  width: 100%;
  margin-bottom: 10px;
  cursor: pointer;
  transition: transform 0.2s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.friend-request-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.card-content {
  display: flex;
  align-items: center;
  width: 100%;
}

.user-info-container {
  display: flex;
  align-items: center;
  max-width: 60%;
}

.user-avatar {
  margin-right: 10px;
}

.user-info {
  display: flex;
  flex-direction: column;
}

.request-name {
  font-weight: bold;
  margin-bottom: 5px;
}

.request-message {
  color: #606266;
  font-size: 14px;
  text-overflow: ellipsis;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.request-status {
  margin-left: auto;
  padding: 0 15px;
  font-size: 13px;
}

.status-pending {
  color: #e6a23c;
  font-weight: bold;
}

.status-approved {
  color: #67c23a;
  font-weight: bold;
}

.status-declined {
  color: #f56c6c;
  font-weight: bold;
}
</style>
