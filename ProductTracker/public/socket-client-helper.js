/**
 * Socket.IO客户端辅助工具
 * 用于处理日期格式化和数据转换
 */

(function(window) {
  // 原始Socket.IO方法
  const originalSocketIo = window.io;
  
  // 格式化ISO时间为YYYY-MM-DD HH:mm:ss
  function formatISODate(isoString) {
    if (typeof isoString !== 'string') {
      return isoString;
    }
    
    // 正确匹配ISO格式的日期字符串 (修复了前面的正则表达式)
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(isoString)) {
      const date = new Date(isoString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }
    
    return isoString;
  }
  
  // 深度格式化对象中的所有日期字段
  function deepFormatDates(obj) {
    if (Array.isArray(obj)) {
      return obj.map(deepFormatDates);
    } else if (obj !== null && typeof obj === 'object') {
      const result = {};
      for (const key in obj) {
        if (key === 'timestamp' || key.endsWith('_at') || key.endsWith('_time')) {
          result[key] = formatISODate(obj[key]);
        } else {
          result[key] = deepFormatDates(obj[key]);
        }
      }
      return result;
    }
    return obj;
  }
  
  // 重写Socket.IO的on方法，处理接收到的数据
  function wrapSocket(socket) {
    const originalOn = socket.on;
    
    socket.on = function(event, callback) {
      if (typeof callback === 'function') {
        // 包装回调函数，格式化日期
        const wrappedCallback = function(...args) {
          // 格式化参数中的日期
          const formattedArgs = args.map(arg => {
            if (typeof arg === 'object' && arg !== null) {
              return deepFormatDates(arg);
            }
            return arg;
          });
          
          return callback.apply(this, formattedArgs);
        };
        
        return originalOn.call(this, event, wrappedCallback);
      }
      
      return originalOn.call(this, event, callback);
    };
    
    return socket;
  }
  
  // 重写window.io方法
  window.io = function(...args) {
    const socket = originalSocketIo.apply(this, args);
    return wrapSocket(socket);
  };
  
  // 导出工具函数
  window.SocketHelper = {
    formatISODate: formatISODate,
    deepFormatDates: deepFormatDates
  };
})(window); 