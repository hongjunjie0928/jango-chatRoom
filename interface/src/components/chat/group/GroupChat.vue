<template>
  <div class="group-chat">
    <!-- 当前群聊对象信息 -->
    <div class="chat-header">
      <div class="chat-header-info">
        <!-- 群聊头像和名称 -->
        <div class="chat-header-left">
          <el-avatar
            icon="el-icon-user-solid"
            size="small"
            shape="square"
            :src="fullAvatar(groupInfo.avatar)"
            fit="fill"
          ></el-avatar>
          <div class="chat-header-name">{{ groupInfo.name }}</div>
        </div>
        <!-- 群聊详情按钮 -->
        <button class="group-info-btn" @click="toggleGroupInfo">
          <i class="el-icon-more"></i>
        </button>
      </div>
    </div>

    <!-- 群聊详情侧边栏 -->
    <GroupInfoPanel
      :chat="groupInfo"
      :isGroupInfoVisible="isGroupInfoVisible"
      @update:isGroupInfoVisible="isGroupInfoVisible = $event"
      @exit-group="handleExitGroup"
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
          ></el-avatar>
        </div>
        <div class="message-content">
          <div v-if="message.sender_id !== user.id" class="message-sender-name">
            {{ message.sender_name }}
          </div>

          <message-bubble
            :message="message"
            :isSent="message.sender_id === user.id"
          ></message-bubble>
        </div>

        <div v-if="message.sender_id === user.id" class="message-avatar">
          <el-avatar
            icon="el-icon-user-solid"
            size="large"
            shape="square"
            :src="fullAvatar(message.sender_avatar)"
            fit="fill"
          ></el-avatar>
        </div>
      </div>
    </div>

    <!-- 编辑区 -->
    <div v-if="isEditable">
      <ChatEditor
        @send-message="handleSendMessage"
        @send-upload="handleSendUpload"
        @update-avatar="handleAvatarUpdate"
      />
    </div>
    <div v-else class="non-editable-hint">
      群聊已解散或您已被移出群聊，无法发送消息。
    </div>
  </div>
</template>

<script>
import ChatEditor from "@/components/chat/ChatEditor.vue";
import MessageBubble from "@/components/chat/group/MessageBubble.vue";
import GroupInfoPanel from "@/components/chat/group/GroupInfoPanel.vue";
import api from "@/api";
import store from "@/store";
import Formatter from "@/format";
import stompService from "@/stompService";
import { debounce } from "lodash";

export default {
  components: {
    ChatEditor,
    MessageBubble,
    GroupInfoPanel,
  },
  props: {
    sessionId: Number,
    target: Object,
  },
  data() {
    return {
      user: store.state.user,
      messages: [], // 保持时间正序排列
      isGroupInfoVisible: false,
      groupInfo: {},
      currentTarget: {},
      isEditable: true,
      loadedMessageCount: 0,
      hasMore: true,
      isLoadingMore: false,
      lastScrollHeight: 0,
      initialScrollDone: false,
      scrollBehavior: "auto",
      shouldScrollToBottom: true,
      scrollDebounce: null,
      resizeObserver: null,
      messageUpdateHandler: null, // 用于存储事件处理器
    };
  },
  watch: {
    sessionId: {
      immediate: true,
      handler(newSessionId) {
        if (newSessionId) {
          this.fetchMessages(newSessionId);
        }
      },
    },
    target: {
      immediate: true,
      deep: true,
      handler(newTarget) {
        this.currentTarget = { ...newTarget };
        api.get(`/rooms/${newTarget.id}`).then((response) => {
          this.groupInfo = response.data.data.group;
          this.checkGroupStatus();
        });
      },
    },
  },
  mounted() {
    this.scrollDebounce = debounce(this.executeScrollToBottom, 100);
    this.stompSubscribe();
    this.messageBusListen();
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
    // STOMP相关方法
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

    // 消息处理方法
    async fetchMessages(sessionId, offset = 0) {
      this.isLoadingMore = true;
      try {
        const limit = 20;
        const response = await api.get(
          `/sessions/${sessionId}?offset=${offset}&limit=${limit}`
        );
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
        
        // API返回的是时间倒序，反转数组
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

    handleScroll(e) {
      const container = e.target;
      const { scrollTop, scrollHeight, clientHeight } = container;
      
      // 检查是否接近底部（50px阈值）
      this.shouldScrollToBottom = scrollHeight - (scrollTop + clientHeight) < 50;
      
      // 检查是否滚动到顶部需要加载更多
      if (scrollTop <= 100 && !this.isLoadingMore && this.hasMore) {
        this.lastScrollHeight = scrollHeight;
        this.loadMore();
      }
    },

    // 消息发送相关方法
    handleSendMessage(content) {
      if (!this.sessionId || this.sessionId <= 0) return;

      const newMessage = {
        id: Date.now(),
        sender_id: this.user.id,
        sender_name: this.user.name,
        sender_avatar: this.user.avatar,
        content_type: 1,
        content_type_display: "文本",
        content: content,
        status: 0,
        status_display: "发送中",
        created_at: new Date().toISOString(),
      };

      api.post(`/sessions/${this.sessionId}`, {
        content_type: 1,
        content: content,
      });

      // 新消息添加到数组末尾
      this.messages.push(newMessage);
      this.scrollToBottom();
    },

    handleSendUpload(uploadType, fileData) {
      const uploadingMessage = {
        id: Date.now(),
        sender_id: this.user.id,
        sender_name: this.user.name,
        sender_avatar: this.user.avatar,
        content_type: this.getContentType(uploadType),
        content_type_display: this.getContentTypeDisplay(uploadType),
        content: fileData.name,
        status: 0,
        status_display: "上传中",
        created_at: new Date().toISOString(),
      };

      // 新消息添加到数组末尾
      this.messages.push(uploadingMessage);
      this.scrollToBottom();

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
        });
    },

    // 其他辅助方法
    fullAvatar(url) {
      return Formatter.fullFileUrl(url);
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

    getContentType(uploadType) {
      const types = {
        image: 2,
        video: 3,
        audio: 5,
      };
      return types[uploadType] || 4;
    },

    getContentTypeDisplay(uploadType) {
      const displays = {
        image: "图片",
        video: "视频",
        audio: "语音",
      };
      return displays[uploadType] || "文件";
    },

    // 群组相关方法
    toggleGroupInfo() {
      this.isGroupInfoVisible = !this.isGroupInfoVisible;
    },

    handleAvatarUpdate(newAvatar) {
      this.currentTarget.avatar = newAvatar;
      this.$emit("update-avatar", newAvatar);
    },

    handleExitGroup() {
      api.post(`/rooms/${this.currentTarget.id}/exit`).then(() => {
        this.$notify({
          title: "成功",
          message: "已退出群聊",
          type: "success",
        });
      });
    },

    checkGroupStatus() {
      if (
        this.groupInfo.status === 0 ||
        this.groupInfo.myMembership?.status === 0
      ) {
        this.isEditable = false;
      } else {
        this.isEditable = true;
      }
    },
  },
};
</script>

<style scoped>
/* 保持原有样式不变 */
.group-chat {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
  position: relative;
}

.chat-header {
  padding: 15px;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
}

.chat-header-info {
  display: flex;
  align-items: center;
  width: 100%;
  justify-content: space-between;
}

.chat-header-left {
  display: flex;
  align-items: center;
}

.chat-header-name {
  font-size: 16px;
  font-weight: bold;
  color: #303133;
  margin-left: 10px;
}

.group-info-btn {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  margin-left: 10px;
}

.chat-messages {
  flex: 1;
  padding: 15px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  scroll-behavior: smooth;
  overflow-anchor: auto;
}

.message {
  display: flex;
  margin-bottom: 15px;
  max-width: 80%;
}

.message-received {
  align-self: flex-start;
}

.message-sent {
  align-self: flex-end;
}

.message-avatar {
  margin: 0 10px;
}

.message-content {
  display: flex;
  flex-direction: column;
}

.message-sender-name {
  font-size: 12px;
  color: #666;
  margin-left: 12px;
  margin-bottom: 4px;
}

.loading-more {
  text-align: center;
  color: #999;
  font-size: 12px;
  margin: 8px 0;
}

.non-editable-hint {
  padding: 15px;
  text-align: center;
  color: #999;
  background: #f5f5f5;
}
</style>