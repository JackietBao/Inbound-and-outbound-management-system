const processModel = require('../models/process.model');
const ExcelExporter = require('../utils/excelExporter');
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const moment = require('moment');
// 导入Socket控制器
const socketController = require('./socket.controller');

// 流程类型到中文名称的映射
const processNameMap = {
  'storage': '入库',
  'film': '贴膜',
  'cutting': '切割',
  'inspection': '检验',
  'shipping': '出货'
};

class ProcessController {
  // 记录批次操作
  async recordProcess(req, res) {
    try {
      const { batchId, processType } = req.body;
      
      // 验证参数
      if (!batchId || !processType) {
        return res.status(400).json({
          success: false,
          message: '批次ID和操作类型不能为空'
        });
      }
      
      const result = await processModel.recordProcess(batchId, processType);
      
      // 通知WebSocket客户端数据已更新
      await socketController.notifyProcessUpdate(processType);
      
      return res.status(200).json(result);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
  
  // 根据时间范围查询数据
  async queryByTimeRange(req, res) {
    try {
      // 同时支持查询参数和请求体
      let processType, startTime, endTime;
      
      if (req.query.processType || req.query.startTime || req.query.endTime) {
        // 从URL查询参数获取
        processType = req.query.processType;
        startTime = req.query.startTime;
        endTime = req.query.endTime;
      } else if (req.body && Object.keys(req.body).length > 0) {
        // 从请求体获取
        processType = req.body.processType;
        startTime = req.body.startTime;
        endTime = req.body.endTime;
      }
      
      // 验证参数
      if (!processType || !startTime || !endTime) {
        return res.status(400).json({
          success: false,
          message: '操作类型、开始时间和结束时间不能为空'
        });
      }
      
      const data = await processModel.queryByTimeRange(processType, startTime, endTime);
      
      // 使用moment格式化时间戳
      const formattedData = data.map(item => ({
        ...item,
        timestamp: moment(item.timestamp).format('YYYY-MM-DD HH:mm:ss')
      }));
      
      return res.status(200).json({
        success: true,
        data: formattedData
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
  
  // 导出Excel文件
  async exportExcel(req, res) {
    try {
      // 同时支持查询参数和请求体
      let processType, startTime, endTime;
      
      if (req.query.processType || req.query.startTime || req.query.endTime) {
        // 从URL查询参数获取
        processType = req.query.processType;
        startTime = req.query.startTime;
        endTime = req.query.endTime;
      } else if (req.body && Object.keys(req.body).length > 0) {
        // 从请求体获取
        processType = req.body.processType;
        startTime = req.body.startTime;
        endTime = req.body.endTime;
      }
      
      // 验证参数
      if (!processType || !startTime || !endTime) {
        return res.status(400).json({
          success: false,
          message: '操作类型、开始时间和结束时间不能为空'
        });
      }
      
      const data = await processModel.queryByTimeRange(processType, startTime, endTime);
      
      // 确保导出目录存在
      const exportDir = path.join(__dirname, '../exports');
      if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true });
      }
      
      // 生成Excel文件
      const exporter = new ExcelExporter();
      exporter.initSheet(`${processNameMap[processType]}数据`);
      exporter.addData(data);
      
      // 使用英文文件名以避免编码问题
      const timestamp = new Date().getTime();
      const filename = `${processType}_data_${timestamp}.xlsx`;
      const filePath = path.join(exportDir, filename);
      
      await exporter.generateExcel(filePath);
      
      // 设置响应头并发送文件
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
      
      // 使用fs流直接发送文件，而不是使用res.sendFile
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
      
      // 文件发送完成后删除临时文件
      fileStream.on('end', () => {
        fs.unlinkSync(filePath);
      });
      
      fileStream.on('error', (err) => {
        console.error('文件流错误:', err);
        if (!res.headersSent) {
          return res.status(500).json({
            success: false,
            message: '文件下载失败'
          });
        }
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
  
  // 获取批次所有流程数据
  async getBatchData(req, res) {
    try {
      const { batchId } = req.params;
      
      if (!batchId) {
        return res.status(400).json({
          success: false,
          message: '批次ID不能为空'
        });
      }
      
      const data = await processModel.getAllProcessData(batchId);
      
      // 格式化各个流程的时间戳并移除created_at字段
      Object.keys(data).forEach(processType => {
        if (data[processType]) {
          if (data[processType].timestamp) {
            data[processType].timestamp = moment(data[processType].timestamp).format('YYYY-MM-DD HH:mm:ss');
          }
          // 移除created_at字段
          if (data[processType].created_at) {
            delete data[processType].created_at;
          }
        }
      });
      
      return res.status(200).json({
        success: true,
        data
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
  
  // 根据批次ID和流程类型查询数据
  async queryByBatchAndProcess(req, res) {
    try {
      // 从请求体获取参数
      const { batchId, processType } = req.body;
      
      // 验证参数
      if (!batchId || !processType) {
        return res.status(400).json({
          success: false,
          message: '批次ID和操作类型不能为空'
        });
      }
      
      const data = await processModel.queryByBatchAndProcess(batchId, processType);
      
      // 使用moment格式化时间戳
      const formattedData = data.map(item => ({
        ...item,
        timestamp: moment(item.timestamp).format('YYYY-MM-DD HH:mm:ss')
      }));
      
      return res.status(200).json({
        success: true,
        data: formattedData
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * 导出所有流程数据为Excel
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async exportAllProcessData(req, res) {
    try {
      const { startTime, endTime } = req.query;
      
      if (!startTime || !endTime) {
        return res.status(400).json({
          success: false,
          message: '开始时间和结束时间不能为空'
        });
      }

      // 创建工作簿
      const workbook = new ExcelJS.Workbook();
      
      // 为每个流程创建工作表
      for (const processType of ['storage', 'film', 'cutting', 'inspection', 'shipping']) {
        const worksheet = workbook.addWorksheet(processType);
        
        // 设置表头
        worksheet.columns = [
          { header: 'ID', key: 'id', width: 10 },
          { header: '批次ID', key: 'batch_id', width: 20 },
          { header: '时间', key: 'timestamp', width: 20 }
        ];
        
        // 查询数据
        const records = await processModel.queryByTimeRange(processType, startTime, endTime);
        
        // 添加数据
        records.forEach(record => {
          // 使用moment格式化时间戳
          const formattedTimestamp = moment(record.timestamp).format('YYYY-MM-DD HH:mm:ss');
          
          worksheet.addRow({
            id: record.id,
            batch_id: record.batch_id,
            timestamp: formattedTimestamp
          });
        });
      }

      // 设置响应头
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=all_process_data_${moment().format('YYYYMMDD_HHmmss')}.xlsx`
      );

      // 发送文件
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error('导出所有流程数据失败:', error);
      res.status(500).json({
        success: false,
        message: '导出所有流程数据失败',
        error: error.message
      });
    }
  }
}

module.exports = new ProcessController(); 