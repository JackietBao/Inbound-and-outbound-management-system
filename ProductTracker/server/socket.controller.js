const ProcessModel = require('./process.model');

// 格式化日期时间为标准格式 YYYY-MM-DD HH:mm:ss
function formatDateTime(timestamp) {
  if (!timestamp) return timestamp;
  
  // 检查是否已经是格式化后的字符串 (不包含T的日期字符串)
  if (typeof timestamp === 'string' && !timestamp.includes('T')) {
    return timestamp;
  }
  
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return timestamp; // 如果无效日期则返回原值
  
  return date.getFullYear() + '-' +
         String(date.getMonth() + 1).padStart(2, '0') + '-' +
         String(date.getDate()).padStart(2, '0') + ' ' +
         String(date.getHours()).padStart(2, '0') + ':' +
         String(date.getMinutes()).padStart(2, '0') + ':' +
         String(date.getSeconds()).padStart(2, '0');
}

// 深度递归处理对象中的所有日期字段
function deepFormatDates(obj) {
  if (Array.isArray(obj)) {
    return obj.map(item => deepFormatDates(item));
  } else if (obj !== null && typeof obj === 'object') {
    const result = {};
    for (const key in obj) {
      if (key === 'timestamp' || key.endsWith('_at') || key.endsWith('_time') || key.endsWith('_date')) {
        result[key] = formatDateTime(obj[key]);
      } else {
        result[key] = deepFormatDates(obj[key]);
      }
    }
    return result;
  }
  return obj;
}

// 缓存上次发送的数据，用于比较避免重复发送相同内容
const lastSentData = {
  process_update: {},
  recent_batches: null,
  process_counts: null
};

// 比较两个对象是否相同（用于避免重复发送相同数据）
function isEqual(obj1, obj2) {
  if (obj1 === obj2) return true;
  if (obj1 === null || obj2 === null) return false;
  if (typeof obj1 !== 'object' || typeof obj2 !== 'object') return obj1 === obj2;
  
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  
  if (keys1.length !== keys2.length) return false;
  
  for (const key of keys1) {
    if (!keys2.includes(key)) return false;
    if (!isEqual(obj1[key], obj2[key])) return false;
  }
  
  return true;
}

// 初始化Socket.IO控制器
exports.initSocketController = (io) => {
  console.log('初始化Socket.IO控制器');
  
  // 添加Socket.IO中间件，用于拦截和格式化所有传出消息中的日期
  io.use((socket, next) => {
    // 保存原始的emit方法
    const originalEmit = socket.emit;
    
    // 重写emit方法，在发送前格式化日期
    socket.emit = function(event, ...args) {
      // 格式化第一个数据参数中的日期
      if (args.length > 0) {
        args[0] = deepFormatDates(args[0]);
      }
      // 调用原始的emit方法
      return originalEmit.apply(this, [event, ...args]);
    };
    
    next();
  });
  
  // 客户端连接事件
  io.on('connection', (socket) => {
    console.log('新客户端连接:', socket.id);
    
    // 当客户端请求获取所有数据
    socket.on('get_all_data', async () => {
      try {
        // 获取并发送各个流程的数据
        const processes = ['storage', 'film', 'cutting', 'inspection', 'shipping'];
        for (const processType of processes) {
          const data = await ProcessModel.getProcessData(processType);
          // 数据已在model层格式化，发送前再次检查确保格式化
          const formattedData = deepFormatDates(data);
          socket.emit('process_update', { processType, records: formattedData });
        }
        
        // 获取并发送最近更新的批次
        const recentBatches = await ProcessModel.getRecentBatches();
        // 数据已在model层格式化，发送前再次检查确保格式化
        socket.emit('recent_batches', deepFormatDates(recentBatches));
        
        // 获取并发送今日各流程完成数量
        const processCounts = await ProcessModel.getProcessCounts();
        socket.emit('process_counts', processCounts);
      } catch (error) {
        console.error('获取数据时发生错误:', error);
      }
    });
    
    // 断开连接事件
    socket.on('disconnect', () => {
      console.log('客户端断开连接:', socket.id);
    });
  });
  
  // 启动定时任务，定期向所有连接的客户端推送最新数据
  startPeriodicUpdates(io);
};

// 定期向所有连接的客户端推送最新数据
function startPeriodicUpdates(io) {
  // 每10秒更新一次数据
  setInterval(async () => {
    try {
      // 如果没有连接的客户端，则跳过更新
      if (io.sockets.sockets.size === 0) {
        return;
      }
      
      // 更新各个流程的数据
      const processes = ['storage', 'film', 'cutting', 'inspection', 'shipping'];
      for (const processType of processes) {
        const data = await ProcessModel.getProcessData(processType);
        // 数据已在model层格式化，发送前再次检查确保格式化
        const formattedData = deepFormatDates(data);
        
        // 检查数据是否与上次发送的相同
        if (!lastSentData.process_update[processType] || 
            !isEqual(lastSentData.process_update[processType], formattedData)) {
          // 更新缓存并发送数据
          lastSentData.process_update[processType] = formattedData;
          io.emit('process_update', { processType, records: formattedData });
        }
      }
      
      // 更新最近的批次数据
      const recentBatches = await ProcessModel.getRecentBatches();
      // 数据已在model层格式化，发送前再次检查确保格式化
      const formattedRecentBatches = deepFormatDates(recentBatches);
      
      // 检查数据是否与上次发送的相同
      if (!lastSentData.recent_batches || 
          !isEqual(lastSentData.recent_batches, formattedRecentBatches)) {
        // 更新缓存并发送数据
        lastSentData.recent_batches = formattedRecentBatches;
        io.emit('recent_batches', formattedRecentBatches);
      }
      
      // 更新处理计数
      const processCounts = await ProcessModel.getProcessCounts();
      
      // 检查数据是否与上次发送的相同
      if (!lastSentData.process_counts || 
          !isEqual(lastSentData.process_counts, processCounts)) {
        // 更新缓存并发送数据
        lastSentData.process_counts = processCounts;
        io.emit('process_counts', processCounts);
      }
    } catch (error) {
      console.error('周期性更新数据时发生错误:', error);
    }
  }, 10000); // 10秒
} 