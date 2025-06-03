<template>
  <div class="group-detail-container">
    <div class="group-detail-card">
      <!-- 群头像与基本信息 -->
      <div class="group-header">
        <el-avatar :src="fullAvatarUrl(group.avatar)" size="large" class="group-avatar" />
        <div class="group-basic-info">
          <h2>{{ group.name }}</h2>
          <p>群ID: {{ group.id }}</p>
        </div>
      </div>

      <!-- 我的群昵称 -->
      <div class="group-info">
        <div class="info-item">
          <span class="info-label">我的群昵称:</span>
          <span class="info-value">{{ group.myNickname || "无" }}</span>
        </div>
      </div>

      <!-- 群成员头像展示 -->
      <div class="group-members">
        <div class="members-header">
          <span>群成员 ({{ group.memberCount }}人)</span>
        </div>
        <div class="member-avatars">
          <el-avatar
            v-for="(member, index) in displayedMembers"
            :key="index"
            :src="fullAvatarUrl(member.avatar)"
            size="small"
            class="member-avatar"
          />
          <span v-if="hiddenMemberCount > 0" class="more-members">+{{ hiddenMemberCount }}</span>
        </div>
      </div>

      <!-- 发消息按钮 -->
      <div class="group-actions">
        <el-button type="primary" @click="sendMessage" :loading="isSendingMessage">发消息</el-button>
      </div>
    </div>
  </div>
</template>

<script>
import api from '@/api';
import Formatter from '@/format';

export default {
  name: 'GroupDetail',
  props: {
    id: {
      type: Number,
      required: true
    }
  },
  data() {
    return {
      group: {
        id: 1001,
        name: '前端技术交流群',
        avatar: 'https://cube.elemecdn.com/3/7c/3ea6beec2825f8905f2bc14b936aapng.png',
        myNickname: '开发者',
        memberCount: 28,
        memberAvatars: [
          { avatar: 'https://cube.elemecdn.com/3/7c/3ea6beec2825f8905f2bc14b936aapng.png' },
          { avatar: 'https://cube.elemecdn.com/0/88/03b0d321651ef5e219b4a7743e89bpng.png' },
          { avatar: 'https://cube.elemecdn.com/f/f3/79a3d02c194227f719923bb159b7apng.png' },
          { avatar: 'https://cube.elemecdn.com/f/f3/79a3d02c194227f719923bb159b7apng.png' },
          { avatar: 'https://cube.elemecdn.com/3/7c/3ea6beec2825f8905f2bc14b936aapng.png' }
        ]
      },
      isSendingMessage: false
    };
  },
  computed: {
    displayedMembers() {
      return this.group.memberAvatars.slice(0, 4);
    },
    hiddenMemberCount() {
      return Math.max(this.group.memberCount - 4, 0);
    }
  },
  watch: {
    "$route.params.id": {
      immediate: true,
      handler(newId) {
        if (newId) {
          this.fetchGroupDetail(newId);
        }
      },
    },
  },
  methods: {
    fullAvatarUrl(url) {
      return Formatter.fullFileUrl(url);
    },
    fetchGroupDetail(groupId) {
      console.log(groupId);
      api.get(`/rooms/${this.id}`)
        .then((response) => {
          this.group = response.data.data.group;
        })
        .catch((error) => {
          console.error("获取群详情失败:", error);
        });
    },
    sendMessage() {
      if (this.isSendingMessage) return;
      this.isSendingMessage = true;

      api.post("/sessions", {
        type: "group",
        targetId: this.group.id
      }).then(response => {
        const sessionId = response.data.data.sessionId;
        this.$router.push({
          name: 'chat',
          query: {
            highlight: sessionId,
            targetId: this.group.id
          }
        });
      }).catch(error => {
        console.error("创建会话失败:", error);
        this.$message.error("创建会话失败");
      }).finally(() => {
        this.isSendingMessage = false;
      });
    }
  }
};
</script>

<style scoped>
/* 页面容器 */
.group-detail-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  padding: 20px;
}

/* 卡片样式 */
.group-detail-card {
  width: 400px;
  max-width: 90%;
  border: none;
  box-shadow: none;
  padding: 20px;
  background-color: #fff;
  border-radius: 8px;
}

/* 群头像与基础信息 */
.group-header {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
}

.group-avatar {
  margin-right: 15px;
}

.group-basic-info h2 {
  margin: 0 0 5px 0;
  font-size: 18px;
}

/* 群信息项 */
.group-info {
  margin-bottom: 20px;
}

.info-item {
  display: flex;
  margin-bottom: 10px;
}

.info-label {
  width: 100px;
  font-weight: bold;
}

.info-value {
  flex-grow: 1;
}

/* 群成员区域 */
.group-members {
  margin-bottom: 20px;
}

.members-header {
  font-weight: bold;
  margin-bottom: 8px;
}

.member-avatars {
  display: flex;
  align-items: center;
}

.member-avatar {
  margin-right: -10px;
  border: 2px solid #fff;
}

.more-members {
  margin-left: 8px;
  font-weight: bold;
  color: #333;
}

/* 操作按钮区域 */
.group-actions {
  display: flex;
  justify-content: center;
}

.el-button {
  width: 100%;
}
</style>