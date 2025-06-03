<template>
  <div class="modal-dialog" v-if="visible">
    <div class="modal-content">
      <div class="modal-header">
        <h3>创建群组</h3>
        <button
          class="modal-close-btn"
          @click="closeDialog"
          :disabled="localIsFormDisabled"
        >
          ✕
        </button>
      </div>
      <div class="modal-body">
        <form @submit.prevent="handleSubmit">
          <div class="form-group">
            <label>群组名称 <span class="required">*</span></label>
            <input
              v-model="form.name"
              placeholder="2-20个字符"
              maxlength="20"
              :disabled="localIsFormDisabled"
            />
          </div>

          <div class="form-group">
            <label>群组描述</label>
            <textarea
              v-model="form.description"
              placeholder="可选描述"
              rows="2"
              maxlength="100"
              :disabled="localIsFormDisabled"
            ></textarea>
          </div>

          <div class="form-group">
            <label>选择成员 <span class="required">*</span></label>
            <el-transfer
              v-model="form.members"
              :data="potentialMembers"
              :titles="['可选成员', '已选成员']"
              :button-texts="['移到左边', '移到右边']"
              :props="{
                key: 'id',
                label: 'displayName',
                disabled: 'isDisabled',
              }"
              @change="onMemberChange"
              :disabled="localIsFormDisabled"
            >
              <!-- 左侧内容自定义 -->
              <template #left-slot>
                <el-scrollbar>
                  <div
                    v-for="member in potentialMembers"
                    :key="member.id"
                    class="member-item"
                    :class="{
                      'member-selected': form.members.includes(member.id),
                    }"
                  >
                    <div class="member-avatar">
                      <img
                        v-if="member.avatar"
                        :src="fullAvatarUrl(member.avatar)"
                        alt="成员头像"
                      />
                      <div v-else class="avatar-placeholder">👤</div>
                    </div>
                    <div class="member-info">
                      <div class="member-name">{{ member.displayName }}</div>
                    </div>
                  </div>
                </el-scrollbar>
              </template>
              <!-- 右侧内容自定义 -->
              <template #right-slot>
                <el-scrollbar>
                  <div
                    v-for="memberId in form.members"
                    :key="memberId"
                    class="member-item"
                  >
                    <div class="member-avatar">
                      <img
                        v-if="getMemberAvatar(memberId)"
                        :src="getMemberAvatar(memberId)"
                        alt="成员头像"
                      />
                      <div v-else class="avatar-placeholder">👤</div>
                    </div>
                    <div class="member-info">
                      <div class="member-name">
                        {{ getMemberName(memberId) }}
                      </div>
                    </div>
                  </div>
                </el-scrollbar>
              </template>
            </el-transfer>
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button class="btn-cancel" @click="closeDialog">取消</button>
        <button
          class="btn-confirm"
          @click="handleSubmit"
          :disabled="!canCreateGroup"
        >
          创建群组
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import Formatter from "@/format";
import api from "@/api";

export default {
  name: "CreateGroupDialog",
  props: {
    visible: {
      type: Boolean,
      required: true,
    },
    currentUserId: {
      type: Number,
      required: true,
    },
    isFormDisabled: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      form: {
        name: "",
        description: "",
        members: [this.currentUserId], // 默认包含当前用户
      },
      potentialMembers: [], // 可选成员列表
      localIsFormDisabled: false, // 本地状态，避免直接修改 prop
    };
  },
  computed: {
    canCreateGroup() {
      return (
        this.form.name.trim().length >= 2 &&
        this.form.name.trim().length <= 20 &&
        this.form.members.length > 0
      );
    },
  },
  watch: {
    visible(newVal) {
      if (newVal) {
        this.fetchPotentialMembers(); // 对话框打开时获取可选成员
      } else {
        this.resetForm(); // 重置表单
      }
    },
    isFormDisabled(newVal) {
      this.localIsFormDisabled = newVal;
    },
  },
  methods: {
    resetForm() {
      this.form = {
        name: "",
        description: "",
        members: [this.currentUserId],
      };
      this.potentialMembers = [];
    },
    fullAvatarUrl(url) {
      return Formatter.fullFileUrl(url);
    },
    getMemberName(memberId) {
      const member = this.potentialMembers.find((m) => m.id === memberId);
      return member ? member.displayName : "";
    },
    getMemberAvatar(memberId) {
      const member = this.potentialMembers.find((m) => m.id === memberId);
      return member ? this.fullAvatarUrl(member.avatar) : null;
    },
    closeDialog() {
      this.$emit("update:visible", false);
    },
    handleSubmit() {
      if (!this.canCreateGroup) return;

      this.localIsFormDisabled = true;

      const payload = {
        name: this.form.name.trim(),
        description: this.form.description.trim(),
        members: this.form.members, // 已经是 [2, 4] 这样的 Number[] 类型
      };

      this.$emit("submit", payload);
    },
    async fetchPotentialMembers() {
      try {
        this.localIsFormDisabled = true;
        const response = await api.get("/friends");
        this.potentialMembers =
          response.data.data.friends?.map((user) => ({
            id: user.id,
            username: user.username,
            nickname: user.nickname,
            remark: user.remark || "",
            avatar: user.avatar,
            displayName: user.remark || user.nickname,
            isDisabled: user.id === this.currentUserId,
          })) || [];
      } catch (error) {
        console.error("获取好友列表失败:", error);
        this.potentialMembers = [];
        this.$notify({
          title: "错误",
          message: "获取好友列表失败",
          type: "error",
        });
      } finally {
        this.localIsFormDisabled = false;
      }
    },
    onMemberChange() {
      if (!this.form.members.includes(this.currentUserId)) {
        this.form.members.push(this.currentUserId);
      }
    },
  },
};
</script>

<style scoped>
.modal-dialog {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.modal-content {
  background-color: white;
  border-radius: 4px;
  width: 800px;
  max-width: 90%;
  max-height: 90%;
  overflow-y: auto;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.modal-header {
  padding: 15px;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-close-btn {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
}

.modal-body {
  padding: 25px;
}

.form-group {
  margin-bottom: 25px;
}

.form-group label {
  display: block;
  margin-bottom: 12px;
  font-weight: bold;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
}

.form-group textarea {
  min-height: 100px;
}

.required {
  color: red;
}

.member-item {
  display: flex;
  align-items: center;
  padding: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.member-avatar {
  width: 48px;
  height: 48px;
  border-radius: 4px;
  overflow: hidden;
  margin-right: 18px;
  background-color: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
}

.member-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  font-size: 24px;
  color: #909399;
}

.member-info {
  flex: 1;
}

.member-name {
  font-size: 16px;
  color: #303133;
}

.member-selected {
  background-color: #f0f7ff;
}

.modal-footer {
  padding: 20px;
  border-top: 1px solid #e4e7ed;
  display: flex;
  justify-content: flex-end;
}

.btn-cancel {
  padding: 12px 24px;
  background-color: white;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  margin-right: 20px;
  cursor: pointer;
  font-size: 15px;
}

.btn-confirm {
  padding: 12px 24px;
  background-color: #409eff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 15px;
}

.btn-confirm:disabled {
  background-color: #a0cfff;
  cursor: not-allowed;
}
</style>