import axios from 'axios';
import store from '@/store';

// 创建 axios 实例
const api = axios.create({
  baseURL: 'http://localhost:8000/apis/' // axios 的基础路径
});


// 请求拦截器修改
api.interceptors.request.use(
  config => {
    const token = store.getters.getAccessToken; // 从 Vuex 获取 access token
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// 响应拦截器修改
api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = store.getters.getRefreshToken;
        if (!refreshToken) throw new Error('No refresh token');
        
        const response = await api.post('/auth/refresh', { refresh: refreshToken });
        const { access, refresh } = response.data.data;
        
        // 使用 Vuex action 更新 token
        await store.dispatch('storeUser', {
          access,
          refresh,
          user: store.state.user // 保持现有用户信息
        });
        
        originalRequest.headers['Authorization'] = `Bearer ${access}`;
        return api(originalRequest);
      } catch (refreshError) {
        console.error('刷新 token 失败:', refreshError);
        await store.dispatch('clearUserInfo');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default api;