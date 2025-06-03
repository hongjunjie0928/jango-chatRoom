<template>
  <el-container class="contacts-container">
    <!-- 列表区 -->
    <el-aside width="300px" class="contacts-list">
      <div class="search-box">
        <el-input
          v-model="searchQuery"
          placeholder="搜索联系人..."
          prefix-icon="el-icon-search"
          clearable
        />
        <el-button
          type="primary"
          @click="toggleAddFriendMode"
          :icon="addFriendMode ? 'el-icon-circle-close' : 'el-icon-user-plus'"
        >
          {{ addFriendMode ? "取消添加" : "添加好友" }}
        </el-button>
      </div>

      <!-- 好友申请部分 -->
      <div class="contact-section">
        <div
          v-if="!addFriendMode"
          class="friend-request-card"
          @click="navigateToFriendRequests"
        >
          <div class="item-style">
            <div class="icon-container">
              <div class="notification-dot" v-if="hasPendingRequests">
                {{ pendingRequestsCount }}
              </div>
            </div>
            <div class="request-name">新的好友</div>
          </div>
        </div>
      </div>

      <!-- 联系人列表和添加好友列表的切换 -->
      <div v-if="!addFriendMode" class="contacts-wrapper">
        <!-- 可折叠的好友和群组部分 -->
        <el-collapse v-model="activeNames" class="contacts-collapse">
          <!-- 好友部分 -->
          <el-collapse-item title="好友" name="1">
            <el-menu class="contact-list">
              <el-menu-item
                v-for="friend in filteredFriends"
                :key="friend.friendId"
                @click="navigateToChat(friend.friendId)"
              >
                <el-avatar :src="fullAvatarUrl(friend.avatar)" size="small" />
                <span>{{
                  friend.remark ? friend.remark : friend.nickname
                }}</span>
              </el-menu-item>
            </el-menu>
          </el-collapse-item>

          <!-- 群组部分 -->
          <el-collapse-item title="群组" name="2">
            <el-menu class="contact-list">
              <el-menu-item
                v-for="group in filteredGroups"
                :key="group.id"
                @click="navigateToGroupDetail(group.id)"
              >
                <el-avatar :src="fullAvatarUrl(group.avatar)" size="small" />
                <span>{{ group.name }}</span>
              </el-menu-item>
            </el-menu>
          </el-collapse-item>
        </el-collapse>
      </div>

      <!-- 添加好友搜索部分 -->
      <div v-else class="search-results-wrapper">
        <el-menu class="contact-list search-results">
          <el-menu-item
            v-for="user in searchResults"
            :key="user.id"
            @click="showUserDetail(user.id)"
          >
            <el-avatar :src="fullAvatarUrl(user.avatar)" size="small" />
            <span>{{ user.nickname }}</span>
          </el-menu-item>
        </el-menu>
      </div>
    </el-aside>

    <!-- 数据区 -->
    <el-main class="content-area">
      <router-view />
      <!-- 用户详情面板 -->
      <el-dialog title="用户详情" :visible.sync="userDetailVisible" width="30%">
        <div v-if="selectedUser">
          <el-avatar :src="selectedUser.avatar" size="large" />
          <h3>{{ selectedUser.name }}</h3>
          <p>邮箱: {{ selectedUser.email }}</p>
          <p>电话: {{ selectedUser.phone }}</p>
          <div v-if="!isAlreadyFriend(selectedUser.id)">
            <el-button type="primary" @click="addFriend(selectedUser.id)"
              >添加到通讯录</el-button
            >
          </div>
          <div v-else>
            <p>已经是好友</p>
          </div>
        </div>
      </el-dialog>

      <!-- 添加好友申请信息面板 -->
      <el-dialog
        title="添加好友申请"
        :visible.sync="addFriendInfoVisible"
        width="30%"
      >
        <el-form>
          <el-form-item label="申请信息">
            <el-input
              v-model="friendRequestMessage"
              type="textarea"
              placeholder="请输入申请信息..."
              :rows="4"
            />
          </el-form-item>
          <el-form-item label="备注">
            <el-input
              v-model="friendRequestRemark"
              placeholder="请输入备注信息..."
            />
          </el-form-item>
        </el-form>
        <div slot="footer" class="dialog-footer">
          <el-button @click="cancelAddFriend">取消</el-button>
          <el-button type="primary" @click="sendFriendRequest">发送</el-button>
        </div>
      </el-dialog>
    </el-main>
  </el-container>
</template>

<script>
import api from "@/api";
import Formatter from "@/format";
import "@/event-bus";

export default {
  data() {
    return {
      hasPendingRequests: false,
      // 搜索按钮绑定的值
      searchQuery: "",

      // 控制展开的折叠面板，默认展开好友和群组
      activeNames: ["1", "2"],

      // 标志是否处于添加好友模式
      addFriendMode: false,

      // 待处理的好友申请数量
      pendingRequestsCount: 0,

      // 好友列表
      friends: [],

      // 群组列表
      groups: [],

      // 搜索按钮绑定的值
      searchResults: [],

      // 用户详情面板的显示/隐藏状态控制
      userDetailVisible: false,

      // 添加好友申请信息面板的显示/隐藏状态控制
      addFriendInfoVisible: false,

      // 当前选中的用户，用于展示用户详情或发送好友申请
      selectedUser: null,

      // 添加好友申请时的申请信息
      friendRequestMessage: "",

      // 添加好友申请时的备注信息
      friendRequestRemark: "",
    };
  },

  computed: {
    // 过滤后的好友列表（支持搜索）
    filteredFriends() {
      if (!this.searchQuery.trim()) {
        return this.friends;
      }
      const query = this.searchQuery.toLowerCase();
      return this.friends.filter((friend) => {
        const remark = friend.remark ? friend.remark.toLowerCase() : "";
        const nickname = friend.nickname ? friend.nickname.toLowerCase() : "";
        return remark.includes(query) || nickname.includes(query);
      });
    },

    // 过滤后的群组列表（支持搜索）
    filteredGroups() {
    let result = this.groups;

    // 先按搜索关键词过滤
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      result = result.filter((group) =>
        group.name?.toLowerCase().includes(query)
      );
    }

    // 再排除 status === 0 的群组
    result = result.filter(group => group.status !== 0);

    return result;
  },
  },

  mounted() {
    this.fetchFriendsAndGroups();
    this.fetchPendingRequestsCount();

    this.$bus.$on("user-info-updated", (body) => {
      this.handleUserInfoUpdate(body);
    });

    this.$bus.$on("friend-updated", (updatedFriend) => {
      const index = this.friends.findIndex(
        (f) => f.friendId === updatedFriend.friendId
      );
      if (index !== -1) {
        // 更新好友信息
        this.friends[index] = {
          ...this.friends[index],
          remark: updatedFriend.remark,
          avatar: updatedFriend.avatar,
          email: updatedFriend.email,
          online: updatedFriend.online,
          phone: updatedFriend.phone,
          common_room_count: updatedFriend.common_room_count,
        };
      }
    });
  },

  beforeDestroy() {
    this.$bus.$off("friend-updated");
    this.$bus.$off("user-info-updated");
    if (this.timer) clearTimeout(this.timer);
  },

  methods: {
    fullAvatarUrl(url) {
      return Formatter.fullFileUrl(url);
    },

    async fetchFriendsAndGroups() {
      if (this.isDataLoaded) return;

      try {
        const [friendsRes, groupsRes] = await Promise.all([
          api.get("/friends"),
          api.get("/rooms"),
        ]);

        if (friendsRes.data.code === 0) {
          this.friends = friendsRes.data.data.friends;
        }

        if (groupsRes.data.code === 0) {
          this.groups = groupsRes.data.data.groups;
        }

        this.isDataLoaded = true;
      } catch (error) {
        console.error("数据加载失败:", error);
      }
    },

    handleUserInfoUpdate(userData) {
      if (!userData || !this.friends || this.friends.length === 0) return;

      const index = this.friends.findIndex(
        (friend) => friend.id === userData.userId
      );

      if (index !== -1) {
        this.$set(this.friends, index, {
          ...this.friends[index],
          avatar: userData.avatar,
          nickname: userData.nickname,
          isOnline: userData.isOnline,
          common_room_count: userData.common_room_count,
          email: userData.email,
          username: userData.username,
          phone: userData.phone,
        });

        this.$message.success(`好友 ${userData.nickname} 信息已更新`);
      }
    },

    fetchPendingRequestsCount() {
      // TODO: 实现获取待处理好友申请数量
    },

    handleSearch: function () {
      if (this.addFriendMode) {
        if (this.timer) {
          clearTimeout(this.timer);
        }

        this.timer = setTimeout(() => {
          if (this.searchQuery.trim() === "") {
            this.searchResults = [];
            return;
          }

          api
            .get(`/users?search=${this.searchQuery}`)
            .then((response) => {
              if (response.data.code === 0) {
                this.searchResults = response.data.data.users.results;
              } else {
                console.error("搜索用户失败:", response.data.message);
              }
            })
            .catch((error) => {
              console.error("搜索用户失败:", error);
            });
        }, 800);
      }
    },

    navigateToFriendRequests() {
      if (this.$route.path !== "/contacts/requests") {
        this.$router.push("/contacts/requests");
      }
    },

    navigateToChat(id) {
      if (this.$route.path !== "/contacts/friend/" + id) {
        this.$router.push({ name: "friendDetail", params: { id: id } });
      }
    },

    navigateToGroupDetail(groupId) {
      if (this.$route.path !== `/contacts/group/${groupId}`) {
        this.$router.push({ name: "groupDetail", params: { id: groupId } });
      }
    },

    toggleAddFriendMode() {
      this.addFriendMode = !this.addFriendMode;
      this.searchQuery = "";
      if (this.addFriendMode) {
        this.handleSearch();
      }
    },

    showUserDetail(userId) {
      const user = this.searchResults.find((u) => u.id === userId);
      if (user) {
        this.selectedUser = user;
        this.userDetailVisible = true;
      }
    },

    isAlreadyFriend(userId) {
      return this.friends.some((friend) => friend.id === userId);
    },

    addFriend(userId) {
      this.userDetailVisible = false;
      this.addFriendInfoVisible = true;
      this.selectedUser = this.searchResults.find((u) => u.id === userId);
    },

    sendFriendRequest() {
      api
        .post("/friends/request", {
          to_user_id: this.selectedUser.id,
          message: this.friendRequestMessage,
          remark: this.friendRequestRemark,
        })
        .then((response) => {
          if (response.data.code === 0) {
            this.$notify({
              title: "成功",
              message: "好友申请已发送",
              type: "success",
              duration: 3000,
            });
          }
        })
        .catch((error) => {
          console.error("发送好友申请失败:", error);
          this.$notify({
            title: "错误",
            message: error.response?.data?.message || "未知错误",
            type: "error",
            duration: 3000,
          });
        });
      this.addFriendInfoVisible = false;
    },

    cancelAddFriend() {
      this.addFriendInfoVisible = false;
      this.selectedUser = null;
      this.friendRequestMessage = "";
      this.friendRequestRemark = "";
    },
  },
};
</script>

<style scoped>
.contacts-container {
  height: 100vh;
  overflow: hidden;
}

.contacts-list {
  border-right: 1px solid #e4e7ed;
  overflow-y: auto;
}

.search-box {
  padding: 15px;
  display: flex;
  align-items: center;
}

.search-box .el-button {
  margin-left: 10px;
}

.friend-request-card {
  margin-bottom: 10px;
  cursor: pointer;
}

.item-style {
  display: flex;
  align-items: center;
  padding: 12px 15px;
  border-radius: 4px;
  background-color: #fff;
  transition: background-color 0.3s;
  box-shadow: none;
  border: none;
}

.item-style:hover {
  background-color: #f5f7fa;
}

.icon-container {
  position: relative;
  margin-right: 15px;
}

.notification-dot {
  position: absolute;
  top: -5px;
  right: -5px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background-color: #ff4d4f;
  color: white;
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.request-name {
  font-weight: bold;
}

.contact-list {
  border: none;
}

.contact-list .el-menu-item {
  padding: 12px 15px;
  margin: 2px 0;
  border-radius: 4px;
}

.contact-list .el-menu-item:hover {
  background-color: #f5f7fa;
}

.contacts-collapse >>> .el-collapse-item__header {
  padding-left: 15px;
  font-weight: bold;
  color: #303133;
}

.contacts-collapse >>> .el-collapse-item__wrap {
  border-bottom: none;
}

.contacts-collapse >>> .el-collapse-item__content {
  padding-bottom: 5px;
}

.content-area {
  padding: 0;
}

.contacts-wrapper,
.search-results-wrapper {
  max-height: calc(100vh - 180px);
  overflow-y: auto;
}

.search-results {
  border: none;
}

.search-results .el-menu-item {
  padding: 12px 15px;
  margin: 2px 0;
  border-radius: 4px;
}

.search-results .el-menu-item:hover {
  background-color: #f5f7fa;
}
</style>