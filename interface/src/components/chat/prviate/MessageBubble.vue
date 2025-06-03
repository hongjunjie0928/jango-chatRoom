<template>
  <div class="message-bubble-wrapper">
    <div 
      class="message-content-wrapper" 
      :class="{ 
        'message-sent': isSent,
        'text-message': message.contentType === 'text',
        'non-text-message': message.contentType !== 'text'
      }"
    >
      <div v-if="message.content_type === 1" class="message-content">
        {{ message.content }}
      </div>
      <div v-else-if="message.content_type === 2" class="message-image">
        <img :src="fileUrl" alt="Image" @click="showImagePreview" />
      </div>
      <div v-else-if="message.content_type === 3" class="message-video">
        <video :src="fileUrl" controls></video>
      </div>
      <div v-else-if="message.content_type === 4" class="message-file">
        <div class="file-info" @click="downloadFile">
          <div class="file-icon">
            <i :class="getFileIcon(message.file_info. name)"></i>
          </div>
          <div class="file-details">
            <div class="file-name">{{ message.file_info. name}}</div>
            <div class="file-size">{{ getFileSize(message.file_info. size) }}</div>
          </div>
        </div>
      </div>
    </div>
    <!-- 时间显示在气泡框外左下角 -->
    <div v-if="message.created_at" class="message-time">{{ timeFormat }}</div>

    <!-- 图片预览模态框 -->
    <div v-if="imagePreviewVisible" class="image-preview-modal">
      <div class="image-preview-content">
        <img 
          :src="previewImage" 
          class="preview-image" 
          @wheel="handleZoom"
          @click="closeImagePreview"
          :style="{ transform: `scale(${zoomLevel})` }"
        />
      </div>
    </div>
  </div>
</template>

<script>
import Formatter from '@/format';
export default {
  props: {
    message: {
      type: Object,
      required: true,
      default: () => ({
        type: '',
        content_type: '',
        content: '',
        create_at: '',
        fileName: '',
        fileSize: 0
      })
    },
    isSent: {
      type: Boolean,
      required: true
    },
  },
  computed:{
    fileUrl(){
      return Formatter.fullFileUrl(this.message.content)
    },
    timeFormat(){
      return Formatter.formatTime(this.message.created_at)
    
    }
  },
  data() {
    return {
      imagePreviewVisible: false,
      previewImage: '',
      zoomLevel: 1 // 缩放级别
    };
  },
  methods: {
    // 获取文件类型图标
    getFileIcon(fileName) {
      const extension = fileName.split('.').pop().toLowerCase();
      const documentExtensions = ['doc', 'docx', 'pdf', 'txt'];
      const spreadsheetExtensions = ['xls', 'xlsx', 'csv'];
      const presentationExtensions = ['ppt', 'pptx'];
      const audioExtensions = ['mp3', 'wav', 'aac'];
      const imageExtensions = ['jpg', 'jpeg', 'png', 'gif'];
      const videoExtensions = ['mp4', 'mov', 'avi', 'flv'];
      
      if (documentExtensions.includes(extension)) {
        return 'document-icon';
      } else if (spreadsheetExtensions.includes(extension)) {
        return 'spreadsheet-icon';
      } else if (presentationExtensions.includes(extension)) {
        return 'presentation-icon';
      } else if (audioExtensions.includes(extension)) {
        return 'audio-icon';
      } else if (imageExtensions.includes(extension)) {
        return 'image-icon';
      } else if (videoExtensions.includes(extension)) {
        return 'video-icon';
      } else {
        return 'file-icon';
      }
    },
    // 获取文件大小显示
    getFileSize(sizeInBytes) {
      if (sizeInBytes < 1024) {
        return `${sizeInBytes} B`;
      } else if (sizeInBytes < 1048576) {
        return `${(sizeInBytes / 1024).toFixed(2)} KB`;
      } else {
        return `${(sizeInBytes / 1048576).toFixed(2)} MB`;
      }
    },
    // 显示图片预览
    showImagePreview(event) {
      this.previewImage = event.target.src;
      this.imagePreviewVisible = true;
      this.zoomLevel = 1; // 重置缩放级别
    },
    // 关闭图片预览
    closeImagePreview() {
      this.imagePreviewVisible = false;
    },
    // 处理缩放
    handleZoom(event) {
      event.preventDefault(); // 防止页面滚动
      
      // 滚轮向上，放大
      if (event.deltaY < 0) {
        this.zoomLevel += 0.1;
      } 
      // 滚轮向下，缩小
      else {
        this.zoomLevel = Math.max(this.zoomLevel - 0.1, 0.5); // 最小缩放级别0.5
      }
    },
    // 下载文件
    downloadFile() {
      // 创建一个临时的 a 标签来触发下载
      const link = document.createElement('a');
      link.href = Formatter.fullFileUrl(this.message.content);
      link.download = this.message.file_info.name;
      link.click();
    }
  },
};
</script>

<style scoped>
.message-bubble-wrapper {
  display: flex;
  flex-direction: column;
  align-items: flex-start; /* 对齐方式 */
}

.message-content-wrapper {
  display: flex;
  flex-direction: column;
  max-width: 40vw; /* 设置气泡框最大宽度为页面宽度的40% */
}

/* 文本消息样式 */
.text-message {
  border: 1px solid #e4e7ed; /* 文本消息外框 */
  border-radius: 18px;
  padding: 8px 12px; /* 文本消息内边距 */
}

/* 非文本消息样式 */
.non-text-message {
  border: 1px solid #e4e7ed; /* 非文本消息外框 */
  border-radius: 8px;
  padding: 8px 12px; /* 非文本消息内边距 */
}

/* 用户发送的消息背景色 */
.message-content-wrapper.message-sent.text-message {
  background-color: #e4f7e7; /* 用户发送的文本消息背景色 */
}

.message-content-wrapper.message-sent.non-text-message {
  background-color: #f5f7fa; /* 用户发送的非文本消息背景色 */
}

.message-content {
  font-size: 14px;
  color: #303133;
  word-break: break-word;
}

.message-image img {
  max-width: 40vw; /* 设置图片最大宽度为页面宽度的40% */
  max-height: 200px;
  border-radius: 8px; /* 设置圆角 */
  cursor: pointer; /* 鼠标悬停时显示为可点击样式 */
}

.message-video video {
  max-width: 40vw; /* 设置视频最大宽度为页面宽度的40% */
  max-height: 200px;
  border-radius: 8px; /* 设置圆角 */
}

.message-file {
  display: flex;
  flex-direction: column;
}

.file-info {
  display: flex;
  align-items: center;
  cursor: pointer; /* 鼠标悬停时显示为可点击样式 */
}

.file-icon {
  font-size: 24px;
  margin-right: 10px;
}

.file-details {
  flex: 1;
}

.file-name {
  font-size: 14px;
  color: #303133;
  word-break: break-all; /* 长文件名换行显示 */
}

.file-size {
  font-size: 12px;
  color: #909399;
}

.message-time {
  font-size: 10px;
  color: #909399;
  margin-top: 3px;
  text-align: left;
  margin-left: 8px; /* 左边距 */
}

/* 图片预览模态框样式 */
.image-preview-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.image-preview-content {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
}

.preview-image {
  max-width: 90vw;
  max-height: 90vh;
  border-radius: 8px;
  transition: transform 0.3s ease;
  cursor: grab;
}

.preview-image:active {
  cursor: grabbing;
}
</style>