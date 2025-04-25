/**
 * 视频数据模型和渲染函数
 * 提供统一的数据源，确保表格视图和画廊视图使用相同的数据
 * 集成数据库持久化功能
 */

// 统一的视频数据数组 - 从数据库加载
let videoData = [];

// 分页配置
let paginationConfig = {
    currentPage: 1,
    pageSize: 20,
    totalPages: 1
};

// 更新分页UI
function updatePagination() {
    const totalVideos = videoData.length;
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
    
    // 如果没有视频数据，直接返回空表格
    if (videoData.length === 0) {
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
    const endIndex = Math.min(startIndex + paginationConfig.pageSize, videoData.length);
    const currentPageData = videoData.slice(startIndex, endIndex);
    
    // 如果当前页没有数据且不是第一页，自动切换到上一页
    if (currentPageData.length === 0 && paginationConfig.currentPage > 1) {
        paginationConfig.currentPage--;
        renderTableView();
        updatePagination();
        return;
    }
    
    console.log(`渲染当前页视频，从${startIndex}到${endIndex}，共${currentPageData.length}个`);
    
    // 恢复表头的复选框，避免表头显示异常
    const selectAllCheckbox = document.querySelector('#video-table th.checkbox-cell input');
    if (selectAllCheckbox) {
        selectAllCheckbox.style.display = '';
    }
    
    currentPageData.forEach(video => {
        const row = document.createElement('tr');
        
        // 复选框列
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
        
        // 文件名列
        const fileNameCell = document.createElement('td');
        fileNameCell.className = 'column-filename';
        fileNameCell.textContent = video.fileName;
        fileNameCell.title = video.fileName; // 添加title属性显示完整内容
        row.appendChild(fileNameCell);
        
        // 番号列
        const codeCell = document.createElement('td');
        codeCell.className = 'column-code';
        codeCell.textContent = video.code || '-';
        codeCell.title = video.code || '-';
        row.appendChild(codeCell);
        
        // 合集列
        const collectionCell = document.createElement('td');
        collectionCell.className = 'column-collection';
        collectionCell.textContent = video.collection || '-';
        collectionCell.title = video.collection || '-';
        row.appendChild(collectionCell);
        
        // 演员列
        const actorsCell = document.createElement('td');
        actorsCell.className = 'column-actors';
        actorsCell.textContent = video.actors || '-';
        actorsCell.title = video.actors || '-';
        row.appendChild(actorsCell);
        
        // 分辨率列
        const resolutionCell = document.createElement('td');
        resolutionCell.className = 'column-resolution';
        resolutionCell.textContent = video.resolution || '-';
        resolutionCell.title = video.resolution || '-';
        row.appendChild(resolutionCell);
        
        // 评分列
        const ratingCell = document.createElement('td');
        ratingCell.className = 'column-rating';
        ratingCell.textContent = video.rating ? video.rating.toFixed(1) : '-';
        ratingCell.title = video.rating ? `评分: ${video.rating.toFixed(1)}` : '未评分';
        row.appendChild(ratingCell);
        
        // 观看次数列
        const viewCountCell = document.createElement('td');
        viewCountCell.className = 'column-viewcount';
        viewCountCell.textContent = video.viewCount || '0';
        viewCountCell.title = `观看次数: ${video.viewCount || '0'}`;
        row.appendChild(viewCountCell);
        
        // 最后观看时间列
        const lastViewDateCell = document.createElement('td');
        lastViewDateCell.className = 'column-lastview';
        lastViewDateCell.textContent = video.lastViewDate || '-';
        lastViewDateCell.title = video.lastViewDate || '未观看';
        row.appendChild(lastViewDateCell);
        
        // 备注列
        const notesCell = document.createElement('td');
        notesCell.className = 'column-notes';
        notesCell.textContent = video.notes || '-';
        notesCell.title = video.notes || '-';
        row.appendChild(notesCell);
        
        // 文件路径列
        const filePathCell = document.createElement('td');
        filePathCell.className = 'column-filepath';
        filePathCell.textContent = video.filePath || '-';
        filePathCell.title = video.filePath || '-';
        row.appendChild(filePathCell);
        
        // 文件大小列
        const fileSizeCell = document.createElement('td');
        fileSizeCell.className = 'column-filesize';
        fileSizeCell.textContent = video.fileSize || '-';
        fileSizeCell.title = video.fileSize || '-';
        row.appendChild(fileSizeCell);
        
        // 文件创建时间列
        const createDateCell = document.createElement('td');
        createDateCell.className = 'column-createdate';
        createDateCell.textContent = video.createDate || '-';
        createDateCell.title = video.createDate || '-';
        row.appendChild(createDateCell);
        
        // 导入时间列
        const importDateCell = document.createElement('td');
        importDateCell.className = 'column-importdate';
        importDateCell.textContent = video.importDate || '-';
        importDateCell.title = video.importDate || '-';
        row.appendChild(importDateCell);
        
        // 上映时间列
        const releaseDateCell = document.createElement('td');
        releaseDateCell.className = 'column-releasedate';
        releaseDateCell.textContent = video.releaseDate || '-';
        releaseDateCell.title = video.releaseDate || '-';
        row.appendChild(releaseDateCell);
        
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
    
    // 如果没有视频数据，显示一个提示
    if (videoData.length === 0) {
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'w-full h-full flex items-center justify-center text-gray-500';
        emptyMessage.textContent = '没有视频数据，请点击"导入视频"按钮添加视频';
        grid.appendChild(emptyMessage);
        return;
    }
    
    // 更新画廊视图的全选按钮状态
    const selectAllGrid = document.getElementById('select-all-grid');
    if (selectAllGrid) {
        // 检查所有视频是否全部被选中
        const allSelected = videoData.length > 0 && videoData.every(video => video.selected);
        selectAllGrid.checked = allSelected;
    }
    
    // 计算当前页的数据 - 与表格视图使用相同的分页
    const startIndex = (paginationConfig.currentPage - 1) * paginationConfig.pageSize;
    const endIndex = Math.min(startIndex + paginationConfig.pageSize, videoData.length);
    const currentPageData = videoData.slice(startIndex, endIndex);
    
    // 如果当前页没有数据且不是第一页，自动切换到上一页
    if (currentPageData.length === 0 && paginationConfig.currentPage > 1) {
        paginationConfig.currentPage--;
        renderGridView();
        updatePagination();
        return;
    }
    
    console.log(`渲染当前页视频（画廊视图），从${startIndex}到${endIndex}，共${currentPageData.length}个`);
    
    // 只渲染当前页的视频数据，而不是全部
    currentPageData.forEach(video => {
        const card = document.createElement('div');
        card.className = 'video-card';
        card.dataset.videoId = video.id;
        
        // 复选框
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'video-card-checkbox';
        checkbox.checked = video.selected;
        checkbox.dataset.id = video.id;
        checkbox.addEventListener('change', function() {
            video.selected = this.checked;
            updateSelectedCount();
            updateBatchActionsVisibility();
        });
        card.appendChild(checkbox);
        
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
        thumbnail.style.backgroundSize = 'cover';
        thumbnail.style.backgroundPosition = 'center';
        
        // 播放按钮覆盖层
        const playOverlay = document.createElement('div');
        playOverlay.className = 'absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 opacity-0 hover:opacity-100 transition-opacity';
        
        const playBtn = document.createElement('button');
        playBtn.className = 'bg-white rounded-full p-2 text-gray-800 hover:text-indigo-600';
        playBtn.innerHTML = '<i class="fas fa-play"></i>';
        playBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            playVideo(video.filePath);
        });
        
        playOverlay.appendChild(playBtn);
        thumbnail.appendChild(playOverlay);
        card.appendChild(thumbnail);
        
        // 视频信息
        const info = document.createElement('div');
        info.className = 'video-info p-2';
        
        // 文件名
        const title = document.createElement('div');
        title.className = 'video-title text-sm font-medium mb-1 truncate';
        title.title = video.fileName; // 添加悬停提示显示完整文件名
        title.textContent = video.fileName;
        info.appendChild(title);
        
        // 演员信息
        const actors = document.createElement('div');
        actors.className = 'video-actors text-xs text-gray-600 mb-1 truncate';
        actors.innerHTML = `<i class="fas fa-user mr-1"></i>${video.actors || '未知演员'}`;
        info.appendChild(actors);
        
        // 底部信息栏（评分和其他元数据）
        const bottomBar = document.createElement('div');
        bottomBar.className = 'flex justify-between items-center';
        
        // 评分 - 使用星星图标显示
        const rating = document.createElement('div');
        rating.className = 'star-rating';
        
        // 创建5颗星星
        for (let i = 1; i <= 5; i++) {
            const star = document.createElement('i');
            star.className = 'star fas fa-star';
            
            // 根据评分决定星星是否填充
            if (video.rating) {
                if (video.rating >= i) {
                    star.classList.add('filled');
                } else if (video.rating > i - 0.5) {
                    star.classList.add('half-filled');
                }
            }
            
            rating.appendChild(star);
        }
        
        bottomBar.appendChild(rating);
        
        // 视频类型/分辨率
        if (video.resolution) {
            const resolution = document.createElement('span');
            resolution.className = 'text-xs text-gray-500';
            resolution.textContent = video.resolution;
            bottomBar.appendChild(resolution);
        }
        
        info.appendChild(bottomBar);
        card.appendChild(info);
        
        // 操作按钮
        const actions = document.createElement('div');
        actions.className = 'video-actions absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity';
        
        const actionBtns = document.createElement('div');
        
        // 编辑按钮
        const editBtn = document.createElement('button');
        editBtn.className = 'action-btn';
        editBtn.title = '编辑';
        editBtn.innerHTML = '<i class="fas fa-edit"></i>';
        editBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            console.log('编辑视频:', video.id);
        });
        actionBtns.appendChild(editBtn);
        
        // 删除按钮
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'action-btn';
        deleteBtn.title = '删除';
        deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
        deleteBtn.addEventListener('click', async function(e) {
            e.stopPropagation();
            console.log('删除视频:', video.id);
            
            // 确认删除
            const confirmMessage = `确定要移除视频 "${video.fileName}" 吗？\n\n注意：这只会从管理器中移除记录，不会删除实际的视频文件。`;
            if (!confirm(confirmMessage)) {
                return;
            }
            
            try {
                // 调用Electron API删除视频记录
                const result = await window.electronAPI.deleteVideo(video.id);
                if (result > 0) {
                    // 从本地数据中移除
                    const index = videoData.findIndex(v => v.id === video.id);
                    if (index !== -1) {
                        videoData.splice(index, 1);
                    }
                    
                    // 更新UI
                    renderTableView();
                    renderGridView();
                    updatePagination();
                    
                    // 更新总视频数量
                    document.getElementById('total-count').textContent = videoData.length;
                    
                    console.log(`成功移除视频记录: ${video.fileName}`);
                } else {
                    console.warn(`未找到要删除的视频: ${video.id}`);
                }
            } catch (error) {
                console.error('删除视频记录失败:', error);
                alert('删除视频记录失败，请查看控制台了解详情');
            }
        });
        actionBtns.appendChild(deleteBtn);
        
        actions.appendChild(actionBtns);
        info.appendChild(actions);
        
        card.appendChild(info);
        
        // 视频卡片点击事件添加选中效果
        card.addEventListener('click', function(e) {
            // 如果点击的是复选框或操作按钮，不处理
            if (e.target.closest('.video-card-checkbox') || 
                e.target.closest('.action-btn') || 
                e.target.type === 'checkbox') {
                return;
            }
            
            // 添加选中样式
            const allCards = grid.querySelectorAll('.video-card');
            allCards.forEach(c => c.classList.remove('selected'));
            this.classList.add('selected');
            
            // 不再触发打开详情的行为
        });
        
        grid.appendChild(card);
    });
}

// 切换视图
function toggleView(e) {
    const tableViewBtn = document.querySelector('.table-view-btn');
    const gridViewBtn = document.querySelector('.grid-view-btn');
    const tableContainer = document.querySelector('.table-container');
    const gridContainer = document.getElementById('video-grid');
    
    if (e.currentTarget.classList.contains('table-view-btn')) {
        // 切换到表格视图
        tableViewBtn.classList.add('active');
        gridViewBtn.classList.remove('active');
        tableContainer.classList.remove('hidden');
        gridContainer.classList.add('hidden');
        
        // 确保表格视图显示正确的数据
        renderTableView();
    } else {
        // 切换到画廊视图
        gridViewBtn.classList.add('active');
        tableViewBtn.classList.remove('active');
        gridContainer.classList.remove('hidden');
        tableContainer.classList.add('hidden');
        
        // 确保画廊视图显示正确的数据
        renderGridView();
    }
    
    // 保存当前视图状态到本地存储
    localStorage.setItem('preferredView', e.currentTarget.classList.contains('table-view-btn') ? 'table' : 'grid');
}

// 更新选中计数
function updateSelectedCount() {
    // 获取当前页的数据范围
    const startIndex = (paginationConfig.currentPage - 1) * paginationConfig.pageSize;
    const endIndex = Math.min(startIndex + paginationConfig.pageSize, videoData.length);
    const currentPageVideos = videoData.slice(startIndex, endIndex);
    
    // 计算当前页选中的项目数
    const selectedCount = currentPageVideos.filter(video => video.selected).length;
    
    // 更新显示
    const selectedCountElement = document.getElementById('selected-count');
    if (selectedCountElement) {
        selectedCountElement.textContent = `${selectedCount}/${currentPageVideos.length}`;
    }
}

// 更新批量操作按钮的可见性
function updateBatchActionsVisibility() {
    const batchActions = document.getElementById('batch-actions');
    
    // 获取当前页的数据
    const startIndex = (paginationConfig.currentPage - 1) * paginationConfig.pageSize;
    const endIndex = Math.min(startIndex + paginationConfig.pageSize, videoData.length);
    const currentPageVideos = videoData.slice(startIndex, endIndex);
    
    // 计算当前页选中的项目数
    const selectedCount = currentPageVideos.filter(video => video.selected).length;
    
    if (selectedCount > 0) {
        batchActions.classList.add('visible');
        document.querySelector('.left-actions').style.display = 'none';
    } else {
        batchActions.classList.remove('visible');
        document.querySelector('.left-actions').style.display = 'block';
    }
    
    // 确保视图切换按钮始终在正确位置
    const viewToggleButtons = document.querySelector('.view-toggle-buttons');
    if (viewToggleButtons) {
        viewToggleButtons.style.display = 'flex';
    }
}

// 全选/取消全选
function toggleSelectAll(checked) {
    // 获取当前页的数据
    const startIndex = (paginationConfig.currentPage - 1) * paginationConfig.pageSize;
    const endIndex = Math.min(startIndex + paginationConfig.pageSize, videoData.length);
    
    // 只更新当前页的数据
    for (let i = startIndex; i < endIndex; i++) {
        videoData[i].selected = checked;
    }
    
    // 重新渲染两个视图，确保UI状态与数据一致
    renderTableView();
    renderGridView();
    
    // 更新选中计数和批量操作按钮状态
    updateSelectedCount();
    updateBatchActionsVisibility();
}

// 反选
function invertSelection() {
    // 获取当前页的数据
    const startIndex = (paginationConfig.currentPage - 1) * paginationConfig.pageSize;
    const endIndex = Math.min(startIndex + paginationConfig.pageSize, videoData.length);
    
    // 只反选当前页的数据
    for (let i = startIndex; i < endIndex; i++) {
        videoData[i].selected = !videoData[i].selected;
    }
    
    // 重新渲染两个视图，确保UI状态与数据一致
    renderTableView();
    renderGridView();
    
    // 更新全选按钮状态 - 检查当前页所有项是否都被选中
    const currentPageVideos = videoData.slice(startIndex, endIndex);
    const allCurrentPageSelected = currentPageVideos.length > 0 && currentPageVideos.every(video => video.selected);
    
    const selectAllTable = document.getElementById('select-all-table');
    if (selectAllTable) {
        selectAllTable.checked = allCurrentPageSelected;
    }
    
    const selectAllGrid = document.getElementById('select-all-grid');
    if (selectAllGrid) {
        selectAllGrid.checked = allCurrentPageSelected;
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
    
    // 更新全选按钮状态 - 检查当前页所有项是否都被选中
    const startIndex = (paginationConfig.currentPage - 1) * paginationConfig.pageSize;
    const endIndex = Math.min(startIndex + paginationConfig.pageSize, videoData.length);
    const currentPageVideos = videoData.slice(startIndex, endIndex);
    const allCurrentPageSelected = currentPageVideos.length > 0 && currentPageVideos.every(video => video.selected);
    
    const selectAllTable = document.getElementById('select-all-table');
    if (selectAllTable) {
        selectAllTable.checked = allCurrentPageSelected;
    }
    
    const selectAllGrid = document.getElementById('select-all-grid');
    if (selectAllGrid) {
        selectAllGrid.checked = allCurrentPageSelected;
    }
    
    // 更新选中计数和批量操作按钮状态
    updateSelectedCount();
    updateBatchActionsVisibility();
}

// 当视频数据变化时更新视图状态
function onVideoDataChanged() {
    renderTableView();
    renderGridView();
    initViewState();
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
    onVideoDataChanged
};