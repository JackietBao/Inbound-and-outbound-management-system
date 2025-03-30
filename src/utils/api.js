import axios from 'axios'

const API_BASE_URL = 'http://192.168.1.16:3000/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
})

export const getProcessData = (processType, startTime, endTime, filters = {}) => {
  // 构建查询参数
  const params = {};
  
  // 添加流程类型（除非是"all"）
  if (processType && processType !== 'all') {
    params.processType = processType;
  }
  
  // 添加时间范围（如果存在）
  if (startTime) {
    params.startTime = startTime;
  }
  if (endTime) {
    params.endTime = endTime;
  }
  
  // 添加筛选条件
  if (filters.batch_id) {
    params.batch_id = filters.batch_id;
  }
  if (filters.employee) {
    params.employee = filters.employee;
  }
  if (filters.company) {
    params.company = filters.company;
  }
  
  console.log('API请求参数:', params);
  
  return api.get('/process', { params });
}

export const getBatchData = (batchId) => {
  return api.get(`/process/${batchId}`)
}

export const exportProcessData = (processType, startTime, endTime, filters = {}) => {
  // 构建基本URL和参数
  const params = new URLSearchParams();
  
  // 添加流程类型
  params.append('processType', processType);
  
  // 添加时间范围（如果存在）
  if (startTime) {
    params.append('startTime', startTime);
  }
  if (endTime) {
    params.append('endTime', endTime);
  }
  
  // 添加额外筛选条件
  if (filters.batch_id) {
    params.append('batch_id', filters.batch_id);
  }
  if (filters.employee) {
    params.append('employee', filters.employee);
  }
  if (filters.company) {
    params.append('company', filters.company);
  }
  
  // 构建最终URL
  const url = `${API_BASE_URL}/process/export?${params.toString()}`;
  
  // 使用window.open直接下载文件
  window.open(url);
}

export const exportAllProcessData = (startTime, endTime, filters = {}) => {
  // 构建基本URL和参数
  const params = new URLSearchParams();
  
  // 添加时间范围（如果存在）
  if (startTime) {
    params.append('startTime', startTime);
  }
  if (endTime) {
    params.append('endTime', endTime);
  }
  
  // 添加额外筛选条件
  if (filters.batch_id) {
    params.append('batch_id', filters.batch_id);
  }
  if (filters.employee) {
    params.append('employee', filters.employee);
  }
  if (filters.company) {
    params.append('company', filters.company);
  }
  
  // 构建最终URL
  const url = `${API_BASE_URL}/process/export-all?${params.toString()}`;
  
  window.open(url);
}

export default api