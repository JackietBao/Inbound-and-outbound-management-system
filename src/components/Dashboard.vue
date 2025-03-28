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
        
        <div class="recent-updates">
          <h3>最近更新的批次</h3>
          <el-table :data="formattedRecentBatches" style="width: 100%" height="300">
            <el-table-column prop="batchId" label="批次ID" width="150" />
            <el-table-column prop="processName" label="流程" width="100" />
            <el-table-column prop="timestamp" label="时间" width="180" />
          </el-table>
        </div>
      </el-card>
    </div>
  </template>
  
  <script>
  import { computed } from 'vue'
  import { PROCESS_TYPES, PROCESS_COLORS } from '../utils/constants'
  import { recentBatches, processCounts, lastUpdateTime } from '../utils/socket'
  
  export default {
    name: 'Dashboard',
    setup() {
      const processTypes = PROCESS_TYPES
      const processColors = PROCESS_COLORS
      
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
      
      return {
        processTypes,
        processColors,
        processCounts,
        recentBatches,
        formattedRecentBatches,
        lastUpdateTime,
        completedCount
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
  
  .recent-updates h3 {
    margin-bottom: 15px;
  }
  </style>