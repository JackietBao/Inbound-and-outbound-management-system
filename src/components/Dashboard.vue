<template>
    <div class="dashboard-container">
      <el-card shadow="hover">
        <template #header>
          <div class="card-header">
            <h2>实时生产状态</h2>
            <el-tag>最后更新: {{ lastUpdateTime }}</el-tag>
          </div>
        </template>
        
        <div class="dashboard-stats">
          <el-row :gutter="20">
            <el-col :span="4" v-for="process in processTypes" :key="process.value">
              <el-card 
                :body-style="{ padding: '10px' }" 
                shadow="hover"
                :style="{ borderLeft: `4px solid ${processColors[process.value]}` }"
              >
                <div class="stat-card">
                  <h3>{{ process.label }}</h3>
                  <div class="count">{{ processCounts[process.value] || 0 }}</div>
                  <div class="today-label">今日完成数量</div>
                </div>
              </el-card>
            </el-col>
            
            <el-col :span="4">
              <el-card body-style="padding: 10px" shadow="hover" style="border-left: 4px solid #8e44ad">
                <div class="stat-card">
                  <h3>全流程完成</h3>
                  <div class="count">{{ completedCount }}</div>
                  <div class="today-label">今日完成批次</div>
                </div>
              </el-card>
            </el-col>
          </el-row>
        </div>
        
        <!-- 新增公司批次完成率模块 -->
        <div class="company-completion-rates">
          <h3>公司批次完成率</h3>
          <div class="completion-rates-container">
            <el-skeleton :rows="3" animated v-if="Object.keys(companyCompletionRates).length === 0" />
            <div v-else v-for="(rate, company) in companyCompletionRates" :key="company" class="company-rate-item">
              <div class="company-name">{{ company }}</div>
              <div class="progress-container">
                <el-progress 
                  :percentage="rate.percentage" 
                  :status="rate.percentage === 100 ? 'success' : ''" 
                  :stroke-width="16"
                  :color="getProgressColor(rate.percentage)"
                >
                  <template #default>
                    <span>已完成: {{ rate.percentage }}%</span>
                    <span class="progress-detail">(完成 {{ rate.completed }}/总计 {{ rate.total }})</span>
                  </template>
                </el-progress>
              </div>
            </div>
          </div>
        </div>
        
        <div class="recent-updates">
          <h3>最近更新的批次</h3>
          <el-table 
            :data="formattedRecentBatches" 
            style="width: 100%" 
            height="300"
            border
            stripe
            highlight-current-row>
            <el-table-column prop="company" label="公司" min-width="150" />
            <el-table-column prop="batchId" label="批次ID" min-width="120" />
            <el-table-column prop="processName" label="流程" min-width="80" align="center" />
            <el-table-column prop="timestamp" label="时间" min-width="150" sortable />
            <el-table-column prop="employee" label="员工" min-width="100" />
          </el-table>
        </div>
      </el-card>
    </div>
  </template>
  
  <script>
  import { computed, onMounted, ref, watch } from 'vue'
  import { PROCESS_TYPES, PROCESS_COLORS } from '../utils/constants'
  import { recentBatches, processCounts, lastUpdateTime, processData } from '../utils/socket'
  
  export default {
    name: 'Dashboard',
    setup() {
      const processTypes = PROCESS_TYPES
      const processColors = PROCESS_COLORS
      const companyCompletionRates = ref({})
      
      // 计算全流程完成数量
      const completedCount = computed(() => processCounts.value.shipping || 0)
      
      // 格式化最近批次的时间
      const formattedRecentBatches = computed(() => {
        return recentBatches.value.map(batch => {
          // 检查时间格式是否需要转换
          let timestamp = batch.timestamp;
          if (timestamp && typeof timestamp === 'string' && timestamp.includes('T')) {
            // 转换ISO格式为标准格式
            const date = new Date(timestamp);
            timestamp = date.getFullYear() + '-' +
                       String(date.getMonth() + 1).padStart(2, '0') + '-' +
                       String(date.getDate()).padStart(2, '0') + ' ' +
                       String(date.getHours()).padStart(2, '0') + ':' +
                       String(date.getMinutes()).padStart(2, '0') + ':' +
                       String(date.getSeconds()).padStart(2, '0');
          }
          
          return {
            ...batch,
            timestamp
          };
        });
      });
      
      // 计算各公司批次完成率
      const calculateCompanyCompletionRates = () => {
        const allCompanies = new Set();
        const companyBatches = {};
        const companyCompletedBatches = {};
        
        // 收集所有公司和批次信息
        for (const processType of Object.keys(processData)) {
          if (Array.isArray(processData[processType].value)) {
            processData[processType].value.forEach(record => {
              if (record.company) {
                allCompanies.add(record.company);
                
                // 初始化公司批次计数
                if (!companyBatches[record.company]) {
                  companyBatches[record.company] = new Set();
                  companyCompletedBatches[record.company] = new Set();
                }
                
                // 添加批次ID到该公司的集合中
                if (record.batch_id) {
                  companyBatches[record.company].add(record.batch_id);
                  
                  // 如果是出货流程，则添加到已完成批次集合
                  if (processType === 'shipping') {
                    companyCompletedBatches[record.company].add(record.batch_id);
                  }
                }
              }
            });
          }
        }
        
        // 计算各公司的完成率
        const rates = {};
        allCompanies.forEach(company => {
          const total = companyBatches[company].size;
          const completed = companyCompletedBatches[company].size;
          const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
          
          rates[company] = {
            total,
            completed,
            percentage
          };
        });
        
        // 按完成率排序
        companyCompletionRates.value = Object.fromEntries(
          Object.entries(rates).sort((a, b) => b[1].percentage - a[1].percentage)
        );
      };
      
      // 进度条渐变色
      const getProgressColor = (percentage) => {
        if (percentage < 30) return '#F56C6C';  // 红色
        if (percentage < 70) return '#E6A23C';  // 黄色
        return '#67C23A';  // 绿色
      };
      
      // 组件挂载时加载数据
      onMounted(() => {
        // 初始计算完成率
        calculateCompanyCompletionRates();
        
        // 监听流程数据变化，重新计算完成率
        const processTypes = ['storage', 'film', 'cutting', 'inspection', 'shipping'];
        processTypes.forEach(type => {
          watch(() => processData[type].value, () => {
            calculateCompanyCompletionRates();
          }, { deep: true });
        });
      });
      
      return {
        processTypes,
        processColors,
        processCounts,
        recentBatches,
        formattedRecentBatches,
        lastUpdateTime,
        completedCount,
        companyCompletionRates,
        getProgressColor
      }
    }
  }
  </script>
  
  <style scoped>
  .dashboard-container {
    margin-bottom: 20px;
  }
  
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .dashboard-stats {
    margin-bottom: 20px;
  }
  
  .stat-card {
    text-align: center;
  }
  
  .stat-card h3 {
    margin: 0 0 10px 0;
    font-size: 16px;
  }
  
  .count {
    font-size: 24px;
    font-weight: bold;
    color: #303133;
  }
  
  .today-label {
    font-size: 12px;
    color: #909399;
    margin-top: 5px;
  }
  
  /* 公司完成率样式 */
  .company-completion-rates {
    margin-bottom: 20px;
  }
  
  .company-completion-rates h3 {
    margin-bottom: 15px;
    font-weight: bold;
    color: #303133;
  }
  
  .completion-rates-container {
    background-color: #f9f9f9;
    border-radius: 4px;
    padding: 15px;
  }
  
  .company-rate-item {
    display: flex;
    align-items: center;
    margin-bottom: 15px;
  }
  
  .company-name {
    width: 180px;
    font-weight: bold;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    padding-right: 15px;
  }
  
  .progress-container {
    flex: 1;
  }
  
  .progress-detail {
    margin-left: 8px;
    font-size: 0.85em;
    color: #606266;
  }
  
  .recent-updates h3 {
    margin-bottom: 15px;
    font-weight: bold;
    color: #303133;
  }
  
  :deep(.el-table) {
    --el-table-header-bg-color: #f5f7fa;
    --el-table-row-hover-bg-color: #ecf5ff;
    --el-table-fixed-left-column: 1px solid #dcdfe6;
    --el-table-fixed-right-column: 1px solid #dcdfe6;
    font-size: 14px;
    border-radius: 4px;
  }
  
  :deep(.el-table th) {
    font-weight: bold;
    color: #303133;
  }
  
  :deep(.el-table__row) {
    transition: background-color 0.2s;
  }
  </style>