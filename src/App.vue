<template>
  <div class="app-container">
    <el-config-provider :locale="zhCn">
      <el-container>
        <el-aside :width="isCollapse ? '64px' : '250px'" class="sidebar">
          <div class="sidebar-header">
            <div class="logo-container">
              <img src="/XG.ico" alt="Logo" class="logo-image" />
              <span v-show="!isCollapse" class="logo-text">生产流程追踪系统</span>
            </div>
            <el-button type="text" @click="toggleSidebar" class="toggle-btn">
              <el-icon :size="24">
                <i-ep-fold v-if="!isCollapse" />
                <i-ep-expand v-else />
              </el-icon>
            </el-button>
          </div>
          <el-menu
            default-active="1"
            class="sidebar-menu"
            :collapse="isCollapse"
            :collapse-transition="false"
            background-color="#545c64"
            text-color="#fff"
            active-text-color="#ffd04b"
            @select="handleMenuSelect"
          >
            <el-menu-item index="1">
              <el-icon><i-ep-pie-chart /></el-icon>
              <template #title>仪表盘</template>
            </el-menu-item>
            <el-menu-item index="2">
              <el-icon><i-ep-odometer /></el-icon>
              <template #title>流程追踪</template>
            </el-menu-item>
            <el-menu-item index="3">
              <el-icon><i-ep-filter /></el-icon>
              <template #title>数据筛选与导出</template>
            </el-menu-item>
          </el-menu>
        </el-aside>

        <el-container>
          <el-header>
            <div class="header-left">
              <el-button 
                type="primary" 
                size="small" 
                circle 
                @click="toggleSidebar" 
                class="sidebar-toggle-btn"
                :title="isCollapse ? '展开导航栏' : '收起导航栏'"
              >
                <el-icon>
                  <i-ep-expand v-if="isCollapse" />
                  <i-ep-fold v-else />
                </el-icon>
              </el-button>
              <div class="header-title">
              </div>
            </div>
            <div class="connection-status">
              <el-tag :type="connectionStatusType">{{ connectionStatusText }}</el-tag>
            </div>
          </el-header>
          
          <el-main>
            <!-- 公司批次完成率 -->
            <dashboard v-if="activeView === '1' || activeView === '2'" :show-completion-rates="activeView === '1'" />
            
            <!-- 数据筛选与导出面板 -->
            <export-panel v-if="activeView === '3'" class="fullscreen-panel" />
          </el-main>
          
          <el-footer>
            © 2025 江苏芯格电子科技有限公司
          </el-footer>
        </el-container>
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
import { PROCESS_TYPES } from './utils/constants'
import socketService, { connectionStatus, lastUpdateTime, setupSocketListeners, connectSocket, disconnectSocket, requestInitialData } from './utils/socket'

export default {
  name: 'App',
  components: {
    ElConfigProvider,
    Dashboard,
    ExportPanel
  },
  setup() {
    const processTypes = PROCESS_TYPES
    const isCollapse = ref(false)
    const activeView = ref('1')
    
    // 切换侧边栏收起/展开
    const toggleSidebar = () => {
      isCollapse.value = !isCollapse.value
    }
    
    // 处理菜单项选择
    const handleMenuSelect = (index) => {
      activeView.value = index
    }
    
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
      processTypes,
      zhCn,
      connectionStatus,
      connectionStatusType,
      connectionStatusText,
      lastUpdateTime,
      isCollapse,
      toggleSidebar,
      activeView,
      handleMenuSelect
    }
  }
}
</script>

<style>
.app-container {
  font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', Arial, sans-serif;
  height: 100vh;
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

.header-left {
  display: flex;
  align-items: center;
}

.header-title {
  display: flex;
  align-items: center;
}

.header-logo {
  width: 28px;
  height: 28px;
  margin-right: 10px;
}

.sidebar-toggle-btn {
  margin-right: 15px;
  z-index: 10;
}

.el-header h1 {
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.el-footer {
  background-color: #f5f7fa;
  color: #909399;
  text-align: center;
  line-height: 60px;
}

.connection-status {
  min-width: 140px;
  text-align: right;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 15px;
}

.last-update-time {
  color: #e6e6e6;
  font-size: 13px;
}

.sidebar {
  background-color: #545c64;
  transition: width 0.3s;
  height: 100vh;
  overflow: hidden;
}

.sidebar-header {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  color: white;
  font-size: 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.logo-container {
  display: flex;
  align-items: center;
}

.logo-image {
  width: 32px;
  height: 32px;
  margin-right: 10px;
}

.logo-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar-menu {
  border-right: none;
}

.toggle-btn {
  color: white;
  margin-right: 0;
}

.el-main {
  padding: 20px;
  overflow-y: auto;
}

.el-container {
  height: 100%;
}

.fullscreen-panel {
  margin-top: 0;
}
</style>