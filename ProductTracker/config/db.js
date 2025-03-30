const mysql = require('mysql2/promise');
require('dotenv').config();

// 创建数据库连接池
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'product_tracker',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  allowPublicKeyRetrieval: true
});

// 初始化数据库
async function initDatabase() {
  try {
    const connection = await pool.getConnection();
    
    // 创建入库表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS storage (
        id INT AUTO_INCREMENT PRIMARY KEY,
        batch_id VARCHAR(20) NOT NULL UNIQUE,
        timestamp DATETIME NOT NULL,
        employee VARCHAR(50) NOT NULL,
        company VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // 创建贴膜表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS film (
        id INT AUTO_INCREMENT PRIMARY KEY,
        batch_id VARCHAR(20) NOT NULL UNIQUE,
        timestamp DATETIME NOT NULL,
        employee VARCHAR(50) NOT NULL,
        company VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // 创建切割表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS cutting (
        id INT AUTO_INCREMENT PRIMARY KEY,
        batch_id VARCHAR(20) NOT NULL UNIQUE,
        timestamp DATETIME NOT NULL,
        employee VARCHAR(50) NOT NULL,
        company VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // 创建检验表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS inspection (
        id INT AUTO_INCREMENT PRIMARY KEY,
        batch_id VARCHAR(20) NOT NULL UNIQUE,
        timestamp DATETIME NOT NULL,
        employee VARCHAR(50) NOT NULL,
        company VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // 创建出货表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS shipping (
        id INT AUTO_INCREMENT PRIMARY KEY,
        batch_id VARCHAR(20) NOT NULL UNIQUE,
        timestamp DATETIME NOT NULL,
        employee VARCHAR(50) NOT NULL,
        company VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    connection.release();
    console.log('数据库表已初始化');
  } catch (error) {
    console.error('数据库初始化失败:', error);
  }
}

module.exports = {
  pool,
  initDatabase
}; 