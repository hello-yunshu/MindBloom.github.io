// Node.js + Express后端服务器
// 用于MindBloom应用的数据存储和API服务

// 导入依赖
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const cron = require('node-cron');

// 定时任务配置
const scheduleTime = process.env.SCHEDULE_TIME || '23:00';
const [scheduleHour, scheduleMinute] = scheduleTime.split(':').map(Number);


// 创建Express应用
const app = express();

// 配置中间件
app.use(express.json());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

// 数据库配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'mindbloom'
};

// 创建数据库连接池
const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// 数据库迁移管理
async function manageDatabaseSchema() {
  try {
    const connection = await pool.getConnection();
    
    // 1. 创建版本表（用于跟踪数据库结构版本）
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS schema_versions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        table_name VARCHAR(50) NOT NULL UNIQUE,
        version INT NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    // 2. 定义表结构（包含版本信息）
    const tableSchemas = [
      {
        name: 'users',
        version: 1,
        sql: `CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          username VARCHAR(255) NOT NULL UNIQUE,
          password VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )`
      },
      {
        name: 'mood_data',
        version: 1,
        sql: `CREATE TABLE IF NOT EXISTS mood_data (
          id INT AUTO_INCREMENT PRIMARY KEY,
          date DATETIME NOT NULL,
          anxiety INT NOT NULL CHECK (anxiety BETWEEN 1 AND 10),
          joy INT NOT NULL CHECK (joy BETWEEN 1 AND 10),
          date_key VARCHAR(10) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_date_key (date_key),
          INDEX idx_date (date)
        )`
      },
      {
        name: 'task_data',
        version: 1,
        sql: `CREATE TABLE IF NOT EXISTS task_data (
          id INT AUTO_INCREMENT PRIMARY KEY,
          date VARCHAR(10) NOT NULL,
          completed INT NOT NULL DEFAULT 0,
          total INT NOT NULL DEFAULT 0,
          completion_rate INT NOT NULL DEFAULT 0 CHECK (completion_rate BETWEEN 0 AND 100),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uk_date (date)
        )`
      },
      {
        name: 'ai_suggestions',
        version: 1,
        sql: `CREATE TABLE IF NOT EXISTS ai_suggestions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          content TEXT NOT NULL,
          date DATETIME NOT NULL,
          metrics JSON NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_date (date)
        )`
      },
      {
        name: 'quotes',
        version: 1,
        sql: `CREATE TABLE IF NOT EXISTS quotes (
          id INT AUTO_INCREMENT PRIMARY KEY,
          text TEXT NOT NULL,
          date DATETIME NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_date (date)
        )`
      }
    ];
    
    // 3. 表结构管理主逻辑
    for (const schema of tableSchemas) {
      // 检查表是否存在
      const [tableExists] = await connection.execute(
        `SELECT table_name FROM information_schema.tables WHERE table_schema = ? AND table_name = ?`,
        [dbConfig.database, schema.name]
      );
      
      if (tableExists.length === 0) {
        // 表不存在，创建表
        await connection.execute(schema.sql);
        console.log(`✅ 新建表: ${schema.name} (版本: ${schema.version})`);
        
        // 插入版本记录
        await connection.execute(
          `INSERT INTO schema_versions (table_name, version) VALUES (?, ?)`,
          [schema.name, schema.version]
        );
      } else {
        // 表存在，检查版本
        const [versionResult] = await connection.execute(
          `SELECT version FROM schema_versions WHERE table_name = ?`,
          [schema.name]
        );
        
        if (versionResult.length === 0) {
          // 没有版本记录，插入当前版本
          await connection.execute(
            `INSERT INTO schema_versions (table_name, version) VALUES (?, ?)`,
            [schema.name, schema.version]
          );
          console.log(`✅ 为表 ${schema.name} 添加版本记录 (版本: ${schema.version})`);
        } else {
          const currentVersion = versionResult[0].version;
          if (currentVersion < schema.version) {
            // 版本需要升级
            console.log(`🔄 表 ${schema.name} 需要升级: ${currentVersion} -> ${schema.version}`);
            
            // 执行升级前备份表
            const backupTableName = `${schema.name}_backup_${Date.now()}`;
            await connection.execute(
              `CREATE TABLE ${backupTableName} LIKE ${schema.name}`
            );
            await connection.execute(
              `INSERT INTO ${backupTableName} SELECT * FROM ${schema.name}`
            );
            console.log(`📦 已备份表 ${schema.name} 到 ${backupTableName}`);
            
            // 在这里添加具体的升级逻辑（根据不同表和版本）
            // 示例：如果是users表从版本1升级到2
            // if (schema.name === 'users' && currentVersion === 1 && schema.version === 2) {
            //   await connection.execute(`ALTER TABLE users ADD COLUMN email VARCHAR(255) NULL`);
            // }
            
            // 更新版本记录
            await connection.execute(
              `UPDATE schema_versions SET version = ? WHERE table_name = ?`,
              [schema.version, schema.name]
            );
            console.log(`✅ 表 ${schema.name} 升级完成: ${currentVersion} -> ${schema.version}`);
          } else if (currentVersion === schema.version) {
            console.log(`✅ 表 ${schema.name} 版本已最新 (版本: ${schema.version})`);
          } else {
            console.log(`⚠️  表 ${schema.name} 版本异常: 当前版本 ${currentVersion} 高于定义版本 ${schema.version}`);
          }
        }
      }
      
      // 4. 执行表结构优化（确保索引和约束正确）
      console.log(`🔧 优化表结构: ${schema.name}`);
      await connection.execute(`OPTIMIZE TABLE ${schema.name}`);
    }
    
    console.log('✅ 数据库表结构管理完成');
    connection.release();
  } catch (error) {
    console.error('❌ 数据库表结构管理失败:', error.message);
    process.exit(1);
  }
}

// 插入初始数据
async function insertInitialData() {
  try {
    const connection = await pool.getConnection();
    
    // 检查是否已有用户数据
    const [users] = await connection.execute('SELECT COUNT(*) as count FROM users');
    if (users[0].count === 0) {
      // 从环境变量读取默认用户名密码
      const defaultUsername = process.env.DEFAULT_USERNAME || 'admin';
      const defaultPassword = process.env.DEFAULT_PASSWORD || 'mindbloom2025';
      
      // 插入默认用户
      await connection.execute(
        'INSERT INTO users (username, password) VALUES (?, ?)',
        [defaultUsername, defaultPassword]
      );
      console.log('✅ 默认用户已创建');
    }
    
    // 检查是否已有引用数据
    const [quotes] = await connection.execute('SELECT COUNT(*) as count FROM quotes');
    if (quotes[0].count === 0) {
      // 插入初始引用
      await connection.execute(
        'INSERT INTO quotes (text, date) VALUES (?, ?)',
        [
          '学习的本质是探索与成长，而非表演与完美。每一步回归真实兴趣的尝试，都是对过去扭曲学习模式的治愈。',
          new Date().toISOString()
        ]
      );
      console.log('✅ 初始引用数据已创建');
    }
    
    connection.release();
  } catch (error) {
    console.error('❌ 插入初始数据失败:', error.message);
    process.exit(1);
  }
}

// 初始化数据库
async function initDatabase() {
  try {
    await manageDatabaseSchema();
    await insertInitialData();
    console.log('✅ 数据库初始化完成');
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error.message);
    process.exit(1);
  }
}

// 调用初始化函数
initDatabase();

// 路由处理

// 获取所有数据
app.get('/api/data', async (req, res) => {
  try {
    // 获取所有数据
    const [moodData] = await pool.execute('SELECT * FROM mood_data ORDER BY date DESC');
    const [taskData] = await pool.execute('SELECT * FROM task_data');
    const [aiSuggestions] = await pool.execute('SELECT * FROM ai_suggestions ORDER BY date DESC');
    const [quotes] = await pool.execute('SELECT * FROM quotes ORDER BY date DESC');
    
    // 转换taskData格式为对象
    const taskDataObj = {};
    taskData.forEach(task => {
      taskDataObj[task.date] = {
        date: task.date,
        completed: task.completed,
        total: task.total,
        completionRate: task.completion_rate
      };
    });
    
    // 获取最后更新时间
    const [lastUpdatedResult] = await pool.execute(
      `SELECT MAX(updated_at) as lastUpdated FROM (
        SELECT updated_at FROM mood_data UNION ALL
        SELECT updated_at FROM task_data UNION ALL
        SELECT updated_at FROM ai_suggestions UNION ALL
        SELECT updated_at FROM quotes
      ) AS all_tables`
    );
    
    const lastUpdated = lastUpdatedResult[0].lastUpdated || new Date().toISOString();
    
    res.json({
      moodData,
      taskData: taskDataObj,
      aiSuggestions,
      quotes,
      lastUpdated
    });
  } catch (error) {
    console.error('获取数据失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// 保存所有数据
app.post('/api/data', async (req, res) => {
  try {
    const data = req.body;
    
    // 开始事务
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      // 保存情绪数据
      if (data.moodData && Array.isArray(data.moodData)) {
        for (const mood of data.moodData) {
          await connection.execute(
            'INSERT INTO mood_data (date, anxiety, joy, date_key) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE anxiety = VALUES(anxiety), joy = VALUES(joy)',
            [mood.date, mood.anxiety, mood.joy, mood.date_key]
          );
        }
      }
      
      // 保存任务数据
      if (data.taskData) {
        for (const [dateKey, task] of Object.entries(data.taskData)) {
          await connection.execute(
            'INSERT INTO task_data (date, completed, total, completion_rate) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE completed = VALUES(completed), total = VALUES(total), completion_rate = VALUES(completion_rate)',
            [dateKey, task.completed, task.total, task.completionRate]
          );
        }
      }
      
      // 保存AI建议
      if (data.aiSuggestions && Array.isArray(data.aiSuggestions)) {
        for (const suggestion of data.aiSuggestions) {
          await connection.execute(
            'INSERT INTO ai_suggestions (title, content, date, metrics) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE title = VALUES(title), content = VALUES(content), metrics = VALUES(metrics)',
            [suggestion.title, suggestion.content, suggestion.date, JSON.stringify(suggestion.metrics || null)]
          );
        }
      }
      
      // 保存引用数据
      if (data.quotes && Array.isArray(data.quotes)) {
        for (const quote of data.quotes) {
          await connection.execute(
            'INSERT INTO quotes (text, date) VALUES (?, ?) ON DUPLICATE KEY UPDATE text = VALUES(text)',
            [quote.text, quote.date]
          );
        }
      }
      
      // 提交事务
      await connection.commit();
      connection.release();
      
      res.json({ success: true, data });
    } catch (error) {
      // 回滚事务
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error('保存数据失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// 保存情绪数据
app.post('/api/mood', async (req, res) => {
  try {
    const moodData = req.body;
    
    await pool.execute(
      'INSERT INTO mood_data (date, anxiety, joy, date_key) VALUES (?, ?, ?, ?)',
      [moodData.date, moodData.anxiety, moodData.joy, moodData.date_key]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('保存情绪数据失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// 保存任务数据
app.post('/api/task', async (req, res) => {
  try {
    const taskData = req.body;
    
    await pool.execute(
      'INSERT INTO task_data (date, completed, total, completion_rate) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE completed = VALUES(completed), total = VALUES(total), completion_rate = VALUES(completion_rate)',
      [taskData.date, taskData.completed, taskData.total, taskData.completionRate]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('保存任务数据失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// 保存AI建议
app.post('/api/ai-suggestion', async (req, res) => {
  try {
    const suggestion = req.body;
    
    await pool.execute(
      'INSERT INTO ai_suggestions (title, content, date, metrics) VALUES (?, ?, ?, ?)',
      [suggestion.title, suggestion.content, suggestion.date, JSON.stringify(suggestion.metrics || null)]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('保存AI建议失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// 用户认证相关API

// 获取当前用户信息
app.get('/api/user', async (req, res) => {
  try {
    const [users] = await pool.execute('SELECT id, username, created_at FROM users LIMIT 1');
    if (users.length === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }
    res.json({ success: true, user: users[0] });
  } catch (error) {
    console.error('获取用户信息失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// 更新用户信息（用户名和密码）
app.put('/api/user', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }
    
    await pool.execute(
      'UPDATE users SET username = ?, password = ? WHERE id = 1',
      [username, password]
    );
    
    res.json({ success: true, message: '用户信息更新成功' });
  } catch (error) {
    console.error('更新用户信息失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// 验证用户登录
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const [users] = await pool.execute(
      'SELECT id, username FROM users WHERE username = ? AND password = ?',
      [username, password]
    );
    
    if (users.length === 0) {
      return res.status(401).json({ success: false, error: '用户名或密码错误' });
    }
    
    res.json({ success: true, user: users[0] });
  } catch (error) {
    console.error('登录验证失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// 生成AI建议
app.post('/api/generate-ai-suggestion', async (req, res) => {
  try {
    // 获取用户数据
    const [moodData] = await pool.execute('SELECT * FROM mood_data ORDER BY date DESC LIMIT 7');
    const [taskData] = await pool.execute('SELECT * FROM task_data ORDER BY date DESC LIMIT 7');
    
    // 计算统计数据
    const stats = {
      avgAnxiety: 0,
      avgJoy: 0,
      avgCompletionRate: 0,
      daysTracked: moodData.length
    };
    
    if (moodData.length > 0) {
      stats.avgAnxiety = moodData.reduce((sum, item) => sum + item.anxiety, 0) / moodData.length;
      stats.avgJoy = moodData.reduce((sum, item) => sum + item.joy, 0) / moodData.length;
    }
    
    if (taskData.length > 0) {
      stats.avgCompletionRate = taskData.reduce((sum, item) => sum + item.completion_rate, 0) / taskData.length;
    }
    
    // 生成AI建议（模拟AI逻辑）
    const suggestions = generateAISuggestions(stats);
    
    // 保存AI建议到数据库
    await pool.execute(
      'INSERT INTO ai_suggestions (title, content, date, metrics) VALUES (?, ?, ?, ?)',
      [
        suggestions.title,
        suggestions.content,
        new Date().toISOString(),
        JSON.stringify(stats)
      ]
    );
    
    res.json({ success: true, suggestion: suggestions });
  } catch (error) {
    console.error('生成AI建议失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// 使用Qwen API生成真实AI建议
async function generateAISuggestions(stats) {
  try {
    // 构建提示词
    const messages = [
      {
        role: 'system',
        content: '你是一个专业的学习心理顾问，专注于帮助用户建立健康的学习习惯和积极的学习心态。'
      },
      {
        role: 'user',
        content: `
        请基于以下用户数据，生成一份详细、实用的学习建议：
        
        用户数据：
        - 平均焦虑程度：${stats.avgAnxiety.toFixed(1)}（1-10分，10分为最焦虑）
        - 平均愉悦程度：${stats.avgJoy.toFixed(1)}（1-10分，10分为最愉悦）
        - 平均任务完成率：${stats.avgCompletionRate.toFixed(0)}%（0-100%）
        - 数据追踪天数：${stats.daysTracked}天
        
        建议要求：
        1. 标题统一为"本周学习建议"
        2. 建议内容要具体、实用，有针对性
        3. 涵盖学习方法、情绪管理、时间安排等方面
        4. 语言要友好、鼓励，符合"学习心理建设指南"的定位
        5. 建议长度适中，不要太长
        6. 避免使用专业术语，保持通俗易懂
        
        请直接生成建议内容，不需要任何引言或解释。
        `
      }
    ];
    
    // 调用Qwen API
    const response = await fetch(`${process.env.QWEN_API_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.QWEN_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.QWEN_MODEL || 'qwen3-max-preview',
        messages: messages,
        temperature: parseFloat(process.env.QWEN_TEMPERATURE || '0.7'),
        max_tokens: 500
      })
    });
    
    if (!response.ok) {
      throw new Error(`Qwen API request failed with status: ${response.status}`);
    }
    
    const result = await response.json();
    
    // 解析响应
    const content = result.choices[0].message.content.trim();
    
    // 生成最终建议
    return {
      title: "本周学习建议",
      content: content,
      date: new Date().toISOString(),
      metrics: stats
    };
  } catch (error) {
    console.error('调用Qwen API失败:', error.message);
    
    // 降级到模拟AI建议
    return generateFallbackAISuggestions(stats);
  }
}

// 降级方案：模拟AI建议生成器（当Qwen API不可用时使用）
function generateFallbackAISuggestions(stats) {
  const suggestions = [];
  
  // 基于焦虑程度生成建议
  if (stats.avgAnxiety > 6) {
    suggestions.push("您的焦虑程度较高，建议尝试冥想或深呼吸练习，每天10-15分钟可以有效缓解学习压力。");
  } else if (stats.avgAnxiety > 3) {
    suggestions.push("您的焦虑程度适中，建议保持规律的学习计划，避免过度劳累。");
  } else {
    suggestions.push("您的情绪状态良好，继续保持积极的学习态度！");
  }
  
  // 基于愉悦程度生成建议
  if (stats.avgJoy < 4) {
    suggestions.push("您的愉悦程度较低，建议在学习中加入一些有趣的元素，比如听喜欢的音乐或学习感兴趣的主题。");
  } else if (stats.avgJoy < 7) {
    suggestions.push("您的愉悦程度适中，建议尝试新的学习方法，保持学习的新鲜感。");
  } else {
    suggestions.push("您的愉悦程度较高，继续保持这种积极的学习状态！");
  }
  
  // 基于任务完成率生成建议
  if (stats.avgCompletionRate < 50) {
    suggestions.push("您的任务完成率较低，建议将大任务分解为小任务，逐步完成，提高成就感。");
  } else if (stats.avgCompletionRate < 80) {
    suggestions.push("您的任务完成率良好，建议设定更具挑战性的目标，进一步提升自己。");
  } else {
    suggestions.push("您的任务完成率很高，继续保持高效的学习习惯！");
  }
  
  // 基于追踪天数生成建议
  if (stats.daysTracked < 3) {
    suggestions.push("您刚开始使用MindBloom，建议坚持记录，一段时间后会看到明显的变化。");
  } else if (stats.daysTracked < 7) {
    suggestions.push("您已经使用MindBloom一段时间，建议回顾过去的数据，总结学习规律。");
  } else {
    suggestions.push("您已经坚持使用MindBloom一周以上，继续保持，学习习惯正在形成！");
  }
  
  // 生成最终建议
  return {
    title: "本周学习建议",
    content: suggestions.join("\n\n"),
    date: new Date().toISOString(),
    metrics: stats
  };
}

// 定时任务：每日生成AI内容
async function scheduledAIGeneration() {
  console.log('⏰ 开始执行定时AI内容生成...');
  try {
    // 获取用户数据
    const [moodData] = await pool.execute('SELECT * FROM mood_data ORDER BY date DESC LIMIT 7');
    const [taskData] = await pool.execute('SELECT * FROM task_data ORDER BY date DESC LIMIT 7');
    
    // 计算统计数据
    const stats = {
      avgAnxiety: 0,
      avgJoy: 0,
      avgCompletionRate: 0,
      daysTracked: moodData.length
    };
    
    if (moodData.length > 0) {
      stats.avgAnxiety = moodData.reduce((sum, item) => sum + item.anxiety, 0) / moodData.length;
      stats.avgJoy = moodData.reduce((sum, item) => sum + item.joy, 0) / moodData.length;
    }
    
    if (taskData.length > 0) {
      stats.avgCompletionRate = taskData.reduce((sum, item) => sum + item.completion_rate, 0) / taskData.length;
    }
    
    // 生成AI建议
    const suggestion = await generateAISuggestions(stats);
    
    // 保存到数据库
    await pool.execute(
      'INSERT INTO ai_suggestions (title, content, date, metrics) VALUES (?, ?, ?, ?)',
      [
        suggestion.title,
        suggestion.content,
        suggestion.date,
        JSON.stringify(suggestion.metrics || null)
      ]
    );
    
    console.log('✅ 定时AI内容生成完成！');
  } catch (error) {
    console.error('❌ 定时AI内容生成失败:', error.message);
  }
}

// 设置定时任务
const cronSchedule = `${scheduleMinute} ${scheduleHour} * * *`; // 格式：分钟 小时 * * *
cron.schedule(cronSchedule, () => {
  console.log(`📅 触发定时任务: ${new Date().toISOString()}`);
  scheduledAIGeneration();
});

console.log(`⏰ 定时任务已设置，每日 ${scheduleTime} 执行`);

// 手动触发AI内容生成API
app.post('/api/generate-daily-ai', async (req, res) => {
  try {
    await scheduledAIGeneration();
    res.json({ success: true, message: 'AI内容生成完成' });
  } catch (error) {
    console.error('手动生成AI内容失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// 静态文件服务（可选，用于直接提供前端文件）
app.use(express.static(__dirname));

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    schedule: {
      time: scheduleTime,
      cron: cronSchedule
    }
  });
});

// 404处理
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// 启动服务器
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`🚀 MindBloom服务器已启动`);
  console.log(`📍 地址: http://${HOST}:${PORT}`);
  console.log(`📊 API文档: http://${HOST}:${PORT}/api/data`);
  console.log(`💡 健康检查: http://${HOST}:${PORT}/health`);
  console.log(`⏰ 定时任务: 每日 ${scheduleTime} 执行`);
  console.log(`🤖 AI模型: ${process.env.QWEN_MODEL || 'qwen3-max-preview'}`);
});
