/**
 * 视频数据模型和渲染函数
 * 提供统一的数据源，确保表格视图和画廊视图使用相同的数据
 * 集成数据库持久化功能
 */

// 从areaC模块导入applyColumnSettings函数
import { applyColumnSettings } from './areaC.js';

// 统一的视频数据数组 - 从数据库加载
let videoData = [];

// 筛选后的视频数据
let filteredData = null;

// 文本搜索筛选结果
let textFilteredData = null;

// 条件筛选结果
let conditionFilteredData = null;

// 排序后的数据
let sortedData = null;

// 当前排序设置
let currentSortSettings = {
    field: 'fileName',
    direction: 'asc'
};

// 分页配置
let paginationConfig = {
    currentPage: 1,
    pageSize: 20,
    totalPages: 1
};

// 更新分页UI
function updatePagination() {
    // 使用排序后的数据或筛选后的数据或原始数据计算总视频数
    const currentData = sortedData || filteredData || videoData;
    const totalVideos = currentData.length;
    const pageSize = paginationConfig.pageSize;
    const totalPages = Math.max(1, Math.ceil(totalVideos / pageSize));
    
    // 确保当前页不超过总页数
    if (paginationConfig.currentPage > totalPages) {
        paginationConfig.currentPage = totalPages;
    }
    
    paginationConfig.totalPages = totalPages;
    
    // 更新分页按钮
    const paginationContainer = document.querySelector('.pagination');
    paginationContainer.innerHTML = '';
    
    // 上一页按钮
    const prevBtn = document.createElement('button');
    prevBtn.className = 'page-btn';
    prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevBtn.disabled = paginationConfig.currentPage === 1;
    prevBtn.addEventListener('click', () => {
        if (paginationConfig.currentPage > 1) {
            paginationConfig.currentPage--;
            // 更新两种视图
            renderCurrentView();
            updatePagination();
        }
    });
    paginationContainer.appendChild(prevBtn);
    
    // 页码按钮 - 动态渲染
    // 根据页数动态调整显示策略
    if (totalPages <= 7) {
        // 页数较少时，显示所有页码
        for (let i = 1; i <= totalPages; i++) {
            appendPageButton(i, paginationContainer);
        }
    } else {
        // 页数较多时，使用更复杂的显示逻辑
        const currentPage = paginationConfig.currentPage;
        
        // 始终显示第一页
        appendPageButton(1, paginationContainer);
        
        // 根据当前页位置决定显示哪些页码
        if (currentPage <= 3) {
            // 当前页靠近开始
            for (let i = 2; i <= 5; i++) {
                appendPageButton(i, paginationContainer);
            }
            appendEllipsis(paginationContainer);
        } else if (currentPage >= totalPages - 2) {
            // 当前页靠近结束
            appendEllipsis(paginationContainer);
            for (let i = totalPages - 4; i <= totalPages - 1; i++) {
                appendPageButton(i, paginationContainer);
            }
        } else {
            // 当前页在中间
            appendEllipsis(paginationContainer);
            for (let i = currentPage - 1; i <= currentPage + 1; i++) {
                appendPageButton(i, paginationContainer);
            }
            appendEllipsis(paginationContainer);
        }
        
        // 始终显示最后一页
        appendPageButton(totalPages, paginationContainer);
    }
    
    // 下一页按钮
    const nextBtn = document.createElement('button');
    nextBtn.className = 'page-btn';
    nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
    nextBtn.disabled = paginationConfig.currentPage === totalPages;
    nextBtn.addEventListener('click', () => {
        if (paginationConfig.currentPage < totalPages) {
            paginationConfig.currentPage++;
            // 更新两种视图
            renderCurrentView();
            updatePagination();
        }
    });
    paginationContainer.appendChild(nextBtn);
    
    // 辅助函数：添加页码按钮
    function appendPageButton(pageNum, container) {
        const pageBtn = document.createElement('button');
        pageBtn.className = 'page-btn' + (pageNum === paginationConfig.currentPage ? ' active' : '');
        pageBtn.textContent = pageNum;
        pageBtn.addEventListener('click', () => {
            paginationConfig.currentPage = pageNum;
            // 更新两种视图
            renderCurrentView();
            updatePagination();
        });
        container.appendChild(pageBtn);
    }
    
    // 辅助函数：添加省略号
    function appendEllipsis(container) {
        const ellipsis = document.createElement('span');
        ellipsis.className = 'page-ellipsis';
        ellipsis.textContent = '...';
        container.appendChild(ellipsis);
    }
    
    // 更新页码输入框
    document.querySelector('.page-jump input').value = paginationConfig.currentPage;
    
    // 更新每页显示数量选择器
    const pageSizeSelector = document.querySelector('.page-size-selector select');
    
    // 移除旧的事件监听器，避免重复绑定
    const oldSelector = pageSizeSelector.cloneNode(true);
    pageSizeSelector.parentNode.replaceChild(oldSelector, pageSizeSelector);
    
    // 设置当前值并添加新的事件监听器
    oldSelector.value = paginationConfig.pageSize;
    oldSelector.addEventListener('change', function() {
        paginationConfig.pageSize = parseInt(this.value);
        paginationConfig.currentPage = 1; // 切换每页显示数量时，重置为第一页
        // 更新两种视图
        renderCurrentView();
        updatePagination();
    });
    
    // 更新页码跳转输入框
    const pageJumpInput = document.querySelector('.page-jump input');
    
    // 移除旧的事件监听器，避免重复绑定
    const oldInput = pageJumpInput.cloneNode(true);
    pageJumpInput.parentNode.replaceChild(oldInput, pageJumpInput);
    
    // 设置当前值并添加新的事件监听器
    oldInput.value = paginationConfig.currentPage;
    oldInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            const page = parseInt(this.value);
            if (page >= 1 && page <= totalPages) {
                paginationConfig.currentPage = page;
                // 更新两种视图
                renderCurrentView();
                updatePagination();
            } else {
                this.value = paginationConfig.currentPage; // 恢复原值
            }
        }
    });
}

// 根据当前选择的视图来渲染内容
function renderCurrentView() {
    // 检查当前哪个视图是可见的
    const gridContainer = document.getElementById('video-grid');
    const isGridView = !gridContainer.classList.contains('hidden');
    
    if (isGridView) {
        renderGridView();
    } else {
        renderTableView();
        
        // 在表格渲染后确保列设置被正确应用
        applyColumnSettings();
    }
}

// 渲染表格视图
function renderTableView() {
    console.log('渲染表格视图，当前视频数量:', videoData.length);
    
    const tableBody = document.querySelector('#video-table tbody');
    if (!tableBody) {
        console.error('渲染表格视图失败: 找不到表格体元素');
        return;
    }
    
    tableBody.innerHTML = '';
    
    // 获取当前需要使用的数据源
    // 优先使用排序后的数据，如果没有则使用筛选后的数据或原始数据
    const currentData = sortedData || filteredData || videoData;
    
    // 如果没有视频数据，直接返回空表格
    if (currentData.length === 0) {
        return;
    }
    
    // 确保表头可见并正确定位
    const tableHeader = document.querySelector('#video-table thead');
    if (tableHeader) {
        tableHeader.style.display = '';
        tableHeader.style.position = 'sticky';
        tableHeader.style.top = '0';
        tableHeader.style.zIndex = '2';
    }
    
    // 计算当前页的数据
    const startIndex = (paginationConfig.currentPage - 1) * paginationConfig.pageSize;
    const endIndex = Math.min(startIndex + paginationConfig.pageSize, currentData.length);
    const currentPageData = currentData.slice(startIndex, endIndex);
    
    // 如果当前页没有数据且不是第一页，自动切换到上一页
    if (currentPageData.length === 0 && paginationConfig.currentPage > 1) {
        paginationConfig.currentPage--;
        renderTableView();
        updatePagination();
        return;
    }
    
    console.log(`渲染当前页视频，从${startIndex}到${endIndex}，共${currentPageData.length}个`);
    
    // 更新表头的复选框，避免表头显示异常
    const selectAllCheckbox = document.querySelector('#video-table th.checkbox-cell input');
    if (selectAllCheckbox) {
        selectAllCheckbox.style.display = '';
        
        // 计算所有视频是否全部选中
        const allSelected = currentData.length > 0 && currentData.every(video => video.selected);
        selectAllCheckbox.checked = allSelected;
    }
    
    // 获取列可见性设置
    let columnSettings = {};
    // 尝试从localStorage直接获取列设置
    const savedSettings = localStorage.getItem('columnSettings');
    if (savedSettings) {
        try {
            columnSettings = JSON.parse(savedSettings);
        } catch (e) {
            console.error('解析表头设置失败:', e);
        }
    }
    
    // 格式化时间函数 - 精确到秒
    function formatTimeWithSeconds(timeString) {
        if (!timeString) return '-';
        
        try {
            // 尝试解析时间字符串
            const date = new Date(timeString);
            
            // 检查是否是有效日期
            if (isNaN(date.getTime())) return timeString;
            
            // 格式化为 YYYY-MM-DD HH:MM:SS
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
            
            return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        } catch (e) {
            console.error('格式化时间失败:', e);
            return timeString; // 出错时返回原始字符串
        }
    }
    
    // 格式化日期函数 - 仅日期
    function formatDateOnly(dateString) {
        if (!dateString) return '-';
        
        try {
            // 尝试解析日期字符串
            const date = new Date(dateString);
            
            // 检查是否是有效日期
            if (isNaN(date.getTime())) return dateString;
            
            // 格式化为 YYYY-MM-DD
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            
            return `${year}-${month}-${day}`;
        } catch (e) {
            console.error('格式化日期失败:', e);
            return dateString; // 出错时返回原始字符串
        }
    }
    
    currentPageData.forEach(video => {
        const row = document.createElement('tr');
        
        // 复选框列 - 始终显示
        const checkboxCell = document.createElement('td');
        checkboxCell.className = 'checkbox-cell sticky-left column-checkbox';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'video-checkbox';
        checkbox.checked = video.selected;
        checkbox.dataset.id = video.id;
        checkbox.addEventListener('change', function(e) {
            // 停止事件传播，防止触发行点击事件
            e.stopPropagation();
            video.selected = this.checked;
            updateSelectedCount();
            updateBatchActionsVisibility();
        });
        
        // 阻止复选框单元格的点击事件传播
        checkboxCell.addEventListener('click', function(e) {
            e.stopPropagation();
        });
        
        checkboxCell.appendChild(checkbox);
        row.appendChild(checkboxCell);
        
        // 定义列及其可见性状态
        const columns = [
            {
                id: 'col-filename',
                class: 'column-filename',
                value: video.fileName,
                title: video.fileName
            },
            {
                id: 'col-code',
                class: 'column-code',
                value: video.code || '-',
                title: video.code || '-'
            },
            {
                id: 'col-collection',
                class: 'column-collection',
                value: video.collection || '-',
                title: video.collection || '-'
            },
            {
                id: 'col-actors',
                class: 'column-actors',
                value: video.actors || '-',
                title: video.actors || '-'
            },
            {
                id: 'col-resolution',
                class: 'column-resolution',
                value: video.resolution || '-',
                title: video.resolution || '-'
            },
            {
                id: 'col-rating',
                class: 'column-rating',
                value: video.rating ? video.rating.toFixed(1) : '-',
                title: video.rating ? `评分: ${video.rating.toFixed(1)}` : '未评分'
            },
            {
                id: 'col-viewcount',
                class: 'column-viewcount',
                value: video.viewCount || '0',
                title: `观看次数: ${video.viewCount || '0'}`
            },
            {
                id: 'col-lastview',
                class: 'column-lastview',
                value: formatTimeWithSeconds(video.lastViewDate),
                title: video.lastViewDate ? video.lastViewDate : '未观看'
            },
            {
                id: 'col-notes',
                class: 'column-notes',
                value: video.notes || '-',
                title: video.notes || '-'
            },
            {
                id: 'col-filepath',
                class: 'column-filepath',
                value: video.filePath || '-',
                title: video.filePath || '-'
            },
            {
                id: 'col-duration',
                class: 'column-duration',
                value: video.duration || '-',
                title: video.duration || '-'
            },
            {
                id: 'col-filesize',
                class: 'column-filesize',
                value: video.fileSize || '-',
                title: video.fileSize || '-'
            },
            {
                id: 'col-createdate',
                class: 'column-createdate',
                value: formatTimeWithSeconds(video.createDate),
                title: video.createDate || '-'
            },
            {
                id: 'col-importdate',
                class: 'column-importdate',
                value: formatTimeWithSeconds(video.importDate),
                title: video.importDate || '-'
            },
            {
                id: 'col-releasedate',
                class: 'column-releasedate',
                value: formatDateOnly(video.releaseDate),
                title: video.releaseDate || '-'
            }
        ];
        
        // 修改这部分：不再基于配置决定是否创建单元格，而是统一创建所有单元格并通过CSS控制显示/隐藏
        columns.forEach(column => {
            const cell = document.createElement('td');
            cell.className = column.class;
            cell.textContent = column.value;
            cell.title = column.title;
            
            // 检查该列是否应该显示
            const isVisible = column.id in columnSettings ? columnSettings[column.id] : true;
            
            // 设置单元格初始可见性
            cell.style.display = isVisible ? '' : 'none';
            
            row.appendChild(cell);
        });
        
        // 添加数据属性用于标识
        row.dataset.videoId = video.id;
        row.dataset.videoPath = video.filePath;
        
        // 添加行点击事件处理
        row.addEventListener('click', function(e) {
            // 检查点击是否在复选框单元格内
            if (e.target.closest('.checkbox-cell') || e.target.type === 'checkbox') {
                return; // 不处理复选框单元格的点击
            }
            
            // 添加行选中样式
            const allRows = tableBody.querySelectorAll('tr');
            allRows.forEach(r => r.classList.remove('selected'));
            this.classList.add('selected');
            
            // 不再触发打开详情的行为
        });
        
        tableBody.appendChild(row);
    });
}

// 渲染画廊视图
function renderGridView() {
    console.log('渲染画廊视图，当前视频数量:', videoData.length);
    
    const grid = document.getElementById('video-grid');
    if (!grid) {
        console.error('渲染画廊视图失败: 找不到网格容器元素');
        return;
    }
    
    // 清空网格容器，释放旧的DOM节点
    grid.innerHTML = '';
    
    // 获取当前需要使用的数据源
    // 优先使用排序后的数据，如果没有则使用筛选后的数据或原始数据
    const currentData = sortedData || filteredData || videoData;
    
    // 计算当前页的数据 - 与表格视图使用相同的分页
    const startIndex = (paginationConfig.currentPage - 1) * paginationConfig.pageSize;
    const endIndex = Math.min(startIndex + paginationConfig.pageSize, currentData.length);
    const currentPageData = currentData.slice(startIndex, endIndex);
    
    // 如果当前页没有数据且不是第一页，自动切换到上一页
    if (currentPageData.length === 0 && paginationConfig.currentPage > 1) {
        paginationConfig.currentPage--;
        renderGridView();
        updatePagination();
        return;
    }
    
    console.log(`渲染当前页视频（画廊视图），从${startIndex}到${endIndex}，共${currentPageData.length}个`);
    
    // 更新画廊视图的全选按钮状态
    const selectAllGrid = document.getElementById('select-all-grid');
    if (selectAllGrid) {
        // 检查所有视频是否全部被选中，而不仅仅是当前页
        const allSelected = currentData.length > 0 && currentData.every(video => video.selected);
        selectAllGrid.checked = allSelected;
    }
    
    // 标签最大显示数
    const MAX_TAGS = 3;
    
    // 只渲染当前页的视频数据
    currentPageData.forEach(video => {
        const card = document.createElement('div');
        card.className = 'video-card';
        card.dataset.videoId = video.id;
        card.dataset.videoPath = video.filePath;
        
        // 缩略图包装容器
        const thumbWrap = document.createElement('div');
        thumbWrap.className = 'thumb-wrap';
        
        // 复选框
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'video-card-checkbox';
        checkbox.checked = video.selected;
        checkbox.dataset.id = video.id;
        checkbox.addEventListener('change', function(e) {
            // 阻止事件冒泡，避免触发卡片点击
            e.stopPropagation();
            video.selected = this.checked;
            updateSelectedCount();
            updateBatchActionsVisibility();
        });
        thumbWrap.appendChild(checkbox);
        
        // 分辨率标签
        if (video.resolution) {
            const resolution = document.createElement('span');
            resolution.className = 'resolution';
            resolution.textContent = video.resolution;
            thumbWrap.appendChild(resolution);
        }
        
        // 时长标签
        if (video.duration) {
            const duration = document.createElement('span');
            duration.className = 'duration';
            duration.textContent = video.duration;
            thumbWrap.appendChild(duration);
        }
        
        // 缩略图
        const thumbnail = document.createElement('div');
        thumbnail.className = 'video-thumbnail';
        // 使用缩略图URL或默认图片
        if (video.thumbnailUrl) {
            // 设置缩略图路径
            thumbnail.style.backgroundImage = `url(${video.thumbnailUrl})`;
            
            // 添加错误处理
            const img = new Image();
            img.onload = () => {
                // 图片加载成功，保持当前背景
            };
            img.onerror = () => {
                // 图片加载失败，使用默认图片
                thumbnail.style.backgroundImage = `url(https://via.placeholder.com/240x135?text=No+Preview)`;
            };
            img.src = video.thumbnailUrl;
        } else {
            thumbnail.style.backgroundImage = `url(https://via.placeholder.com/240x135?text=No+Preview)`;
        }
        
        thumbWrap.appendChild(thumbnail);
        card.appendChild(thumbWrap);
        
        // 视频信息区域
        const info = document.createElement('div');
        info.className = 'video-info';
        
        // 标题 - 优先使用code(视频标题)，如果code为空则使用fileName(文件名)
        const title = document.createElement('div');
        title.className = 'video-title';
        title.title = video.fileName; // 悬停提示显示完整文件名
        // 显示视频标题，如果没有则显示文件名
        title.textContent = video.code && video.code.trim() !== '' ? video.code : video.fileName;
        info.appendChild(title);
        
        // 标签区域
        if (video.collection) {
            const tagsContainer = document.createElement('div');
            tagsContainer.className = 'video-tags';
            
            // 解析标签
            const tagList = video.collection.split(',').filter(tag => tag.trim() !== '');
            
            // 显示前MAX_TAGS个标签
            const visibleTags = tagList.slice(0, MAX_TAGS);
            const remainingTags = tagList.slice(MAX_TAGS);
            
            // 添加可见标签
            visibleTags.forEach(tag => {
                const tagElement = document.createElement('span');
                tagElement.className = 'video-tag';
                tagElement.textContent = tag.trim();
                tagsContainer.appendChild(tagElement);
            });
            
            // 如果有更多标签，添加"..."及提示框
            if (remainingTags.length > 0) {
                const moreTag = document.createElement('span');
                moreTag.className = 'tag-more';
                moreTag.textContent = '...';
                
                const tooltip = document.createElement('span');
                tooltip.className = 'tag-tooltip';
                tooltip.textContent = remainingTags.join('、');
                
                moreTag.appendChild(tooltip);
                tagsContainer.appendChild(moreTag);
            }
            
            info.appendChild(tagsContainer);
        }
        
        // 演员信息
        const actors = document.createElement('div');
        actors.className = 'video-actors';
        actors.textContent = video.actors ? video.actors : '未知演员';
        info.appendChild(actors);
        
        // 底部信息栏（评分、分辨率等信息）
        const bottomInfo = document.createElement('div');
        bottomInfo.className = 'bottom-info';
        
        // 星级评分
        const starsContainer = document.createElement('div');
        starsContainer.className = 'stars-row';
        
        // 创建5颗星星 - 使用SVG实现
        for (let i = 1; i <= 5; i++) {
            const star = document.createElement('span');
            star.className = 'star';
            
            // 根据评分决定星星类型
            let starClass = '';
            if (video.rating && video.rating >= i) {
                starClass = 'filled';
            } else if (video.rating && video.rating > i - 0.5) {
                starClass = 'half-filled';
            }
            
            // 创建SVG星星
            star.innerHTML = `<svg viewBox="0 0 20 20"><polygon points="10,1 13,7 19,7.5 15,12 16,18 10,15 4,18 5,12 1,7.5 7,7"/></svg>`;
            if (starClass) {
                star.classList.add(starClass);
            }
            
            starsContainer.appendChild(star);
        }
        
        bottomInfo.appendChild(starsContainer);
        info.appendChild(bottomInfo);
        
        card.appendChild(info);
        
        // 卡片点击事件 - 选中效果
        card.addEventListener('click', function(e) {
            // 如果点击的是复选框，不处理
            if (e.target.closest('.video-card-checkbox') || e.target.type === 'checkbox') {
                return;
            }
            
            // 添加选中样式
            const allCards = grid.querySelectorAll('.video-card');
            allCards.forEach(c => c.classList.remove('selected'));
            this.classList.add('selected');
        });
        
        // // 卡片双击事件 - 播放视频
        // card.addEventListener('dblclick', function(e) {
        //     // 如果点击的是复选框，不处理
        //     if (e.target.closest('.video-card-checkbox') || e.target.type === 'checkbox') {
        //         return;
        //     }
            
        //     // 播放视频
        //     playVideo(video.filePath);
        // });
        
        grid.appendChild(card);
    });
}

// 切换视图
function toggleView(e) {
    const tableViewBtn = document.querySelector('.table-view-btn');
    const gridViewBtn = document.querySelector('.grid-view-btn');
    const tableContainer = document.querySelector('.table-container');
    const gridContainer = document.getElementById('video-grid');
    
    // 获取当前使用的数据源
    const currentData = sortedData || filteredData || videoData;
    
    if (e.currentTarget.classList.contains('table-view-btn')) {
        // 切换到表格视图
        tableViewBtn.classList.add('active');
        gridViewBtn.classList.remove('active');
        tableContainer.classList.remove('hidden');
        gridContainer.classList.add('hidden');
    } else {
        // 切换到画廊视图
        gridViewBtn.classList.add('active');
        tableViewBtn.classList.remove('active');
        gridContainer.classList.remove('hidden');
        tableContainer.classList.add('hidden');
    }
    
    // 确保两种视图都正确显示数据及其选中状态
    renderCurrentView();
    
    // 保存当前视图状态到本地存储
    localStorage.setItem('preferredView', e.currentTarget.classList.contains('table-view-btn') ? 'table' : 'grid');
}

// 更新批量操作按钮的可见性
function updateBatchActionsVisibility() {
    // 获取批量操作浮窗
    const batchOperationsFloat = document.getElementById('batch-operations-float');
    
    // 使用updateSelectedCount函数返回的结果获取选中计数
    const { totalSelectedCount } = updateSelectedCount();
    
    if (totalSelectedCount > 0) {
        // 显示批量操作浮窗
        batchOperationsFloat.classList.add('visible');
    } else {
        // 隐藏批量操作浮窗
        batchOperationsFloat.classList.remove('visible');
    }
}

// 更新选中计数
function updateSelectedCount() {
    // 确保使用一致的数据源 - 优先使用排序后的数据
    const currentData = sortedData || filteredData || videoData;
    
    // 计算所有已选中的视频数量
    const totalSelectedCount = currentData.filter(video => video.selected).length;
    
    // 更新显示
    const selectedCountElement = document.getElementById('selected-count');
    if (selectedCountElement) {
        selectedCountElement.textContent = `${totalSelectedCount}`;
    }
    
    return { totalSelectedCount };
}

// 全选/取消全选
function toggleSelectAll(checked) {
    // 确保使用一致的数据源 - 优先使用排序后的数据
    const currentData = sortedData || filteredData || videoData;
    
    // 全选或取消全选所有视频，而不仅仅是当前页
    currentData.forEach(video => {
        video.selected = checked;
    });
    
    // 重新渲染两个视图，确保UI状态与数据一致
    renderTableView();
    renderGridView();
    
    // 更新选中计数和批量操作按钮状态
    updateSelectedCount();
    updateBatchActionsVisibility();
}

// 反选
function invertSelection() {
    // 确保使用一致的数据源 - 优先使用排序后的数据
    const currentData = sortedData || filteredData || videoData;
    
    // 反选所有数据
    currentData.forEach(video => {
        video.selected = !video.selected;
    });
    
    // 重新渲染两个视图，确保UI状态与数据一致
    renderTableView();
    renderGridView();
    
    // 更新全选按钮状态 - 检查所有项是否都被选中
    const allSelected = currentData.length > 0 && currentData.every(video => video.selected);
    
    const selectAllTable = document.getElementById('select-all-table');
    if (selectAllTable) {
        selectAllTable.checked = allSelected;
    }
    
    const selectAllGrid = document.getElementById('select-all-grid');
    if (selectAllGrid) {
        selectAllGrid.checked = allSelected;
    }
    
    updateSelectedCount();
    updateBatchActionsVisibility();
}

// 将invertSelection函数暴露给全局，以便areaC.js可以调用
window.invertSelection = invertSelection;

// 播放视频
async function playVideo(filePath) {
    if (!filePath) return;
    
    try {
        // 使用Electron API打开视频文件
        await window.electronAPI.openVideo(filePath);
        
        // 更新UI中的观看次数和最后观看时间
        const videoIndex = videoData.findIndex(video => video.filePath === filePath);
        if (videoIndex !== -1) {
            videoData[videoIndex].viewCount += 1;
            videoData[videoIndex].lastViewDate = new Date().toISOString().split('T')[0];
            
            // 重新渲染视图以反映更新
            renderTableView();
            renderGridView();
        }
    } catch (error) {
        console.error('播放视频失败:', error);
    }
}

// 初始化视图状态
function initViewState() {
    // 更新分页
    updatePagination();
    
    // 确保使用一致的数据源 - 优先使用排序后的数据
    const currentData = sortedData || filteredData || videoData;
    
    // 更新全选按钮状态 - 检查所有视频是否都被选中
    const allSelected = currentData.length > 0 && currentData.every(video => video.selected);
    
    const selectAllTable = document.getElementById('select-all-table');
    if (selectAllTable) {
        selectAllTable.checked = allSelected;
    }
    
    const selectAllGrid = document.getElementById('select-all-grid');
    if (selectAllGrid) {
        selectAllGrid.checked = allSelected;
    }
    
    // 更新选中计数和批量操作按钮状态
    updateSelectedCount();
    updateBatchActionsVisibility();
}

// 当视频数据变化时更新视图状态
function onVideoDataChanged() {
    // 清除筛选，确保显示完整数据
    textFilteredData = null;
    conditionFilteredData = null;
    filteredData = null;
    sortedData = null;
    
    // 应用排序
    sortAllData();
    
    // 更新视图状态
    initViewState();
    
    // 更新总视频计数显示
    const totalCountElement = document.getElementById('total-count');
    if (totalCountElement) {
        totalCountElement.textContent = videoData.length;
    }
    
    // 确保两种视图都被重新渲染
    renderCurrentView();
}

// 添加videoDataChanged事件监听器
document.addEventListener('videoDataChanged', function(event) {
    console.log('收到videoDataChanged事件:', event.detail);
    onVideoDataChanged();
});

// 应用所有筛选条件生成最终筛选结果
function applyFilters() {
    if (!textFilteredData && !conditionFilteredData) {
        // 没有任何筛选条件，显示全部数据
        console.log('应用筛选: 无筛选条件，显示全部数据');
        filteredData = null;
    } else if (textFilteredData && !conditionFilteredData) {
        // 只有文本筛选
        console.log(`应用筛选: 只有文本筛选，结果数量 ${textFilteredData.length}`);
        filteredData = textFilteredData;
    } else if (!textFilteredData && conditionFilteredData) {
        // 只有条件筛选
        console.log(`应用筛选: 只有条件筛选，结果数量 ${conditionFilteredData.length}`);
        filteredData = conditionFilteredData;
    } else {
        // 两种筛选条件都存在，取交集
        console.log(`应用筛选: 同时存在文本筛选(${textFilteredData.length}个)和条件筛选(${conditionFilteredData.length}个)，计算交集`);
        
        // 使用ID匹配确保更高效率的交集计算
        filteredData = textFilteredData.filter(textVideo => 
            conditionFilteredData.some(condVideo => condVideo.id === textVideo.id)
        );
        
        console.log(`应用筛选: 交集结果 ${filteredData.length} 个视频`);
    }
    
    // 重置到第一页
    paginationConfig.currentPage = 1;
    
    // 应用排序
    sortAllData();
}

// 设置文本筛选结果
function setTextFilter(videos) {
    if (videos === null) {
        // 清除文本筛选
        console.log('清除文本筛选');
        textFilteredData = null;
    } else {
        // 设置文本筛选结果
        console.log(`设置文本筛选结果: ${videos.length} 个视频`);
        textFilteredData = videos;
    }
    
    // 应用所有筛选条件
    applyFilters();
}

// 设置条件筛选结果
function setConditionFilter(videos) {
    if (videos === null) {
        // 清除条件筛选
        console.log('清除条件筛选');
        conditionFilteredData = null;
    } else {
        // 设置条件筛选结果
        console.log(`设置条件筛选结果: ${videos.length} 个视频`);
        conditionFilteredData = videos;
    }
    
    // 应用所有筛选条件
    applyFilters();
}

// 清除所有筛选
function clearAllFilters() {
    textFilteredData = null;
    conditionFilteredData = null;
    filteredData = null;
    
    // 重置到第一页
    paginationConfig.currentPage = 1;
    
    // 在清除筛选后应用排序
    sortAllData();
}

// 设置筛选后的视频数据 (旧方法，保留用于兼容)
function setFilteredVideos(videos) {
    if (videos === null) {
        // 如果明确传入null（搜索框为空的情况），清除筛选，显示所有视频
        filteredData = null;
    } else {
        // 无论结果是否为空数组，都保存下来
        // 这样空数组会显示"无结果"，而不是回退到显示所有视频
        filteredData = videos;
    }
    
    // 重置为第一页
    paginationConfig.currentPage = 1;
    
    // 更新视图和分页
    renderTableView();
    renderGridView();
    updatePagination();
    
    // 更新总视频计数显示
    const totalCountElement = document.getElementById('total-count');
    if (totalCountElement) {
        const totalVideos = filteredData ? filteredData.length : videoData.length;
        totalCountElement.textContent = totalVideos;
    }
}

// 获取当前使用的视频数据
function getVideos() {
    return videoData;
}

// 排序视频数据 - 提供给其他模块调用的接口
function sortVideos(field, direction) {
    // 更新排序设置
    updateSortSettings(field, direction);
}

// 导出函数供其他模块使用
export {
    videoData,
    paginationConfig,
    updatePagination,
    renderTableView,
    renderGridView,
    renderCurrentView,
    toggleView,
    updateSelectedCount,
    updateBatchActionsVisibility,
    toggleSelectAll,
    invertSelection,
    playVideo,
    initViewState,
    onVideoDataChanged,
    setFilteredVideos,
    getVideos,
    setTextFilter,
    setConditionFilter,
    clearAllFilters,
    sortVideos,
    currentSortSettings
};

// 初始化时将这些方法挂载到window.videoData
// 这样其他模块可以直接通过window.videoData调用这些方法
window.videoData = {
    setFilteredVideos,
    getVideos,
    setTextFilter,
    setConditionFilter,
    clearAllFilters,
    sortVideos
};

// 排序所有数据
function sortAllData() {
    console.log(`对数据进行全局排序: 字段=${currentSortSettings.field}, 方向=${currentSortSettings.direction}`);
    
    // 获取当前需要使用的数据源（筛选后的或原始的）
    const dataToSort = filteredData || videoData;
    
    // 创建一个数组副本进行排序
    // 注意：这里只需要浅拷贝数组，但不能深拷贝对象，否则会丢失引用关系
    const dataToSortCopy = [...dataToSort];
    
    // 根据字段类型选择不同的排序逻辑
    switch(currentSortSettings.field) {
        case 'fileName':
        case 'code':
        case 'collection':
        case 'actors':
        case 'notes':
        case 'filePath':
        case 'duration':
            // 文本字段排序
            dataToSortCopy.sort((a, b) => {
                const valueA = (a[currentSortSettings.field] || '').toString().toLowerCase();
                const valueB = (b[currentSortSettings.field] || '').toString().toLowerCase();
                return currentSortSettings.direction === 'asc' 
                    ? valueA.localeCompare(valueB) 
                    : valueB.localeCompare(valueA);
            });
            break;
            
        case 'rating':
        case 'viewCount':
        case 'fileSize':
            // 数值字段排序
            dataToSortCopy.sort((a, b) => {
                const valueA = parseFloat(a[currentSortSettings.field]) || 0;
                const valueB = parseFloat(b[currentSortSettings.field]) || 0;
                return currentSortSettings.direction === 'asc' 
                    ? valueA - valueB 
                    : valueB - valueA;
            });
            break;
            
        case 'lastViewDate':
        case 'createdAt':
        case 'importDate':
        case 'releaseDate':
            // 日期字段排序
            dataToSortCopy.sort((a, b) => {
                const dateA = a[currentSortSettings.field] ? new Date(a[currentSortSettings.field]) : new Date(0);
                const dateB = b[currentSortSettings.field] ? new Date(b[currentSortSettings.field]) : new Date(0);
                
                // 检查日期是否有效
                const validDateA = !isNaN(dateA.getTime());
                const validDateB = !isNaN(dateB.getTime());
                
                // 处理无效日期
                if (!validDateA && !validDateB) return 0;
                if (!validDateA) return currentSortSettings.direction === 'asc' ? 1 : -1;
                if (!validDateB) return currentSortSettings.direction === 'asc' ? -1 : 1;
                
                return currentSortSettings.direction === 'asc' 
                    ? dateA.getTime() - dateB.getTime() 
                    : dateB.getTime() - dateA.getTime();
            });
            break;
            
        case 'resolution':
            // 分辨率特殊处理
            dataToSortCopy.sort((a, b) => {
                const resA = (a.resolution || '').toString();
                const resB = (b.resolution || '').toString();
                
                // 提取分辨率数值 (例如从 "1920x1080" 提取宽度和高度)
                const matchA = resA.match(/(\d+)\s*[xX×]\s*(\d+)/);
                const matchB = resB.match(/(\d+)\s*[xX×]\s*(\d+)/);
                
                // 计算像素总数作为比较基础
                const pixelsA = matchA ? parseInt(matchA[1]) * parseInt(matchA[2]) : 0;
                const pixelsB = matchB ? parseInt(matchB[1]) * parseInt(matchB[2]) : 0;
                
                return currentSortSettings.direction === 'asc' 
                    ? pixelsA - pixelsB 
                    : pixelsB - pixelsA;
            });
            break;
            
        default:
            // 默认排序
            dataToSortCopy.sort((a, b) => {
                const valueA = (a[currentSortSettings.field] || '').toString().toLowerCase();
                const valueB = (b[currentSortSettings.field] || '').toString().toLowerCase();
                return currentSortSettings.direction === 'asc' 
                    ? valueA.localeCompare(valueB) 
                    : valueB.localeCompare(valueA);
            });
    }
    
    // 更新排序后的数据
    sortedData = dataToSortCopy;
    
    console.log(`排序完成，共 ${sortedData.length} 条数据`);
    
    // 重置到第一页
    paginationConfig.currentPage = 1;
    
    // 更新视图和分页
    renderCurrentView();
    updatePagination();
}

// 更新排序设置
function updateSortSettings(field, direction) {
    console.log(`更新排序设置: 字段=${field}, 方向=${direction}`);
    
    // 更新排序设置
    currentSortSettings.field = field;
    currentSortSettings.direction = direction;
    
    // 执行排序
    sortAllData();
}