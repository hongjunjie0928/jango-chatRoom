import { Client } from '@stomp/stompjs';

class StompClient {
  constructor(config = {}) {
    // 默认配置
    this.defaultConfig = {
      brokerURL: 'ws://localhost:8000/ws/stomp',
      connectHeaders: {
        'accept-version': '1.2',
        'heart-beat': '4000,4000'
      },
      reconnectDelay: 5000,
      maxReconnectAttempts: 5,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      debug: false,
      autoReconnect: true,
      queueMaxSize: 100,
      connectionTimeout: 10000,
      splitLargeFrames: true, // 自动处理大帧分片
      maxWebSocketChunkSize: 20 * 1024, // 设置最大分片大小

      // 钩子函数
      onConnect: () => {},
      onDisconnect: () => {},
      onStompError: (frame) => console.error('[STOMP] 协议错误:', frame.headers?.message),
      onWebSocketError: (err) => console.error('[WS] 错误:', err),
      onReconnect: (attempt) => console.log(`[STOMP] 正在重连... (第 ${attempt} 次)`),
      onMessageError: (e, msg) => console.error('[STOMP] 消息解析失败', e, msg),
      onBeforeSend: (message) => message
    };

    this.config = { ...this.defaultConfig, ...config };
    this.client = null;
    this.userId = null;
    this.subscriptions = new Map(); // 使用 Map 更好管理订阅
    this.messageQueue = [];
    this.subscriptionQueue = [];
    this.reconnectAttempts = 0;
    this.connectionTimeoutRef = null;
    this.isExplicitDisconnect = false;

    this._init();
  }

  _init() {
    this.client = new Client({
      brokerURL: this.config.brokerURL,
      connectHeaders: this.config.connectHeaders,
      reconnectDelay: this.config.reconnectDelay,
      heartbeatIncoming: this.config.heartbeatIncoming,
      heartbeatOutgoing: this.config.heartbeatOutgoing,

      debug: this.config.debug ? (msg) => console.log('[STOMP Debug]', msg) : undefined,
      autoConvertBinaryToString: true,

      onConnect: (frame) => {
        this._handleConnectSuccess(frame);
      },

      onStompError: (frame) => {
        this.config.onStompError(frame);
        this._handleConnectionError(new Error(frame.headers?.message || 'STOMP协议错误'));
      },

      onWebSocketClose: () => {
        if (!this.isExplicitDisconnect) {
          this._handleConnectionError(new Error('WebSocket连接关闭'));
        }
      },

      onWebSocketError: (event) => {
        this.config.onWebSocketError(event);
        this._handleConnectionError(new Error('WebSocket错误'));
      },

      onDisconnect: () => {
        this._handleDisconnect();
      }
    });

    this.client.webSocketFactory = () => {
      const url = new URL(this.config.brokerURL);
      if (this.userId) {
        url.searchParams.set('uid', this.userId);
      }
      const ws = new WebSocket(url.toString());
      ws.addEventListener('error', (event) => {
        console.error('[WS] WebSocket创建错误:', event);
      });
      return ws;
    };
  }

  /**
   * 连接 STOMP 服务
   */
  // 连接函数，用于连接STOMP服务器
  connect(userId, options = {}) {
    // 返回一个Promise对象
    return new Promise((resolve, reject) => {
      // 如果客户端已经连接，则打印警告信息并返回
      if (this.client.connected) {
        console.warn('[STOMP] 客户端已连接');
        return resolve();
      }

      // 将isExplicitDisconnect设置为false，表示未主动断开连接
      this.isExplicitDisconnect = false;
      // 设置userId
      this.userId = userId;

      // 设置连接头信息
      this.client.connectHeaders = {
        ...this.client.connectHeaders,
        'user-id': this.userId,
        'client-id': `client-${userId}-${Date.now()}`
      };

      // 获取连接超时时间，默认为config.connectionTimeout
      const timeout = options.timeout || this.config.connectionTimeout;
      // 设置连接超时定时器
      this.connectionTimeoutRef = setTimeout(() => {
        this.connectionTimeoutRef = null;
        // 如果连接超时，则断开连接并返回错误信息
        if (!this.client.connected) {
          this.disconnect(true);
          reject(new Error('连接超时'));
        }
      }, timeout);

      // 保存原始的onConnect函数
      const originalOnConnect = this.client.onConnect;
      // 设置新的onConnect函数
      this.client.onConnect = (frame) => {
        // 清除连接超时定时器
        clearTimeout(this.connectionTimeoutRef);
        this.connectionTimeoutRef = null;
        // 调用原始的onConnect函数
        originalOnConnect(frame);
        // 解析Promise
        resolve(frame);
        // 将onConnect函数恢复为原始的onConnect函数
        setTimeout(() => {
          this.client.onConnect = originalOnConnect;
        }, 0);
      };

      // 保存原始的onStompError函数
      const originalOnStompError = this.client.onStompError;
      // 设置新的onStompError函数
      this.client.onStompError = (frame) => {
        // 清除连接超时定时器
        clearTimeout(this.connectionTimeoutRef);
        this.connectionTimeoutRef = null;
        // 调用原始的onStompError函数
        originalOnStompError(frame);
        // 返回错误信息
        reject(new Error(frame.headers?.message || 'STOMP连接错误'));
        // 将onStompError函数恢复为原始的onStompError函数
        setTimeout(() => {
          this.client.onStompError = originalOnStompError;
        }, 0);
      };

      // 尝试激活客户端
      try {
        this.client.activate();
      } catch (err) {
        // 如果激活失败，则返回错误信息
        reject(err);
      }
    });
  }

  /**
   * 断开连接
   */
  // 断开连接
  disconnect(force = false) {
    // 设置断开连接标志
    this.isExplicitDisconnect = true;

    // 如果存在连接超时引用，则清除超时引用
    if (this.connectionTimeoutRef) {
      clearTimeout(this.connectionTimeoutRef);
      this.connectionTimeoutRef = null;
    }

    // 如果强制断开连接，则调用客户端的forceDisconnect方法
    if (force) {
      this.client.forceDisconnect();
    } else {
      // 否则，调用客户端的deactivate方法
      this.client.deactivate();
    }
  }

  /**
   * 订阅某个目的地
   */
  // 订阅方法
  subscribe(destination, callback) {
    // 如果客户端未连接，则将订阅加入队列
    if (!this.client.connected) {
      console.warn("[STOMP] 尚未连接，加入订阅队列", destination);
      this.subscriptionQueue.push({ destination, callback });
      return;
    }
  
    // 生成订阅ID
    const subscriptionId = `sub-${Math.random().toString(36).substr(2, 9)}`;
    console.log(`[DEBUG] 准备订阅: ${destination}, ID=${subscriptionId}`);
  
    try {
      // 订阅
      const subscription = this.client.subscribe(
        destination,
        (message) => {
          // console.log('📥 接收到原始消息:', message); // 新增调试
          try {
            // 调用回调函数
            callback(message);
          } catch (e) {
            // 如果回调函数出错，则调用配置中的onMessageError方法
            this.config.onMessageError(e, message);
          }
        },
        {
          // 设置订阅ID和自动确认
          id: subscriptionId,
          ack: 'auto'
        },
      );
  
      // 将订阅信息加入订阅集合
      this.subscriptions.set(subscriptionId, { destination, subscription });
      console.log(`✅ 已订阅: ${destination}, ID=${subscriptionId}`);
    } catch (error) {
      // 如果订阅失败，则输出错误信息
      console.error(`❌ 订阅失败: ${destination}`, error);
    }
  }

  /**
   * 取消订阅
   */
  unsubscribe(destination) {
    for (const [id, sub] of this.subscriptions.entries()) {
      if (sub.destination === destination) {
        sub.subscription.unsubscribe();
        this.subscriptions.delete(id);
        console.log(`🗑️ 已取消订阅: ${destination}`);
        break;
      }
    }
  }

  /**
   * 发送消息
   */
  send(destination, body, headers = {}, options = {}) {
    if (!this.client.connected) {
      console.warn('[STOMP] 未连接，无法发送消息');
      if (options.queueWhileDisconnected) {
        this.messageQueue.push({ destination, body, headers });
      }
      return false;
    }

    try {
      this.client.publish({
        destination,
        body: JSON.stringify(body),
        headers
      });
      return true;
    } catch (error) {
      console.error(`[STOMP] 发送消息失败: ${destination}`, error);
      return false;
    }
  }

  /**
   * 获取当前连接状态
   */
  isConnected() {
    return this.client?.connected || false;
  }

  /**
   * 重新订阅所有队列中的订阅
   */
  _resubscribeAll() {
    this.subscriptionQueue.forEach(({ destination, callback }) => {
      this.subscribe(destination, callback);
    });
    this.subscriptionQueue = [];
  }

  /**
   * 处理连接成功事件
   */
  _handleConnectSuccess(frame) {
    console.log("✅ STOMP 连接已建立", frame);
    this.reconnectAttempts = 0;
    this._resubscribeAll();
    this.config.onConnect(frame);
    window.dispatchEvent(new CustomEvent('stomp.connected', { detail: frame }));
  }

  /**
   * 处理连接错误
   */
  _handleConnectionError(error) {
    console.error("❌ STOMP 连接异常:", error.message);
    if (this.connectionTimeoutRef) {
      clearTimeout(this.connectionTimeoutRef);
      this.connectionTimeoutRef = null;
    }

    if (!this.isExplicitDisconnect && this.config.autoReconnect) {
      this._handleReconnect();
    }
  }

  /**
   * 处理断开连接
   */
  _handleDisconnect() {
    console.log("🔌 STOMP 连接已断开");
    this.config.onDisconnect();
    window.dispatchEvent(new CustomEvent('stomp.disconnected'));

    if (!this.isExplicitDisconnect && this.config.autoReconnect) {
      this._handleReconnect();
    }
  }

  /**
   * 自动重连机制
   */
  _handleReconnect() {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.warn(`[STOMP] 达到最大重连次数 (${this.config.maxReconnectAttempts})`);
      return;
    }

    this.reconnectAttempts++;
    this.config.onReconnect(this.reconnectAttempts);

    setTimeout(async () => {
      if (!this.client.connected && !this.isExplicitDisconnect) {
        console.log(`🔄 正在尝试重连 (${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`);
        await this.client.activate();
      }
    }, this.config.reconnectDelay);
  }

  /**
   * 处理消息队列（连接成功后）
   */
  _processMessageQueue() {
    while (this.messageQueue.length > 0) {
      const item = this.messageQueue.shift();
      this.send(item.destination, item.body, item.headers, { queueWhileDisconnected: false });
    }
  }
}

// 单例导出
const stompService = new StompClient({
  debug: true,
  // debug: process.env.NODE_ENV === 'development',
  onConnect: (frame) => {
    console.log("🔗 STOMP 连接成功", frame);
  },
  onStompError: (frame) => {
    console.error('❌ STOMP 错误:', frame.headers?.message);
  },
  onWebSocketError: (event) => {
    console.error('🌐 WebSocket 错误:', event);
  },
  onDisconnect: () => {
    console.log('🔌 STOMP 已断开');
  },
  onMessageError: (e, msg) => {
    console.error('⚠️ 消息解析失败:', e, msg);
  },
  onBeforeSend: (message) => ({
    ...message,
    headers: {
      ...message.headers,
      timestamp: Date.now()
    }
  })
});

export default stompService;