const ExcelJS = require('exceljs');
const moment = require('moment');

class ExcelExporter {
  constructor() {
    this.workbook = new ExcelJS.Workbook();
    this.sheet = null;
  }

  // 创建并设置工作表
  initSheet(sheetName) {
    this.sheet = this.workbook.addWorksheet(sheetName);
    this.sheet.columns = [
      { header: '序号', key: 'id', width: 10 },
      { header: '批次', key: 'batchId', width: 15 },
      { header: '时间', key: 'timestamp', width: 25 }
    ];
    
    // 设置表头样式
    this.sheet.getRow(1).font = { bold: true };
    this.sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
  }

  // 添加数据
  addData(data) {
    if (!this.sheet) {
      throw new Error('工作表尚未初始化');
    }
    
    data.forEach(record => {
      // 格式化时间戳
      const formattedTimestamp = new Date(record.timestamp).toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).replace(/\//g, '-');
      
      this.sheet.addRow({
        id: record.id,
        batchId: record.batch_id,
        timestamp: formattedTimestamp
      });
    });
    
    // 设置所有单元格对齐方式
    for (let i = 2; i <= this.sheet.rowCount; i++) {
      this.sheet.getRow(i).alignment = { vertical: 'middle', horizontal: 'center' };
    }
  }

  // 生成Excel文件
  async generateExcel(filename) {
    if (!this.sheet) {
      throw new Error('工作表尚未初始化');
    }
    
    await this.workbook.xlsx.writeFile(filename);
    return filename;
  }
}

module.exports = ExcelExporter; 