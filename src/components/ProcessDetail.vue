<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { processData } from '@/utils/socket';
import { useRoute } from 'vue-router';

const route = useRoute();
const processType = ref('');
const processName = ref('');
const records = ref([]);
const loading = ref(true);
const searchText = ref('');

// 创建搜索条件的计算属性
const filteredRecords = computed(() => {
  if (!searchText.value) {
    return records.value;
  }
  const search = searchText.value.toLowerCase();
  return records.value.filter(record => {
    // 判断各个字段是否包含搜索文本
    return (
      record.batch_id.toString().toLowerCase().includes(search) ||
      (record.operator && record.operator.toLowerCase().includes(search)) ||
      (record.timestamp && record.timestamp.toLowerCase().includes(search))
    );
  });
});

// 监听路由变化
watch(() => route.params.processType, (newValue) => {
  if (newValue) {
    setProcessType(newValue);
  }
}, { immediate: true });

// 监听对应流程的数据变化
watch(() => processType.value, (newType) => {
  if (newType && processData[newType]) {
    // 监听数据变化
    watch(() => processData[newType].value, (newData) => {
      records.value = newData;
      loading.value = false;
    }, { immediate: true });
  }
});

// 设置流程类型和名称
function setProcessType(type) {
  processType.value = type;
  
  // 设置对应的中文名称
  switch (type) {
    case 'storage':
      processName.value = '入库';
      break;
    case 'film':
      processName.value = '覆膜';
      break;
    case 'cutting':
      processName.value = '分切';
      break;
    case 'inspection':
      processName.value = '检验';
      break;
    case 'shipping':
      processName.value = '出货';
      break;
    default:
      processName.value = '未知流程';
  }
}

onMounted(() => {
  if (route.params.processType) {
    setProcessType(route.params.processType);
  } else {
    ElMessage.error('未指定流程类型');
  }
});
</script>

<template>
  <div class="process-detail">
    <div class="header">
      <h2>{{ processName }}流程详情</h2>
      <div class="search-box">
        <el-input
          v-model="searchText"
          placeholder="搜索批次ID、操作员或时间..."
          clearable
          prefix-icon="Search"
        />
      </div>
    </div>
    
    <el-table 
      :data="filteredRecords" 
      border 
      stripe 
      style="width: 100%" 
      v-loading="loading"
    >
      <el-table-column 
        prop="batch_id" 
        label="批次ID" 
        width="120" 
        sortable
      />
      <el-table-column 
        prop="operator" 
        label="操作员" 
        width="120"
      />
      <el-table-column 
        prop="timestamp" 
        label="操作时间" 
        width="180" 
        sortable
      />
      
      <!-- 基于不同的流程类型显示不同的额外字段 -->
      <template v-if="processType === 'storage'">
        <el-table-column 
          prop="material_type" 
          label="材料类型" 
        />
        <el-table-column 
          prop="quantity" 
          label="数量(kg)" 
          width="100"
        />
        <el-table-column 
          prop="storage_location" 
          label="存储位置" 
        />
      </template>
      
      <template v-else-if="processType === 'film'">
        <el-table-column 
          prop="film_type" 
          label="覆膜类型" 
        />
        <el-table-column 
          prop="machine_id" 
          label="机器ID" 
          width="100"
        />
        <el-table-column 
          prop="duration" 
          label="处理时间(分钟)" 
          width="140"
        />
      </template>
      
      <template v-else-if="processType === 'cutting'">
        <el-table-column 
          prop="width" 
          label="宽度(mm)" 
          width="100"
        />
        <el-table-column 
          prop="length" 
          label="长度(m)" 
          width="100"
        />
        <el-table-column 
          prop="machine_id" 
          label="机器ID" 
          width="100"
        />
      </template>
      
      <template v-else-if="processType === 'inspection'">
        <el-table-column 
          prop="quality_grade" 
          label="质量等级" 
          width="100"
        />
        <el-table-column 
          prop="defect_count" 
          label="缺陷数量" 
          width="100"
        />
        <el-table-column 
          prop="pass_status" 
          label="是否通过" 
          width="100"
        />
      </template>
      
      <template v-else-if="processType === 'shipping'">
        <el-table-column 
          prop="destination" 
          label="目的地" 
        />
        <el-table-column 
          prop="carrier" 
          label="承运商" 
        />
        <el-table-column 
          prop="tracking_number" 
          label="跟踪号" 
        />
      </template>
      
      <el-table-column 
        prop="notes" 
        label="备注" 
        min-width="150"
      />
    </el-table>
  </div>
</template>

<style scoped>
.process-detail {
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.search-box {
  width: 300px;
}

.el-table {
  margin-top: 20px;
}
</style> 