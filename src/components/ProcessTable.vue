<template>
    <div class="process-table-container">
      <div class="table-header" :style="{ borderColor: processColor }">
        <h3>{{ processName }}流程数据</h3>
        <div class="table-header-info">
          <span>共 {{ totalItems }} 条记录</span>
        </div>
      </div>
      
      <el-table
        :data="formattedData"
        style="width: 100%"
        border
        stripe
        highlight-current-row
        :header-cell-style="{ background: processColor, color: 'white' }"
      >
        <el-table-column prop="batch_id" label="批次ID" width="150" />
        <el-table-column prop="company" label="公司" min-width="150" />
        <el-table-column prop="timestamp" label="操作时间" width="180" sortable="custom" />
        <el-table-column prop="employee" label="员工" width="120" />
      </el-table>
      
      <div class="pagination-container">
        <el-pagination
          background
          layout="prev, pager, next, sizes, total"
          :total="totalItems"
          :page-size="pageSize"
          :current-page="currentPage"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
          :page-sizes="[10, 20, 50, 100]"
        />
      </div>
    </div>
  </template>
  
  <script>
  import { ref, computed, watch } from 'vue'
  import { processData } from '../utils/socket'
  import { PROCESS_COLORS } from '../utils/constants'
  
  export default {
    name: 'ProcessTable',
    props: {
      processType: {
        type: String,
        required: true
      },
      processName: {
        type: String,
        required: true
      }
    },
    setup(props) {
      const currentPage = ref(1)
      const pageSize = ref(10)
      
      // 获取当前流程数据，并监听变化
      const currentProcessData = computed(() => {
        return processData[props.processType].value || []
      })
      
      // 获取流程对应的主题色
      const processColor = computed(() => {
        return PROCESS_COLORS[props.processType] || '#409EFF'
      })
      
      // 计算总记录数
      const totalItems = computed(() => {
        return currentProcessData.value.length
      })
      
      // 格式化时间戳
      const formatTimestamp = (timestamp) => {
        if (!timestamp) return timestamp;
        
        // 检查是否已经是格式化后的字符串
        if (typeof timestamp === 'string' && !timestamp.includes('T')) {
          return timestamp;
        }
        
        // 转换ISO格式为标准格式
        const date = new Date(timestamp);
        return date.getFullYear() + '-' +
              String(date.getMonth() + 1).padStart(2, '0') + '-' +
              String(date.getDate()).padStart(2, '0') + ' ' +
              String(date.getHours()).padStart(2, '0') + ':' +
              String(date.getMinutes()).padStart(2, '0') + ':' +
              String(date.getSeconds()).padStart(2, '0');
      }
      
      // 计算分页和格式化后的数据（按时间降序排序）
      const formattedData = computed(() => {
        // 首先按时间戳降序排序（最新的记录在前）
        const sortedData = [...currentProcessData.value].sort((a, b) => {
          const timeA = new Date(a.timestamp).getTime();
          const timeB = new Date(b.timestamp).getTime();
          return timeB - timeA; // 降序排序
        });
        
        const start = (currentPage.value - 1) * pageSize.value;
        const end = start + pageSize.value;
        
        return sortedData.slice(start, end).map(item => ({
          ...item,
          timestamp: formatTimestamp(item.timestamp)
        }));
      });
      
      // 处理分页变化
      const handleCurrentChange = (page) => {
        currentPage.value = page
      }
      
      const handleSizeChange = (size) => {
        pageSize.value = size
        currentPage.value = 1
      }
      
      // 监听流程类型变化，重置分页
      watch(() => props.processType, () => {
        currentPage.value = 1
      })
      
      // 当数据变化且当前页无数据时，重置到第一页
      watch(totalItems, (newValue) => {
        if (newValue > 0 && formattedData.value.length === 0) {
          currentPage.value = 1
        }
      })
      
      return {
        currentProcessData,
        totalItems,
        formattedData,
        currentPage,
        pageSize,
        handleCurrentChange,
        handleSizeChange,
        processColor
      }
    }
  }
  </script>
  
  <style scoped>
  .process-table-container {
    margin-bottom: 20px;
  }
  
  .table-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
    padding: 10px 15px;
    border-left: 4px solid;
    background-color: #f9f9f9;
    border-radius: 4px;
  }
  
  .table-header h3 {
    margin: 0;
    font-size: 18px;
    font-weight: bold;
  }
  
  .table-header-info {
    color: #606266;
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  
  .pagination-container {
    margin-top: 20px;
    display: flex;
    justify-content: center;
  }
  
  :deep(.el-table) {
    --el-table-header-bg-color: #f5f7fa;
    --el-table-row-hover-bg-color: #ecf5ff;
    --el-table-border-color: #e6e6e6;
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
    border-radius: 4px;
    overflow: hidden;
  }
  
  :deep(.el-table__row) {
    transition: all 0.3s;
  }
  </style>