<template>
  <div class="chat-editor">
    <div class="editor-tools">
      <div class="emoji-btn-wrapper">
        <button class="editor-tool-btn" @click="toggleEmojiPicker" title="表情">
          <svg
            t="1748256211745"
            class="icon"
            viewBox="0 0 1024 1024"
            version="1.1"
            xmlns="http://www.w3.org/2000/svg"
            p-id="10945"
            width="16"
            height="16"
          >
            <path
              d="M510.933333 960c-247.04 0-448-200.981333-448-448 0-247.04 200.96-448 448-448 247.018667 0 448 200.96 448 448C958.933333 759.018667 757.952 960 510.933333 960zM510.933333 106.666667c-223.509333 0-405.333333 181.824-405.333333 405.333333s181.824 405.333333 405.333333 405.333333 405.333333-181.824 405.333333-405.333333S734.442667 106.666667 510.933333 106.666667zM511.978667 765.376c-90.197333 0-173.824-40.768-229.44-111.850667-7.253333-9.28-5.632-22.677333 3.648-29.952 9.28-7.232 22.698667-5.632 29.952 3.669333 47.466667 60.693333 118.848 95.488 195.84 95.488 77.802667 0 149.653333-35.392 197.12-97.130667 7.168-9.344 20.565333-11.114667 29.909333-3.925333s11.093333 20.586667 3.925333 29.909333C687.296 723.904 603.114667 765.376 511.978667 765.376zM374.4 499.178667c-17.685333 0-32-14.314667-32-32l0-64c0-17.685333 14.314667-32 32-32s32 14.314667 32 32l0 64C406.4 484.864 392.085333 499.178667 374.4 499.178667zM651.733333 499.178667c-17.664 0-32-14.314667-32-32l0-64c0-17.685333 14.336-32 32-32s32 14.314667 32 32l0 64C683.733333 484.864 669.397333 499.178667 651.733333 499.178667z"
              fill="#272636"
              p-id="10946"
            ></path>
          </svg>
        </button>
        <div v-if="isEmojiPickerVisible" class="emoji-picker">
          <div class="emoji-grid">
            <span
              v-for="(emoji, index) in visibleEmojis"
              :key="index"
              class="emoji-item"
              @click="insertEmoji(emoji)"
            >
              {{ emoji }}
            </span>
          </div>
          <div class="emoji-pagination">
            <button
              class="emoji-page-btn"
              :disabled="currentPage === 0"
              @click="prevPage"
            >
              &lt;
            </button>
            <span class="emoji-page-info">
              {{ currentPage + 1 }}/{{ totalPages }}
            </span>
            <button
              class="emoji-page-btn"
              :disabled="currentPage === totalPages - 1"
              @click="nextPage"
            >
              &gt;
            </button>
          </div>
        </div>
      </div>
      <button class="editor-tool-btn" @click="uploadImage" title="图片">
        <i class="el-icon-picture-outline"></i>
      </button>
      <button class="editor-tool-btn" @click="uploadVideo" title="视频">
        <i class="el-icon-video-camera"></i>
      </button>
      <button class="editor-tool-btn" @click="uploadFile" title="文件">
        <i class="el-icon-document"></i>
      </button>
    </div>
    <div class="editor-input">
      <textarea
        v-model="newMessage"
        placeholder="输入消息..."
        @keypress.enter.prevent="sendMessage"
        @input="adjustTextareaHeight"
      ></textarea>
    </div>
    <div class="editor-actions">
      <button class="send-btn" @click="sendMessage" title="发送">
        发送
        
      </button>
    </div>
  </div>
</template>
  
  <script>
export default {
  props: { sessionId: Number },
  data() {
    return {
      newMessage: "",
      uploadType: "",
      uploadFileData: null,
      isEmojiPickerVisible: false,
      currentPage: 0,
      emojisPerPage: 30, // 5x6 grid
      emojis: [
        "😀",
        "😁",
        "😂",
        "🤣",
        "😃",
        "😄",
        "😅",
        "😆",
        "😉",
        "😊",
        "😋",
        "😎",
        "😍",
        "😘",
        "🥰",
        "😗",
        "😙",
        "😚",
        "🙂",
        "🤗",
        "🤩",
        "🤔",
        "🤨",
        "😐",
        "😑",
        "😶",
        "🙄",
        "😏",
        "😣",
        "😥",
        "😮",
        "😯",
        "😲",
        "😳",
        "🥺",
        "😦",
        "😧",
        "😨",
        "😰",
        "😥",
        "😢",
        "😭",
        "😱",
        "😖",
        "😣",
        "😞",
        "😓",
        "😩",
        "😫",
        "🥱",
        "😤",
        "😡",
        "😠",
        "🤬",
        "😈",
        "👿",
        "💀",
        "☠️",
        "💩",
        "🤡",
        "👹",
        "👺",
        "👻",
        "👽",
        "👾",
        "🤖",
        "😺",
        "😸",
        "😹",
        "😻",
        "😼",
        "😽",
        "🙀",
        "😿",
        "😾",
        "🙈",
        "🙉",
        "🙊",
        "💋",
        "💌",
        "💘",
        "💝",
        "💖",
        "💗",
        "💓",
        "💞",
        "💕",
        "💟",
      ],
    };
  },
  computed: {
    totalPages() {
      return Math.ceil(this.emojis.length / this.emojisPerPage);
    },
    visibleEmojis() {
      const start = this.currentPage * this.emojisPerPage;
      const end = start + this.emojisPerPage;
      return this.emojis.slice(start, end);
    },
  },
  methods: {
    sendMessage() {
      if (this.newMessage.trim() === "") return;
      this.$emit("send-message", this.newMessage);
      this.newMessage = "";
    },
    toggleEmojiPicker() {
      this.isEmojiPickerVisible = !this.isEmojiPickerVisible;
      this.currentPage = 0;
    },
    insertEmoji(emoji) {
      this.newMessage += emoji;
      this.adjustTextareaHeight();
    },
    prevPage() {
      if (this.currentPage > 0) this.currentPage--;
    },
    nextPage() {
      if (this.currentPage < this.totalPages - 1) this.currentPage++;
    },
    uploadImage() {
      this.uploadType = "image";
      this.triggerFileInput();
    },
    uploadVideo() {
      this.uploadType = "video";
      this.triggerFileInput();
    },
    uploadFile() {
      this.uploadType = "file";
      this.triggerFileInput();
    },
    triggerFileInput() {
      const input = document.createElement("input");
      input.type = "file";
      input.accept =
        this.uploadType === "image"
          ? "image/*"
          : this.uploadType === "video"
          ? "video/*"
          : "*";
      input.onchange = this.handleFileSelected;
      input.click();
    },
    handleFileSelected(event) {
      const file = event.target.files[0];
      if (!file) return;

      this.uploadFileData = {
        name: file.name,
        url: URL.createObjectURL(file),
        file: file, // 新增：传递文件对象
      };
      this.$emit("send-upload", this.uploadType, this.uploadFileData);
    },
    adjustTextareaHeight() {
      const textarea = this.$el.querySelector("textarea");
      textarea.style.height = "auto";
      textarea.style.height = textarea.scrollHeight + "px";
    },
    handleClickOutside(event) {
      if (
        this.isEmojiPickerVisible &&
        !this.$el.querySelector(".emoji-btn-wrapper").contains(event.target)
      ) {
        this.isEmojiPickerVisible = false;
      }
    },
  },
  mounted() {
    document.addEventListener("click", this.handleClickOutside);
  },
  beforeDestroy() {
    document.removeEventListener("click", this.handleClickOutside);
  },
};
</script>
  
  <style scoped>
.chat-editor {
  display: flex;
  flex-direction: column;
  border-top: 1px solid #e4e7ed;
  padding: 10px;
  background-color: #fff;
  position: relative;
}

.editor-tools {
  display: flex;
  margin-bottom: 10px;
  position: relative;
}

.emoji-btn-wrapper {
  position: relative;
}

.editor-tool-btn {
  width: 30px;
  height: 30px;
  border: none;
  background-color: transparent;
  margin-right: 10px;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #606266;
}

.editor-tool-btn:hover {
  color: #409eff;
}

.editor-input {
  flex: 1;
  display: flex;
  margin-bottom: 10px;
}

textarea {
  width: 100%;
  min-height: 60px;
  max-height: 150px;
  padding: 8px;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  resize: none;
  overflow-y: auto;
}

.editor-actions {
  display: flex;
  justify-content: flex-end;
}

.send-btn {
  padding: 8px 16px;
  background-color: #409eff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
}

.send-btn i {
  margin-left: 5px;
}

.send-btn:hover {
  background-color: #3684e7;
}

/* 表情选择器样式 */
.emoji-picker {
  position: absolute;
  bottom: 100%;
  left: 0;
  width: 250px;
  background-color: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 10px;
  z-index: 100;
}

.emoji-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  grid-template-rows: repeat(6, 1fr);
  gap: 5px;
  margin-bottom: 8px;
}

.emoji-item {
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 20px;
  cursor: pointer;
  padding: 3px;
  border-radius: 4px;
}

.emoji-item:hover {
  background-color: #f5f7fa;
}

.emoji-pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
}

.emoji-page-btn {
  width: 24px;
  height: 24px;
  padding: 0;
  background-color: #f5f7fa;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 12px;
}

.emoji-page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.emoji-page-btn:hover:not(:disabled) {
  background-color: #e4e7ed;
}

.emoji-page-info {
  font-size: 12px;
  color: #606266;
}
</style>