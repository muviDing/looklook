/**
 * 视频管理器应用主入口
 * 负责初始化各个区域模块并协调它们的交互
 * 集成数据库持久化功能
 */

// 导入视频数据模块
import { videoData, updatePagination, paginationConfig } from './videoData.js';

// 导入各个区域模块
import { initTitleBar } from './areaA.js';
import { initSearchFilter } from './areaB.js';
import { initFunctionBar } from './areaC.js';
import { initVideoList } from './areaD.js';
import { initFooter } from './areaE.js';
import { initDetailDrawer } from './areaF.js';

// 导入多选下拉框数据模块
import { extractDataFromVideos, syncDataFromEnum } from './multiSelectData.js';

// 初始化页面
document.addEventListener('DOMContentLoaded', async function() {
    // 初始化应用
    await initializeApp();
});

// 初始化应用
async function initializeApp() {
    try {
        console.log('开始初始化应用...');
        
        // 从主进程获取视频数据（从数据库加载）
        const savedVideos = await window.electronAPI.getVideos();
        console.log(`从数据库获取到 ${savedVideos ? savedVideos.length : 0} 个视频`);
        
        if (savedVideos && savedVideos.length > 0) {
            // 更新视频数据
            videoData.length = 0; // 清空现有数据
            videoData.push(...savedVideos);
            console.log(`成功加载 ${videoData.length} 个视频到前端`);
            
            // 提取筛选选项数据
            extractDataFromVideos(videoData);
            console.log('已从视频数据中提取筛选选项');
        } else {
            console.log('数据库中没有视频数据');
            // 确保videoData是空数组
            videoData.length = 0;
        }
        
        // 初始化各个区域模块
        await import('./areaA.js').then(module => {
            if (typeof module.initTitleBar === 'function') {
                module.initTitleBar();
            }
        });
        
        await import('./areaB.js').then(module => {
            if (typeof module.initSearchFilter === 'function') {
                module.initSearchFilter();
            }
        });
        
        await import('./areaC.js').then(module => {
            if (typeof module.initFunctionBar === 'function') {
                module.initFunctionBar();
            }
        });
        
        // 先加载数据，再初始化视频列表区域
        await import('./videoData.js').then(async module => {
            if (typeof module.loadVideoData === 'function') {
                await module.loadVideoData();
            }
        });
        
        await import('./areaD.js').then(module => {
            if (typeof module.initVideoList === 'function') {
                module.initVideoList();
            }
        });
        
        await import('./areaE.js').then(module => {
            if (typeof module.initPagination === 'function') {
                module.initPagination();
            }
        });
        
        await import('./areaF.js').then(module => {
            if (typeof module.initDetailDrawer === 'function') {
                module.initDetailDrawer();
            }
        });
        
        // 更新总视频数量
        const totalCountElement = document.getElementById('total-count');
        totalCountElement.textContent = videoData.length;
        console.log(`总视频数量元素更新为: ${videoData.length}`);
        
        // 更新分页
        updatePagination();
        
        // 设置数据同步处理程序
        setupDataSyncHandlers();
        
        // 设置数据同步任务
        setupDataSyncTask();
        
        // 初始化筛选浮窗和选项卡切换
        initFilterPopupAndTabs();
        
        console.log('应用初始化完成');
    } catch (error) {
        console.error('初始化应用失败:', error);
    }
}

/**
 * 设置数据同步处理程序
 * 确保视频数据的修改能够持久化到数据库
 */
function setupDataSyncHandlers() {
    // 监听视频数据变化并同步到数据库
    // 这里使用自定义事件来处理数据变化
    document.addEventListener('videoDataChanged', async (event) => {
        try {
            const { video, action } = event.detail;
            
            switch (action) {
                case 'update':
                    await window.electronAPI.updateVideo(video);
                    break;
                case 'delete':
                    await window.electronAPI.deleteVideo(video.id);
                    break;
                case 'add':
                    await window.electronAPI.saveVideo(video);
                    break;
                default:
                    console.warn('未知的数据操作:', action);
            }
        } catch (error) {
            console.error('同步视频数据到数据库失败:', error);
        }
    });
}

// 设置数据同步任务，确保F区域和H区域数据一致
function setupDataSyncTask() {
    console.log('设置数据同步任务...');
    
    // 立即进行一次同步
    syncDataFromEnum().then(() => {
        console.log('初始数据同步完成');
    }).catch(error => {
        console.error('初始数据同步失败:', error);
    });
    
    // 定期同步数据，每分钟一次
    setInterval(() => {
        syncDataFromEnum().then(() => {
            console.log('定期数据同步完成');
        }).catch(error => {
            console.error('定期数据同步失败:', error);
        });
    }, 60000); // 60秒
}

// 初始化筛选浮窗和选项卡切换
function initFilterPopupAndTabs() {
    // 筛选浮窗
    const filterButton = document.querySelector('.filter-btn');
    const filterPopup = document.getElementById('filter-popup');
    const closeFilterButton = document.getElementById('filter-close');
    
    console.log('筛选按钮:', filterButton);
    console.log('筛选浮窗:', filterPopup);
    console.log('关闭按钮:', closeFilterButton);
    
    // 显示筛选浮窗
    filterButton.addEventListener('click', () => {
        const backdrop = document.getElementById('filter-backdrop');
        const filterPopup = document.getElementById('filter-popup');
        
        // 显示背景和浮窗
        backdrop.style.display = 'block';
        filterPopup.style.display = 'block';
        
        console.log('显示筛选浮窗');
        
        // 添加动画效果
        setTimeout(() => {
            backdrop.classList.add('active');
            filterPopup.classList.add('active');
            
            console.log('激活背景和浮窗');
        }, 10);
    });
    
    // 关闭筛选浮窗
    closeFilterButton.addEventListener('click', () => {
        hideFilterPopup();
    });
    
    // 点击外部关闭筛选浮窗
    document.addEventListener('click', (e) => {
        const backdrop = document.getElementById('filter-backdrop');
        if (backdrop.style.display === 'block' && 
            !filterPopup.contains(e.target) && 
            e.target !== filterButton && 
            !e.target.closest('.filter-btn')) {
            hideFilterPopup();
        }
    });
    
    // 隐藏筛选浮窗
    function hideFilterPopup() {
        const backdrop = document.getElementById('filter-backdrop');
        backdrop.classList.remove('active');
        filterPopup.classList.remove('active');
        
        console.log('关闭筛选浮窗');
        
        // 动画结束后隐藏元素
        setTimeout(() => {
            backdrop.style.display = 'none';
            filterPopup.style.display = 'none';
            
            console.log('隐藏背景和浮窗');
        }, 300);
    }
    
    // 选项卡切换功能
    const tabs = document.querySelectorAll('.filter-tab');
    const tabContents = document.querySelectorAll('.filter-tab-content');
    
    console.log('标签数量:', tabs.length);
    console.log('标签内容区域数量:', tabContents.length);
    
    // 初始化 - 默认显示第一个选项卡
    tabs[0].classList.add('active');
    tabContents[0].classList.add('active');
    
    tabs.forEach(tab => {
        console.log('标签ID:', tab.id);
        tab.addEventListener('click', () => {
            // 移除所有active类
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // 添加active类到当前点击的选项卡
            tab.classList.add('active');
            
            // 显示对应的内容区域
            const tabId = tab.id;
            const contentId = `tab-content-${tabId.replace('tab-', '')}`;
            console.log('点击了标签:', tabId, '将显示内容:', contentId);
            document.getElementById(contentId).classList.add('active');
        });
    });
}