const processModel = require('../models/process.model');
const moment = require('moment');

// 保存io实例的引用
let ioInstance = null;

// 保存已连接的客户端
const connectedClients = new Set();

// 各流程类型数据的缓存
const processDataCache = {
  storage: [],
  film: [],
  cutting: [],
  inspection: [],
  shipping: []
};

// 最近更新批次缓存
let recentBatchesCache = [];

// 今日各流程完成数量
let processCountsCache = {};

// 格式化日期时间，确保返回字符串格式
function formatDateTime(timestamp) {
  // 如果已经是格式化后的字符串且格式正确，直接返回
  if (typeof timestamp === 'string' && 
      /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(timestamp)) {
    return timestamp;
  }
  
  // 否则使用moment格式化
  return moment(timestamp).format('YYYY-MM-DD HH:mm:ss');
}

// 深度格式化对象中的所有日期属性
function deepFormatDates(obj) {
  if (Array.isArray(obj)) {
    return obj.map(item => deepFormatDates(item));
  } else if (obj !== null && typeof obj === 'object') {
    const result = {};
    for (const key in obj) {
      if (key === 'timestamp' || key.endsWith('_at')) {
        result[key] = formatDateTime(obj[key]);
      } else {
        result[key] = deepFormatDates(obj[key]);
      }
    }
    return result;
  }
  return obj;
}

// 初始化Socket.IO
exports.init = (io) => {
  // 保存io实例以供后续使用
  ioInstance = io;

  // 添加Socket.IO中间件，拦截所有传出消息
  io.use((socket, next) => {
    // 保存原始的emit方法
    const originalEmit = socket.emit;
    
    // 重写emit方法
    socket.emit = function(event, ...args) {
      // 对参数进行日期格式化
      const formattedArgs = args.map(arg => {
        if (typeof arg === 'object' && arg !== null) {
          return deepFormatDates(arg);
        }
        return arg;
      });
      
      // 调用原始emit方法
      return originalEmit.apply(this, [event, ...formattedArgs]);
    };
    
    next();
  });

  // 连接事件
  io.on('connection', (socket) => {
    console.log(`客户端已连接: ${socket.id}`);
    connectedClients.add(socket);

    // 断开连接
    socket.on('disconnect', () => {
      console.log(`客户端已断开: ${socket.id}`);
      connectedClients.delete(socket);
    });

    // 客户端请求初始数据
    socket.on('get_all_data', async () => {
      try {
        // 发送所有缓存数据
        for (const processType in processDataCache) {
          // 深度格式化所有日期
          const formattedData = deepFormatDates(processDataCache[processType]);
          
          socket.emit('process_update', {
            processType,
            records: formattedData
          });
        }

        // 发送最近更新批次
        const formattedBatches = deepFormatDates(recentBatchesCache);
        socket.emit('recent_batches', formattedBatches);

        // 发送今日统计数据
        socket.emit('process_counts', processCountsCache);
      } catch (error) {
        console.error('发送初始数据失败:', error);
      }
    });
  });

  // 启动数据轮询和广播
  startDataPolling(io);
};

// 轮询数据并广播更新
async function startDataPolling(io) {
  try {
    // 立即执行一次数据更新
    await updateAllData(io);

    // 设置轮询间隔 (每2秒)
    setInterval(async () => {
      await updateAllData(io);
    }, 2000);
  } catch (error) {
    console.error('数据轮询初始化失败:', error);
  }
}

// 更新所有数据
async function updateAllData(io) {
  try {
    // 获取当前日期
    const today = moment().format('YYYY-MM-DD');
    const startTime = `${today} 00:00:00`;
    const endTime = `${today} 23:59:59`;

    // 获取各流程数据
    const processTypes = ['storage', 'film', 'cutting', 'inspection', 'shipping'];
    const allRecentBatches = [];
    const counts = {};

    for (const processType of processTypes) {
      const data = await processModel.queryByTimeRange(processType, startTime, endTime);
      
      // 检查数据是否有变化 (使用深度格式化后的数据做比较)
      const formattedData = deepFormatDates(data);
      const formattedCache = deepFormatDates(processDataCache[processType]);
      
      if (JSON.stringify(formattedData) !== JSON.stringify(formattedCache)) {
        // 更新缓存
        processDataCache[processType] = data;
        
        // 广播更新
        io.emit('process_update', {
          processType,
          records: formattedData
        });
      }

      // 更新计数
      counts[processType] = data.length;

      // 添加到最近更新的批次列表
      const processName = getProcessName(processType);
      const processData = data.map(item => ({
        batchId: item.batch_id,
        processName,
        timestamp: item.timestamp // 稍后再格式化
      }));
      allRecentBatches.push(...processData);
    }

    // 检查计数是否有变化
    if (JSON.stringify(counts) !== JSON.stringify(processCountsCache)) {
      processCountsCache = counts;
      io.emit('process_counts', counts);
    }

    // 按时间排序并只保留最近的10条
    const recentBatches = allRecentBatches
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 10);
      
    // 格式化时间
    const formattedBatches = deepFormatDates(recentBatches);

    // 检查最近批次是否有变化
    if (JSON.stringify(formattedBatches) !== JSON.stringify(deepFormatDates(recentBatchesCache))) {
      recentBatchesCache = recentBatches;
      io.emit('recent_batches', formattedBatches);
    }
  } catch (error) {
    console.error('更新数据失败:', error);
  }
}

// 获取流程类型的中文名称
function getProcessName(processType) {
  const nameMap = {
    'storage': '入库',
    'film': '贴膜',
    'cutting': '切割',
    'inspection': '检验',
    'shipping': '出货'
  };
  return nameMap[processType] || processType;
}

// 当新记录添加时，通知所有客户端
exports.notifyProcessUpdate = async (processType) => {
  try {
    // 获取当前日期
    const today = moment().format('YYYY-MM-DD');
    const startTime = `${today} 00:00:00`;
    const endTime = `${today} 23:59:59`;

    // 获取最新数据
    const data = await processModel.queryByTimeRange(processType, startTime, endTime);
    
    // 更新缓存
    processDataCache[processType] = data;
    
    // 使用保存的io实例
    if (ioInstance) {
      // 深度格式化所有日期
      const formattedData = deepFormatDates(data);
      
      // 广播更新
      ioInstance.emit('process_update', {
        processType,
        records: formattedData
      });
      
      // 更新统计数据
      await updateAllData(ioInstance);
    }
  } catch (error) {
    console.error('通知过程更新失败:', error);
  }
}; 