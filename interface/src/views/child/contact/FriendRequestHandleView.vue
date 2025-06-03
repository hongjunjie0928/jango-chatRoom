<!-- FriendRequestHandleView -->
<!-- 好友申请处理 -->
<template>
  <div class="friend-request-handle-view">
    <!-- 添加后退按钮 -->
    <el-button class="back-button" icon="el-icon-back" @click="goBackToList"
      >返回</el-button
    >

    <div class="request-card">
      <div class="content-wrapper">
        <div class="user-info">
          <el-row>
            <el-col :span="24">
              <div class="user-info-inner">
                <el-avatar
                  :src="fullAvatarUrl(request.from_user.avatar)"
                  size="large"
                  class="user-avatar"
                />
                <div class="user-details">
                  <div class="user-name">{{ request.from_user.nickname }}</div>
                  <div class="request-time">
                    申请时间: {{ request.created_at }}
                  </div>
                </div>
              </div>
            </el-col>
          </el-row>
        </div>
        <div v-if="request.message" class="request-message">
          <div class="message-label">备注</div>
          <p class="message-text">{{ request.message }}</p>
        </div>
        <div class="action-buttons">
          <el-button type="primary" @click="showAddFriendInfo = true"
            >同意</el-button
          >
          <el-button type="danger" @click="rejectRequest">拒绝</el-button>
        </div>
      </div>

      <!-- 添加好友信息面板 -->
      <el-dialog
        title="通过朋友验证"
        :visible.sync="showAddFriendInfo"
        width="50%"
        :show-close="false"
      >
        <el-form ref="friendForm" :model="friendInfo" label-width="80px">
          <el-form-item label="备注">
            <el-input v-model="friendInfo.remark" type="text" />
          </el-form-item>
        </el-form>
        <span slot="footer" class="dialog-footer">
          <div style="text-align: center">
            <el-button @click="showAddFriendInfo = false">取消</el-button>
            <el-button type="primary" @click="submitFriendInfo">提交</el-button>
          </div>
        </span>
      </el-dialog>
    </div>
  </div>
</template>
  
  <script>
import api from "@/api";
import Formatter from "@/format";
export default {
  name: "FriendRequestHandleView",
  props: {
    requestId: {
      type: Number,
      required: true,
    },
  },
  computed:{
    realRemark(){
      return this.friendInfo.remark.trim() === '' ? null : this.friendInfo.remark;
    }
  },
  data() {
    return {
      request: {},
      showAddFriendInfo: false,
      friendInfo: {
        remark: "",
      },
    };
  },
  created() {
    this.fetchRequestDetails();
  },
  methods: {
    fetchRequestDetails() {
      (this.request = this.$route.params.data
        ? JSON.parse(this.$route.params.data)
        : null),
        console.log("FriendRequestHandleView:" + this.request);
    },
    // 拼接头像全路径
    fullAvatarUrl(url) {
      return Formatter.fullFileUrl(url)
    },

    rejectRequest() {
      api
        .put("/friends/request/" + this.request.id, {
          action: "reject",
        })
        .then(() => {
          this.$message.error("已拒绝好友申请");
          this.updateRequestStatus("已拒绝");
        })
        .catch((error) => {
          console.log(error);
        });
    },
    updateRequestStatus(status) {
      // 模拟更新好友申请状态
      // 实际应用中，这里应该是通过 API 调用更新状态
      this.request.status = status;
      this.goBackToList();
    },
    goBackToList() {
      // 检查当前路由是否是目标路由
      if (this.$route.name !== "friendRequests") {
        this.$router.push({ name: "friendRequests" }).catch((err) => {
          // 忽略重复导航错误
          if (err.name !== "NavigationDuplicated") {
            // 其他错误仍然需要处理
            console.error(err);
          }
        });
      }
    },
    // 同意申请
    submitFriendInfo() {
      api
        .put("/friends/request/" + this.request.id, {
          action: "accept",
          remark: this.realRemark
        })
        .then(() => {
          // 处理补充好友信息的逻辑
          this.$message.success("已同意好友申请，并补充了好友信息");
          this.updateRequestStatus("已通过");
          this.showAddFriendInfo = false;
        })
        .catch((error) => {
          console.log(error);
        });
    },
  },
};
</script>
  
  <style scoped>
.friend-request-handle-view {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  padding: 0 20px;
  position: relative;
}

.back-button {
  position: absolute;
  top: 20px;
  left: 20px;
}

.request-card {
  width: 50%;
  max-width: 500px;
  border: none;
  box-shadow: none;
  padding: 20px;
  background-color: #fff;
  border-radius: 4px;
}

.content-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.user-info {
  width: 100%;
  margin-bottom: 20px;
}

.user-info-inner {
  display: flex;
  align-items: center;
  justify-content: center;
}

.user-avatar {
  margin-right: 15px;
}

.user-details {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-weight: bold;
  font-size: 18px;
  margin-bottom: 5px;
}

.request-time {
  color: #606266;
  font-size: 14px;
}

.request-message {
  width: 100%;
  margin-bottom: 20px;
}

.message-label {
  font-weight: bold;
  margin-bottom: 5px;
}

.message-text {
  padding: 15px;
  background-color: #f9f9f9;
  border-radius: 4px;
}

.action-buttons {
  width: 100%;
  text-align: center;
}

.action-buttons .el-button {
  margin: 0 10px;
}
</style>