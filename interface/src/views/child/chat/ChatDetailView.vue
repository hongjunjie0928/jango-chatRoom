<template>
  <div class="chat-view">
    <!-- 左侧会话列表 -->
    <div class="chat-list">
      <div class="chat-list-header">
        <h3>会话列表</h3>
      </div>
      <div class="chat-items">
        <div
          v-for="(item, index) in chatItems"
          :key="item.session_id"
          class="chat-item"
          :class="{ active: selectedIndex === index }"
          @click="selectChat(index, item)"
        >
          <div class="chat-item-avatar">
            <el-avatar
              icon="el-icon-user-solid"
              size="large"
              shape="square"
              :src="fullAvatarUrl(item.target.avatar)"
              fit="fill"
            ></el-avatar>
            <div v-if="item.unread_count > 0" class="unread-count">
              {{ item.unread_count > 99 ? "99+" : item.unread_count }}
            </div>
          </div>
          <div class="chat-item-content">
            <div class="chat-item-name">{{ item.target.name }}</div>
            <div class="chat-item-preview">
              <template
                v-if="
                  item.type === 2 &&
                  item.last_message &&
                  item.last_message.sender_id !== user.id
                "
              >
                {{ item.last_message.sender_name }}:{{
                  item.last_message.content_preview
                }}
              </template>
              <template v-else>
                {{ item.last_message ? item.last_message.content_preview : "" }}
              </template>
            </div>
          </div>
          <div v-if="item.last_message" class="chat-item-time">
            {{ formateDate(item.last_message.created_at) }}
          </div>
        </div>


      </div>
    </div>

    <!-- 右侧聊天区域 -->
    <div class="chat-area">
      <div v-if="loading" class="loading-chat">
        <i class="el-icon-loading"></i>
        加载聊天中...
      </div>
      <template v-else>
        <div v-if="currentChat && shouldRenderChat" class="chat-detail">
          <keep-alive>
            <component
              :is="currentChatComponent"
              :sessionId="currentChat.session_id"
              :target="currentChat.target"
              :key="currentChatKey"
            />
          </keep-alive>
        </div>
        <div v-else class="chat-placeholder">
          <div class="chat-placeholder-icon">
            <i class="el-icon-chat-line-round"></i>
          </div>
          <div class="chat-placeholder-text">选择一个会话开始聊天</div>
        </div>
      </template>
    </div>
  </div>
</template>

<script>
import PrivateChat from "@/components/chat/prviate/PrviateChat.vue";
import GroupChat from "@/components/chat/group/GroupChat.vue";
import Formatter from "@/format";
import api from "@/api";
import store from "@/store";
import _ from "lodash"; // 引入 lodash
import stompService from "@/stompService";

export default {
  components: {
    PrivateChat,
    GroupChat,
  },
  data() {
    return {
      user: store.state.user,
      chatItems: [],
      selectedIndex: -1,
      currentChat: null,
      loading: false,
      shouldRenderChat: false,
      loadTimer: null,
      highlightSessionId: null,
      targetUserId: null,
      isSessionLoaded: false, // 新增：标记会话是否已加载
    };
  },
  computed: {
    currentChatComponent() {
      return this.currentChat.type === "group" ? "GroupChat" : "PrivateChat";
    },
    currentChatKey() {
      return `${this.currentChat?.session_id}_${Date.now()}`;
    },
  },
  mounted() {
    console.log("【ChatDetailView】开始订阅 /topic/session");

    stompService.subscribe("/topic/session", (message) => {
      console.log("【STOMP】回调触发 - 开始处理消息");
      console.log(message);
      try {
        let bodyStr = "";

        if (message.isBinaryBody && message.binaryBody) {
          const decoder = new TextDecoder("utf-8");
          bodyStr = decoder.decode(message.binaryBody);
          console.log(bodyStr);
        } else if (message.body) {
          bodyStr = message.body;
        } else {
          throw new Error("消息内容为空");
        }

        const parsed = JSON.parse(bodyStr.trim());
        console.log("✅ 成功解析消息:", parsed);

        this.$bus.$emit("message-update", parsed);
      } catch (e) {
        console.error("❌ 消息解析失败:", e, message);
      }
    });

    // 注册 message-update 监听器
    this.messageUpdateHandler = (message) => {
      console.log("【message-update触发】接收到的消息:", message);
      this.handleMessageUpdate(message);
    };
    this.$bus.$on("message-update", this.messageUpdateHandler);

    this.parseRouteQuery();
    this.loadSessions();
  },
  beforeDestroy() {
    console.log("【ChatDetailView】组件即将销毁，取消订阅");
    stompService.unsubscribe("/topic/session");
    if (this.messageUpdateHandler) {
      this.$bus.$off("message-update", this.handleMessageUpdate);
    }
  },

  methods: {
    handleMessageUpdate(message) {
      console.log("【handleMessageUpdate】开始处理消息");
      console.log("收到的 message:", message);

      const {
        sessionId,
        messageId,
        sender_id,
        sender_name,
        sender_nickname,
        sender_avatar,
        content_type,
        content_type_display,
        content,
        status,
        status_display,
        file_info,
        created_at,
      } = message;
      const currentUserId = this.user.id;
      console.log("当前用户ID:", currentUserId);
      console.log("消息发送者ID:", sender_id);
      console.log("会话ID:", sessionId);
      // 查找对应的 chatItem
      const index = this.chatItems.findIndex(
        (item) => item.session_id === sessionId
      );

      if (index === -1) {
        console.warn("⚠️ 未找到匹配的 chatItem，终止更新");
        return;
      }
      console.log(`✅ 找到 chatItem，索引: ${index}`, this.chatItems[index]);
      // 构建 last_message 对象
      const lastMessage = {
        id: messageId,
        sender_id,
        sender_name,
        sender_nickname,
        sender_avatar,
        content_type,
        content,
        content_preview: this.generateContentPreview({
          content_type,
          content,
          content_type_display,
          file_info,
        }),
        created_at,
        status,
        status_display,
      };

      console.log("构建的 last_message:", lastMessage);
      // 使用 $set 更新响应式字段
      this.$set(this.chatItems[index], "last_message", lastMessage);
      console.log("✅ 已通过 $set 更新 last_message");
      if (this.highlightSessionId != sessionId) {
        if (sender_id !== currentUserId) {
          const newUnreadCount = this.chatItems[index].unread_count + 1;
          this.$set(this.chatItems[index], "unread_count", newUnreadCount);
          console.log(`✅ 消息非自己发送，未读数已增加至: ${newUnreadCount}`);
        } else {
          console.log("ℹ️ 消息为自己发送，未读数未更改");
        }
      }
      // 只有当发送者不是当前用户时才增加未读计数

      console.log("最终 chatItem 状态:", this.chatItems[index]);
    },

    /**
     * 根据消息内容生成预览文本
     * @param {Object} msg - 消息对象
     * @returns {string} 预览文本
     */
    generateContentPreview(msg) {
      if (msg.content_type === 1) {
        return msg.content;
      } else if ([2, 3, 4, 5].includes(msg.content_type)) {
        return `[${msg.content_type_display}]`;
      }
      return "[未知]";
    },

    formateDate(data) {
      return Formatter.formatTime(data);
    },
    fullAvatarUrl(url) {
      return Formatter.fullFileUrl(url);
    },
    parseRouteQuery() {
      this.highlightSessionId = this.$route.query.highlight;
      this.targetUserId = this.$route.query.targetId;
    },
    async loadSessions() {
      if (this.isSessionLoaded) return; // 如果会话已加载，则不再重复加载

      this.loading = true;
      try {
        const response = await api.get("/sessions");
        this.chatItems = response.data.data.sessions;
        this.isSessionLoaded = true; // 标记会话已加载
        await this.autoSelectSession();
      } catch (error) {
        console.error("加载会话列表失败:", error);
      } finally {
        this.loading = false;
      }
    },
    async autoSelectSession() {
      // 1. 优先使用highlightSessionId查找
      if (this.highlightSessionId) {
        const index = this.chatItems.findIndex(
          (item) => item.session_id === this.highlightSessionId
        );
        if (index !== -1) {
          await this.selectChat(index, this.chatItems[index]);
          return;
        }
      }

      // 2. 使用targetUserId查找私聊会话
      if (this.targetUserId) {
        const privateChat = this.chatItems.find(
          (item) =>
            item.type === 1 &&
            (item.target.id === this.targetUserId ||
              (item.user1 && item.user1.id === this.targetUserId) ||
              (item.user2 && item.user2.id === this.targetUserId))
        );

        if (privateChat) {
          const index = this.chatItems.indexOf(privateChat);
          await this.selectChat(index, privateChat);
          return;
        }
      }

      // 3. 如果没有匹配的会话，但传入了targetId，则创建新会话
      if (this.targetUserId) {
        await this.createNewSession(this.targetUserId);
      }
    },
    async createNewSession(targetId) {
      try {
        const response = await api.post("/sessions", {
          type: "private",
          targetId: targetId,
        });
        this.isSessionLoaded = false; // 创建新会话后，标记会话未加载
        await this.loadSessions();

        // 查找新创建的会话
        const newSession = this.chatItems.find(
          (item) => item.session_id === response.data.data.sessionId
        );

        if (newSession) {
          const index = this.chatItems.indexOf(newSession);
          await this.selectChat(index, newSession);
        }
      } catch (error) {
        console.error("创建会话失败:", error);
        this.$message.error("创建会话失败");
      }
    },
    async selectChat(index, item) {
      // 取消之前的延迟加载
      if (this.loadTimer) clearTimeout(this.loadTimer);

      this.selectedIndex = index;
      this.currentChat = item;
      this.shouldRenderChat = false;
      if (this.chatItems[index].unread_count > 0) {
        this.$set(this.chatItems[index], "unread_count", 0);
        console.log(`✅ 会话【${item.session_id}】未读数已清零`);
      }

      // 延迟200ms加载组件，确保过渡效果
      await new Promise((resolve) => {
        this.loadTimer = setTimeout(() => {
          this.shouldRenderChat = true;
          resolve();
        }, 200);
      });

      // 更新URL但不触发导航
      try {
        await this.$router.replace({
          name: "chat",
          query: {
            highlight: item.session_id,
            targetId: item.type === 1 ? item.target.id : null,
          },
        });
      } catch (error) {
        // 忽略导航重复错误
        if (error.name !== "NavigationDuplicated") {
          console.error("路由更新失败:", error);
        }
      }
    },
    formatTime(timeString) {
      const options = { hour: "2-digit", minute: "2-digit" };
      return new Intl.DateTimeFormat("zh-CN", options).format(
        new Date(timeString)
      );
    },
  },
  watch: {
    "$route.query": {
      handler: _.debounce(function () {
        // 使用防抖函数
        this.parseRouteQuery();
        this.autoSelectSession();
      }, 300),
      immediate: true,
    },
  },
};
</script>

<style scoped>
/* 保持原有样式不变 */
.chat-view {
  display: flex;
  height: 100%;
  width: 100%;
}

.chat-list {
  width: 300px;
  background-color: #f5f7fa;
  border-right: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
}

.chat-list-header {
  padding: 15px;
  border-bottom: 1px solid #e4e7ed;
}

.chat-list-header h3 {
  margin: 0;
  font-size: 16px;
  color: #303133;
}

.chat-items {
  flex: 1;
  overflow-y: auto;
}

.chat-item {
  display: flex;
  align-items: center;
  padding: 10px 15px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.chat-item:hover {
  background-color: #e9f5ff;
}

.chat-item.active {
  background-color: #e9f5ff;
  font-weight: bold;
  border-left: 3px solid #409eff;
}

.chat-item-avatar {
  position: relative;
  width: 40px;
  height: 40px;
  border-radius: 5px;
  overflow: hidden;
  margin-right: 10px;
}

.unread-count {
  position: absolute;
  top: 0;
  right: 0;
  width: 20px;
  height: 20px;
  background-color: #ff4d4f;
  color: white;
  border-radius: 50%;
  font-size: 12px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.chat-item-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.chat-item-name {
  font-size: 14px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 3px;
}

.chat-item-preview {
  font-size: 12px;
  color: #909399;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chat-item-time {
  font-size: 10px;
  color: #909399;
  margin-top: 2px;
}

.chat-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: #fff;
}

.chat-detail {
  display: flex;
  flex-direction: column;
  flex: 1; /* 占满剩余空间 */
  height: 100%; /* 明确设置高度 */
  min-height: 0; /* 防止 flex 容器高度塌陷 */
  overflow: hidden;
}

.loading-chat {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: #909399;
  font-size: 16px;
}

.chat-placeholder {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 50px 0;
  color: #909399;
  text-align: center;
}

.chat-placeholder-icon {
  font-size: 40px;
  margin-bottom: 15px;
}

.chat-placeholder-text {
  font-size: 16px;
}
</style>