# 生产流程追踪系统

基于Node.js和MySQL的生产流程追踪系统，用于追踪产品从入库到出货的整个流程。

## 功能特点

- 严格按照"入库 -> 贴膜 -> 切割 -> 检验 -> 出货"的顺序进行操作
- 对不符合流程顺序的操作进行拦截并返回错误信息
- 防止在同一环节重复记录
- 提供按时间范围查询各表数据的API接口
- 支持将数据导出为Excel表格

## 系统架构

- 前端：移动端应用（扫码录入）
- 后端：Node.js + Express
- 数据库：MySQL
- 数据表：入库表、贴膜表、切割表、检验表、出货表

## 安装与部署

### 前提条件

- Node.js (v14+)
- MySQL (v5.7+)

### 安装步骤

1. 克隆代码仓库
   ```
   git clone <repository-url>
   cd ProductTracker
   ```

2. 安装依赖
   ```
   npm install
   ```

3. 配置环境变量
   ```
   cp .env.example .env
   ```
   然后编辑.env文件，填入正确的数据库连接信息

4. 创建数据库
   ```
   CREATE DATABASE product_tracker;
   ```

5. 启动应用
   ```
   npm start
   ```

## API接口文档

### 记录批次操作


curl -X GET -H "Content-Type: application/json" -d '{
  "processType": "storage",
  "startTime": "2025-03-25 20:30:59",
  "endTime": "2025-03-26 23:59:59"
}' "http://192.168.232.153:3000/api/process"

- **URL**: `/api/process`
- **Method**: `POST`
- **请求体**:
  ```json
  {
    "batchId": "24B0256",
    "processType": "storage"  // 操作类型: storage, film, cutting, inspection, shipping
  }
  ```
- **响应**:
  ```json
  {
    "success": true,
    "message": "批次 24B0256 的storage操作已记录"
  }
  ```

### 按时间范围查询数据

- **URL**: `/api/process`
- **Method**: `GET`
- **查询参数**:
  - `processType`: 操作类型 (storage, film, cutting, inspection, shipping)
  - `startTime`: 开始时间 (YYYY-MM-DD HH:mm:ss)
  - `endTime`: 结束时间 (YYYY-MM-DD HH:mm:ss)
- **或者使用JSON请求体**:
  ```json
  {
    "processType": "storage",
    "startTime": "2025-03-25 20:30:59",
    "endTime": "2025-03-26 23:59:59"
  }
  ```
- **响应**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": 1,
        "batch_id": "24B0256",
        "timestamp": "2025-03-25 20:30:59"
      },
      ...
    ]
  }
  ```

### 导出数据为Excel

- **URL**: `/api/process/export`
- **Method**: `GET`
- **查询参数**:
  - `processType`: 操作类型 (storage, film, cutting, inspection, shipping)
  - `startTime`: 开始时间 (YYYY-MM-DD HH:mm:ss)
  - `endTime`: 结束时间 (YYYY-MM-DD HH:mm:ss)
- **或者使用JSON请求体**:
  ```json
  {
    "processType": "storage",
    "startTime": "2025-03-25 20:30:59",
    "endTime": "2025-03-26 23:59:59"
  }
  ```
  http://192.168.232.153:3000/api/process/export?processType=storage&startTime=2025-03-25%2020:30:59&endTime=2025-03-26%2023:59:59
- **响应**: Excel文件下载

### 获取批次所有流程数据

- **URL**: `/api/process/:batchId`
- **Method**: `GET`
- **路径参数**:
  - `batchId`: 批次ID
- **响应**:
  ```json
  {
    "success": true,
    "data": {
      "storage": {
        "id": 1,
        "batch_id": "24B0256",
        "timestamp": "2025-03-25 20:30:59"
      },
      "film": {
        "id": 1,
        "batch_id": "24B0256",
        "timestamp": "2025-03-25 21:15:30"
      },
      ...
    }
  }
  ```

### 按批次ID和流程类型查询数据

- **URL**: `/api/process/batch`
- **Method**: `GET`
- **请求体**:
  ```json
  {
    "batchId": "24B0256",
    "processType": "storage"
  }
  ```
- **响应**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": 1,
        "batch_id": "24B0256",
        "timestamp": "2025-03-26 10:36:12"
      }
    ]
  }
  ```

## 错误处理

系统会对不符合流程顺序的操作返回明确的错误信息，例如：

```json
{
  "success": false,
  "message": "操作失败，请先完成以下步骤: 1.扫码入库 2.扫码贴膜"
}
``` 