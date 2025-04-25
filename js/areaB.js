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
    
    // 获取筛选按钮位置，将浮窗定位在附近
    const btnRect = filterBtn.getBoundingClientRect();
    popup.style.top = (btnRect.bottom + 10) + 'px'; // 在按钮下方10px
    popup.style.right = (window.innerWidth - btnRect.right) + 'px'; // 对齐按钮右侧
    
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
        console.log('数据源同步完成，初始化多选组件');
        // 初始化多选下拉框组件
        initMultiSelectComponents();
    }).catch(error => {
        console.error('数据源同步失败:', error);
        // 失败时也尝试初始化组件
        initMultiSelectComponents();
    });
    
    // 关闭按钮事件
    document.getElementById('filter-close').addEventListener('click', hideFilterPopup);
    
    // 点击背景关闭
    document.getElementById('filter-backdrop').addEventListener('click', hideFilterPopup);
    
    // 防止点击浮窗本身关闭
    document.getElementById('filter-popup').addEventListener('click', function(event) {
        event.stopPropagation();
    });
    
    // 重置按钮事件
    document.getElementById('filter-reset').addEventListener('click', function() {
        // 重置多选组件
        collectionMultiSelect.clear();
        actorsMultiSelect.clear();
        
        // 重置评分
        resetRatingFilter();
        
        // 重置其他表单元素
        document.getElementById('filter-resolution').value = '';
        document.getElementById('filter-duration-min').value = '';
        document.getElementById('filter-duration-max').value = '';
        document.getElementById('filter-path').value = '';
        
        // 清除已选筛选条件显示
        clearActiveFilters();
    });
    
    // 应用筛选按钮事件
    document.getElementById('filter-apply').addEventListener('click', function() {
        applyAdvancedFilter();
        hideFilterPopup();
    });
    
    // 初始化星级评分点击事件
    initRatingFilter();
    
    // 移除筛选条件点击事件
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('remove-filter')) {
            removeFilter(e.target.getAttribute('data-type'));
        }
    });
    
    // 从URL参数加载筛选条件（如果有）
    loadFiltersFromUrl();
}

// 初始化多选下拉框组件
function initMultiSelectComponents() {
    console.log('初始化筛选器多选下拉框组件');
    
    // 获取数据源
    const collections = getCollections();
    const actors = getActors();
    
    console.log('合集数据源:', collections);
    console.log('演员数据源:', actors);
    
    // 合集多选组件
    const collectionContainer = document.getElementById('filter-collection-container');
    if (collectionContainer) {
        collectionMultiSelect = createFilterMultiSelect({
            containerElement: collectionContainer,
            placeholder: '选择合集',
            dataSource: collections,
            dataType: 'collections'
        });
        console.log('合集多选组件已初始化');
    } else {
        console.error('找不到合集容器元素');
    }
    
    // 演员多选组件
    const actorsContainer = document.getElementById('filter-actors-container');
    if (actorsContainer) {
        actorsMultiSelect = createFilterMultiSelect({
            containerElement: actorsContainer,
            placeholder: '选择演员',
            dataSource: actors,
            dataType: 'actors'
        });
        console.log('演员多选组件已初始化');
    } else {
        console.error('找不到演员容器元素');
    }
}

// 从URL参数加载筛选条件
function loadFiltersFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const hasFilters = urlParams.has('filter');
    
    if (hasFilters) {
        try {
            const filterParams = JSON.parse(decodeURIComponent(urlParams.get('filter')));
            
            // 设置多选框的值
            if (filterParams.collections && Array.isArray(filterParams.collections)) {
                collectionMultiSelect.setValues(filterParams.collections);
            }
            
            if (filterParams.actors && Array.isArray(filterParams.actors)) {
                actorsMultiSelect.setValues(filterParams.actors);
            }
            
            // 设置其他筛选项
            if (filterParams.rating) {
                const ratingValue = document.getElementById('filter-rating-value');
                ratingValue.textContent = filterParams.rating;
                updateStarRating(filterParams.rating);
            }
            
            if (filterParams.resolution) {
                document.getElementById('filter-resolution').value = filterParams.resolution;
            }
            
            if (filterParams.duration) {
                if (filterParams.duration.min) {
                    document.getElementById('filter-duration-min').value = filterParams.duration.min;
                }
                if (filterParams.duration.max) {
                    document.getElementById('filter-duration-max').value = filterParams.duration.max;
                }
            }
            
            if (filterParams.path) {
                document.getElementById('filter-path').value = filterParams.path;
            }
            
            // 应用筛选
            applyAdvancedFilter();
        } catch (error) {
            console.error('解析URL筛选参数错误:', error);
        }
    }
}

// 更新URL参数
function updateUrlWithFilters(filterData) {
    const url = new URL(window.location.href);
    
    // 移除现有筛选参数
    url.searchParams.delete('filter');
    
    // 如果有活跃筛选条件，添加到URL
    if (
        (filterData.collections && filterData.collections.length > 0) ||
        (filterData.actors && filterData.actors.length > 0) ||
        filterData.rating > 0 ||
        filterData.resolution ||
        (filterData.duration && (filterData.duration.min || filterData.duration.max)) ||
        filterData.path
    ) {
        url.searchParams.set('filter', encodeURIComponent(JSON.stringify(filterData)));
    }
    
    // 更新URL，不刷新页面
    window.history.replaceState({}, '', url);
}

// 更新星星评分显示
function updateStarRating(rating) {
    const stars = document.querySelectorAll('#filter-rating-stars i');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.classList.remove('far');
            star.classList.add('fas');
        } else {
            star.classList.remove('fas');
            star.classList.add('far');
        }
    });
}

// 移除单个筛选条件
function removeFilter(type) {
    switch (type) {
        case 'collections':
            collectionMultiSelect.clear();
            break;
        case 'actors':
            actorsMultiSelect.clear();
            break;
        case 'rating':
            document.getElementById('filter-rating-value').textContent = '0';
            updateStarRating(0);
            break;
        case 'resolution':
            document.getElementById('filter-resolution').value = '';
            break;
        case 'duration':
            document.getElementById('filter-duration-min').value = '';
            document.getElementById('filter-duration-max').value = '';
            break;
        case 'path':
            document.getElementById('filter-path').value = '';
            break;
    }
    
    // 重新应用筛选
    applyAdvancedFilter();
}

// 清除所有活跃筛选条件显示
function clearActiveFilters() {
    document.getElementById('active-filters').innerHTML = '';
    document.getElementById('filter-count').style.display = 'none';
}

// 更新活跃筛选条件显示
function updateActiveFilters(filterData) {
    const activeFiltersContainer = document.getElementById('active-filters');
    const filterCountBadge = document.getElementById('filter-count');
    
    // 清空现有显示
    activeFiltersContainer.innerHTML = '';
    
    // 计算活跃筛选条件数量
    let activeCount = 0;
    
    // 合集筛选
    if (filterData.collections && filterData.collections.length > 0) {
        activeCount++;
        const tag = createFilterTag('合集: ' + filterData.collections.join(', '), 'collections');
        activeFiltersContainer.appendChild(tag);
    }
    
    // 演员筛选
    if (filterData.actors && filterData.actors.length > 0) {
        activeCount++;
        const tag = createFilterTag('演员: ' + filterData.actors.join(', '), 'actors');
        activeFiltersContainer.appendChild(tag);
    }
    
    // 评分筛选
    if (filterData.rating > 0) {
        activeCount++;
        const tag = createFilterTag('评分: ≥ ' + filterData.rating + '星', 'rating');
        activeFiltersContainer.appendChild(tag);
    }
    
    // 分辨率筛选
    if (filterData.resolution) {
        activeCount++;
        const tag = createFilterTag('分辨率: ' + filterData.resolution, 'resolution');
        activeFiltersContainer.appendChild(tag);
    }
    
    // 时长筛选
    if (filterData.duration && (filterData.duration.min || filterData.duration.max)) {
        activeCount++;
        let durationText = '时长: ';
        if (filterData.duration.min) durationText += '≥ ' + filterData.duration.min + '分钟';
        if (filterData.duration.min && filterData.duration.max) durationText += ' 且 ';
        if (filterData.duration.max) durationText += '≤ ' + filterData.duration.max + '分钟';
        
        const tag = createFilterTag(durationText, 'duration');
        activeFiltersContainer.appendChild(tag);
    }
    
    // 文件路径筛选
    if (filterData.path) {
        activeCount++;
        const tag = createFilterTag('路径: ' + filterData.path, 'path');
        activeFiltersContainer.appendChild(tag);
    }
    
    // 更新筛选条件计数
    if (activeCount > 0) {
        filterCountBadge.textContent = activeCount;
        filterCountBadge.style.display = 'flex';
    } else {
        filterCountBadge.style.display = 'none';
    }
}

// 创建筛选标签元素
function createFilterTag(text, type) {
    const tag = document.createElement('div');
    tag.className = 'filter-tag';
    tag.innerHTML = `
        ${text}
        <span class="remove-filter" data-type="${type}">
            <i class="fas fa-times"></i>
        </span>
    `;
    return tag;
}

// 初始化星级评分筛选
function initRatingFilter() {
    const stars = document.querySelectorAll('#filter-rating-stars i');
    const ratingValue = document.getElementById('filter-rating-value');
    
    stars.forEach(star => {
        star.addEventListener('click', function() {
            const value = parseInt(this.getAttribute('data-value'));
            ratingValue.textContent = value;
            
            // 更新星星显示
            updateStarRating(value);
        });
    });
}

// 重置星级评分
function resetRatingFilter() {
    const stars = document.querySelectorAll('#filter-rating-stars i');
    const ratingValue = document.getElementById('filter-rating-value');
    
    ratingValue.textContent = '0';
    stars.forEach(star => {
        star.classList.remove('fas');
        star.classList.add('far');
    });
}

// 应用高级筛选
function applyAdvancedFilter() {
    // 获取所有筛选条件
    const collections = collectionMultiSelect ? collectionMultiSelect.getValues() : [];
    const actors = actorsMultiSelect ? actorsMultiSelect.getValues() : [];
    const rating = parseInt(document.getElementById('filter-rating-value').textContent);
    const resolution = document.getElementById('filter-resolution').value;
    const minDuration = document.getElementById('filter-duration-min').value;
    const maxDuration = document.getElementById('filter-duration-max').value;
    const filePath = document.getElementById('filter-path').value.toLowerCase();
    
    // 整合筛选数据对象
    const filterData = {
        collections,
        actors,
        rating,
        resolution,
        duration: {
            min: minDuration,
            max: maxDuration
        },
        path: filePath
    };
    
    // 更新活跃筛选条件显示
    updateActiveFilters(filterData);
    
    // 更新URL
    updateUrlWithFilters(filterData);
    
    // 过滤视频数据
    const filteredVideos = videoData.filter(video => {
        // 合集筛选（多选）
        if (collections.length > 0 && (!video.series || !collections.includes(video.series))) {
            return false;
        }
        
        // 演员筛选（多选）
        if (actors.length > 0) {
            // 如果视频没有演员信息或者为空，直接排除
            if (!video.actors || video.actors.trim() === '') {
                return false;
            }
            
            // 将视频的演员信息拆分为数组
            const videoActors = video.actors.split(/[,，、]/).map(a => a.trim());
            
            // 检查是否包含任意一个选中的演员
            if (!actors.some(actor => videoActors.includes(actor))) {
                return false;
            }
        }
        
        // 评分筛选
        if (rating > 0 && (!video.rating || video.rating < rating)) return false;
        
        // 分辨率筛选
        if (resolution && video.resolution !== resolution) return false;
        
        // 时长筛选
        if (minDuration && (!video.duration || video.duration < parseInt(minDuration))) return false;
        if (maxDuration && (!video.duration || video.duration > parseInt(maxDuration))) return false;
        
        // 文件路径筛选
        if (filePath && !(video.path && video.path.toLowerCase().includes(filePath))) return false;
        
        return true;
    });
    
    // 使用过滤后的数据重新渲染视图
    renderTableView(filteredVideos);
    renderGridView(filteredVideos);
    
    // 更新显示的视频数量
    document.getElementById('total-count').textContent = filteredVideos.length;
}

// 根据搜索词过滤视频
function filterVideos(searchTerm) {
    // 如果搜索词为空，显示所有视频
    if (!searchTerm) {
        renderTableView();
        renderGridView();
        return;
    }
    
    // 过滤视频数据
    const filteredVideos = videoData.filter(video => {
        // 在多个字段中搜索
        return (
            (video.fileName && video.fileName.toLowerCase().includes(searchTerm)) ||
            (video.code && video.code.toLowerCase().includes(searchTerm)) ||
            (video.series && video.series.toLowerCase().includes(searchTerm)) ||
            (video.actors && video.actors.toLowerCase().includes(searchTerm)) ||
            (video.notes && video.notes.toLowerCase().includes(searchTerm))
        );
    });
    
    // 使用过滤后的数据重新渲染视图
    renderTableView(filteredVideos);
    renderGridView(filteredVideos);
    
    // 更新显示的视频数量
    document.getElementById('total-count').textContent = filteredVideos.length;
}

// 导出函数供主模块使用
export { initSearchFilter, filterVideos };