<template>
    <div class="dashboard-container">
      <el-card shadow="hover">
        <div class="dashboard-stats" v-if="!showCompletionRates">
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
        
        <!-- 公司批次完成率模块 -->
        <div class="company-completion-rates" v-if="showCompletionRates">
          <div class="completion-rates-container">
            <el-skeleton :rows="3" animated v-if="Object.keys(companyCompletionRates).length === 0" />
            
            <el-row :gutter="20" v-else>
              <el-col :xs="24" :sm="12" :md="8" :lg="8" :xl="8" v-for="(rate, company) in companyCompletionRates" :key="company" class="company-col">
                <div class="company-card">
                  <div class="company-name">{{ company }}</div>
                  <div class="progress-bar">
                    <div 
                      class="progress-bar-completed" 
                      :style="{ width: `${rate.percentage}%`, backgroundColor: getProgressColor(rate.percentage) }"
                    >
                      <span class="progress-text" v-if="rate.percentage >= 10">已出货{{ rate.percentage }}%</span>
                    </div>
                    <div 
                      class="progress-bar-uncompleted"
                      :style="{ width: `${100 - rate.percentage}%` }"
                      v-if="rate.percentage < 100"
                    >
                      <span class="progress-text-uncompleted" v-if="100 - rate.percentage >= 10">未出货{{ 100 - rate.percentage }}%</span>
                    </div>
                  </div>
                  <div class="progress-details">
                    <span class="complete-label">已完成</span>
                    <span class="batch-count">{{ rate.completed }}/{{ rate.total }}</span>
                    <span class="complete-status" v-if="rate.percentage === 100">(已全部完成)</span>
                  </div>
                </div>
              </el-col>
            </el-row>
          </div>
        </div>
        
        <div class="recent-updates" v-if="!showCompletionRates">
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
    props: {
      showCompletionRates: {
        type: Boolean,
        default: false
      }
    },
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
    margin-bottom: 10px;
  }
  
  .dashboard-stats {
    margin-bottom: 20px;
  }
  
  .stat-card {
    text-align: center;
  }
  
  .stat-card h3 {
    font-size: 14px;
    color: #606266;
    margin-top: 0;
    margin-bottom: 10px;
  }
  
  .count {
    font-size: 24px;
    font-weight: bold;
    color: #303133;
  }
  
  .today-label {
    color: #909399;
    font-size: 12px;
    margin-top: 5px;
  }
  
  .recent-updates {
    margin-top: 20px;
  }
  
  .company-completion-rates {
    width: 100%;
  }
  
  .completion-rates-container {
    margin-top: 15px;
  }
  
  .company-col {
    margin-bottom: 20px;
  }
  
  .company-card {
    background-color: #f5f7fa;
    padding: 15px;
    border-radius: 4px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }
  
  .company-name {
    font-weight: bold;
    margin-bottom: 10px;
    color: #303133;
  }
  
  .progress-bar {
    display: flex;
    height: 20px;
    border-radius: 10px;
    overflow: hidden;
    margin-bottom: 8px;
    background-color: #e9ecef;
  }
  
  .progress-bar-completed {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    border-radius: 10px 0 0 10px;
    transition: width 0.3s ease;
    color: white;
    font-size: 12px;
    font-weight: bold;
  }
  
  .progress-bar-uncompleted {
    height: 100%;
    background-color: #e9ecef;
    border-radius: 0 10px 10px 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .progress-text {
    padding: 0 5px;
    white-space: nowrap;
  }
  
  .progress-text-uncompleted {
    padding: 0 5px;
    white-space: nowrap;
    color: #606266;
    font-size: 12px;
    font-weight: bold;
  }
  
  .progress-details {
    display: flex;
    align-items: center;
    font-size: 12px;
    color: #606266;
  }
  
  .complete-label {
    margin-right: 5px;
  }
  
  .batch-count {
    font-weight: bold;
  }
  
  .complete-status {
    margin-left: 8px;
    color: #67c23a;
    font-weight: bold;
  }
  
  .dashboard-container :deep(.el-card__body) {
    padding: 10px;
  }
  </style>