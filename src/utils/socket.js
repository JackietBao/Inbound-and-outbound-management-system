import { io } from 'socket.io-client';
import { ref } from 'vue';

// WebSocket连接状态
export const connectionStatus = ref('disconnected');
// 存储各个流程的最新数据
export const processData = {
  storage: ref([]),
  film: ref([]),
  cutting: ref([]),
  inspection: ref([]),
  shipping: ref([])
};
// 最近更新的批次
export const recentBatches = ref([]);
// 今日各流程完成数量
export const processCounts = ref({});
// 最后更新时间
export const lastUpdateTime = ref('--');

// 格式化日期时间为标准格式
function formatDateTime(timestamp) {
  if (!timestamp) return timestamp;
  
  // 检查是否已经是格式化后的字符串
  if (typeof timestamp === 'string' && !timestamp.includes('T')) {
    return timestamp;
  }
  
  // 转换ISO格式为标准格式
  const date = new Date(timestamp);
  return date.getFullYear() + '-' +
         String(date.getMonth() + 1).padStart(2, '0') + '-' +
         String(date.getDate()).padStart(2, '0') + ' ' +
         String(date.getHours()).padStart(2, '0') + ':' +
         String(date.getMinutes()).padStart(2, '0') + ':' +
         String(date.getSeconds()).padStart(2, '0');
}

// 深度格式化对象中的所有日期属性
function deepFormatDates(obj) {
  if (Array.isArray(obj)) {
    return obj.map(item => deepFormatDates(item));
  } else if (obj !== null && typeof obj === 'object') {
    const result = {};
    for (const key in obj) {
      if (key === 'timestamp' || key.endsWith('_at') || key.endsWith('_time')) {
        result[key] = formatDateTime(obj[key]);
      } else {
        result[key] = deepFormatDates(obj[key]);
      }
    }
    return result;
  }
  return obj;
}

// 创建Socket实例
const socket = io('http://192.168.232.153:3000', {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: Infinity
});

// 连接WebSocket
export const connectSocket = () => {
  if (socket.disconnected) {
    socket.connect();
  }
};

// 断开WebSocket连接
export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
  }
};

// 设置事件监听器
export const setupSocketListeners = () => {
  // 连接状态监听
  socket.on('connect', () => {
    connectionStatus.value = 'connected';
    console.log('WebSocket连接成功');
  });

  socket.on('disconnect', () => {
    connectionStatus.value = 'disconnected';
    console.log('WebSocket连接断开');
  });

  socket.on('connect_error', (error) => {
    connectionStatus.value = 'error';
    console.error('WebSocket连接错误:', error);
  });

  // 流程数据更新监听
  socket.on('process_update', (data) => {
    const { processType, records } = data;
    if (processType && records) {
      // 确保时间格式正确
      const formattedRecords = deepFormatDates(records);
      processData[processType].value = formattedRecords;
      lastUpdateTime.value = '北京时间：' + new Date().toLocaleString('zh-CN');
    }
  });

  // 最近更新的批次
  socket.on('recent_batches', (data) => {
    // 确保时间格式正确
    recentBatches.value = deepFormatDates(data);
    lastUpdateTime.value = '北京时间：' + new Date().toLocaleString('zh-CN');
  });

  // 今日统计数据更新
  socket.on('process_counts', (data) => {
    processCounts.value = data;
    lastUpdateTime.value = '北京时间：' + new Date().toLocaleString('zh-CN');
  });
};

// 请求初始数据
export const requestInitialData = () => {
  if (socket.connected) {
    socket.emit('get_all_data');
  }
};

// 提供单例模式的Socket实例
export default {
  socket,
  connectSocket,
  disconnectSocket,
  setupSocketListeners,
  requestInitialData
}; 