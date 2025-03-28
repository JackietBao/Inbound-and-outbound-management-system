const db = require('./db');

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

// 格式化记录中的日期字段
function formatRecordDates(records) {
  if (Array.isArray(records)) {
    return records.map(record => {
      if (record.timestamp) {
        record.timestamp = formatDateTime(record.timestamp);
      }
      return record;
    });
  }
  return records;
}

// 获取特定流程类型的所有记录
exports.getProcessData = async (processType) => {
  try {
    const query = `SELECT * FROM ${processType}_process ORDER BY timestamp DESC LIMIT 100`;
    const [records] = await db.query(query);
    return formatRecordDates(records);
  } catch (error) {
    console.error(`获取${processType}流程数据时发生错误:`, error);
    throw error;
  }
};

// 获取最近更新的批次
exports.getRecentBatches = async () => {
  try {
    const query = `
      (SELECT batch_id, 'storage' as process_type, timestamp FROM storage_process ORDER BY timestamp DESC LIMIT 10)
      UNION ALL
      (SELECT batch_id, 'film' as process_type, timestamp FROM film_process ORDER BY timestamp DESC LIMIT 10)
      UNION ALL
      (SELECT batch_id, 'cutting' as process_type, timestamp FROM cutting_process ORDER BY timestamp DESC LIMIT 10)
      UNION ALL
      (SELECT batch_id, 'inspection' as process_type, timestamp FROM inspection_process ORDER BY timestamp DESC LIMIT 10)
      UNION ALL
      (SELECT batch_id, 'shipping' as process_type, timestamp FROM shipping_process ORDER BY timestamp DESC LIMIT 10)
      ORDER BY timestamp DESC
      LIMIT 10
    `;
    const [records] = await db.query(query);
    return formatRecordDates(records);
  } catch (error) {
    console.error('获取最近更新的批次时发生错误:', error);
    throw error;
  }
};

// 获取今天各流程处理的批次数量
exports.getProcessCounts = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    
    const processCounts = {};
    const processTypes = ['storage', 'film', 'cutting', 'inspection', 'shipping'];
    
    for (const type of processTypes) {
      const query = `
        SELECT COUNT(DISTINCT batch_id) as count 
        FROM ${type}_process 
        WHERE DATE(timestamp) = ?
      `;
      const [results] = await db.query(query, [todayStr]);
      processCounts[type] = results[0].count;
    }
    
    return processCounts;
  } catch (error) {
    console.error('获取今日流程计数时发生错误:', error);
    throw error;
  }
};

// 添加存储流程记录
exports.addStorageProcess = async (data) => {
  try {
    const query = `
      INSERT INTO storage_process (
        batch_id, operator, timestamp, material_type, quantity, storage_location, notes
      ) VALUES (?, ?, NOW(), ?, ?, ?, ?)
    `;
    const [result] = await db.query(query, [
      data.batch_id,
      data.operator,
      data.material_type,
      data.quantity,
      data.storage_location,
      data.notes || null
    ]);
    return result.insertId;
  } catch (error) {
    console.error('添加存储流程记录时发生错误:', error);
    throw error;
  }
};

// 添加覆膜流程记录
exports.addFilmProcess = async (data) => {
  try {
    const query = `
      INSERT INTO film_process (
        batch_id, operator, timestamp, film_type, machine_id, duration, notes
      ) VALUES (?, ?, NOW(), ?, ?, ?, ?)
    `;
    const [result] = await db.query(query, [
      data.batch_id,
      data.operator,
      data.film_type,
      data.machine_id,
      data.duration,
      data.notes || null
    ]);
    return result.insertId;
  } catch (error) {
    console.error('添加覆膜流程记录时发生错误:', error);
    throw error;
  }
};

// 添加分切流程记录
exports.addCuttingProcess = async (data) => {
  try {
    const query = `
      INSERT INTO cutting_process (
        batch_id, operator, timestamp, width, length, machine_id, notes
      ) VALUES (?, ?, NOW(), ?, ?, ?, ?)
    `;
    const [result] = await db.query(query, [
      data.batch_id,
      data.operator,
      data.width,
      data.length,
      data.machine_id,
      data.notes || null
    ]);
    return result.insertId;
  } catch (error) {
    console.error('添加分切流程记录时发生错误:', error);
    throw error;
  }
};

// 添加检验流程记录
exports.addInspectionProcess = async (data) => {
  try {
    const query = `
      INSERT INTO inspection_process (
        batch_id, operator, timestamp, quality_grade, defect_count, pass_status, notes
      ) VALUES (?, ?, NOW(), ?, ?, ?, ?)
    `;
    const [result] = await db.query(query, [
      data.batch_id,
      data.operator,
      data.quality_grade,
      data.defect_count,
      data.pass_status,
      data.notes || null
    ]);
    return result.insertId;
  } catch (error) {
    console.error('添加检验流程记录时发生错误:', error);
    throw error;
  }
};

// 添加出货流程记录
exports.addShippingProcess = async (data) => {
  try {
    const query = `
      INSERT INTO shipping_process (
        batch_id, operator, timestamp, destination, carrier, tracking_number, notes
      ) VALUES (?, ?, NOW(), ?, ?, ?, ?)
    `;
    const [result] = await db.query(query, [
      data.batch_id,
      data.operator,
      data.destination,
      data.carrier,
      data.tracking_number,
      data.notes || null
    ]);
    return result.insertId;
  } catch (error) {
    console.error('添加出货流程记录时发生错误:', error);
    throw error;
  }
}; 