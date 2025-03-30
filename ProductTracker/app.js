const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const { initDatabase } = require('./config/db');
const processRoutes = require('./routes/process.routes');

// 创建Express应用
const app = express();
const PORT = process.env.PORT || 3000;

// 创建HTTP服务器
const server = http.createServer(app);

// 设置Socket.IO
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务
app.use(express.static(path.join(__dirname, 'public')));

// 初始化数据库
initDatabase();

// API路由
app.use('/api', processRoutes);

// 根路由
app.get('/', (req, res) => {
  res.send('生产流程追踪系统API服务正在运行');
});

// 初始化Socket控制器 (必须在这里引入以避免循环依赖)
const socketController = require('./controllers/socket.controller');
socketController.init(io);

// 将io对象添加到app，使其可在其他模块中访问
app.set('io', io);

// 错误处理中间件
app.use((err, req, res, next) => {
  res.status(500).json({
    success: false,
    message: '服务器内部错误'
  });
});

// 启动服务器
server.listen(PORT, () => {
  console.log(`服务器已启动，端口：${PORT}`);
}); 