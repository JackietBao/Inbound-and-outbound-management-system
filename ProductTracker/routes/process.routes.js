const express = require('express');
const router = express.Router();
const processController = require('../controllers/process.controller');

/**
 * @api {post} /api/process 记录批次操作
 * @apiDescription 记录批次的操作（入库、贴膜、切割、检验、出货）
 * @apiBody {String} batchId 批次ID
 * @apiBody {String} processType 操作类型 (storage, film, cutting, inspection, shipping)
 * @apiBody {String} employee 操作员工
 * @apiBody {String} company 公司名称
 */
router.post('/process', processController.recordProcess);

/**
 * @api {get} /api/process 按时间范围查询数据
 * @apiDescription 根据操作类型和时间范围查询批次数据
 * @apiQuery {String} processType 操作类型 (storage, film, cutting, inspection, shipping)
 * @apiQuery {String} startTime 开始时间 (YYYY-MM-DD HH:mm:ss)
 * @apiQuery {String} endTime 结束时间 (YYYY-MM-DD HH:mm:ss)
 * @apiNote 同时支持URL查询参数和JSON请求体
 */
router.get('/process', express.json(), processController.queryByTimeRange);

/**
 * @api {get} /api/process/batch 按批次ID和流程类型查询数据
 * @apiDescription 根据批次ID和操作类型查询批次数据
 * @apiBody {String} batchId 批次ID
 * @apiBody {String} processType 操作类型 (storage, film, cutting, inspection, shipping)
 */
router.get('/process/batch', express.json(), processController.queryByBatchAndProcess);

/**
 * @api {get} /api/process/export 导出数据为Excel
 * @apiDescription 将指定操作类型和时间范围的数据导出为Excel文件
 * @apiQuery {String} processType 操作类型 (storage, film, cutting, inspection, shipping)
 * @apiQuery {String} startTime 开始时间 (YYYY-MM-DD HH:mm:ss)
 * @apiQuery {String} endTime 结束时间 (YYYY-MM-DD HH:mm:ss)
 * @apiNote 同时支持URL查询参数和JSON请求体
 */
router.get('/process/export', express.json(), processController.exportExcel);

/**
 * @api {get} /api/process/export-all 导出所有流程数据为Excel
 * @apiDescription 将指定时间范围内的所有流程数据导出为Excel文件，每个流程一个工作表
 * @apiQuery {String} startTime 开始时间 (YYYY-MM-DD HH:mm:ss)
 * @apiQuery {String} endTime 结束时间 (YYYY-MM-DD HH:mm:ss)
 */
router.get('/process/export-all', processController.exportAllProcessData);

/**
 * @api {get} /api/process/update-employee-company 更新所有记录的员工和公司信息
 * @apiDescription 将所有记录中缺失的员工和公司信息更新为默认值
 */
router.get('/process/update-employee-company', processController.updateEmployeeAndCompany);

/**
 * @api {get} /api/process/:batchId 获取批次所有流程数据
 * @apiDescription 获取指定批次ID的所有流程数据
 * @apiParam {String} batchId 批次ID
 */
router.get('/process/:batchId', processController.getBatchData);

module.exports = router; 