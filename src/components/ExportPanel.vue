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
      
      <div v-if="searchResults.length > 0" class="search-results">
        <h3>查询结果 (共 {{ searchResults.length }} 条)</h3>
        <p class="time-range-info">
          筛选时间范围：{{ exportForm.timeRange[0] }} 至 {{ exportForm.timeRange[1] }}
        </p>
        <el-table :data="searchResults" border stripe style="width: 100%" max-height="400">
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column prop="batch_id" label="批次ID" width="150" />
          <el-table-column prop="timestamp" label="操作时间" width="180" sortable />
          <el-table-column 
            v-if="exportForm.processType === 'storage'" 
            prop="material_type" 
            label="材料类型"
          />
          <el-table-column 
            v-if="exportForm.processType === 'storage'" 
            prop="quantity" 
            label="数量(kg)" 
          />
          <el-table-column 
            v-if="exportForm.processType === 'film'" 
            prop="film_type" 
            label="覆膜类型" 
          />
          <el-table-column 
            v-if="exportForm.processType === 'cutting'" 
            prop="width" 
            label="宽度(mm)" 
          />
          <el-table-column 
            v-if="exportForm.processType === 'cutting'" 
            prop="length" 
            label="长度(m)" 
          />
          <el-table-column 
            v-if="exportForm.processType === 'inspection'" 
            prop="quality_grade" 
            label="质量等级" 
          />
          <el-table-column 
            v-if="exportForm.processType === 'shipping'" 
            prop="destination" 
            label="目的地" 
          />
        </el-table>
        
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
    </el-card>
  </template>
  
  <script>
  import { ref, reactive, computed } from 'vue'
  import { ElMessage } from 'element-plus'
  import { exportProcessData, exportAllProcessData } from '../utils/api'
  import { PROCESS_TYPES } from '../utils/constants'
  import { processData } from '../utils/socket'
  
  export default {
    name: 'ExportPanel',
    setup() {
      const processTypes = PROCESS_TYPES
      const exporting = ref(false)
      const searchResults = ref([])
      
      // 日期快捷选项
      const dateShortcuts = [
        {
          text: '今天',
          value: () => {
            const end = new Date()
            const start = new Date(new Date().setHours(0, 0, 0, 0))
            return [start, end]
          }
        },
        {
          text: '昨天',
          value: () => {
            const end = new Date()
            end.setTime(end.getTime() - 3600 * 1000 * 24)
            end.setHours(23, 59, 59, 999)
            const start = new Date(end)
            start.setHours(0, 0, 0, 0)
            return [start, end]
          }
        },
        {
          text: '最近一小时',
          value: () => {
            const end = new Date()
            const start = new Date()
            start.setTime(start.getTime() - 3600 * 1000)
            return [start, end]
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
      
      // 获取今天的开始和结束时间
      const getTodayRange = () => {
        const today = new Date()
        const startOfDay = new Date(today.setHours(0, 0, 0, 0))
        const endOfDay = new Date(new Date().setHours(23, 59, 59, 999))
        
        return [startOfDay, endOfDay]
      }
      
      // 初始化时间范围为今天
      exportForm.timeRange = getTodayRange()
      
      // 获取可用的实时数据
      const getRealtimeData = computed(() => {
        const result = {}
        Object.keys(processData).forEach(key => {
          result[key] = processData[key].value
        })
        return result
      })
      
      // 处理查询 - 使用WebSocket数据
      const handleSearch = () => {
        if (!exportForm.timeRange || !exportForm.timeRange[0] || !exportForm.timeRange[1]) {
          ElMessage.warning('请选择时间范围')
          return
        }
        
        if (exportForm.processType === 'all') {
          ElMessage.warning('查询时请选择具体的流程类型')
          return
        }
        
        const startTime = new Date(exportForm.timeRange[0])
        const endTime = new Date(exportForm.timeRange[1])
        
        console.log('筛选时间范围:', startTime.toISOString(), '至', endTime.toISOString())
        console.log('筛选时间字符串:', exportForm.timeRange[0], '至', exportForm.timeRange[1])
        
        try {
          // 从实时数据中筛选符合时间范围的数据
          const processType = exportForm.processType
          const data = getRealtimeData.value[processType] || []
          
          searchResults.value = data.filter(item => {
            // 处理不同格式的时间戳
            let timestamp
            if (typeof item.timestamp === 'string') {
              // 处理已格式化的时间字符串 (YYYY-MM-DD HH:mm:ss)
              if (item.timestamp.includes('T')) {
                timestamp = new Date(item.timestamp)
              } else {
                // 格式化的非ISO时间字符串需要转换
                const parts = item.timestamp.split(/[- :]/)
                if (parts.length >= 6) {
                  timestamp = new Date(
                    parts[0], parts[1]-1, parts[2],  // 年，月（0-11），日
                    parts[3], parts[4], parts[5]    // 时，分，秒
                  )
                } else {
                  timestamp = new Date(item.timestamp)
                }
              }
            } else if (item.timestamp instanceof Date) {
              timestamp = item.timestamp
            } else {
              return false  // 无效的时间戳
            }
            
            // 精确比较到秒级
            return timestamp >= startTime && timestamp <= endTime
          })
          
          console.log('筛选结果:', searchResults.value.length, '条记录')
          
          if (searchResults.value.length === 0) {
            ElMessage.info('没有找到符合条件的数据')
          }
        } catch (error) {
          console.error('查询数据失败:', error)
          ElMessage.error('查询数据失败')
        }
      }
      
      // 处理导出 - 仍使用API导出
      const handleExport = async () => {
        if (!exportForm.timeRange || !exportForm.timeRange[0] || !exportForm.timeRange[1]) {
          ElMessage.warning('请选择时间范围')
          return
        }
        
        exporting.value = true
        
        try {
          // 转换日期为字符串格式 YYYY-MM-DD HH:mm:ss
          let startTime, endTime
          
          // 处理不同类型的时间值
          if (typeof exportForm.timeRange[0] === 'string') {
            startTime = exportForm.timeRange[0]
          } else {
            const start = new Date(exportForm.timeRange[0])
            startTime = start.getFullYear() + '-' +
                       String(start.getMonth() + 1).padStart(2, '0') + '-' +
                       String(start.getDate()).padStart(2, '0') + ' ' +
                       String(start.getHours()).padStart(2, '0') + ':' +
                       String(start.getMinutes()).padStart(2, '0') + ':' +
                       String(start.getSeconds()).padStart(2, '0')
          }
          
          if (typeof exportForm.timeRange[1] === 'string') {
            endTime = exportForm.timeRange[1]
          } else {
            const end = new Date(exportForm.timeRange[1])
            endTime = end.getFullYear() + '-' +
                     String(end.getMonth() + 1).padStart(2, '0') + '-' +
                     String(end.getDate()).padStart(2, '0') + ' ' +
                     String(end.getHours()).padStart(2, '0') + ':' +
                     String(end.getMinutes()).padStart(2, '0') + ':' +
                     String(end.getSeconds()).padStart(2, '0')
          }
          
          console.log('导出时间范围:', startTime, '至', endTime)
          
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
          
          // 获取表头
          const headers = ["ID", "批次ID", "操作时间(精确到秒)"];
          
          // 根据流程类型添加额外的表头
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
          
          // 添加数据行
          searchResults.value.forEach(item => {
            let row = [
              item.id,
              item.batch_id,
              item.timestamp
            ];
            
            // 添加流程特定字段
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
          link.setAttribute("download", `${exportForm.processType}_数据_${new Date().toISOString().replace(/[:.]/g, '_')}.csv`);
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
      
      return {
        processTypes,
        exportForm,
        searchResults,
        exporting,
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
  </style> 