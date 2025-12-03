// 应用配置
const APP_CONFIG = {
    API_URL: 'http://localhost:3000', // 本地后端服务器地址
    STORAGE_KEYS: {
        MOOD_DATA: 'mindbloom_mood_data',
        TASK_DATA: 'mindbloom_task_data',
        USER_SESSION: 'mindbloom_user_session',
        AI_SUGGESTIONS: 'mindbloom_ai_suggestions',
        QUOTES: 'mindbloom_quotes'
    }
};

// 自定义弹窗组件
class CustomAlert {
    static show(message, type = 'info', duration = 3000, autoClose = true) {
        // 创建弹窗元素
        const alertElement = document.createElement('div');
        alertElement.className = `custom-alert custom-alert-${type}`;
        
        alertElement.innerHTML = `
            <div class="custom-alert-content">
                <span class="custom-alert-message">${message}</span>
                <button class="custom-alert-close">
                    <i class="material-icons">close</i>
                </button>
            </div>
        `;
        
        // 添加到页面
        document.body.appendChild(alertElement);
        
        // 添加动画类
        setTimeout(() => {
            alertElement.classList.add('custom-alert-show');
        }, 10);
        
        // 添加关闭按钮事件
        const closeBtn = alertElement.querySelector('.custom-alert-close');
        closeBtn.addEventListener('click', () => {
            CustomAlert.hide(alertElement);
        });
        
        // 自动关闭（如果autoClose为true）
        if (autoClose) {
            setTimeout(() => {
                CustomAlert.hide(alertElement);
            }, duration);
        }
    }
    
    static hide(alertElement) {
        alertElement.classList.remove('custom-alert-show');
        setTimeout(() => {
            if (alertElement.parentNode) {
                alertElement.parentNode.removeChild(alertElement);
            }
        }, 300);
    }
    
    // 便捷方法
    static success(message, duration = 3000, autoClose = true) {
        this.show(message, 'success', duration, autoClose);
    }
    
    static error(message, duration = 5000, autoClose = true) {
        this.show(message, 'error', duration, autoClose);
    }
    
    static warning(message, duration = 4000, autoClose = true) {
        this.show(message, 'warning', duration, autoClose);
    }
    
    static info(message, duration = 3000, autoClose = true) {
        this.show(message, 'info', duration, autoClose);
    }
    
    // 便捷方法：手动关闭模式（用于重要操作反馈）
    static successManual(message) {
        this.show(message, 'success', 0, false);
    }
    
    static errorManual(message) {
        this.show(message, 'error', 0, false);
    }
    
    static warningManual(message) {
        this.show(message, 'warning', 0, false);
    }
    
    static infoManual(message) {
        this.show(message, 'info', 0, false);
    }
}

// 用户认证管理
class AuthManager {
    static isLoggedIn() {
        const session = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.USER_SESSION);
        return session === 'true';
    }

    static async login(username, password) {
        try {
            // 调用API验证登录
            const response = await fetch(`${APP_CONFIG.API_URL}/api/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const result = await response.json();
            if (result.success) {
                localStorage.setItem(APP_CONFIG.STORAGE_KEYS.USER_SESSION, 'true');
                localStorage.setItem('current_user', JSON.stringify(result.user));
                return true;
            }
            return false;
        } catch (error) {
            console.error('登录失败:', error);
            return false;
        }
    }

    static logout() {
        localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.USER_SESSION);
        localStorage.removeItem('current_user');
    }

    static async updateUser(username, password) {
        try {
            const response = await fetch(`${APP_CONFIG.API_URL}/api/user`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const result = await response.json();
            return result.success;
        } catch (error) {
            console.error('更新用户信息失败:', error);
            return false;
        }
    }

    static async getCurrentUser() {
        try {
            const response = await fetch(`${APP_CONFIG.API_URL}/api/user`);
            const result = await response.json();
            if (result.success) {
                localStorage.setItem('current_user', JSON.stringify(result.user));
                return result.user;
            }
            return null;
        } catch (error) {
            console.error('获取用户信息失败:', error);
            return null;
        }
    }
}

// API 客户端类，用于与 Cloudflare Workers 交互
class APIClient {
    static async fetchAPI(endpoint, method = 'GET', data = null) {
        const url = `${APP_CONFIG.API_URL}${endpoint}`;
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (data) {
            options.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                throw new Error(`API request failed with status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('API request error:', error);
            return null;
        }
    }

    static async getData() {
        return await this.fetchAPI('/api/data');
    }

    static async saveData(data) {
        return await this.fetchAPI('/api/data', 'POST', data);
    }

    static async saveMoodData(moodData) {
        return await this.fetchAPI('/api/mood', 'POST', moodData);
    }

    static async saveTaskData(taskData) {
        return await this.fetchAPI('/api/task', 'POST', taskData);
    }

    static async saveAISuggestion(suggestion) {
        return await this.fetchAPI('/api/ai-suggestion', 'POST', suggestion);
    }
}

// 数据管理类
class DataManager {
    static getMoodData() {
        const data = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.MOOD_DATA);
        return data ? JSON.parse(data) : [];
    }

    static async saveMoodData(moodData) {
        // 保存到本地存储
        const data = this.getMoodData();
        data.push(moodData);
        localStorage.setItem(APP_CONFIG.STORAGE_KEYS.MOOD_DATA, JSON.stringify(data));
        
        // 只有登录后才同步到后端
        if (AuthManager.isLoggedIn()) {
            // 同步到 Cloudflare KV
            await APIClient.saveMoodData(moodData);
        }
    }

    static getTaskData() {
        const data = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.TASK_DATA);
        return data ? JSON.parse(data) : {};
    }

    static async saveTaskData(taskData) {
        // 保存到本地存储
        localStorage.setItem(APP_CONFIG.STORAGE_KEYS.TASK_DATA, JSON.stringify(taskData));
        
        // 只有登录后才同步到后端
        if (AuthManager.isLoggedIn()) {
            // 同步到 Cloudflare KV
            await APIClient.saveTaskData(taskData);
        }
    }

    static getAISuggestions() {
        const data = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.AI_SUGGESTIONS);
        return data ? JSON.parse(data) : [];
    }

    static async saveAISuggestions(suggestions) {
        // 保存到本地存储
        localStorage.setItem(APP_CONFIG.STORAGE_KEYS.AI_SUGGESTIONS, JSON.stringify(suggestions));
        
        // 只有登录后才同步到后端
        if (AuthManager.isLoggedIn()) {
            // 同步到 Cloudflare KV
            await APIClient.saveAISuggestion(suggestions[suggestions.length - 1]);
        }
    }

    static getQuotes() {
        const data = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.QUOTES);
        return data ? JSON.parse(data) : [];
    }

    static saveQuote(quote) {
        const data = this.getQuotes();
        data.push(quote);
        localStorage.setItem(APP_CONFIG.STORAGE_KEYS.QUOTES, JSON.stringify(data));
    }

    // 从 Cloudflare KV 同步数据到本地存储
    static async syncFromCloud() {
        const cloudData = await APIClient.getData();
        if (cloudData) {
            if (cloudData.moodData) {
                localStorage.setItem(APP_CONFIG.STORAGE_KEYS.MOOD_DATA, JSON.stringify(cloudData.moodData));
            }
            if (cloudData.taskData) {
                localStorage.setItem(APP_CONFIG.STORAGE_KEYS.TASK_DATA, JSON.stringify(cloudData.taskData));
            }
            if (cloudData.aiSuggestions) {
                localStorage.setItem(APP_CONFIG.STORAGE_KEYS.AI_SUGGESTIONS, JSON.stringify(cloudData.aiSuggestions));
            }
            if (cloudData.quotes) {
                localStorage.setItem(APP_CONFIG.STORAGE_KEYS.QUOTES, JSON.stringify(cloudData.quotes));
            }
            return true;
        }
        return false;
    }

    static exportData() {
        const data = {
            moodData: this.getMoodData(),
            taskData: this.getTaskData(),
            aiSuggestions: this.getAISuggestions(),
            quotes: this.getQuotes(),
            exportDate: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mindbloom_data_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }
}

// 日期工具类
class DateUtils {
    static formatDate(date = new Date()) {
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
        const weekday = days[date.getDay()];
        
        return `${year}年${month}月${day}日 ${weekday}`;
    }

    static getTodayKey() {
        const now = new Date();
        return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    }

    static getWeekDays() {
        return ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    }
}

// 应用主类
class MindBloomApp {
    constructor() {
        this.charts = null;
        this.init();
    }

    async init() {
        // 无论是否登录，都加载数据并显示
        await DataManager.syncFromCloud();
        
        this.setupEventListeners();
        this.setCurrentDate();
        this.initCharts();
        this.setupTabs();
        this.setupMoodTracking();
        this.initCompletionRate();
        this.loadAISuggestions();
        this.generateAIQuote();
    }

    showLogin() {
        document.body.innerHTML = `
            <div class="login-container">
                <div class="login-card">
                    <h2>🔐 学习心理建设指南</h2>
                    <div class="form-group">
                        <label for="username">用户名</label>
                        <input type="text" id="username" placeholder="请输入用户名">
                    </div>
                    <div class="form-group">
                        <label for="password">密码</label>
                        <input type="password" id="password" placeholder="请输入密码">
                    </div>
                    <button class="login-btn" id="login-btn">登录</button>
                    <div style="margin-top: 15px; color: #666; font-size: 0.9rem;">
                        仅允许本人使用
                    </div>
                </div>
            </div>
        `;

        document.getElementById('login-btn').addEventListener('click', async () => {
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            
            const success = await AuthManager.login(username, password);
            if (success) {
                location.reload();
            } else {
                alert('用户名或密码错误，请重试！');
            }
        });
        
        // 支持回车键登录
        document.getElementById('password').addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') {
                const username = document.getElementById('username').value;
                const password = document.getElementById('password').value;
                
                const success = await AuthManager.login(username, password);
                if (success) {
                    location.reload();
                } else {
                    CustomAlert.errorManual('用户名或密码错误，请重试！');
                }
            }
        });
    }

    setupEventListeners() {
        // 自动主题功能
        const updateTheme = () => {
            // 跟随系统主题，移除本地存储的主题设置
            localStorage.removeItem('theme');
            const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.body.classList.toggle('dark-mode', isDark);
        };
        
        // 初始化主题
        updateTheme();
        
        // 监听系统主题变化
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', updateTheme);
        
        // 控制用户设置卡片的显示
        const userSettingsCard = document.querySelector('.card:nth-child(3)');
        if (userSettingsCard) {
            if (AuthManager.isLoggedIn()) {
                userSettingsCard.style.display = 'block';
            } else {
                userSettingsCard.style.display = 'none';
            }
        }
        
        // 添加登录按钮（仅未登录时显示）
        if (!AuthManager.isLoggedIn()) {
            const loginBtn = document.createElement('button');
            loginBtn.className = 'mdl-button mdl-js-button mdl-button--raised mdl-button--accent login-btn';
            loginBtn.innerHTML = '<i class="material-icons">login</i> 登录';
            loginBtn.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 1000;';
            loginBtn.addEventListener('click', () => {
                this.showLogin();
            });
            document.body.appendChild(loginBtn);
        }
        
        // 数据导出按钮
        const exportBtn = document.createElement('button');
        exportBtn.className = 'export-btn';
        exportBtn.innerHTML = '<i class="material-icons">download</i> 导出数据';
        exportBtn.addEventListener('click', () => {
            DataManager.exportData();
        });
        
        // 数据同步按钮
        const syncBtn = document.createElement('button');
        syncBtn.className = 'export-btn';
        syncBtn.innerHTML = '<i class="material-icons">sync</i> 同步数据';
        syncBtn.addEventListener('click', async () => {
            const success = await DataManager.syncFromCloud();
            if (success) {
                CustomAlert.success('数据同步成功！');
                location.reload(); // 刷新页面以显示最新数据
            } else {
                CustomAlert.error('数据同步失败，请稍后重试。');
            }
        });
        
        // 添加数据导出和同步按钮到用户设置卡片
        const userSettingsCardContent = document.querySelector('.card:nth-child(3) .card-content');
        if (userSettingsCardContent) {
            const buttonContainer = document.createElement('div');
            buttonContainer.style.cssText = 'display: flex; gap: var(--spacing-md); margin-top: var(--spacing-lg); flex-wrap: wrap;';
            buttonContainer.appendChild(exportBtn);
            buttonContainer.appendChild(syncBtn);
            userSettingsCardContent.appendChild(buttonContainer);
        };
        
        // 用户设置表单事件监听
        const settingsForm = document.getElementById('user-settings-form');
        if (settingsForm) {
            settingsForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                // 检查用户是否登录
                if (!AuthManager.isLoggedIn()) {
                    this.showLogin();
                    return;
                }
                
                const newUsername = document.getElementById('new-username').value;
                const newPassword = document.getElementById('new-password').value;
                const confirmPassword = document.getElementById('confirm-password').value;
                
                // 验证密码
                if (newPassword !== confirmPassword) {
                    CustomAlert.warningManual('两次输入的密码不一致，请重新输入！');
                    return;
                }
                
                // 验证用户名和密码不为空
                if (!newUsername || !newPassword) {
                    CustomAlert.errorManual('用户名和密码不能为空！');
                    return;
                }
                
                // 更新用户信息
                const success = await AuthManager.updateUser(newUsername, newPassword);
                if (success) {
                    CustomAlert.successManual('用户信息更新成功！请重新登录。');
                    AuthManager.logout();
                    location.reload();
                } else {
                    CustomAlert.errorManual('用户信息更新失败，请稍后重试。');
                }
            });
        }
        
        // 退出登录按钮处理
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            // 只有已登录用户才能看到退出登录按钮
            if (AuthManager.isLoggedIn()) {
                logoutBtn.style.display = 'block';
                logoutBtn.addEventListener('click', () => {
                    AuthManager.logout();
                    location.reload();
                });
            } else {
                logoutBtn.style.display = 'none';
            }
        }
    }

    setCurrentDate() {
        const dateElement = document.getElementById('current-date');
        if (dateElement) {
            dateElement.textContent = DateUtils.formatDate();
        }
    }

    initCharts() {
        // 周统计图表
        const weeklyCtx = document.getElementById('weekly-chart').getContext('2d');
        this.charts = {
            weekly: new Chart(weeklyCtx, {
                type: 'line',
                data: {
                    labels: DateUtils.getWeekDays(),
                    datasets: [
                        {
                            label: '焦虑程度',
                            data: [6, 5, 4, 3, 3, 2, 2],
                            borderColor: '#cf6679',
                            backgroundColor: 'rgba(207, 102, 121, 0.1)',
                            tension: 0.3,
                            fill: true
                        },
                        {
                            label: '愉悦程度',
                            data: [4, 5, 6, 7, 7, 8, 8],
                            borderColor: '#03dac6',
                            backgroundColor: 'rgba(3, 218, 198, 0.1)',
                            tension: 0.3,
                            fill: true
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            min: 1,
                            max: 10,
                            title: {
                                display: true,
                                text: '程度 (1-10)'
                            }
                        }
                    }
                }
            }),
            
            // 月统计图表
            monthly: new Chart(document.getElementById('monthly-chart').getContext('2d'), {
                type: 'bar',
                data: {
                    labels: ['第1周', '第2周', '第3周', '第4周'],
                    datasets: [
                        {
                            label: '平均焦虑程度',
                            data: [7, 6, 4, 3],
                            backgroundColor: 'rgba(207, 102, 121, 0.7)'
                        },
                        {
                            label: '平均愉悦程度',
                            data: [3, 5, 6, 8],
                            backgroundColor: 'rgba(3, 218, 198, 0.7)'
                        },
                        {
                            label: '任务完成率',
                            data: [40, 60, 75, 85],
                            backgroundColor: 'rgba(98, 0, 238, 0.7)'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100,
                            title: {
                                display: true,
                                text: '百分比/程度'
                            }
                        }
                    }
                }
            })
        };
    }

    setupTabs() {
        const tabs = document.querySelectorAll('.tab');
        const tabContents = document.querySelectorAll('.tab-content');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));
                
                tab.classList.add('active');
                const tabId = tab.getAttribute('data-tab');
                document.getElementById(`${tabId}-tab`).classList.add('active');
            });
        });
    }

    setupMoodTracking() {
        const anxietySlider = document.getElementById('anxiety-slider');
        const joySlider = document.getElementById('joy-slider');
        const saveBtn = document.getElementById('save-mood');
        const anxietyDisplay = document.getElementById('anxiety-display');
        const joyDisplay = document.getElementById('joy-display');
        const anxietyLevel = document.getElementById('anxiety-level');
        const joyLevel = document.getElementById('joy-level');
        
        // 更新显示
        const updateDisplay = () => {
            const anxietyValue = anxietySlider.value;
            const joyValue = joySlider.value;
            
            anxietyDisplay.textContent = anxietyValue;
            joyDisplay.textContent = joyValue;
            anxietyLevel.textContent = anxietyValue;
            joyLevel.textContent = joyValue;
            
            // 更新颜色
            anxietyLevel.style.color = anxietyValue <= 3 ? '#03dac6' : anxietyValue <= 6 ? '#ff9800' : '#cf6679';
            joyLevel.style.color = joyValue >= 7 ? '#03dac6' : joyValue >= 4 ? '#ff9800' : '#cf6679';
        };
        
        // 保存状态
        saveBtn.addEventListener('click', async () => {
            // 检查用户是否登录
            if (!AuthManager.isLoggedIn()) {
                this.showLogin();
                return;
            }
            
            const anxietyValue = parseInt(anxietySlider.value);
            const joyValue = parseInt(joySlider.value);
            
            const moodData = {
                date: new Date().toISOString(),
                anxiety: anxietyValue,
                joy: joyValue,
                dateKey: DateUtils.getTodayKey()
            };
            
            await DataManager.saveMoodData(moodData);
            CustomAlert.success('今日状态已保存！');
            
            this.updateCompletionRate();
            this.updateStreak();
        });
        
        // 事件监听
        anxietySlider.addEventListener('input', updateDisplay);
        joySlider.addEventListener('input', updateDisplay);
        
        // 初始化显示
        updateDisplay();
    }

    updateCompletionRate() {
        const completedTasks = document.querySelectorAll('.mdl-checkbox__input:checked').length;
        const totalTasks = document.querySelectorAll('.mdl-checkbox__input').length;
        const completionRate = Math.round((completedTasks / totalTasks) * 100);
        
        document.getElementById('completion-rate').textContent = completionRate + '%';
        
        // 保存任务数据
        const taskData = {
            date: DateUtils.getTodayKey(),
            completed: completedTasks,
            total: totalTasks,
            completionRate: completionRate
        };
        
        // 检查用户是否登录
        if (AuthManager.isLoggedIn()) {
            DataManager.saveTaskData(taskData);
        }
    }

    updateStreak() {
        // 简单的连续天数计算
        const streakElement = document.getElementById('streak-count');
        const currentStreak = parseInt(streakElement.textContent) || 0;
        const completionRate = parseInt(document.getElementById('completion-rate').textContent);
        
        if (completionRate >= 70) {
            streakElement.textContent = currentStreak + 1;
        }
    }

    initCompletionRate() {
        this.updateCompletionRate();
        
        // 为所有复选框添加事件监听
        document.querySelectorAll('.mdl-checkbox__input').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.updateCompletionRate();
            });
        });
    }

    loadAISuggestions() {
        // 加载AI建议
        const suggestions = DataManager.getAISuggestions();
        const aiContainer = document.createElement('div');
        aiContainer.className = 'ai-suggestions';
        
        aiContainer.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <h3><i class="material-icons">smart_toy</i> AI学习建议</h3>
                <button class="mdl-button mdl-js-button mdl-button--icon" id="refresh-ai-suggestions">
                    <i class="material-icons">refresh</i>
                </button>
            </div>
        `;
        
        if (suggestions.length === 0) {
            aiContainer.innerHTML += `
                <div class="ai-suggestion-item">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <strong>📝 AI建议</strong>
                        <button class="mdl-button mdl-js-button mdl-button--icon close-ai-suggestion">
                            <i class="material-icons">close</i>
                        </button>
                    </div>
                    <p>还没有AI建议，系统将在每周自动生成。</p>
                </div>
            `;
        } else {
            suggestions.forEach((suggestion, index) => {
                aiContainer.innerHTML += `
                    <div class="ai-suggestion-item" id="ai-suggestion-${index}">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                            <strong>${suggestion.title}</strong>
                            <button class="mdl-button mdl-js-button mdl-button--icon close-ai-suggestion" data-id="${index}">
                                <i class="material-icons">close</i>
                            </button>
                        </div>
                        <p>${suggestion.content}</p>
                        <small>生成时间：${new Date(suggestion.date).toLocaleDateString()}</small>
                    </div>
                `;
            });
        }
        
        // 添加到任务卡片前
        const taskCard = document.querySelector('.card:nth-child(3)');
        taskCard.parentNode.insertBefore(aiContainer, taskCard);
        
        // 添加刷新按钮事件监听
        const refreshBtn = document.getElementById('refresh-ai-suggestions');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.generateAISuggestions();
            });
        }
        
        // 添加关闭按钮事件监听
        const closeBtns = aiContainer.querySelectorAll('.close-ai-suggestion');
        closeBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const suggestionItem = e.target.closest('.ai-suggestion-item');
                if (suggestionItem) {
                    suggestionItem.style.display = 'none';
                }
            });
        });
        
        // 检查是否需要自动生成新的建议（每周一次）
        this.checkForAutoAISuggestions();
    }
    
    // 生成AI建议
    async generateAISuggestions() {
        try {
            // 调用后端API生成AI建议
            const response = await fetch(`${APP_CONFIG.API_URL}/api/generate-ai-suggestion`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error('生成AI建议失败');
            }
            
            const result = await response.json();
            if (result.success) {
                const suggestion = result.suggestion;
                
                // 保存到本地存储（会自动处理后端同步）
                await DataManager.saveAISuggestions([suggestion]);
                
                // 重新加载建议
                const existingAIContainer = document.querySelector('.ai-suggestions');
                if (existingAIContainer) {
                    existingAIContainer.remove();
                }
                this.loadAISuggestions();
                
                CustomAlert.success('AI建议已更新！');
            }
        } catch (error) {
            console.error('生成AI建议失败:', error);
            CustomAlert.error('生成AI建议失败，请稍后重试。');
        }
    }
    
    // 检查是否需要自动生成AI建议
    async checkForAutoAISuggestions() {
        const lastSuggestionDate = localStorage.getItem('last_ai_suggestion_date');
        const today = new Date().toISOString().split('T')[0];
        
        if (!lastSuggestionDate) {
            // 第一次使用，生成建议
            await this.generateAISuggestions();
            localStorage.setItem('last_ai_suggestion_date', today);
        } else {
            // 检查是否超过7天
            const lastDate = new Date(lastSuggestionDate);
            const todayDate = new Date(today);
            const diffTime = Math.abs(todayDate - lastDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays >= 7) {
                // 超过7天，自动生成新建议
                await this.generateAISuggestions();
                localStorage.setItem('last_ai_suggestion_date', today);
            }
        }
    }

    // 生成并显示AI建议文字
    async generateAIQuote() {
        try {
            // 调用后端API生成AI建议文字
            const response = await fetch(`${APP_CONFIG.API_URL}/api/generate-ai-quote`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    const aiQuote = result.quote;
                    const quoteElement = document.querySelector('.quote-text');
                    if (quoteElement) {
                        quoteElement.textContent = `"${aiQuote}"`;
                    }
                    
                    // 保存到本地存储
                    DataManager.saveQuote({
                        text: aiQuote,
                        date: new Date().toISOString(),
                        isAI: true
                    });
                    return;
                }
            }
            
            // 如果API调用失败，使用随机引用
            this.loadRandomQuote();
        } catch (error) {
            console.error('生成AI引用失败:', error);
            // 发生错误时使用随机引用
            this.loadRandomQuote();
        }
    }
    
    // 加载随机引用（作为备用方案）
    loadRandomQuote() {
        // 随机生成或加载引用
        const quotes = [
            "学习的本质是探索与成长，而非表演与完美。每一步回归真实兴趣的尝试，都是对过去扭曲学习模式的治愈。",
            "真正的学习是内心驱动的探索，不是外界压力下的表演。",
            "允许自己慢慢来，学习没有捷径，只有持续的积累。",
            "学习的快乐来自于过程中的发现，而非最终的结果。",
            "每一次尝试都是进步，每一次失败都是学习的机会。",
            "不要为了别人的期待而学习，要为了自己的成长而努力。",
            "学习是一场马拉松，不是短跑比赛。保持节奏，享受过程。",
            "好奇心是最好的老师，保持对世界的探索欲望。"
        ];
        
        const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
        const quoteElement = document.querySelector('.quote-text');
        if (quoteElement) {
            quoteElement.textContent = `"${randomQuote}"`;
        }
        
        // 保存到本地存储
        DataManager.saveQuote({
            text: randomQuote,
            date: new Date().toISOString(),
            isAI: false
        });
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    new MindBloomApp();
});