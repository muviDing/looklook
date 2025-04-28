/**
 * 区域B: 搜索和筛选功能
 * 负责处理搜索框和筛选按钮的交互
 */

import { videoData, renderTableView, renderGridView } from './videoData.js';
import { 
    extractDataFromVideos, 
    getCollections, 
    getActors, 
    createFilterMultiSelect,
    syncDataFromEnum
} from './multiSelectData.js';

// 多选下拉框组件实例
let collectionMultiSelect = null;
let actorsMultiSelect = null;

// 选中的筛选值
let selectedCollections = [];
let selectedActors = [];

// 初始化搜索和筛选功能
function initSearchFilter() {
    // 首先从视频数据中提取数据源
    extractDataFromVideos(videoData);
    
    // 搜索框事件
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
    searchInput.addEventListener('input', function() {
        // 实现搜索功能
        const searchTerm = this.value.toLowerCase();
        filterVideos(searchTerm);
    });
    } else {
        console.error('找不到搜索输入框元素');
    }
    
    // 筛选按钮事件
    const filterBtn = document.querySelector('.filter-btn');
    if (filterBtn) {
        console.log('找到筛选按钮:', filterBtn);
        filterBtn.addEventListener('click', function(e) {
            console.log('筛选按钮被点击');
            e.preventDefault();
            // 显示筛选面板
            showFilterPopup();
        });
    } else {
        console.error('找不到筛选按钮元素');
    }

    // 初始化筛选浮窗事件
    initFilterPopup();
    
    // 添加筛选气泡刷新事件监听
    document.addEventListener('filter-bubbles-refresh', handleFilterBubblesRefresh);
}

// 处理筛选气泡刷新事件
function handleFilterBubblesRefresh() {
    console.log('接收到筛选气泡刷新事件');
    
    // 获取最新的数据源
    const collections = getCollections();
    const actors = getActors();
    
    console.log('刷新筛选气泡: 合集数量=', collections.length, '演员数量=', actors.length);
    
    // 刷新气泡显示
    initCollectionBubbles(collections);
    initActorsBubbles(actors);
    
    // 保留当前选择的状态
    refreshCollectionBubbles();
    refreshActorsBubbles();
}

// 显示筛选浮窗
function showFilterPopup() {
    console.log('showFilterPopup被调用');
    const backdrop = document.getElementById('filter-backdrop');
    const popup = document.getElementById('filter-popup');
    const filterBtn = document.querySelector('.filter-btn');
    
    console.log('backdrop元素:', backdrop);
    console.log('popup元素:', popup);
    
    if (!backdrop || !popup || !filterBtn) {
        console.error('找不到筛选浮窗元素或筛选按钮!');
        return;
    }
    
    // 初始化已选区域的显示状态
    const activeFiltersContainer = document.getElementById('active-filters');
    if (activeFiltersContainer) {
        // 检查是否有活动的筛选条件
        const hasFilters = 
            (selectedCollections && selectedCollections.length > 0) ||
            (selectedActors && selectedActors.length > 0);
            
        // 根据是否有筛选条件决定显示状态
        if (hasFilters) {
            activeFiltersContainer.style.display = 'flex';
            activeFiltersContainer.style.borderBottom = '1px solid rgba(229, 231, 235, 0.5)';
        } else {
            activeFiltersContainer.style.display = 'none';
            activeFiltersContainer.style.borderBottom = 'none';
        }
    }
    
    // 不使用动态定位，依赖CSS固定位置
    
    // 确保先把display设置为block
    backdrop.style.display = 'block';
    popup.style.display = 'block';
    
    // 清除可能已存在的类和样式冲突
    backdrop.classList.remove('active');
    popup.classList.remove('active');
    
    // 强制重绘
    backdrop.offsetHeight;
    popup.offsetHeight;
    
    // 添加动画效果
    setTimeout(() => {
        console.log('添加active类');
        backdrop.classList.add('active');
        popup.classList.add('active');
        
        // 输出添加类后的状态
        console.log('backdrop是否有active类:', backdrop.classList.contains('active'));
        console.log('popup是否有active类:', popup.classList.contains('active'));
    }, 10);
}

// 隐藏筛选浮窗
function hideFilterPopup() {
    const backdrop = document.getElementById('filter-backdrop');
    const popup = document.getElementById('filter-popup');
    
    backdrop.classList.remove('active');
    popup.classList.remove('active');
    
    // 应用当前选中的筛选条件
    applyAdvancedFilter();
    
    // 动画结束后隐藏元素
    setTimeout(() => {
        backdrop.style.display = 'none';
        popup.style.display = 'none';
    }, 300);
}

// 初始化筛选浮窗的事件
function initFilterPopup() {
    console.log('初始化筛选浮窗...');
    
    // 先同步数据源
    syncDataFromEnum().then(() => {
        console.log('数据源同步完成，初始化气泡标签组件');
        // 初始化气泡标签组件
        initBubbleComponents();
    }).catch(error => {
        console.error('数据源同步失败:', error);
        // 失败时也尝试初始化组件
        initBubbleComponents();
    });
    
    // 关闭按钮事件 - 如果有的话
    const closeButton = document.getElementById('filter-close');
    if (closeButton) {
        closeButton.addEventListener('click', hideFilterPopup);
    }
    
    // 点击背景关闭
    document.getElementById('filter-backdrop').addEventListener('click', hideFilterPopup);
    
    // 防止点击浮窗本身关闭
    document.getElementById('filter-popup').addEventListener('click', function(event) {
        event.stopPropagation();
    });
    
    // 选项卡切换功能
    const tabs = document.querySelectorAll('.filter-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // 移除所有active类
            tabs.forEach(t => t.classList.remove('active'));
            
            // 添加active类到当前点击的选项卡
            this.classList.add('active');
            
            // 显示对应的内容区域
            const tabId = this.id;
            const contentId = `tab-content-${tabId.replace('tab-', '')}`;
            
            document.querySelectorAll('.filter-tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            document.getElementById(contentId).classList.add('active');
        });
    });
    
    // 从URL参数加载筛选条件（如果有）
    loadFiltersFromUrl();
}

// 初始化气泡标签组件
function initBubbleComponents() {
    console.log('初始化气泡标签组件');
    
    // 获取数据源
    const collections = getCollections();
    const actors = getActors();
    
    console.log('合集数据源:', collections.length, '项');
    console.log('演员数据源:', actors.length, '项');
    
    // 初始化合集气泡
    initCollectionBubbles(collections);
    
    // 初始化演员气泡
    initActorsBubbles(actors);
    
    // 初始化搜索功能
    initBubbleSearch();
}

// 初始化合集气泡
function initCollectionBubbles(collections) {
    const container = document.getElementById('filter-collection-bubble-container');
    if (!container) {
        console.error('找不到合集气泡容器');
        return;
    }
    
    container.innerHTML = '';
    
    if (collections.length === 0) {
        container.innerHTML = '<div class="filter-no-results">暂无合集数据</div>';
        return;
    }
    
    collections.forEach(collection => {
        const bubble = document.createElement('div');
        bubble.className = `filter-bubble ${selectedCollections.includes(collection) ? 'selected' : ''}`;
        bubble.textContent = collection;
        bubble.dataset.value = collection;
        
        bubble.addEventListener('click', () => {
            toggleCollectionSelection(collection, bubble);
        });
        
        container.appendChild(bubble);
    });
}

// 初始化演员气泡
function initActorsBubbles(actors) {
    const container = document.getElementById('filter-actors-bubble-container');
    if (!container) {
        console.error('找不到演员气泡容器');
        return;
    }
    
    container.innerHTML = '';
    
    if (actors.length === 0) {
        container.innerHTML = '<div class="filter-no-results">暂无演员数据</div>';
        return;
    }
    
    actors.forEach(actor => {
        const bubble = document.createElement('div');
        bubble.className = `filter-bubble ${selectedActors.includes(actor) ? 'selected' : ''}`;
        bubble.textContent = actor;
        bubble.dataset.value = actor;
        
        bubble.addEventListener('click', () => {
            toggleActorSelection(actor, bubble);
        });
        
        container.appendChild(bubble);
    });
}

// 切换合集选择状态
function toggleCollectionSelection(collection, bubbleElement) {
    const index = selectedCollections.indexOf(collection);
    
    if (index === -1) {
        // 添加选择
        selectedCollections.push(collection);
        bubbleElement.classList.add('selected');
    } else {
        // 移除选择
        selectedCollections.splice(index, 1);
        bubbleElement.classList.remove('selected');
    }
    
    // 自动应用筛选，不等待用户点击应用按钮
    applyAdvancedFilter();
}

// 切换演员选择状态
function toggleActorSelection(actor, bubbleElement) {
    const index = selectedActors.indexOf(actor);
    
    if (index === -1) {
        // 添加选择
        selectedActors.push(actor);
        bubbleElement.classList.add('selected');
    } else {
        // 移除选择
        selectedActors.splice(index, 1);
        bubbleElement.classList.remove('selected');
    }
    
    // 自动应用筛选，不等待用户点击应用按钮
    applyAdvancedFilter();
}

// 重置合集选择
function resetCollectionBubbles() {
    selectedCollections = [];
    const bubbles = document.querySelectorAll('#filter-collection-bubble-container .filter-bubble');
    bubbles.forEach(bubble => {
        bubble.classList.remove('selected');
    });
}

// 重置演员选择
function resetActorsBubbles() {
    selectedActors = [];
    const bubbles = document.querySelectorAll('#filter-actors-bubble-container .filter-bubble');
    bubbles.forEach(bubble => {
        bubble.classList.remove('selected');
    });
}

// 初始化搜索功能
function initBubbleSearch() {
    // 合集搜索
    const collectionSearch = document.getElementById('collection-search');
    collectionSearch.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        filterCollectionBubbles(searchTerm);
    });
    
    // 演员搜索
    const actorsSearch = document.getElementById('actors-search');
    actorsSearch.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        filterActorsBubbles(searchTerm);
    });
}

// 筛选合集气泡
function filterCollectionBubbles(searchTerm) {
    const collections = getCollections();
    const filteredCollections = searchTerm 
        ? collections.filter(c => c.toLowerCase().includes(searchTerm))
        : collections;
    
    const container = document.getElementById('filter-collection-bubble-container');
    
    container.innerHTML = '';
    
    if (filteredCollections.length === 0) {
        container.innerHTML = '<div class="filter-no-results">没有匹配的合集</div>';
        return;
    }
    
    filteredCollections.forEach(collection => {
        const bubble = document.createElement('div');
        bubble.className = `filter-bubble ${selectedCollections.includes(collection) ? 'selected' : ''}`;
        bubble.textContent = collection;
        bubble.dataset.value = collection;
        
        bubble.addEventListener('click', () => {
            toggleCollectionSelection(collection, bubble);
        });
        
        container.appendChild(bubble);
    });
}

// 筛选演员气泡
function filterActorsBubbles(searchTerm) {
    const actors = getActors();
    const filteredActors = searchTerm 
        ? actors.filter(a => a.toLowerCase().includes(searchTerm))
        : actors;
    
    const container = document.getElementById('filter-actors-bubble-container');
    
    container.innerHTML = '';
    
    if (filteredActors.length === 0) {
        container.innerHTML = '<div class="filter-no-results">没有匹配的演员</div>';
        return;
    }
    
    filteredActors.forEach(actor => {
        const bubble = document.createElement('div');
        bubble.className = `filter-bubble ${selectedActors.includes(actor) ? 'selected' : ''}`;
        bubble.textContent = actor;
        bubble.dataset.value = actor;
        
        bubble.addEventListener('click', () => {
            toggleActorSelection(actor, bubble);
        });
        
        container.appendChild(bubble);
    });
}

// 从URL参数加载筛选条件
function loadFiltersFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const hasFilters = urlParams.has('filter');
    
    if (hasFilters) {
        try {
            const filterParams = JSON.parse(decodeURIComponent(urlParams.get('filter')));
            
            // 设置气泡选择器的值
            if (filterParams.collections && Array.isArray(filterParams.collections)) {
                selectedCollections = [...filterParams.collections];
                refreshCollectionBubbles();
            }
            
            if (filterParams.actors && Array.isArray(filterParams.actors)) {
                selectedActors = [...filterParams.actors];
                refreshActorsBubbles();
            }
            
            // 应用筛选
            applyAdvancedFilter();
        } catch (error) {
            console.error('解析URL筛选参数错误:', error);
        }
    }
}

// 刷新合集气泡选中状态
function refreshCollectionBubbles() {
    const bubbles = document.querySelectorAll('#filter-collection-bubble-container .filter-bubble');
    bubbles.forEach(bubble => {
        const value = bubble.dataset.value;
        if (selectedCollections.includes(value)) {
            bubble.classList.add('selected');
        } else {
            bubble.classList.remove('selected');
        }
    });
}

// 刷新演员气泡选中状态
function refreshActorsBubbles() {
    const bubbles = document.querySelectorAll('#filter-actors-bubble-container .filter-bubble');
    bubbles.forEach(bubble => {
        const value = bubble.dataset.value;
        if (selectedActors.includes(value)) {
            bubble.classList.add('selected');
        } else {
            bubble.classList.remove('selected');
        }
    });
}

// 更新URL参数
function updateUrlWithFilters(filterData) {
    const url = new URL(window.location.href);
    
    // 移除现有筛选参数
    url.searchParams.delete('filter');
    
    // 如果有活跃筛选条件，添加到URL
    if (
        (filterData.collections && filterData.collections.length > 0) ||
        (filterData.actors && filterData.actors.length > 0)
    ) {
        url.searchParams.set('filter', encodeURIComponent(JSON.stringify(filterData)));
    }
    
    // 更新URL，不刷新页面
    window.history.replaceState({}, '', url);
}

// 移除筛选条件
function removeFilter(type) {
    console.log('移除筛选条件:', type);
    if (type === 'collections') {
        selectedCollections = [];
        refreshCollectionBubbles();
    } else if (type === 'actors') {
        selectedActors = [];
        refreshActorsBubbles();
    }
    
    // 重新应用筛选
    applyAdvancedFilter();
}

// 清除已选筛选条件显示
function clearActiveFilters() {
    const activeFiltersContainer = document.getElementById('active-filters');
    if (activeFiltersContainer) {
        activeFiltersContainer.innerHTML = '';
        // 确保在清空内容后完全隐藏
        activeFiltersContainer.style.display = 'none';
        activeFiltersContainer.style.borderBottom = 'none';
    }
    
    // 重置筛选值
    selectedCollections = [];
    selectedActors = [];
    
    // 清除条件筛选
    window.videoData.setConditionFilter(null);
    
    // 清除筛选按钮上的计数
    const filterCountElement = document.getElementById('filter-count');
    if (filterCountElement) {
        filterCountElement.style.display = 'none';
    }
}

// 更新已选筛选条件显示
function updateActiveFilters(filterData) {
    // 清除当前显示的筛选标签，但不重置实际的筛选状态
    const activeFiltersContainer = document.getElementById('active-filters');
    if (!activeFiltersContainer) return;
    
    // 清空容器但不清除筛选状态
    activeFiltersContainer.innerHTML = '';
    
    // 检查是否有任何筛选条件
    const hasCollections = filterData.collections && filterData.collections.length > 0;
    const hasActors = filterData.actors && filterData.actors.length > 0;
    const hasActiveFilters = hasCollections || hasActors;
    
    // 如果没有筛选条件，确保容器隐藏并提前返回
    if (!hasActiveFilters) {
        activeFiltersContainer.style.display = 'none';
        activeFiltersContainer.style.borderBottom = 'none';
        
        // 清除筛选按钮上的计数
        const filterCountElement = document.getElementById('filter-count');
        if (filterCountElement) {
            filterCountElement.style.display = 'none';
        }
        return;
    }
    
    // 有筛选条件时显示容器
    activeFiltersContainer.style.display = 'flex';
    activeFiltersContainer.style.borderBottom = '1px solid rgba(229, 231, 235, 0.5)';
    
    // 添加"已选："标签
    const label = document.createElement('span');
    label.className = 'active-filters-label';
    label.textContent = '已选：';
    activeFiltersContainer.appendChild(label);
    
    // 添加合集筛选条件
    if (hasCollections) {
        const text = `合集: ${filterData.collections.join(', ')}`;
        activeFiltersContainer.appendChild(createFilterTag(text, 'collections'));
    }
    
    // 添加演员筛选条件
    if (hasActors) {
        const text = `演员: ${filterData.actors.join(', ')}`;
        activeFiltersContainer.appendChild(createFilterTag(text, 'actors'));
    }
    
    // 添加重置按钮
    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'filter-btn-reset';
    resetBtn.innerHTML = '<i class="fas fa-times"></i> 重置';
    resetBtn.addEventListener('click', function() {
        resetCollectionBubbles();
        resetActorsBubbles();
        clearActiveFilters();
        applyAdvancedFilter();
    });
    activeFiltersContainer.appendChild(resetBtn);
    
    // 更新筛选按钮上的计数
    const filterCountElement = document.getElementById('filter-count');
    if (filterCountElement) {
        const count = (hasCollections ? 1 : 0) + (hasActors ? 1 : 0);
        filterCountElement.textContent = count;
        filterCountElement.style.display = 'flex';
    }
}

// 创建筛选标签
function createFilterTag(text, type) {
    const tag = document.createElement('div');
    tag.className = 'filter-tag';
    
    const content = document.createElement('span');
    content.textContent = text;
    
    const removeBtn = document.createElement('span');
    removeBtn.className = 'remove-filter';
    removeBtn.textContent = '×';
    removeBtn.dataset.type = type;
    
    // 直接添加点击事件，确保事件冒泡
    removeBtn.addEventListener('click', function(e) {
        e.stopPropagation(); // 防止事件冒泡到父元素
        removeFilter(type);
    });
    
    tag.appendChild(content);
    tag.appendChild(removeBtn);
    return tag;
}

// 应用高级筛选
function applyAdvancedFilter() {
    // 构建筛选数据对象
    const filterData = {
        collections: selectedCollections,
        actors: selectedActors
    };
    
    // 更新URL参数
    updateUrlWithFilters(filterData);
    
    // 更新筛选条件显示
    updateActiveFilters(filterData);
    
    // 执行筛选 - 使用筛选条件更新视频列表
    applyFiltersToVideoList(filterData);
}

// 将筛选应用到视频列表
function applyFiltersToVideoList(filterData) {
    const videos = window.videoData.getVideos();
    
    // 检查是否有任何筛选条件
    const hasCollections = filterData.collections && filterData.collections.length > 0;
    const hasActors = filterData.actors && filterData.actors.length > 0;
    const hasActiveFilters = hasCollections || hasActors;
    
    // 如果没有筛选条件，清除条件筛选
    if (!hasActiveFilters) {
        window.videoData.setConditionFilter(null);
        return;
    }
    
    // 根据筛选条件过滤视频
    const filteredVideos = videos.filter(video => {
        // 检查合集筛选
        if (hasCollections) {
            // 如果视频没有合集属性，则不符合条件
            if (!video.collection) {
                return false;
            }
            
            // 将视频的合集转换为数组，处理可能的多值情况
            const videoCollections = typeof video.collection === 'string' 
                ? video.collection.split(/\s*,\s*/).map(c => c.trim()).filter(c => c)
                : Array.isArray(video.collection) ? video.collection : [video.collection];
            
            // 检查是否至少有一个合集匹配 - 精确匹配整个值
            const hasMatchingCollection = filterData.collections.some(collection =>
                videoCollections.includes(collection)
            );
            
            if (!hasMatchingCollection) {
                return false;
            }
        }
        
        // 检查演员筛选
        if (hasActors) {
            // 如果视频没有演员属性，则不符合条件
            if (!video.actors) {
                return false;
            }
            
            // 将视频的演员转换为数组，处理可能的多值情况
            const videoActors = typeof video.actors === 'string' 
                ? video.actors.split(/\s*,\s*/).map(a => a.trim()).filter(a => a)
                : Array.isArray(video.actors) ? video.actors : [video.actors];
            
            // 检查是否至少有一个演员匹配 - 精确匹配整个值
            const hasMatchingActor = filterData.actors.some(actor =>
                videoActors.includes(actor)
            );
            
            if (!hasMatchingActor) {
                return false;
            }
        }
        
        return true;
    });
    
    // 更新视频列表显示
    window.videoData.setConditionFilter(filteredVideos);
}

// 根据搜索词过滤视频
function filterVideos(searchTerm) {
    // 如果搜索词为空，清除文本筛选
    if (!searchTerm) {
        window.videoData.setTextFilter(null); // 清除文本筛选
        return;
    }
    
    // 从原始数据源获取视频数据
    const videos = window.videoData.getVideos();
    
    // 过滤视频数据
    const filteredVideos = videos.filter(video => {
        // 在指定字段中搜索 - 使用模糊匹配（包含子字符串）
        return (
            // 文件名 - 模糊匹配
            (video.fileName && video.fileName.toLowerCase().includes(searchTerm)) ||
            
            // 标题 - 模糊匹配
            (video.code && video.code.toLowerCase().includes(searchTerm)) ||
            
            // 合集 - 模糊匹配，考虑多值情况
            (video.collection && (
                typeof video.collection === 'string' 
                    ? video.collection.toLowerCase().includes(searchTerm) 
                    : Array.isArray(video.collection) 
                        ? video.collection.some(c => c.toLowerCase().includes(searchTerm))
                        : String(video.collection).toLowerCase().includes(searchTerm)
            )) ||
            
            // 演员 - 模糊匹配，考虑多值情况
            (video.actors && (
                typeof video.actors === 'string' 
                    ? video.actors.toLowerCase().includes(searchTerm) 
                    : Array.isArray(video.actors) 
                        ? video.actors.some(a => a.toLowerCase().includes(searchTerm))
                        : String(video.actors).toLowerCase().includes(searchTerm)
            )) ||
            
            // 备注 - 模糊匹配
            (video.notes && video.notes.toLowerCase().includes(searchTerm)) ||
            
            // 文件路径 - 模糊匹配
            (video.filePath && video.filePath.toLowerCase().includes(searchTerm))
        );
    });
    
    // 使用新的API更新文本筛选结果
    window.videoData.setTextFilter(filteredVideos);
}

// 导出函数供主模块使用
export { 
    initSearchFilter, 
    filterVideos,
    // 导出刷新函数，允许外部模块调用刷新
    handleFilterBubblesRefresh
};