<template>
  <div class="private-chat">
    <!-- 当前私聊对象信息 -->
    <div class="chat-header">
      <div class="chat-header-info">
        <div class="chat-header-content">
          <div class="chat-header-name">{{ target.name }}</div>
          <div class="chat-header-status">在线</div>
        </div>
        <!-- 用户信息按钮 -->
        <button class="user-info-btn" @click="toggleUserInfo">
          <i class="el-icon-more"></i>
        </button>
      </div>
    </div>

    <!-- 用户信息侧边栏 -->
    <UserInfoPanel
      :id="target.id"
      :isUserInfoVisible="isUserInfoVisible"
      @update:isUserInfoVisible="updateUserInfoVisibility"
    />

    <!-- 消息显示区 -->
    <div class="chat-messages" ref="messagesContainer" @scroll="handleScroll">
      <div v-if="isLoadingMore" class="loading-more">加载中...</div>
      <div
        v-for="message in messages"
        :key="message.id"
        class="message"
        :class="{
          'message-received': message.sender_id !== user.id,
          'message-sent': message.sender_id === user.id,
        }"
      >
        <div v-if="message.sender_id !== user.id" class="message-avatar">
          <el-avatar
            icon="el-icon-user-solid"
            size="large"
            shape="square"
            :src="fullAvatar(message.sender_avatar)"
            fit="fill"
          >
            <img :src="fullAvatar(message.sender_avatar)" />
          </el-avatar>
        </div>

        <message-bubble
          :message="message"
          :isSent="message.sender_id === user.id"
        ></message-bubble>

        <div v-if="message.sender_id === user.id" class="message-avatar">
          <el-avatar
            icon="el-icon-user-solid"
            size="large"
            shape="square"
            :src="fullAvatar(message.sender_avatar)"
            fit="fill"
          >
            <img :src="fullAvatar(message.sender_avatar)" />
          </el-avatar>
        </div>
      </div>
    </div>

    <!-- 编辑区 -->
    <chat-editor
      @send-message="handleSendMessage"
      @send-upload="handleSendUpload"
    ></chat-editor>
  </div>
</template>

<script>
import MessageBubble from "@/components/chat/prviate/MessageBubble.vue";
import ChatEditor from "@/components/chat/ChatEditor.vue";
import UserInfoPanel from "@/components/chat/prviate/UserInfoPanel.vue";
import api from "@/api";
import store from "@/store";
import Formatter from "@/format";
import stompService from "@/stompService";
import { debounce } from "lodash";

export default {
  components: {
    MessageBubble,
    ChatEditor,
    UserInfoPanel,
  },
  data() {
    return {
      isUserInfoVisible: false,
      user: store.state.user,
      messages: [], // 现在保持时间正序排列
      loadedMessageCount: 0,
      hasMore: true,
      isLoadingMore: false,
      lastScrollHeight: 0,
      pageInfo: {
        current_page: 1,
        page_size: 10,
        total_count: 1,
      },
      isUploading: false,
      isSendingMessage: false,
      isInitialLoad: true,
      shouldScrollToBottom: true,
      initialScrollDone: false,
      scrollBehavior: "auto",
      scrollDebounce: null,
      resizeObserver: null,
    };
  },
  props: {
    sessionId: Number,
    target: Object,
  },
  mounted() {
    this.scrollDebounce = debounce(this.executeScrollToBottom, 100);
    this.stompSubscribe();
    this.messageBusListen();

    if (this.sessionId) {
      this.fetchMessages(this.sessionId);
    }

    this.setupResizeObserver();
  },
  beforeDestroy() {
    this.stompUnsubscribe();
    this.messageBusOff();

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  },
  methods: {
    // 获取消息（API返回的是时间倒序）
    async fetchMessages(sessionId, offset = 0) {
      this.isLoadingMore = true;
      try {
        const limit = 20;
        const response = await api.get(`/sessions/${sessionId}?offset=${offset}&limit=${limit}`);
        let newMessages = response.data.data.messages || [];
        
        // API返回的是时间倒序，我们需要反转数组
        newMessages = [...newMessages].reverse();

        if (offset === 0) {
          this.messages = newMessages;
        } else {
          // 加载更多历史消息，拼接到前面
          this.messages = [...newMessages, ...this.messages];
        }

        this.loadedMessageCount = this.messages.length;
        this.hasMore = response.data.data.pagination?.has_more ?? false;

        this.$nextTick(() => {
          if (offset === 0) {
            this.scrollToBottom(true);
            setTimeout(() => {
              this.initialScrollDone = true;
              this.scrollBehavior = "smooth";
            }, 100);
          } else {
            const container = this.$refs.messagesContainer;
            if (container && this.lastScrollHeight > 0) {
              container.scrollTop = container.scrollHeight - this.lastScrollHeight;
            }
          }
        });
      } catch (error) {
        console.error("获取消息失败:", error);
      } finally {
        this.isLoadingMore = false;
      }
    },

    // 加载更多历史消息
    async loadMore() {
      if (this.isLoadingMore || !this.hasMore) return;

      this.lastScrollHeight = this.$refs.messagesContainer.scrollHeight;

      this.isLoadingMore = true;
      try {
        const limit = 10;
        const response = await api.get(
          `/sessions/${this.sessionId}?offset=${this.loadedMessageCount}&limit=${limit}`
        );
        let newMessages = response.data.data.messages || [];
        
        // API返回的是时间倒序，我们需要反转数组
        newMessages = [...newMessages].reverse();

        // 拼接到消息列表前面
        this.messages = [...newMessages, ...this.messages];
        this.loadedMessageCount = this.messages.length;
        this.hasMore = response.data.data.pagination?.has_more ?? false;

        this.$nextTick(() => {
          const container = this.$refs.messagesContainer;
          if (container && this.lastScrollHeight > 0) {
            container.scrollTop = container.scrollHeight - this.lastScrollHeight;
          }
        });
      } catch (error) {
        console.error("加载更多消息失败:", error);
      } finally {
        this.isLoadingMore = false;
      }
    },

    // 处理新消息
    handleMessageUpdate(message) {
      if (message.sessionId !== this.sessionId) return;

      const newMessage = {
        id: message.messageId,
        sender_id: message.sender_id,
        sender_name: message.sender_name,
        sender_nickname: message.sender_nickname,
        sender_avatar: message.sender_avatar,
        content_type: message.content_type,
        content_type_display: message.content_type_display,
        content: message.content,
        status: message.status,
        status_display: message.status_display,
        file_info: message.file_info,
        created_at: message.created_at,
      };

      if (newMessage.sender_id !== this.user.id) {
        // 新消息添加到数组末尾
        this.messages.push(newMessage);
        this.scrollToBottom();
      }
    },

    // 发送消息
    handleSendMessage(content) {
      if (!this.sessionId || this.sessionId <= 0) return;
      if (this.isSendingMessage) return;

      const newMessage = {
        id: Date.now(),
        sender_id: this.user.id,
        sender_name: this.user.name,
        sender_nickname: this.user.nickname,
        sender_avatar: this.user.avatar,
        content_type: 1,
        content_type_display: "文本",
        content: content,
        status: 0,
        status_display: "发送中",
        created_at: new Date().toISOString(),
      };

      this.isSendingMessage = true;

      api.post(`/sessions/${this.sessionId}`, {
        content_type: 1,
        content: content,
      }).finally(() => {
        this.isSendingMessage = false;
      });

      // 发送的消息添加到数组末尾
      this.messages.push(newMessage);
      this.scrollToBottom();
    },

    // 其他方法保持不变...
    stompSubscribe() {
      stompService.subscribe("/topic/session", (message) => {
        try {
          let bodyStr = "";
          if (message.isBinaryBody && message.binaryBody) {
            const decoder = new TextDecoder("utf-8");
            bodyStr = decoder.decode(message.binaryBody);
          } else if (message.body) {
            bodyStr = message.body;
          } else {
            throw new Error("消息内容为空");
          }

          const parsed = JSON.parse(bodyStr.trim());
          this.$bus.$emit("message-update", parsed);
        } catch (e) {
          console.error("消息解析失败:", e, message);
        }
      });
    },

    stompUnsubscribe() {
      stompService.unsubscribe("/topic/session");
    },

    messageBusListen() {
      this.messageUpdateHandler = (message) => {
        this.handleMessageUpdate(message);
      };
      this.$bus.$on("message-update", this.messageUpdateHandler);
    },

    messageBusOff() {
      this.$bus.$off("message-update", this.messageUpdateHandler);
    },

    fullAvatar(url) {
      return Formatter.fullFileUrl(url);
    },

    toggleUserInfo() {
      this.isUserInfoVisible = !this.isUserInfoVisible;
    },

    updateUserInfoVisibility(value) {
      this.isUserInfoVisible = value;
    },

    handleScroll(e) {
      const container = e.target;
      const { scrollTop, scrollHeight, clientHeight } = container;

      this.shouldScrollToBottom = scrollHeight - (scrollTop + clientHeight) < 50;

      if (scrollTop <= 10 && !this.isLoadingMore && this.hasMore) {
        this.loadMore();
      }
    },

    scrollToBottom(force = false) {
      if (!force && !this.shouldScrollToBottom) return;
      this.scrollDebounce();
    },

    executeScrollToBottom() {
      const container = this.$refs.messagesContainer;
      if (!container) return;

      const behavior = this.initialScrollDone ? "smooth" : this.scrollBehavior;

      container.scrollTo({
        top: container.scrollHeight,
        behavior: behavior,
      });
    },

    setupResizeObserver() {
      if (typeof ResizeObserver !== "undefined") {
        this.resizeObserver = new ResizeObserver(() => {
          if (this.shouldScrollToBottom) {
            this.scrollToBottom();
          }
        });

        const container = this.$refs.messagesContainer;
        if (container) {
          this.resizeObserver.observe(container);
        }
      }
    },

    handleSendUpload(uploadType, fileData) {
      const uploadingMessage = {
        id: Date.now(),
        sender_id: this.user.id,
        sender_name: this.user.name,
        sender_nickname: this.user.nickname,
        sender_avatar: this.user.avatar,
        content_type: this.getContentType(uploadType),
        content_type_display: this.getContentTypeDisplay(uploadType),
        content: fileData.name,
        status: 0,
        status_display: "上传中",
        created_at: new Date().toISOString(),
      };
      this.messages.push(uploadingMessage);
      this.scrollToBottom();
      this.isUploading = true;
      const formData = new FormData();
      formData.append("file", fileData.file);
      api
        .put(`/sessions/${this.sessionId}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        })
        .then((response) => {
          const newMessage = response.data.data.message;
          const index = this.messages.findIndex(
            (msg) => msg.id === uploadingMessage.id
          );
          if (index !== -1) {
            this.messages.splice(index, 1, newMessage);
          }
          this.scrollToBottom();
        })
        .catch((error) => {
          console.error("文件上传失败:", error);
          const index = this.messages.findIndex(
            (msg) => msg.id === uploadingMessage.id
          );
          if (index !== -1) {
            this.messages[index].status = -1;
            this.messages[index].status_display = "上传失败";
          }
        })
        .finally(() => {
          this.isUploading = false;
        });
    },

    getContentType(uploadType) {
      if (uploadType === "image") return 2;
      if (uploadType === "video") return 3;
      if (uploadType === "audio") return 5;
      return 4;
    },

    getContentTypeDisplay(uploadType) {
      if (uploadType === "image") return "图片";
      if (uploadType === "video") return "视频";
      if (uploadType === "audio") return "语音";
      return "文件";
    },
  },
};
</script>
<style scoped>
.private-chat {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.chat-header {
  padding: 12px 16px;
  border-bottom: 1px solid #e6e6e6;
  background-color: #f5f5f5;
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.chat-header-info {
  display: flex;
  align-items: center;
  width: 100%;
  justify-content: space-between;
}

.chat-header-content {
  display: flex;
  flex-direction: column;
}

.chat-header-name {
  font-size: 16px;
  font-weight: 500;
  color: #333;
}

.chat-header-status {
  font-size: 12px;
  color: #999;
  margin-top: 2px;
}

.user-info-btn {
  background: none;
  border: none;
  font-size: 18px;
  color: #666;
  cursor: pointer;
  padding: 4px;
  margin-left: 8px;
}

.chat-messages {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  background-color: #f9f9f9;
  min-height: 300px;
  scroll-behavior: smooth;
  overflow-anchor: auto;
}

.message {
  display: flex;
  margin-bottom: 16px;
  max-width: 80%;
}

.message-received {
  align-self: flex-start;
}

.message-sent {
  align-self: flex-end;
}

.message-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  overflow: hidden;
  margin-right: 12px;
  margin-left: 12px;
  flex-shrink: 0;
}

.message-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.loading-more {
  text-align: center;
  color: #999;
  font-size: 12px;
  margin: 8px 0;
}
</style>