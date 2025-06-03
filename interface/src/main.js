import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import ElementUI from 'element-ui'
import 'element-ui/lib/theme-chalk/index.css';
import '@fortawesome/fontawesome-free/css/all.min.css'

Vue.prototype.$backServerUrl = "http://localhost:8000"
Vue.config.productionTip = false
Vue.use(ElementUI)

import EventBus from './event-bus'
Vue.prototype.$bus = EventBus

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')
