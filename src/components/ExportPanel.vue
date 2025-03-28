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
        <p class="time-range-info">
          筛选时间范围：{{ exportForm.timeRange[0] }} 至 {{ exportForm.timeRange[1] }}
        </p>
        <el-table 
          :data="paginatedData" 
          border 
          stripe 
          style="width: 100%" 
          max-height="400"
          :default-sort="{prop: 'timestamp', order: 'descending'}"
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
          
          <!-- 入库流程特定字段 -->
          <template v-if="exportForm.processType === 'storage'">
            <el-table-column prop="material_type" label="材料类型" sortable />
            <el-table-column prop="quantity" label="数量(kg)" sortable />
            <el-table-column prop="storage_location" label="存储位置" sortable />
            <el-table-column prop="supplier" label="供应商" sortable />
          </template>
          
          <!-- 覆膜流程特定字段 -->
          <template v-if="exportForm.processType === 'film'">
            <el-table-column prop="film_type" label="覆膜类型" sortable />
            <el-table-column prop="machine_id" label="机器ID" sortable />
            <el-table-column prop="duration" label="处理时间(分钟)" sortable />
            <el-table-column prop="operator" label="操作员" sortable />
          </template>
          
          <!-- 裁切流程特定字段 -->
          <template v-if="exportForm.processType === 'cutting'">
            <el-table-column prop="width" label="宽度(mm)" sortable />
            <el-table-column prop="length" label="长度(m)" sortable />
            <el-table-column prop="machine_id" label="机器ID" sortable />
            <el-table-column prop="roll_count" label="卷数" sortable />
          </template>
          
          <!-- 质检流程特定字段 -->
          <template v-if="exportForm.processType === 'inspection'">
            <el-table-column prop="quality_grade" label="质量等级" sortable />
            <el-table-column prop="defect_count" label="缺陷数量" sortable />
            <el-table-column prop="pass_status" label="是否通过" sortable>
              <template #default="scope">
                <el-tag :type="scope.row.pass_status ? 'success' : 'danger'">
                  {{ scope.row.pass_status ? '通过' : '不通过' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="inspector" label="检验员" sortable />
          </template>
          
          <!-- 出库流程特定字段 -->
          <template v-if="exportForm.processType === 'shipping'">
            <el-table-column prop="destination" label="目的地" sortable />
            <el-table-column prop="carrier" label="承运商" sortable />
            <el-table-column prop="tracking_number" label="跟踪号" sortable />
            <el-table-column prop="package_count" label="包装数量" sortable />
          </template>
          
          <!-- 备注字段 -->
          <el-table-column prop="notes" label="备注" min-width="120" />
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
        description="暂无数据，请选择时间范围并点击查询按钮"
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
        timeRange: null
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
        if (!exportForm.timeRange || !exportForm.timeRange[0] || !exportForm.timeRange[1]) {
          ElMessage.warning('请选择时间范围')
          return
        }
        
        if (exportForm.processType === 'all') {
          ElMessage.warning('查询时请选择具体的流程类型')
          return
        }
        
        // 解析用户选择的时间，并明确指定为上海时区
        const startTime = moment.tz(exportForm.timeRange[0], 'YYYY-MM-DD HH:mm:ss', SHANGHAI_TZ).format('YYYY-MM-DD HH:mm:ss')
        const endTime = moment.tz(exportForm.timeRange[1], 'YYYY-MM-DD HH:mm:ss', SHANGHAI_TZ).format('YYYY-MM-DD HH:mm:ss')
        
        console.log('筛选时间范围 (上海时区):', startTime, '至', endTime)
        
        loading.value = true
        searchError.value = ''
        
        // 调用后端API获取数据
        getProcessData(exportForm.processType, startTime, endTime)
          .then(response => {
            if (response.data && response.data.success) {
              searchResults.value = response.data.data
              
              if (searchResults.value.length === 0) {
                ElMessage.info('没有找到符合条件的数据')
              } else {
                ElMessage.success(`查询成功，共找到 ${searchResults.value.length} 条记录`)
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
        if (!exportForm.timeRange || !exportForm.timeRange[0] || !exportForm.timeRange[1]) {
          ElMessage.warning('请选择时间范围')
          return
        }
        
        exporting.value = true
        
        try {
          // 处理不同类型的时间值 - 转换为上海时区的字符串
          let startTime, endTime
          
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
          
          if (exportForm.processType === 'all') {
            // 导出所有流程数据
            exportAllProcessData(startTime, endTime)
          } else {
            // 导出单个流程数据
            exportProcessData(exportForm.processType, startTime, endTime)
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
          
          // 获取表头 - 根据后端返回的数据字段调整
          const headers = ["ID", "批次ID", "操作时间"];
          
          // 根据流程类型添加额外的表头 - 确保与后端返回的字段匹配
          if (exportForm.processType === 'storage') {
            headers.push("材料类型", "数量(kg)", "存储位置");
          } else if (exportForm.processType === 'film') {
            headers.push("覆膜类型", "机器ID", "处理时间(分钟)");
          } else if (exportForm.processType === 'cutting') {
            headers.push("宽度(mm)", "长度(m)", "机器ID");
          } else if (exportForm.processType === 'inspection') {
            headers.push("质量等级", "缺陷数量", "是否通过");
          } else if (exportForm.processType === 'shipping') {
            headers.push("目的地", "承运商", "跟踪号");
          }
          
          headers.push("备注");
          
          // 添加表头
          csvContent += headers.join(",") + "\r\n";
          
          // 添加数据行 - 确保字段名与后端返回的字段匹配
          searchResults.value.forEach(item => {
            let row = [
              item.id,
              item.batch_id,
              item.timestamp
            ];
            
            // 添加流程特定字段 - 确保与后端返回的字段名一致
            if (exportForm.processType === 'storage') {
              row.push(
                item.material_type || "",
                item.quantity || "",
                item.storage_location || ""
              );
            } else if (exportForm.processType === 'film') {
              row.push(
                item.film_type || "",
                item.machine_id || "",
                item.duration || ""
              );
            } else if (exportForm.processType === 'cutting') {
              row.push(
                item.width || "",
                item.length || "",
                item.machine_id || ""
              );
            } else if (exportForm.processType === 'inspection') {
              row.push(
                item.quality_grade || "",
                item.defect_count || "",
                item.pass_status || ""
              );
            } else if (exportForm.processType === 'shipping') {
              row.push(
                item.destination || "",
                item.carrier || "",
                item.tracking_number || ""
              );
            }
            
            row.push(item.notes || "");
            
            // 处理CSV中的特殊字符
            for (let i = 0; i < row.length; i++) {
              if (typeof row[i] === 'string' && (row[i].includes(',') || row[i].includes('"') || row[i].includes('\n'))) {
                row[i] = `"${row[i].replace(/"/g, '""')}"`;
              }
            }
            
            csvContent += row.join(",") + "\r\n";
          });
          
          // 创建下载链接
          const encodedUri = encodeURI(csvContent);
          const link = document.createElement("a");
          link.setAttribute("href", encodedUri);
          // 使用 moment 生成更简洁的文件名 (基于上海时区当前时间)
          const formattedDate = moment().tz(SHANGHAI_TZ).format('YYYYMMDD_HHmmss');
          link.setAttribute("download", `${exportForm.processType}_数据_${formattedDate}.csv`);
          document.body.appendChild(link);
          
          // 触发下载
          link.click();
          document.body.removeChild(link);
          
          ElMessage.success('数据导出成功');
        } catch (error) {
          console.error('导出筛选数据失败:', error);
          ElMessage.error('导出筛选数据失败');
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