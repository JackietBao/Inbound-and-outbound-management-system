import axios from 'axios'

const API_BASE_URL = 'http://localhost:3000/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
})

export const getProcessData = (processType, startTime, endTime) => {
  return api.get('/process', {
    params: { processType, startTime, endTime }
  })
}

export const getBatchData = (batchId) => {
  return api.get(`/process/${batchId}`)
}

export const exportProcessData = (processType, startTime, endTime) => {
  // 确保日期参数被正确编码
  const encodedStartTime = encodeURIComponent(startTime)
  const encodedEndTime = encodeURIComponent(endTime)
  
  // 使用window.open直接下载文件
  const url = `${API_BASE_URL}/process/export?processType=${processType}&startTime=${encodedStartTime}&endTime=${encodedEndTime}`
  window.open(url)
}

export const exportAllProcessData = (startTime, endTime) => {
  // 确保日期参数被正确编码
  const encodedStartTime = encodeURIComponent(startTime)
  const encodedEndTime = encodeURIComponent(endTime)
  
  const url = `${API_BASE_URL}/process/export-all?startTime=${encodedStartTime}&endTime=${encodedEndTime}`
  window.open(url)
}

export default api