<template>
  <div class="container">
    <div class="register-form-container">
      <h2 class="title">聊天室注册</h2>
      <el-form ref="registerForm" :model="registerForm" :rules="registerRules">
        <el-form-item prop="email">
          <label>邮箱</label>
          <el-input
            v-model="registerForm.email"
            placeholder="请输入邮箱"
            type="email"
            prefix-icon="el-icon-message"
            ref="emailInput"
            @keyup.enter.native="focusNextInput('passwordInput')"
          ></el-input>
        </el-form-item>
        <el-form-item prop="password">
          <label>密码</label>
          <el-input
            v-model="registerForm.password"
            placeholder="请输入密码"
            type="password"
            prefix-icon="el-icon-lock"
            ref="passwordInput"
            @keyup.enter.native="focusNextInput('confirmPasswordInput')"
          ></el-input>
        </el-form-item>
        <el-form-item prop="confirmPassword">
          <label>确认密码</label>
          <el-input
            v-model="registerForm.confirmPassword"
            placeholder="请再次输入密码"
            type="password"
            prefix-icon="el-icon-lock"
            ref="confirmPasswordInput"
            @keyup.enter.native="handleRegister"
          ></el-input>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleRegister" class="register-button">注册</el-button>
        </el-form-item>
        <div class="login-link">
          <span>已有账号？</span>
          <el-link type="primary" @click="goToLogin">立即登录</el-link>
        </div>
      </el-form>
    </div>
  </div>
</template>

<script>
import api from '@/api/index'
export default {
  data() {
    const validateConfirmPassword = (rule, value, callback) => {
      if (value !== this.registerForm.password) {
        callback(new Error('两次输入的密码不一致'));
      } else {
        callback();
      }
    };

    return {
      registerForm: {
        email: '',
        password: '',
        confirmPassword: ''
      },
      registerRules: {
        email: [
          { required: true, message: '请输入邮箱', trigger: 'blur' },
          { type: 'email', message: '请输入正确的邮箱格式', trigger: ['blur', 'change'] }
        ],
        password: [
          { required: true, message: '请输入密码', trigger: 'blur' },
          { min: 6, message: '密码长度至少为6位', trigger: 'blur' }
        ],
        confirmPassword: [
          { required: true, message: '请再次输入密码', trigger: 'blur' },
          { validator: validateConfirmPassword, trigger: 'blur' }
        ]
      }
    };
  },
  methods: {
    handleRegister() {
      // 先进行表单验证
      this.$refs.registerForm.validate((valid) => {
        if (valid) {
          // 验证通过，发起注册请求
          api.post("auth/register", { 
            email: this.registerForm.email,
            password: this.registerForm.password
          })
          .then(() => {
            // 使用 el-notification 显示成功通知
            this.$notify({
              title: '成功',
              message: '注册成功！',
              type: 'success',
              duration: 2000, // 通知显示 2 秒
              onClose: () => {
                // 通知关闭后跳转到登录页面
                this.goToLogin();
              }
            });
          })
          .catch(error => {
            // 使用 el-notification 显示失败通知
            this.$notify({
              title: '错误',
              message: '错误码'+error.response.data.code+'\n'+error.response.data.message,
              type: 'error',
              duration: 2000 // 通知显示 2 秒
            });
          });
        } else {
          // 验证失败，使用 el-notification 显示错误通知
          this.$notify({
            title: '错误',
            message: '表单验证失败，请检查您的输入！',
            type: 'error',
            duration: 2000 // 通知显示 2 秒
          });
          console.log('表单验证失败，不允许注册');
          return false;
        }
      });
    },
    goToLogin() {
      // 跳转到登录页面的逻辑
      this.$router.push('/login'); // 假设登录页面的路径是 '/login'
    },
    focusNextInput(nextInputRef) {
      this.$nextTick(() => {
        this.$refs[nextInputRef].focus();
      });
    }
  },
  mounted() {
    // 页面加载完成后，自动聚焦到邮箱输入框
    this.$nextTick(() => {
      this.$refs.emailInput.focus();
    });
  }
};
</script>

<style scoped>
.container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: #f5f7fa;
}

.register-form-container {
  width: 100%;
  max-width: 400px;
  background-color: #fff;
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.title {
  text-align: center;
  margin-bottom: 30px;
  color: #303133;
}

.register-button {
  width: 100%;
}

.login-link {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}
</style>