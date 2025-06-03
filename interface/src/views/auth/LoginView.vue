<template>
  <div class="container">
    <div class="login-form-container">
      <h2 class="title">聊天室登录</h2>
      <el-form ref="loginForm" :model="loginForm" :rules="loginRules">
        <el-form-item prop="account">
          <label>用户名/邮箱</label>
          <el-input
            v-model="loginForm.account"
            placeholder="用户名/邮箱"
            type="text"
            prefix-icon="el-icon-user"
            @keyup.enter.native="focusPasswordInput"
            ref="accountInput"
          ></el-input>
        </el-form-item>
        <el-form-item prop="password">
          <label>密码</label>
          <el-input
            v-model="loginForm.password"
            placeholder="密码"
            type="password"
            prefix-icon="el-icon-lock"
            @keyup.enter.native="handleLogin"
            ref="passwordInput"
          ></el-input>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleLogin" class="login-button"
            >登录</el-button
          >
        </el-form-item>
        <div class="register-link">
          <span>还没有账号？</span>
          <el-link type="primary" @click="goToRegister">立即注册</el-link>
        </div>
      </el-form>
    </div>
  </div>
</template>

<script>
import api from "@/api";

export default {
  data() {
    return {
      loginForm: {
        account: "",
        password: "",
      },
      loginRules: {
        account: [
          { required: true, message: "请输入用户名或邮箱", trigger: "blur" },
        ],
        password: [
          { required: true, message: "请输入密码", trigger: "blur" },
          { min: 6, message: "密码长度至少为6位", trigger: "blur" },
        ],
      },
    };
  },
  methods: {
    handleLogin() {
      // 先进行表单验证
      this.$refs.loginForm.validate((valid) => {
        if (valid) {
          // 验证通过，发起登录请求
          api
            .post("/auth/login", this.loginForm)
            .then((response) => {
              // 假设后端返回的 token 在 response.data 中
              const { access, refresh } = response.data.data.token;
              const user = response.data.data.user;
              this.$store.dispatch("storeUser", {
                access: access,
                refresh: refresh,
                user: user,
              });
              // 使用 el-notification 提示用户登录成功
              this.$notify({
                title: "成功",
                message: "登录成功！",
                type: "success",
                duration: 1000,
                onClose: () => {
                  this.$router.push("/");
                },
              });
            })
            .catch((error) => {
              // 处理登录失败的情况
              let message = "登录失败，请检查您的输入或网络连接！";
              if (error.response.status === 401) {
                message = "认证失败，帐号或密码错误";
              }
              this.$notify({
                title: "错误",
                message,
                type: "error",
                duration: 2000,
              });
            });
        } else {
          // 验证失败，提示用户
          this.$notify({
            title: "错误",
            message: "表单验证失败，请检查您的输入！",
            type: "error",
            duration: 2000,
          });
          return false;
        }
      });
    },

    goToRegister() {
      // 跳转到注册页面
      this.$router.push("/register");
    },
    focusPasswordInput() {
      this.$refs.passwordInput.focus();
    },
  },
  mounted() {
    // 页面加载完成后，自动聚焦到用户名输入框
    this.$nextTick(() => {
      this.$refs.accountInput.focus();
    });
  },
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

.login-form-container {
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

.login-button {
  width: 100%;
}

.register-link {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}
</style>