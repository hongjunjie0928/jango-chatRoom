import Vue from 'vue'
import Vuex from 'vuex'
import stompService from '@/stompService'

Vue.use(Vuex)

export default new Vuex.Store({
  state: {
    // 存储用户的 access token
    accessToken: localStorage.getItem('accessToken') || null,
    // 存储用户的 refresh token
    refreshToken: localStorage.getItem('refreshToken') || null,
    // 存储用户信息
    user: JSON.parse(localStorage.getItem('user')) || null,
    // 存储用户是否登录的状态
    isAuthenticated: JSON.parse(localStorage.getItem('isAuthenticated')) || false ,
    stompCilent : stompService,
  
  },
  getters: {
    // 获取用户的 access token
    getAccessToken: state => state.accessToken,
    // 获取用户的 refresh token
    getRefreshToken: state => state.refreshToken,
    // 获取用户信息
    getUser: state => state.user,
    // 获取用户登录状态
    isAuthenticated: state => state.isAuthenticated
  },
  mutations: {
    // 设置用户的 access token
    SET_ACCESS_TOKEN(state, token) {
      state.accessToken = token
      localStorage.setItem('accessToken', token)
    },
    // 设置用户的 refresh token
    SET_REFRESH_TOKEN(state, token) {
      state.refreshToken = token
      localStorage.setItem('refreshToken', token)
    },
    // 设置用户信息
    SET_USER(state, user) {
      state.user = user
      localStorage.setItem('user', JSON.stringify(user))
    },
    // 设置用户登录状态
    SET_AUTHENTICATED(state, status) {
      state.isAuthenticated = status
      localStorage.setItem('isAuthenticated', JSON.stringify(status))
    },
    // 清除用户信息（登出时调用）
    CLEAR_USER_INFO(state) {
      state.accessToken = null
      state.refreshToken = null
      state.user = null
      state.isAuthenticated = false
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
      localStorage.removeItem('isAuthenticated')
    }
  },
  actions: {
    // 存储用户登录信息
    storeUser({ commit }, userData) {
      const { access, refresh, user } = userData
      commit('SET_ACCESS_TOKEN', access)
      commit('SET_REFRESH_TOKEN', refresh)
      commit('SET_USER', user)
      commit('SET_AUTHENTICATED', true)
    },
    // 清除用户信息（登出）
    clearUserInfo({ commit }) {
      commit('CLEAR_USER_INFO')
    },
    // 可以在这里添加其他与认证相关的操作，如刷新 token 等
  },
  modules: {
    // 如果有模块，可以在这里添加
  }
})