<template>
    <el-card shadow="hover" class="export-panel">
      <template #header>
        <div class="card-header">
          <h2>数据筛选与导出</h2>
        </div>
      </template>
      
      <el-form :model="exportForm" label-width="100px" inline>
        <el-form-item label="流程类型">
          <el-select v-model="exportForm.processType" placeholder="选择流程类型">
            <el-option
              v-for="item in processTypes"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
            <el-option key="all" label="所有流程" value="all" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="批次ID">
          <el-input
            v-model="exportForm.batchId"
            placeholder="输入批次ID"
            clearable
          />
        </el-form-item>
        
        <el-form-item label="员工">
          <el-input
            v-model="exportForm.employee"
            placeholder="输入员工姓名"
            clearable
          />
        </el-form-item>
        
        <el-form-item label="公司">
          <el-input
            v-model="exportForm.company"
            placeholder="输入公司名称"
            clearable
          />
        </el-form-item>
        
        <el-form-item label="时间范围">
          <el-date-picker
            v-model="exportForm.timeRange"
            type="datetimerange"
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            value-format="YYYY-MM-DD HH:mm:ss"
            format="YYYY-MM-DD HH:mm:ss"
            :default-time="['00:00:00', '23:59:59']"
            :shortcuts="dateShortcuts"
            :disabledDate="disabledDate"
            :editable="true"
            :clearable="true"
            time-arrow-control
          />
        </el-form-item>
        
        <el-form-item>
          <el-button 
            type="primary" 
            @click="handleSearch" 
            :loading="loading"
            icon="el-icon-search"
          >
            查询
          </el-button>
          <el-button 
            type="success" 
            @click="handleExport" 
            icon="el-icon-download"
            :loading="exporting"
          >
            导出Excel
          </el-button>
        </el-form-item>
      </el-form>
      
      <div v-if="searchError" class="error-message">
        <el-alert
          title="查询失败"
          type="error"
          :description="searchError"
          show-icon
          :closable="true"
        />
      </div>
      
      <div v-if="loading" class="loading-overlay">
        <el-skeleton :rows="5" animated />
      </div>
      
      <div v-if="searchResults.length > 0" class="search-results">
        <h3>查询结果 (共 {{ searchResults.length }} 条)</h3>
        <p v-if="exportForm.timeRange && exportForm.timeRange[0] && exportForm.timeRange[1]" class="time-range-info">
          筛选时间范围：{{ exportForm.timeRange[0] }} 至 {{ exportForm.timeRange[1] }}
        </p>
        <el-table 
          :data="paginatedData" 
          border 
          stripe 
          style="width: 100%" 
          max-height="400"
          :default-sort="{prop: 'id', order: 'ascending'}"
        >
          <!-- 基础共通字段 -->
          <el-table-column 
            prop="id" 
            label="ID" 
            width="80" 
            sortable
          />
          <el-table-column 
            prop="batch_id" 
            label="批次ID" 
            width="150" 
            sortable
          />
          <el-table-column 
            prop="timestamp" 
            label="操作时间" 
            width="180" 
            sortable
          />
          <el-table-column 
            prop="employee" 
            label="员工" 
            width="120" 
            sortable
          />
          <el-table-column 
            prop="company" 
            label="公司" 
            min-width="150" 
            sortable
          />
          
          <!-- 移除所有流程特定字段 -->
          <!-- 入库流程特定字段 -->
          <!-- 覆膜流程特定字段 -->
          <!-- 裁切流程特定字段 -->
          <!-- 质检流程特定字段 -->
          <!-- 出库流程特定字段 -->
          <!-- 备注字段 -->
        </el-table>
        
        <!-- 添加分页功能 -->
        <div class="pagination-container" v-if="searchResults.length > 10">
          <el-pagination
            layout="total, sizes, prev, pager, next, jumper"
            :total="searchResults.length"
            :page-sizes="[10, 20, 50, 100]"
            :default-page-size="10"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
        
        <div class="export-actions">
          <el-button 
            type="success" 
            @click="exportFilteredData" 
            size="small" 
            icon="el-icon-download"
          >
            导出筛选结果
          </el-button>
        </div>
      </div>
      
      <el-empty 
        v-if="!loading && !searchResults.length && !searchError" 
        description="暂无数据，请输入筛选条件并点击查询按钮"
      />
    </el-card>
  </template>
  
  <script>
  import { ref, reactive, computed } from 'vue'
  import { ElMessage } from 'element-plus'
  import moment from 'moment-timezone'
  import { getProcessData, exportProcessData, exportAllProcessData } from '../utils/api'
  import { PROCESS_TYPES } from '../utils/constants'
  import { processData } from '../utils/socket'
  
  // 设置默认时区为上海
  const SHANGHAI_TZ = 'Asia/Shanghai';
  
  export default {
    name: 'ExportPanel',
    setup() {
      const processTypes = PROCESS_TYPES
      const exporting = ref(false)
      const loading = ref(false)
      const searchResults = ref([])
      const searchError = ref('')
      
      // 分页相关
      const currentPage = ref(1)
      const pageSize = ref(10)
      const paginatedData = computed(() => {
        const start = (currentPage.value - 1) * pageSize.value
        const end = start + pageSize.value
        return searchResults.value.slice(start, end)
      })
      
      // 日期快捷选项
      const dateShortcuts = [
        {
          text: '今天',
          value: () => {
            // 使用上海时区获取当前时间和当天开始时间
            const end = moment().tz(SHANGHAI_TZ)
            const start = moment().tz(SHANGHAI_TZ).startOf('day')
            return [start.toDate(), end.toDate()] // DatePicker 需要 Date 对象
          }
        },
        {
          text: '昨天',
          value: () => {
            // 使用上海时区获取昨天的时间范围
            const start = moment().tz(SHANGHAI_TZ).subtract(1, 'days').startOf('day')
            const end = moment().tz(SHANGHAI_TZ).subtract(1, 'days').endOf('day')
            return [start.toDate(), end.toDate()]
          }
        },
        {
          text: '最近一小时',
          value: () => {
            // 使用上海时区获取最近一小时的时间范围
            const end = moment().tz(SHANGHAI_TZ)
            const start = moment().tz(SHANGHAI_TZ).subtract(1, 'hour')
            return [start.toDate(), end.toDate()]
          }
        },
        {
          text: '最近10分钟',
          value: () => {
            const end = new Date()
            const start = new Date()
            start.setTime(start.getTime() - 10 * 60 * 1000)
            return [start, end]
          }
        },
        {
          text: '最近1分钟',
          value: () => {
            const end = new Date()
            const start = new Date()
            start.setTime(start.getTime() - 60 * 1000)
            return [start, end]
          }
        },
        {
          text: '最近30秒',
          value: () => {
            const end = new Date()
            const start = new Date()
            start.setTime(start.getTime() - 30 * 1000)
            return [start, end]
          }
        }
      ]
      
      // 禁用未来日期
      const disabledDate = (time) => {
        return time.getTime() > Date.now()
      }
      
      // 导出表单
      const exportForm = reactive({
        processType: 'storage',
        timeRange: null,
        employee: '',
        company: '',
        batchId: ''
      })
      
      // 获取今天的开始和结束时间 (上海时区)
      const getTodayRange = () => {
        const startOfDay = moment().tz(SHANGHAI_TZ).startOf('day')
        const endOfDay = moment().tz(SHANGHAI_TZ).endOf('day')
        // DatePicker 需要 Date 对象或特定格式字符串，我们传字符串
        return [startOfDay.format('YYYY-MM-DD HH:mm:ss'), endOfDay.format('YYYY-MM-DD HH:mm:ss')]
      }
      
      // 初始化时间范围为今天
      exportForm.timeRange = getTodayRange()
      
      // 处理查询 - 使用后端API
      const handleSearch = () => {
        // 检查是否至少有一个筛选条件
        if (!exportForm.timeRange && !exportForm.batchId && !exportForm.employee && !exportForm.company) {
          ElMessage.warning('请至少输入一个筛选条件(批次ID、员工、公司或时间范围)')
          return
        }
        
        if (exportForm.processType === 'all' && !exportForm.batchId) {
          ElMessage.warning('选择"所有流程"时，请至少输入批次ID进行筛选')
          return
        }
        
        let startTime = null
        let endTime = null
        
        // 如果设置了时间范围，则处理时间
        if (exportForm.timeRange && exportForm.timeRange[0] && exportForm.timeRange[1]) {
          // 解析用户选择的时间，并明确指定为上海时区
          startTime = moment.tz(exportForm.timeRange[0], 'YYYY-MM-DD HH:mm:ss', SHANGHAI_TZ).format('YYYY-MM-DD HH:mm:ss')
          endTime = moment.tz(exportForm.timeRange[1], 'YYYY-MM-DD HH:mm:ss', SHANGHAI_TZ).format('YYYY-MM-DD HH:mm:ss')
          console.log('筛选时间范围 (上海时区):', startTime, '至', endTime)
        }
        
        loading.value = true
        searchError.value = ''
        
        // 构建筛选条件
        const filters = {};
        if (exportForm.batchId) {
          filters.batch_id = exportForm.batchId.trim();
          console.log('批次ID筛选条件:', filters.batch_id);
        }
        if (exportForm.employee) {
          filters.employee = exportForm.employee.trim();
        }
        if (exportForm.company) {
          filters.company = exportForm.company.trim();
        }
        
        console.log('发送查询请求:', exportForm.processType, filters);
        
        // 调用后端API获取数据
        getProcessData(exportForm.processType, startTime, endTime, filters)
          .then(response => {
            console.log('API响应数据:', response.data);
            
            if (response.data && response.data.success) {
              let results = response.data.data;
              
              // 前端严格筛选逻辑
              // 1. 批次ID筛选
              if (exportForm.batchId) {
                const batchIdTrim = exportForm.batchId.trim();
                results = results.filter(item => 
                  item.batch_id === batchIdTrim
                );
                
                if (results.length === 0) {
                  console.log(`没有找到批次ID为 "${batchIdTrim}" 的记录`);
                }
                
                console.log('批次ID筛选后结果:', results);
              }
              
              // 2. 员工筛选
              if (exportForm.employee) {
                const employeeTrim = exportForm.employee.trim();
                results = results.filter(item => 
                  item.employee === employeeTrim
                );
                
                if (results.length === 0) {
                  console.log(`没有找到员工为 "${employeeTrim}" 的记录`);
                }
                
                console.log('员工筛选后结果:', results);
              }
              
              // 3. 公司筛选
              if (exportForm.company) {
                const companyTrim = exportForm.company.trim();
                results = results.filter(item => 
                  item.company === companyTrim
                );
                
                if (results.length === 0) {
                  console.log(`没有找到公司为 "${companyTrim}" 的记录`);
                }
                
                console.log('公司筛选后结果:', results);
              }
              
              searchResults.value = results;
              
              if (searchResults.value.length === 0) {
                // 构建详细的提示消息
                let noResultsMsg = '没有找到符合';
                const conditions = [];
                
                if (exportForm.batchId) conditions.push(`批次ID为"${exportForm.batchId.trim()}"`);
                if (exportForm.employee) conditions.push(`员工为"${exportForm.employee.trim()}"`);
                if (exportForm.company) conditions.push(`公司为"${exportForm.company.trim()}"`);
                
                if (conditions.length > 0) {
                  noResultsMsg += conditions.join('且') + '的记录';
                } else {
                  noResultsMsg += '条件的数据';
                }
                
                // 添加流程类型信息
                const processTypeText = exportForm.processType === 'storage' ? '入库' : 
                  exportForm.processType === 'film' ? '贴膜' : 
                  exportForm.processType === 'cutting' ? '切割' : 
                  exportForm.processType === 'inspection' ? '检验' : 
                  exportForm.processType === 'shipping' ? '出货' : '所有';
                  
                noResultsMsg += `（在"${processTypeText}流程"中）`;
                
                ElMessage.info(noResultsMsg);
              } else {
                ElMessage.success(`查询成功，共找到 ${searchResults.value.length} 条记录`);
              }
            } else {
              searchError.value = response.data?.message || '查询失败'
              ElMessage.error(searchError.value)
              searchResults.value = []
            }
          })
          .catch(error => {
            console.error('查询数据失败:', error)
            searchError.value = error.response?.data?.message || '查询数据失败，请稍后重试'
            ElMessage.error(searchError.value)
            searchResults.value = []
          })
          .finally(() => {
            loading.value = false
          })
      }
      
      // 处理导出 - 仍使用API导出
      const handleExport = async () => {
        // 检查是否至少有一个筛选条件
        if (!exportForm.timeRange && !exportForm.batchId && !exportForm.employee && !exportForm.company) {
          ElMessage.warning('请至少输入一个筛选条件(批次ID、员工、公司或时间范围)')
          return
        }
        
        exporting.value = true
        
        try {
          let startTime = null
          let endTime = null
          
          // 如果设置了时间范围，则处理时间
          if (exportForm.timeRange && exportForm.timeRange[0] && exportForm.timeRange[1]) {
            // 处理不同类型的时间值 - 转换为上海时区的字符串
            if (typeof exportForm.timeRange[0] === 'string') {
              // 假设已经是 'YYYY-MM-DD HH:mm:ss' 格式
              startTime = moment.tz(exportForm.timeRange[0], 'YYYY-MM-DD HH:mm:ss', SHANGHAI_TZ).format('YYYY-MM-DD HH:mm:ss');
            } else {
              startTime = moment(exportForm.timeRange[0]).tz(SHANGHAI_TZ).format('YYYY-MM-DD HH:mm:ss')
            }
            
            if (typeof exportForm.timeRange[1] === 'string') {
              endTime = moment.tz(exportForm.timeRange[1], 'YYYY-MM-DD HH:mm:ss', SHANGHAI_TZ).format('YYYY-MM-DD HH:mm:ss');
            } else {
              endTime = moment(exportForm.timeRange[1]).tz(SHANGHAI_TZ).format('YYYY-MM-DD HH:mm:ss')
            }
            
            console.log('导出时间范围 (上海时区):', startTime, '至', endTime)
          }
          
          // 构建额外筛选条件
          const filters = {};
          if (exportForm.batchId) {
            filters.batch_id = exportForm.batchId.trim();
          }
          if (exportForm.employee) {
            filters.employee = exportForm.employee.trim();
          }
          if (exportForm.company) {
            filters.company = exportForm.company.trim();
          }
          
          if (exportForm.processType === 'all') {
            // 导出所有流程数据
            exportAllProcessData(startTime, endTime, filters)
          } else {
            // 导出单个流程数据
            exportProcessData(exportForm.processType, startTime, endTime, filters)
          }
          
          ElMessage.success('导出任务已提交，文件将自动下载')
        } catch (error) {
          console.error('导出数据失败:', error)
          ElMessage.error('导出数据失败')
        } finally {
          exporting.value = false
        }
      }
      
      // 导出筛选后的数据结果
      const exportFilteredData = () => {
        if (searchResults.value.length === 0) {
          ElMessage.warning('没有可导出的数据')
          return
        }
        
        try {
          // 创建Excel友好的数据
          let csvContent = "data:text/csv;charset=utf-8,";
          
          // 只保留共通字段
          const headers = ["ID", "批次ID", "操作时间", "员工", "公司"];
          
          // 添加表头
          csvContent += headers.join(",") + "\r\n";
          
          // 添加数据，仅包含共通字段
          searchResults.value.forEach(item => {
            // 转义CSV中的特殊字符
            const sanitizeCSV = (value) => {
              if (value === null || value === undefined) return "";
              value = String(value);
              // 如果值包含逗号、双引号或换行符，则用双引号包裹并将内部双引号替换为两个双引号
              if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                return `"${value.replace(/"/g, '""')}"`;
              }
              return value;
            };
            
            const row = [
              sanitizeCSV(item.id),
              sanitizeCSV(item.batch_id),
              sanitizeCSV(item.timestamp),
              sanitizeCSV(item.employee || ""),
              sanitizeCSV(item.company || "")
            ];
            
            csvContent += row.join(",") + "\r\n";
          });
          
          // 创建下载链接
          const encodedUri = encodeURI(csvContent);
          const link = document.createElement("a");
          link.setAttribute("href", encodedUri);
          
          // 构建文件名，包含筛选条件信息
          let filename = exportForm.processType === 'all' ? 'all' : exportForm.processType;
          
          if (exportForm.batchId) filename += `_batch_${exportForm.batchId.trim()}`;
          if (exportForm.employee) filename += `_emp_${exportForm.employee.trim()}`;
          if (exportForm.company) filename += `_comp_${exportForm.company.trim()}`;
          
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          filename += `_${timestamp}.csv`;
          
          link.setAttribute("download", filename);
          document.body.appendChild(link);
          
          // 触发下载
          link.click();
          
          // 清理DOM
          document.body.removeChild(link);
          
          ElMessage.success('数据导出成功');
        } catch (error) {
          console.error('导出数据失败:', error);
          ElMessage.error('导出数据失败');
        }
      }
      
      // 处理分页变化
      const handleSizeChange = (size) => {
        pageSize.value = size
        currentPage.value = 1
      }
      
      const handleCurrentChange = (page) => {
        currentPage.value = page
      }
      
      return {
        processTypes,
        exportForm,
        searchResults,
        searchError,
        exporting,
        loading,
        currentPage,
        pageSize,
        paginatedData,
        handleSizeChange,
        handleCurrentChange,
        handleSearch,
        handleExport,
        exportFilteredData,
        dateShortcuts,
        disabledDate
      }
    }
  }
  </script>
  
  <style scoped>
  .export-panel {
    margin-bottom: 20px;
  }
  
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .search-results {
    margin-top: 20px;
  }
  
  .search-results h3 {
    margin-bottom: 15px;
  }
  
  .export-actions {
    margin-top: 15px;
    text-align: right;
  }
  
  .time-tip {
    margin-top: 10px;
    font-size: 0.8em;
    color: #909399;
  }
  
  .time-range-info {
    margin-bottom: 10px;
    font-size: 0.8em;
    color: #909399;
  }
  
  .error-message {
    color: #f56c6c;
    margin: 10px 0;
    font-size: 14px;
  }
  
  .loading-overlay {
    position: relative;
    min-height: 100px;
    margin: 20px 0;
  }
  
  .pagination-container {
    margin: 15px 0;
    text-align: right;
  }
  
  /* 表格样式优化 */
  :deep(.el-table .cell) {
    word-break: break-word;
  }
  
  :deep(.el-table--striped .el-table__body tr.el-table__row--striped td) {
    background-color: #fafafa;
  }
  
  :deep(.el-table__row:hover > td) {
    background-color: #f0f9ff !important;
  }
  
  /* 表单样式优化 */
  :deep(.el-form--inline .el-form-item) {
    margin-right: 15px;
    margin-bottom: 15px;
  }
  
  /* 响应式优化 */
  @media screen and (max-width: 768px) {
    :deep(.el-form--inline) {
      display: flex;
      flex-direction: column;
    }
    
    :deep(.el-form--inline .el-form-item) {
      margin-right: 0;
    }
  }
  </style> 