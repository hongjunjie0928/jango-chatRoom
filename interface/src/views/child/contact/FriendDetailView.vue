<template>
  <div class="contact-detail-container">
    <div class="contact-detail-card">
      <div class="contact-header">
        <el-avatar
          :src="fullAvatarUrl(contact.avatar)"
          size="large"
          class="contact-avatar"
        />
        <div class="contact-basic-info">
          <h2>{{ contact.nickname }}</h2>
          <p>{{ contact.email }}</p>
        </div>
        <div class="more-actions">
          <el-popover
            placement="bottom-end"
            width="160"
            v-model="moreActionsVisible"
          >
            <p @click="openEditRemarkDialog">修改备注</p>
            <el-button slot="reference" icon="el-icon-more" circle></el-button>
          </el-popover>
        </div>
      </div>
      <div class="contact-status">
        <span :class="['status', contact.isOnline ? 'online' : 'offline']">
          {{ contact.isOnline ? "在线" : "离线" }}
        </span>
      </div>
      <div class="contact-info">
        <div class="info-item">
          <span class="info-label">备注:</span>
          <span class="info-value">{{ contact.remark || "无" }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">手机号:</span>
          <span class="info-value">{{ contact.phone || "无" }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">共同群聊数:</span>
          <span class="info-value">{{ contact.common_room_count || 0 }}</span>
        </div>
      </div>
      <div class="contact-actions">
        <el-button type="primary" @click="sendMessage" :loading="isSendingMessage">发消息</el-button>
      </div>
    </div>

    <!-- 修改备注对话框 -->
    <el-dialog
      title="修改备注"
      :visible.sync="editRemarkDialogVisible"
      width="30%"
    >
      <el-form>
        <el-form-item label="备注">
          <el-input v-model="newMark" placeholder="请输入备注"></el-input>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="editRemarkDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveRemark">保存</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import Formatter from "@/format";
import api from "@/api";
import "@/event-bus";

export default {
  props: {
    id: Number,
  },
  data() {
    return {
      contact: {
        id: null,
        name: "",
        avatar: "",
        email: "",
        isOnline: false,
        remark: "",
        sharedGroups: [],
        phone: "",
        common_room_count: 0,
      },
      newMark: "",
      moreActionsVisible: false,
      editRemarkDialogVisible: false,
      isSendingMessage: false, // 新增：发送消息锁
    };
  },
  watch: {
    "$route.params.id": {
      immediate: true,
      handler(newId) {
        if (newId) {
          this.fetchContactDetail(newId);
        }
      },
    },
  },
  mounted() {
    this.$bus.$on("user-info-updated", (message) =>
      this.handleUserInfoUpdated(message.body)
    );
    this.$bus.$on("user-status-updated", this.handleUserStatusUpdated);
  },
  beforeDestroy() {
    this.$bus.$off("user-status-updated", this.handleUserStatusUpdated);
    this.$bus.$off("user-info-updated", this.handleUserInfoUpdated);
  },
  methods: {
    fullAvatarUrl(url) {
      return Formatter.fullFileUrl(url);
    },
    fetchContactDetail() {
      api
        .get(`/friends/${this.id}`)
        .then((response) => {
          this.contact = response.data.data;
        })
        .catch((error) => {
          console.error("获取好友详情失败:", error);
        });
    },
    handleUserInfoUpdated(userData) {
      if (!userData || !this.contact || this.contact.id !== userData.userId) {
        return;
      }

      this.$set(this.contact, "avatar", userData.avatar);
      this.$set(this.contact, "nickname", userData.nickname);
      this.$set(this.contact, "email", userData.email);
      this.$set(this.contact, "phone", userData.phone);
      this.$set(this.contact, "common_room_count", userData.common_room_count);
    },
    sendMessage() {
      if (this.isSendingMessage) return; // 锁定防止重复点击
      this.isSendingMessage = true;

      api
        .post("/sessions", {
          type: "private",
          targetId: this.contact.id,
        })
        .then((response) => {
          const sessionId = response.data.data.sessionId;
          this.$router.push({
            name: "chat",
            query: {
              highlight: sessionId,
              targetId: this.contact.id,
            },
          });
        })
        .catch((error) => {
          console.error("创建会话失败:", error);
          this.$message.error("创建会话失败");
        })
        .finally(() => {
          this.isSendingMessage = false; // 解锁
        });
    },
    openEditRemarkDialog() {
      this.editRemarkDialogVisible = true;
    },
    saveRemark() {
      api
        .put(`/friends/${this.id}`, { remark: this.newMark })
        .then((response) => {
          this.contact.remark = response.data.data.remark;
          this.newMark = "";
          this.$message.success("备注修改成功");
          this.editRemarkDialogVisible = false;

          this.$bus.$emit("friend-updated", {
            friendId: this.id,
            id: response.data.data.id,
            remark: response.data.data.remark,
            username: response.data.data.username,
            avatar: this.contact.avatar,
          });
        })
        .catch((error) => {
          console.error("修改备注失败:", error);
          this.$message.error("备注修改失败");
        });
    },
    handleUserStatusUpdated(userData) {
      if (userData?.userId === this.contact.id) {
        this.contact.isOnline = userData.status === "online";
      }
    },
  },
};
</script>

<style scoped>
/* 原有样式不变 */
.contact-detail-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  padding: 20px;
}

.contact-detail-card {
  width: 400px;
  max-width: 90%;
  border: none;
  box-shadow: none;
  padding: 20px;
  background-color: #fff;
  border-radius: 8px;
}

.contact-header {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
}

.contact-avatar {
  margin-right: 15px;
}

.contact-basic-info h2 {
  margin: 0 0 5px 0;
  font-size: 18px;
}

.contact-status {
  margin-bottom: 15px;
}

.status {
  font-size: 14px;
  font-weight: bold;
}

.status.online {
  color: #52c41a;
}

.status.offline {
  color: #999;
}

.contact-info {
  margin-bottom: 20px;
}

.info-item {
  display: flex;
  margin-bottom: 10px;
}

.info-label {
  width: 80px;
  font-weight: bold;
}

.info-value {
  flex-grow: 1;
}

.contact-actions {
  display: flex;
  justify-content: center;
}

.el-button {
  width: 100%;
}

.more-actions {
  margin-left: auto;
}
</style>