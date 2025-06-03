<template>
  <div
    class="group-info-sidebar"
    :class="{ active: isGroupInfoVisible }"
    @click.self="closeGroupInfo"
  >
    <!-- 遮罩层 -->
    <div class="overlay" v-if="isGroupInfoVisible"></div>

    <div class="group-info-content" @click.stop>
      <div class="group-info-header">
        <div class="group-info-avatar-container">
          <el-avatar
            icon="el-icon-user-solid"
            size="large"
            shape="square"
            :src="fullAvatarUrl(chat.avatar)"
            fit="fill"
          ></el-avatar>
        </div>
        <div class="group-info-name-container">
          <div class="group-info-name">{{ chat.name }}</div>
        </div>
      </div>

      <div class="group-info-description">
        <!-- 群组信息 -->
        <div class="management-section">
          <div class="section-title">群组信息</div>
          <p>群组名称：{{ chat.name }}</p>
          <p>成员数量：{{ membersMeta.total }}人</p>
        </div>

        <!-- 当前用户信息 -->
        <div
          v-if="currentUserInfo"
          class="management-section current-user-info"
        >
          <div class="section-title">我的信息</div>
          <p>
            我的昵称：
            <span class="nickname" @click.stop="editNickname">
              {{ currentUserInfo.nickname || currentUserInfo.username }}
            </span>
          </p>
          <p>我的角色：{{ currentUserInfo.role_display }}</p>
        </div>

        <!-- 成员列表 -->
        <div class="management-section group-member-list-container">
          <div class="section-title">
            成员列表 ({{ visibleMembers.length }}/{{ membersMeta.total }})
          </div>
          <el-scrollbar class="member-scroll-container" ref="memberScroll">
            <div
              v-for="member in visibleMembers"
              :key="member.user_id"
              class="member-item"
              :class="{ 'is-me': member.user_id === currentUserInfo?.user_id }"
            >
              <el-avatar
                icon="el-icon-user-solid"
                size="small"
                shape="square"
                :src="fullAvatarUrl(member.avatar)"
                fit="fill"
              ></el-avatar>
              <span class="member-name">
                {{ member.nickname || member.username }}
                <span
                  v-if="member.user_id === chat.creator_id"
                  class="creator-tag"
                  >(创建者)</span
                >
              </span>
              <span class="member-role">{{ member.role_display }}</span>
            </div>
            <div v-if="!allLoaded" class="load-more" @click="loadMoreMembers">
              加载更多
            </div>
          </el-scrollbar>
        </div>

        <!-- 操作按钮 -->
        <div class="bottom-actions">
          <el-button
            v-if="isGroupAdminOrOwner"
            type="primary"
            class="action-btn"
            @click="manageGroup"
          >
            管理群组
          </el-button>

          <el-button
            v-if="isGroupAdminOrOwner"
            type="primary"
            class="action-btn"
            @click="manageMembers"
          >
            管理成员
          </el-button>

          <el-button type="danger" class="action-btn" @click="exitGroup">
            退出群聊
          </el-button>

          <el-button
            v-if="isGroupOwner"
            type="danger"
            class="action-btn"
            @click="dismissGroup"
          >
            解散群组
          </el-button>
        </div>
      </div>
    </div>

    <!-- 修改昵称对话框 -->
    <el-dialog
      title="修改昵称"
      :visible.sync="nicknameDialogVisible"
      width="30%"
      :append-to-body="true"
    >
      <el-form>
        <el-form-item label="新昵称">
          <el-input
            v-model="newNickname"
            placeholder="请输入新的昵称"
            maxlength="10"
            show-word-limit
          ></el-input>
        </el-form-item>
      </el-form>
      <span slot="footer" class="dialog-footer">
        <el-button @click="nicknameDialogVisible = false">取 消</el-button>
        <el-button type="primary" @click="saveNickname">保 存</el-button>
      </span>
    </el-dialog>

    <!-- 管理群组对话框 -->
    <el-dialog
      title="管理群组"
      :visible.sync="groupManageDialogVisible"
      width="50%"
      :append-to-body="true"
    >
      <el-form label-width="100px">
        <el-form-item label="群组名称">
          <el-input
            v-model="newGroupName"
            placeholder="请输入新的群名称"
            maxlength="30"
            show-word-limit
          ></el-input>
        </el-form-item>

        <el-form-item label="群组描述">
          <el-input
            v-model="newGroupDescription"
            type="textarea"
            placeholder="请输入群组描述"
            maxlength="200"
            show-word-limit
          ></el-input>
        </el-form-item>

        <el-form-item label="群组头像">
          <div class="avatar-upload-container">
            <label class="avatar-uploader">
              <img
                v-if="newGroupAvatar"
                :src="fullAvatarUrl(newGroupAvatar)"
                class="avatar-preview"
              />
              <i v-else class="el-icon-plus avatar-uploader-icon"></i>
              <input
                type="file"
                accept="image/*"
                @change="handleFileChange"
                style="display: none"
                ref="fileInput"
              />
            </label>
            <div v-if="uploading" class="upload-progress">
              <el-progress :percentage="uploadProgress"></el-progress>
            </div>
          </div>
        </el-form-item>
      </el-form>
      <span slot="footer" class="dialog-footer">
        <el-button @click="groupManageDialogVisible = false">取 消</el-button>
        <el-button type="primary" @click="saveGroupInfo">保 存</el-button>
      </span>
    </el-dialog>

    <!-- 管理成员对话框 -->
    <el-dialog
      title="管理成员"
      :visible.sync="memberManageDialogVisible"
      width="70%"
      :append-to-body="true"
    >
      <div class="member-management-container">
        <div class="add-member-section">
          <el-button
            type="primary"
            icon="el-icon-plus"
            circle
            @click="openAddMemberDialog"
            style="margin-left: auto"
          ></el-button>
        </div>

        <el-table
          :data="manageMembersList"
          border
          style="width: 100%; margin-top: 20px"
        >
          <el-table-column prop="username" label="用户名" width="150">
            <template slot-scope="scope">
              <div style="display: flex; align-items: center">
                <el-avatar
                  size="small"
                  :src="fullAvatarUrl(scope.row.avatar)"
                  style="margin-right: 10px"
                ></el-avatar>
                {{ scope.row.username }}
              </div>
            </template>
          </el-table-column>
          <el-table-column
            prop="nickname"
            label="群昵称"
            width="150"
          ></el-table-column>
          <el-table-column label="角色" width="200">
            <template slot-scope="scope">
              <el-select
                v-model="scope.row.role"
                class="role-select"
                @change="handleRoleChange(scope.row)"
                :disabled="scope.row.user_id === chat.creator_id"
              >
                <el-option label="普通成员" :value="0"></el-option>
                <el-option label="管理员" :value="1"></el-option>
                <el-option
                  v-if="isGroupOwner"
                  label="群主"
                  :value="2"
                ></el-option>
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="180">
            <template slot-scope="scope">
              <div class="member-action-btns">
                <el-button
                  size="mini"
                  type="primary"
                  @click="saveMemberRole(scope.row)"
                  :disabled="scope.row.user_id === chat.creator_id"
                >
                  保存
                </el-button>
                <el-button
                  size="mini"
                  type="danger"
                  @click="removeMember(scope.row)"
                  :disabled="!canRemoveMember(scope.row)"
                >
                  移除
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>

        <!-- 新增：添加好友的对话框 -->
        <el-dialog
          title="选择好友添加到群组"
          :visible.sync="addMemberDialogVisible"
          append-to-body
          width="40%"
        >
          <el-form>
            <el-form-item label="搜索好友">
              <el-input
                v-model="searchFriend"
                placeholder="请输入用户名或ID"
                @input="fetchFriends"
              ></el-input>
            </el-form-item>
          </el-form>

          <!-- 多选区域 -->
          <div class="friend-checkbox-group">
            <el-checkbox-group v-model="selectedFriends">
              <div
                v-for="friend in filteredFriends"
                :key="friend.id"
                class="friend-item"
                :class="{ disabled: friend.isInGroup }"
              >
                <el-checkbox :label="friend.id" :disabled="friend.isInGroup">
                  <div style="display: flex; align-items: center">
                    <el-avatar
                      size="small"
                      :src="fullAvatarUrl(friend.avatar)"
                      style="margin-right: 10px"
                    ></el-avatar>
                    {{ friend.name }}
                    <span
                      v-if="friend.isInGroup"
                      style="color: #999; margin-left: 8px"
                      >(已在群内)</span
                    >
                  </div>
                </el-checkbox>
              </div>
            </el-checkbox-group>
          </div>

          <span slot="footer">
            <el-button @click="addMemberDialogVisible = false">取消</el-button>
            <el-button type="primary" @click="submitSelectedFriends"
              >确定添加</el-button
            >
          </span>
        </el-dialog>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import api from "@/api";
import Formatter from "@/format";

export default {
  props: {
    chat: {
      type: Object,
      required: true,
    },
    isGroupInfoVisible: {
      type: Boolean,
      default: false,
    },
  },

  data() {
    return {
      members: [],
      visibleMembers: [],
      membersMeta: { total: 0 },
      isGroupOwner: false,
      isGroupAdmin: false,
      allLoaded: false,
      currentUserInfo: null,
      nicknameDialogVisible: false,
      newNickname: "",
      groupManageDialogVisible: false,
      newGroupName: "",
      newGroupDescription: "",
      newGroupAvatar: null,
      uploading: false,
      uploadProgress: 0,
      memberManageDialogVisible: false,
      changedRoles: {},
      searchFriend: "",
      friends: [],
      selectedFriends: [],
      addMemberDialogVisible: false,
    };
  },

  computed: {
    isGroupAdminOrOwner() {
      return this.isGroupAdmin || this.isGroupOwner;
    },
    manageMembersList() {
      return this.members.filter(
        (member) =>
          member.user_id !== this.currentUserInfo?.user_id &&
          member.user_id !== this.chat.creator_id
      );
    },
    // 过滤出不在群内的好友
    filteredFriends() {
      const currentMemberIds = this.members.map((m) => m.user_id);
      return this.friends.map((friend) => ({
        ...friend,
        isInGroup: currentMemberIds.includes(friend.id),
      }));
    },
  },

  watch: {
    isGroupInfoVisible(val) {
      if (val) {
        this.fetchMembers();
      }
    },
  },

  methods: {
    openAddMemberDialog() {
      this.addMemberDialogVisible = true;
      this.fetchFriends();
    },
    fullAvatarUrl(url) {
      return Formatter.fullFileUrl(url);
    },
    formatDate(date) {
      return Formatter.formatTime(date);
    },
    closeGroupInfo() {
      this.$emit("update:isGroupInfoVisible", false);
    },
    async fetchMembers() {
      try {
        const res = await api.get(`/rooms/${this.chat.id}/member`);
        if (res.data.code === 0) {
          this.members = res.data.data.members;
          this.membersMeta.total = res.data.data.total;
          this.visibleMembers = this.members.slice(0, 10);
          this.allLoaded = this.visibleMembers.length >= this.members.length;

          const currentUserId = this.$store.state.user.id;
          const currentUser = this.members.find(
            (m) => m.user_id === currentUserId
          );
          if (currentUser) {
            this.currentUserInfo = {
              ...currentUser,
              role_display: this.getRoleDisplay(currentUser.role),
            };
            this.isGroupOwner = currentUser.role === 2;
            this.isGroupAdmin = currentUser.role === 1;
          }
        }
      } catch (error) {
        console.error("获取成员列表失败:", error);
        this.$message.error("获取成员列表失败");
      }
    },
    loadMoreMembers() {
      if (this.allLoaded) return;
      const start = this.visibleMembers.length;
      const end = start + 10;
      const newMembers = this.members.slice(start, end);
      this.visibleMembers = [...this.visibleMembers, ...newMembers];
      this.allLoaded = this.visibleMembers.length >= this.members.length;
    },
    getRoleDisplay(role) {
      const roles = { 0: "普通成员", 1: "管理员", 2: "群主" };
      return roles[role] || "未知角色";
    },
    editNickname() {
      this.newNickname = this.currentUserInfo.nickname || "";
      this.nicknameDialogVisible = true;
    },
    async saveNickname() {
      if (!this.newNickname.trim()) {
        this.$message.error("昵称不能为空");
        return;
      }

      try {
        const res = await api.put(`/rooms/${this.chat.id}/member`, {
          userId: this.currentUserInfo.user_id,
          nickname: this.newNickname,
        });

        if (res.data.code === 0) {
          this.$message.success("昵称修改成功");
          this.currentUserInfo.nickname = this.newNickname;
          this.updateLocalMember(this.currentUserInfo.user_id, {
            nickname: this.newNickname,
          });
          this.nicknameDialogVisible = false;
        } else {
          this.$message.error(res.data.message || "昵称修改失败");
        }
      } catch (error) {
        console.error("修改昵称失败:", error);
        this.$message.error("修改昵称失败");
      }
    },
    manageGroup() {
      this.newGroupName = this.chat.name;
      this.newGroupDescription = this.chat.description || "";
      this.newGroupAvatar = this.chat.avatar;
      this.groupManageDialogVisible = true;
    },
    handleFileChange(e) {
      const file = e.target.files[0];
      if (!file) return;
      this.uploadAvatar(file);
    },
    async uploadAvatar(file) {
      this.uploading = true;
      this.uploadProgress = 0;

      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await api.post(`/rooms/${this.chat.id}/avatar`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          onUploadProgress: (progressEvent) => {
            this.uploadProgress = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
          },
        });

        if (res.data.code === 0) {
          this.newGroupAvatar = res.data.data.url;
          this.$message.success("头像上传成功");
        } else {
          this.$message.error(res.data.message || "头像上传失败");
        }
      } catch (error) {
        console.error("头像上传失败:", error);
        this.$message.error("头像上传失败");
      } finally {
        this.uploading = false;
      }
    },
    async saveGroupInfo() {
      if (!this.newGroupName.trim()) {
        this.$message.error("群名称不能为空");
        return;
      }

      try {
        const res = await api.patch(`/rooms/${this.chat.id}/info`, {
          name: this.newGroupName,
          description: this.newGroupDescription,
          avatar: this.newGroupAvatar,
        });

        if (res.data.code === 0) {
          this.$message.success("群组信息更新成功");
          this.$emit("update-group-info", {
            name: this.newGroupName,
            description: this.newGroupDescription,
            avatar: this.newGroupAvatar,
          });
          this.groupManageDialogVisible = false;
        } else {
          this.$message.error(res.data.message || "群组信息更新失败");
        }
      } catch (error) {
        console.error("更新群组信息失败:", error);
        this.$message.error("更新群组信息失败");
      }
    },
    manageMembers() {
      this.memberManageDialogVisible = true;
      this.changedRoles = {};
      this.fetchFriends();
    },
    handleRoleChange(member) {
      this.changedRoles[member.user_id] = member.role;
    },
    canRemoveMember(member) {
      if (member.user_id === this.currentUserInfo.user_id) return false;
      if (member.user_id === this.chat.creator_id) return false;
      if (this.isGroupOwner) return true;
      if (this.isGroupAdmin) return member.role === 0;
      return false;
    },
    async saveMemberRole(member) {
      if (this.changedRoles[member.user_id] === undefined) {
        this.$message.warning("请先修改角色");
        return;
      }

      try {
        const res = await api.put(`/rooms/${this.chat.id}/member`, {
          userId: member.user_id,
          role: this.changedRoles[member.user_id],
        });

        if (res.data.code === 0) {
          this.$message.success("角色更新成功");
          member.role = this.changedRoles[member.user_id];
          member.role_display = this.getRoleDisplay(member.role);
          delete this.changedRoles[member.user_id];
        } else {
          this.$message.error(res.data.message || "角色更新失败");
        }
      } catch (error) {
        console.error("更新角色失败:", error);
        this.$message.error("更新角色失败");
      }
    },
    removeMember(member) {
      this.$confirm(
        `确定要移除成员 ${member.nickname || member.username} 吗?`,
        "提示",
        {
          confirmButtonText: "确定",
          cancelButtonText: "取消",
          type: "warning",
        }
      )
        .then(async () => {
          try {
            const res = await api.delete(`/rooms/${this.chat.id}/member`, {
              data: { user_id: member.user_id },
            });

            if (res.data.code === 0) {
              this.$message.success("成员移除成功");
              this.members = this.members.filter(
                (m) => m.user_id !== member.user_id
              );
              this.visibleMembers = this.visibleMembers.filter(
                (m) => m.user_id !== member.user_id
              );
              this.membersMeta.total--;
            } else {
              this.$message.error(res.data.message || "成员移除失败");
            }
          } catch (error) {
            console.error("移除成员失败:", error);
            this.$message.error("移除成员失败");
          }
        })
        .catch(() => {});
    },
    async fetchFriends() {
      if (!this.searchFriend.trim()) {
        this.$message.error("请输入好友姓名或ID进行搜索");
        return;
      }

      try {
        const res = await api.get("/friends", {
          params: { keyword: this.searchFriend },
        });

        if (res.data.code === 0) {
          this.friends = res.data.data.friends.map((friend) => ({
            id: friend.id,
            name: friend.username,
            avatar: friend.avatar,
          }));
        } else {
          this.friends = [];
          this.$message.error(res.data.message || "获取好友列表失败");
        }
      } catch (error) {
        console.error("搜索好友失败:", error);
        this.friends = [];
        this.$message.error("搜索好友失败");
      }
    },
    async submitSelectedFriends() {
      if (this.selectedFriends.length === 0) {
        this.$message.warning("请选择至少一位好友");
        return;
      }

      for (const userId of this.selectedFriends) {
        await this.addMember(userId);
      }

      this.addMemberDialogVisible = false;
      this.selectedFriends = [];
    },
    async addMember(userId) {
      try {
        const res = await api.post(`/rooms/${this.chat.id}/member`, {
          userId: userId,
        });

        if (res.data.code === 0) {
          this.$message.success("成员添加成功");
          this.fetchMembers();
        } else {
          this.$message.error(res.data.message || "成员添加失败");
        }
      } catch (error) {
        console.error("添加成员失败:", error);
        this.$message.error("添加成员失败");
      }
    },
    updateLocalMember(userId, data) {
      const index = this.members.findIndex((m) => m.user_id === userId);
      if (index !== -1) {
        this.members[index] = { ...this.members[index], ...data };
      }
      const visIndex = this.visibleMembers.findIndex(
        (m) => m.user_id === userId
      );
      if (visIndex !== -1) {
        this.visibleMembers[visIndex] = {
          ...this.visibleMembers[visIndex],
          ...data,
        };
      }
    },
    exitGroup() {
      if (this.isGroupOwner) {
        this.$confirm(
          "您是群主，退出群聊前需要先转让群主身份。是否继续?",
          "提示",
          {
            confirmButtonText: "确定",
            cancelButtonText: "取消",
            type: "warning",
          }
        )
          .then(() => this.doExitGroup())
          .catch(() => {});
      } else {
        this.doExitGroup();
      }
    },
    async doExitGroup() {
      try {
        const res = await api.delete(`/rooms/${this.chat.id}/member`, {
          data: { user_id: this.currentUserInfo.user_id },
        });

        if (res.data.code === 0) {
          this.$message.success("已成功退出群组");
          this.$emit("exit-group");
          this.closeGroupInfo();
        } else {
          this.$message.error(res.data.message || "退出群组失败");
        }
      } catch (error) {
        console.error("退出群组失败:", error);
        this.$message.error("退出群组失败");
      }
    },
    dismissGroup() {
      this.$confirm("确定要解散该群组吗？此操作不可撤销！", "警告", {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "error",
      })
        .then(async () => {
          try {
            const res = await api.delete(`/rooms/${this.chat.id}`);

            if (res.data.code === 0) {
              this.$message.success("群组已解散");
              this.$emit("group-dismissed");
              this.closeGroupInfo();
            } else {
              this.$message.error(res.data.message || "解散群组失败");
            }
          } catch (error) {
            console.error("解散群组失败:", error);
            this.$message.error("解散群组失败");
          }
        })
        .catch(() => {});
    },
  },
};
</script>

<style scoped>
.group-info-sidebar {
  position: fixed;
  top: 0;
  right: -400px;
  width: 400px;
  height: 100%;
  background-color: #fff;
  box-shadow: -2px 0 10px rgba(0, 0, 0, 0.1);
  z-index: 2000;
  transition: right 0.3s ease;
  overflow-y: auto;
}

.group-info-sidebar.active {
  right: 0;
}

.overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 400px;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.3);
  z-index: 1999;
  cursor: pointer;
}

.group-info-header {
  display: flex;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e6e6e6;
}

.group-info-avatar-container {
  width: 60px;
  height: 60px;
  margin-right: 15px;
}

.group-info-name-container {
  flex: 1;
}

.group-info-name {
  font-size: 18px;
  font-weight: bold;
  color: #333;
}

.management-section {
  margin-bottom: 20px;
  padding: 15px;
  background-color: #f8f9fa;
  border-radius: 4px;
}

.section-title {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 12px;
  color: #333;
  display: flex;
  align-items: center;
}

.section-title::before {
  content: "";
  display: inline-block;
  width: 4px;
  height: 16px;
  background-color: #409eff;
  margin-right: 8px;
  border-radius: 2px;
}

.current-user-info {
  background-color: #f0f7ff;
}

.nickname {
  color: #409eff;
  cursor: pointer;
  padding: 2px 5px;
  border-radius: 3px;
}

.nickname:hover {
  background-color: #ecf5ff;
}

.member-scroll-container {
  max-height: 300px;
}

.member-item {
  display: flex;
  align-items: center;
  padding: 10px;
  margin-bottom: 8px;
  background-color: #fff;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.member-item.is-me {
  background-color: #f0f7ff;
  border-left: 3px solid #409eff;
}

.member-name {
  flex: 1;
  margin-left: 10px;
  color: #333;
}

.creator-tag {
  font-size: 12px;
  color: #f56c6c;
  margin-left: 5px;
}

.member-role {
  font-size: 12px;
  padding: 3px 8px;
  border-radius: 10px;
  background-color: #e6e6e6;
  color: #666;
}

.load-more {
  text-align: center;
  padding: 10px;
  color: #409eff;
  cursor: pointer;
  font-size: 14px;
}

.load-more:hover {
  background-color: #f5f7fa;
}

.bottom-actions {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.action-btn {
  min-width: 120px;
  width: 100%;
}

.avatar-upload-container {
  display: flex;
  align-items: center;
  gap: 20px;
}

.avatar-preview {
  width: 120px;
  height: 120px;
  border-radius: 4px;
  object-fit: cover;
  border: 1px dashed #dcdfe6;
}

.avatar-uploader {
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  cursor: pointer;
  width: 120px;
  height: 120px;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
}

.avatar-uploader:hover {
  border-color: #409eff;
}

.avatar-uploader-icon {
  font-size: 28px;
  color: #8c939d;
}

.upload-progress {
  flex: 1;
}

.role-select {
  width: 100%;
}

.member-action-btns {
  display: flex;
  gap: 8px;
}

.member-management-container {
  width: 100%;
}

.add-member-section {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 20px;
}

.friend-item {
  display: flex;
  align-items: center;
  padding: 6px 0;
}

.friend-item .el-checkbox__label {
  display: flex;
  align-items: center;
}

.add-member-section {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
}

.friend-checkbox-group {
  max-height: 300px;
  overflow-y: auto;
}

.friend-item {
  padding: 6px 0;
  transition: background-color 0.2s ease;
}

.friend-item:hover {
  background-color: #f5f7fa;
}

.friend-item.disabled {
  opacity: 0.6;
}
</style>