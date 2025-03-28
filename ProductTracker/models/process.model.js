const { pool } = require('../config/db');
const moment = require('moment');

// 操作类型与对应的表名映射
const processMap = {
  'storage': 'storage',      // 入库
  'film': 'film',            // 贴膜
  'cutting': 'cutting',      // 切割
  'inspection': 'inspection', // 检验
  'shipping': 'shipping'     // 出货
};

// 操作顺序
const processSequence = ['storage', 'film', 'cutting', 'inspection', 'shipping'];

// 格式化日期时间，直接在数据层就进行格式化
function formatDateTime(timestamp) {
  return moment(timestamp).format('YYYY-MM-DD HH:mm:ss');
}

class ProcessModel {
  // 记录批次操作
  async recordProcess(batchId, processType) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // 检查操作类型是否有效
      if (!processMap[processType]) {
        throw new Error('无效的操作类型');
      }
      
      // 检查是否已经在此流程中记录过
      const [existingRecords] = await connection.execute(
        `SELECT * FROM ${processMap[processType]} WHERE batch_id = ?`,
        [batchId]
      );
      
      if (existingRecords.length > 0) {
        throw new Error(`批次 ${batchId} 已在${processType}环节被记录`);
      }
      
      // 检查流程顺序
      await this.validateProcessSequence(batchId, processType, connection);
      
      // 记录当前时间
      const now = moment().format('YYYY-MM-DD HH:mm:ss');
      
      // 插入记录
      await connection.execute(
        `INSERT INTO ${processMap[processType]} (batch_id, timestamp) VALUES (?, ?)`,
        [batchId, now]
      );
      
      await connection.commit();
      return { success: true, message: `批次 ${batchId} 的${processType}操作已记录` };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
  
  // 验证流程顺序
  async validateProcessSequence(batchId, currentProcess, connection) {
    const currentIndex = processSequence.indexOf(currentProcess);
    
    // 如果是第一个流程，不需要验证
    if (currentIndex === 0) return true;
    
    // 检查之前的流程是否都已完成
    const previousProcesses = processSequence.slice(0, currentIndex);
    const missingProcesses = [];
    
    for (const process of previousProcesses) {
      const [records] = await connection.execute(
        `SELECT * FROM ${processMap[process]} WHERE batch_id = ?`,
        [batchId]
      );
      
      if (records.length === 0) {
        missingProcesses.push(process);
      }
    }
    
    if (missingProcesses.length > 0) {
      const missingSteps = missingProcesses.map((process, index) => {
        return `${index + 1}.${process === 'storage' ? '扫码入库' : 
                process === 'film' ? '扫码贴膜' : 
                process === 'cutting' ? '扫码切割' : 
                process === 'inspection' ? '扫码检验' : '扫码出货'}`;
      }).join(' ');
      
      throw new Error(`操作失败，请先完成以下步骤: ${missingSteps}`);
    }
    
    return true;
  }
  
  // 按时间范围查询数据
  async queryByTimeRange(processType, startTime, endTime) {
    if (!processMap[processType]) {
      throw new Error('无效的操作类型');
    }
    
    const [records] = await pool.execute(
      `SELECT * FROM ${processMap[processType]} 
       WHERE timestamp BETWEEN ? AND ?
       ORDER BY timestamp ASC`,
      [startTime, endTime]
    );
    
    // 在返回之前格式化所有时间戳为字符串
    return records.map(record => ({
      ...record,
      timestamp: formatDateTime(record.timestamp)
    }));
  }
  
  // 获取所有流程的批次数据
  async getAllProcessData(batchId) {
    const result = {};
    
    for (const process of processSequence) {
      const [records] = await pool.execute(
        `SELECT * FROM ${processMap[process]} WHERE batch_id = ?`,
        [batchId]
      );
      
      // 格式化时间戳
      if (records.length > 0) {
        const record = records[0];
        if (record.timestamp) {
          record.timestamp = formatDateTime(record.timestamp);
        }
        result[process] = record;
      } else {
        result[process] = null;
      }
    }
    
    return result;
  }
  
  // 根据批次ID和流程类型查询数据
  async queryByBatchAndProcess(batchId, processType) {
    if (!processMap[processType]) {
      throw new Error('无效的操作类型');
    }
    
    const [records] = await pool.execute(
      `SELECT id, batch_id, timestamp FROM ${processMap[processType]} 
       WHERE batch_id = ?`,
      [batchId]
    );
    
    // 在返回之前格式化所有时间戳为字符串
    return records.map(record => ({
      ...record,
      timestamp: formatDateTime(record.timestamp)
    }));
  }
}

module.exports = new ProcessModel(); 