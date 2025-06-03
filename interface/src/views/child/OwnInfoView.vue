<template>
  <div class="own-info-container">
    <div class="info-content">
      <div class="user-avatar-container">
        <!-- 使用 el-avatar 显示头像 -->
        <el-avatar 
        c
          :src="avatarUrl" 
          size="large" 
          class="user-avatar"
          @click.native="selectFile"
        />
        <!-- 隐藏的文件输入框 -->
        <input 
          type="file" 
          ref="fileInput" 
          accept="image/*" 
          style="display: none" 
          @change="handleFileChange" 
        >
      </div>
      <el-form ref="userForm" :model="localUser" label-width="120px">
        <el-form-item label="用户名">
          <span>{{ localUser.username }}</span>
        </el-form-item>
        <el-form-item label="昵称">
          <el-input v-model="localUser.nickname" placeholder="请输入昵称"></el-input>
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="localUser.email" placeholder="请输入邮箱"></el-input>
        </el-form-item>
        <el-form-item label="电话">
          <el-input v-model="localUser.phone" placeholder="请输入电话"></el-input>
        </el-form-item>
      </el-form>
      <div class="button-container">
        <el-button @click="cancel">取消</el-button>
        <el-button type="primary" @click="save">保存</el-button>
      </div>
    </div>
  </div>
</template>

<script>
import api from '@/api';
import Formatter from '@/format';
import store from '@/store';

export default {
  data() {
    return {
      localUser: {
        username: 'junjie', // 模拟用户名
        nickname: 'Junjie', // 模拟昵称
        email: 'junjie@example.com', // 模拟邮箱
        phone: '13800138000', // 模拟电话
        avatar: 'https://cube.elemecdn.com/3/7c/3ea6beec2825f8905f2bc14b936aapng.png', // 模拟头像
      },
      fileToUpload: null, // 用于存储选择的文件
    };
  },
  computed:{
    avatarUrl(){
      return Formatter.fullFileUrl(this.localUser.avatar)
    }
  },
  mounted() {
    // 获取当前用户信息
    api.get("/users/me").then((response) => {
      this.localUser = response.data.data;
    });
  },
  methods: {
    // 点击头像时选择文件
    selectFile() {
      this.$refs.fileInput.click(); // 触发文件选择对话框
    },
    // 处理文件变化
    handleFileChange(event) {
      const file = event.target.files[0];
      if (file) {
        this.fileToUpload = file;
        this.uploadAvatar();
      }
    },
    // 上传头像
    uploadAvatar() {
      if (!this.fileToUpload) return;

      // 验证文件类型
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp'];
      const isValidType = validTypes.includes(this.fileToUpload.type);
      if (!isValidType) {
        this.$message.error('上传头像图片只能是 JPG、PNG、GIF、BMP 或 WEBP 格式!');
        return;
      }

      // 验证文件大小
      const isLt2M = this.fileToUpload.size / 1024 / 1024 < 2;
      if (!isLt2M) {
        this.$message.error('上传头像图片大小不能超过 2MB!');
        return;
      }

      // 创建 FormData 对象
      const formData = new FormData();
      formData.append('avatar', this.fileToUpload);

      // 使用 axios 上传文件
      api.put('/users/me', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      }).then(response => {
        // 处理上传成功
        this.handleAvatarSuccess(response);
      }).catch(error => {
        // 处理上传错误
        this.handleAvatarError(error);
      });
    },
    // 处理上传成功
    handleAvatarSuccess(response) {
      this.localUser.avatar = response.data.data.avatar;
      this.$message.success('头像上传成功!');
    },
    // 处理上传错误
    handleAvatarError(error) {
      console.error('头像上传失败:', error);
      this.$message.error('头像上传失败，请稍后再试!');
    },
    // 取消按钮
    cancel() {
      this.$router.push('/'); // 返回主页
    },
    // 保存按钮
    save() {
      api.post("/users/me", this.localUser).then(
        () => {
          this.$notify({
            title: '成功',
            message: '修改成功',
            type: 'success',
            duration: 1000
          });
          store.commit('SET_USER',this.localUser)
          this.$router.push('/'); // 返回主页
        }
      );
    },
  },
};
</script>

<style scoped>
.own-info-container {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh; /* 使容器占满整个视口高度 */
  padding: 20px;
}

.info-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: #fff;
  padding: 20px;
  width: 100%;
  max-width: 600px; /* 限制最大宽度 */
}

.user-avatar-container {
  position: relative;
  margin-bottom: 20px;
  cursor: pointer; /* 添加鼠标悬停效果 */
}

.user-avatar {
  cursor: pointer; /* 确保头像可点击 */
}

.button-container {
  margin-top: 20px;
}
</style>