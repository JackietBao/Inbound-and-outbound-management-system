<template>
  <el-card shadow="hover" class="batch-editor">
    <template #header>
      <div class="card-header">
        <h2>批次信息修改</h2>
      </div>
    </template>
    
    <el-form :model="batchForm" ref="batchFormRef" :rules="rules" label-width="80px" class="batch-form" size="default">
      <!-- 原始批次ID查询 -->
      <el-form-item label="批次ID" prop="originalBatchId">
        <el-row :gutter="10">
          <el-col :span="18">
            <el-input
              v-model="batchForm.originalBatchId"
              placeholder="输入需要修改的批次ID"
              clearable
              :disabled="!!selectedBatch"
            />
          </el-col>
          <el-col :span="6">
            <el-button 
              type="primary" 
              @click="searchBatch" 
              :disabled="!!selectedBatch || !batchForm.originalBatchId"
              :loading="searching"
            >
              查询
            </el-button>
          </el-col>
        </el-row>
      </el-form-item>
      
      <template v-if="selectedBatch">
        <!-- 显示批次当前信息 -->
        <div class="current-info">
          <h3>当前批次信息</h3>
          <el-descriptions :column="1" border>
            <el-descriptions-item label="批次ID">{{ selectedBatch.batch_id }}</el-descriptions-item>
            <el-descriptions-item label="员工">{{ selectedBatch.employee }}</el-descriptions-item>
            <el-descriptions-item label="公司">{{ selectedBatch.company }}</el-descriptions-item>
            <el-descriptions-item label="最后更新">{{ selectedBatch.timestamp }}</el-descriptions-item>
            <el-descriptions-item label="流程">{{ getProcessLabel(selectedBatch.process_type) }}</el-descriptions-item>
          </el-descriptions>
        </div>
        
        <!-- 修改表单 -->
        <div class="edit-form">
          <h3>修改信息</h3>
          
          <el-form-item label="新批次ID" prop="newBatchId">
            <el-input 
              v-model="batchForm.newBatchId"
              placeholder="输入新的批次ID (留空表示不修改)" 
              clearable
            />
          </el-form-item>
          
          <el-form-item label="新员工" prop="newEmployee">
            <el-input 
              v-model="batchForm.newEmployee" 
              placeholder="输入新的员工姓名 (留空表示不修改)" 
              clearable
            />
          </el-form-item>
          
          <el-form-item label="新公司" prop="newCompany">
            <el-input 
              v-model="batchForm.newCompany" 
              placeholder="输入新的公司名称 (留空表示不修改)" 
              clearable
            />
          </el-form-item>
          
          <el-form-item>
            <el-row :gutter="10" justify="center">
              <el-col :xs="24" :sm="12">
                <el-button 
                  type="primary" 
                  @click="submitUpdate" 
                  :loading="updating" 
                  :disabled="!hasChanges"
                  style="width: 100%"
                >
                  提交修改
                </el-button>
              </el-col>
              <el-col :xs="24" :sm="12">
                <el-button 
                  type="warning" 
                  @click="resetForm" 
                  style="width: 100%"
                >
                  取消
                </el-button>
              </el-col>
            </el-row>
          </el-form-item>
        </div>
      </template>
      
      <div v-else-if="notFound" class="not-found">
        <el-alert
          title="未找到该批次"
          type="warning"
          description="请检查批次ID是否正确"
          show-icon
          :closable="false"
        />
      </div>
      
      <div v-if="!selectedBatch && !notFound" class="instructions">
        <el-alert
          title="使用说明"
          type="info"
          description="输入要修改的批次ID并点击查询，然后可以修改批次信息"
          show-icon
          :closable="false"
        />
      </div>
    </el-form>
  </el-card>
</template>

<script>
import { ref, computed, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { getBatchData, updateBatchInfo } from '../utils/api'
import { PROCESS_TYPES } from '../utils/constants'

export default {
  name: 'BatchEditor',
  setup() {
    // 表单引用
    const batchFormRef = ref(null)
    
    // 表单数据
    const batchForm = reactive({
      originalBatchId: '',
      newBatchId: '',
      newEmployee: '',
      newCompany: ''
    })
    
    // 表单校验规则
    const rules = {
      originalBatchId: [
        { required: true, message: '请输入需要修改的批次ID', trigger: 'blur' }
      ]
    }
    
    // 状态标志
    const searching = ref(false)
    const updating = ref(false)
    const notFound = ref(false)
    const selectedBatch = ref(null)
    
    // 计算是否有修改
    const hasChanges = computed(() => {
      return (
        (batchForm.newBatchId && batchForm.newBatchId !== selectedBatch.value?.batch_id) ||
        (batchForm.newEmployee && batchForm.newEmployee !== selectedBatch.value?.employee) ||
        (batchForm.newCompany && batchForm.newCompany !== selectedBatch.value?.company)
      )
    })
    
    // 获取流程类型的中文名称
    const getProcessLabel = (processType) => {
      const process = PROCESS_TYPES.find(p => p.value === processType)
      return process ? process.label : (processType || '未知')
    }
    
    // 查询批次信息
    const searchBatch = async () => {
      if (!batchForm.originalBatchId) {
        ElMessage.warning('请输入批次ID')
        return
      }
      
      searching.value = true
      notFound.value = false
      selectedBatch.value = null
      
      try {
        const response = await getBatchData(batchForm.originalBatchId)
        
        if (response.data && response.data.success && response.data.data) {
          selectedBatch.value = response.data.data
          // 预填充表单
          batchForm.newBatchId = ''
          batchForm.newEmployee = ''
          batchForm.newCompany = ''
          ElMessage.success('批次信息获取成功')
        } else {
          notFound.value = true
          ElMessage.warning('未找到该批次信息')
        }
      } catch (error) {
        console.error('获取批次信息失败:', error)
        ElMessage.error('获取批次信息失败: ' + (error.response?.data?.message || error.message))
        notFound.value = true
      } finally {
        searching.value = false
      }
    }
    
    // 提交修改
    const submitUpdate = async () => {
      if (!selectedBatch.value) {
        ElMessage.warning('请先查询批次信息')
        return
      }
      
      if (!hasChanges.value) {
        ElMessage.warning('未检测到任何修改')
        return
      }
      
      // 构建要更新的数据
      const updateData = {}
      
      if (batchForm.newBatchId) {
        updateData.batch_id = batchForm.newBatchId
      }
      
      if (batchForm.newEmployee) {
        updateData.employee = batchForm.newEmployee
      }
      
      if (batchForm.newCompany) {
        updateData.company = batchForm.newCompany
      }
      
      updating.value = true
      
      try {
        const response = await updateBatchInfo(batchForm.originalBatchId, updateData)
        
        if (response.data && response.data.success) {
          ElMessage.success('批次信息修改成功')
          resetForm()
        } else {
          ElMessage.error('修改失败: ' + (response.data?.message || '未知错误'))
        }
      } catch (error) {
        console.error('修改批次信息失败:', error)
        ElMessage.error('修改失败: ' + (error.response?.data?.message || error.message))
      } finally {
        updating.value = false
      }
    }
    
    // 重置表单
    const resetForm = () => {
      batchFormRef.value?.resetFields()
      batchForm.originalBatchId = ''
      batchForm.newBatchId = ''
      batchForm.newEmployee = ''
      batchForm.newCompany = ''
      selectedBatch.value = null
      notFound.value = false
    }
    
    return {
      batchFormRef,
      batchForm,
      rules,
      searching,
      updating,
      notFound,
      selectedBatch,
      hasChanges,
      getProcessLabel,
      searchBatch,
      submitUpdate,
      resetForm
    }
  }
}
</script>

<style scoped>
.batch-editor {
  max-width: 800px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.batch-form {
  margin-top: 20px;
}

.current-info, .edit-form {
  margin-top: 30px;
  margin-bottom: 30px;
}

.current-info h3, .edit-form h3 {
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #ebeef5;
  color: #303133;
}

.not-found, .instructions {
  margin: 30px 0;
}
</style> 