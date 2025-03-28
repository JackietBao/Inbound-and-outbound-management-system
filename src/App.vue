<template>
  <div class="app-container">
    <el-config-provider :locale="zhCn">
      <el-container>
        <el-header>
          <h1>碳化硅磨划厂生产流程追踪系统</h1>
          <div class="connection-status">
            <el-tag :type="connectionStatusType">{{ connectionStatusText }}</el-tag>
          </div>
        </el-header>
        
        <el-main>
          <!-- 实时数据仪表板 -->
          <dashboard />
          
          <!-- 数据筛选与导出面板 -->
          <export-panel />
          
          <!-- 各流程表格数据 -->
          <div class="process-tables">
            <el-tabs v-model="activeTab" type="card">
              <el-tab-pane 
                v-for="process in processTypes" 
                :key="process.value" 
                :label="process.label" 
                :name="process.value"
              >
                <process-table :process-type="process.value" :process-name="process.label" />
              </el-tab-pane>
            </el-tabs>
          </div>
        </el-main>
        
        <el-footer>
          © 2025 碳化硅磨划厂生产流程追踪系统
        </el-footer>
      </el-container>
    </el-config-provider>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElConfigProvider } from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import Dashboard from './components/Dashboard.vue'
import ExportPanel from './components/ExportPanel.vue'
import ProcessTable from './components/ProcessTable.vue'
import { PROCESS_TYPES } from './utils/constants'
import socketService, { connectionStatus, setupSocketListeners, connectSocket, disconnectSocket, requestInitialData } from './utils/socket'

export default {
  name: 'App',
  components: {
    ElConfigProvider,
    Dashboard,
    ExportPanel,
    ProcessTable
  },
  setup() {
    const activeTab = ref('storage')
    const processTypes = PROCESS_TYPES
    
    // 计算WebSocket连接状态样式
    const connectionStatusType = computed(() => {
      switch (connectionStatus.value) {
        case 'connected':
          return 'success'
        case 'disconnected':
          return 'danger'
        case 'error':
          return 'warning'
        default:
          return 'info'
      }
    })
    
    // 计算WebSocket连接状态文本
    const connectionStatusText = computed(() => {
      switch (connectionStatus.value) {
        case 'connected':
          return '数据实时连接中'
        case 'disconnected':
          return '未连接实时数据'
        case 'error':
          return '连接错误'
        default:
          return '连接中...'
      }
    })
    
    // 组件挂载时初始化WebSocket
    onMounted(() => {
      // 设置WebSocket事件监听
      setupSocketListeners()
      // 连接WebSocket
      connectSocket()
      // 连接成功后请求初始数据
      setTimeout(() => {
        requestInitialData()
      }, 1000)
    })
    
    // 组件卸载时断开WebSocket连接
    onUnmounted(() => {
      disconnectSocket()
    })
    
    return {
      activeTab,
      processTypes,
      zhCn,
      connectionStatus,
      connectionStatusType,
      connectionStatusText
    }
  }
}
</script>

<style>
.app-container {
  font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', Arial, sans-serif;
}

.el-header {
  background-color: #545c64;
  color: white;
  line-height: 60px;
  text-align: center;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  position: relative;
}

.el-header h1 {
  position: absolute;
  left: 0;
  right: 0;
  margin: 0 auto;
  text-align: center;
}

.el-footer {
  background-color: #f5f7fa;
  color: #909399;
  text-align: center;
  line-height: 60px;
}

.process-tables {
  margin-top: 20px;
}

.connection-status {
  min-width: 140px;
  text-align: right;
  z-index: 1;
}
</style>