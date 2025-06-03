import Vue from 'vue';
import Router from 'vue-router';
import store from '@/store';

// 使用 Vue Router
Vue.use(Router);

// 定义路由组件
const LoginView = () => import('@/views/auth/LoginView.vue');
const RegisterView = () => import('@/views/auth/RegisterView.vue');
const MainView = () => import('@/views/MainView.vue');
const NotFoundView = () => import('@/views/other/NotFoundView.vue');

// 聊天模块
const ChatDetailView = () => import('@/views/child/chat/ChatDetailView.vue');

// 联系人模块
const ContactsView = () => import('@/views/child/ContactsView.vue');
const FriendRequestView = () => import('@/views/child/contact/FriendRequestView.vue');
const FriendRequestHandleView = () => import('@/views/child/contact/FriendRequestHandleView.vue');
const FriendDetailView = () => import('@/views/child/contact/FriendDetailView.vue');
const GroupDetailView = () => import('@/views/child/contact/GroupDetailView.vue');
const OwnInfoView = ()=>import('@/views/child/OwnInfoView.vue')

const routes = [
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: { requiresAuth: false } // 登录页面不需要认证
  },
  {
    path: '/register',
    name: 'register',
    component: RegisterView,
    meta: { requiresAuth: false } // 注册页面不需要认证
  },
  {
    path: '/',
    // redirect: '/chat', // 添加重定向规则
    component: MainView,
    meta: { requiresAuth: true }, // 主页面需要认证
    children: [
      {
        path: 'me',
        name: "me",
        component: OwnInfoView
      },
      // 聊天模块路由
      {
        path: 'chat',
        name: 'chat',
        component: ChatDetailView,
        meta: { requiresAuth: true } // 聊天页面需要认证
      },

      // 联系人模块路由
      {
        path: 'contacts',
        name: 'contacts',
        component: ContactsView,
        meta: { requiresAuth: true }, // 联系人页面需要认证
        children: [
          {
            path: 'requests',
            name: 'friendRequests',
            component: FriendRequestView,
            meta: { requiresAuth: true } // 好友请求页面需要认证
          },
          {
            path: 'requests/:id',
            name: 'handleFriendRequest',
            component: FriendRequestHandleView,
            meta: { requiresAuth: true }, // 处理好友请求页面需要认证
            props: true
          },
          {
            path: 'friend/:id',
            name: 'friendDetail',
            component: FriendDetailView,
            meta: { requiresAuth: true }, // 好友详情页面需要认证
            props: true
          },
          {
            path: 'group/:id',
            name: 'groupDetail',
            component: GroupDetailView,
            meta: { requiresAuth: true }, // 群组详情页面需要认证
            props: true
          }
        ]
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'notFound',
    component: NotFoundView,
    meta: { requiresAuth: false } // 404 页面不需要认证
  }
];

const router = new Router({
  mode: 'history', // 使用历史模式
  base: process.env.BASE_URL,
  routes
});

// 路由守卫
router.beforeEach(async (to, from, next) => {
  if (to.meta.requiresAuth) {
    // 检查 Vuex 中的认证状态
    if (store.getters.isAuthenticated && store.getters.getAccessToken) {
      next();
    } else {
      // 检查 localStorage 作为后备
      const localAccessToken = localStorage.getItem('accessToken');
      const localRefreshToken = localStorage.getItem('refreshToken');
      
      if (localAccessToken && localRefreshToken) {
        // 如果有本地 token，尝试恢复状态
        try {
          await store.dispatch('storeUser', {
            access: localAccessToken,
            refresh: localRefreshToken,
            user: JSON.parse(localStorage.getItem('user'))
          });
          next();
        } catch (e) {
          await store.dispatch('clearUserInfo');
          next('/login');
        }
      } else {
        if (to.name !== 'login' && to.name !== 'register') {
          next('/login');
        } else {
          next();
        }
      }
    }
  } else {
    next();
  }
});

export default router;