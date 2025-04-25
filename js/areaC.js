/**
 * 区域C: 功能按钮
 * 负责处理功能按钮和批量操作的交互
 */

import { videoData, updateSelectedCount, renderTableView, renderGridView, updatePagination, paginationConfig, updateBatchActionsVisibility, onVideoDataChanged } from './videoData.js';

// 全选/取消全选视频
function toggleSelectAll(isChecked) {
    // 直接调用videoData.js中的toggleSelectAll函数
    // 它会负责更新数据模型和所有UI元素
    import('./videoData.js').then(module => {
        module.toggleSelectAll(isChecked);
    });
}

// 反选视频
function invertSelection() {
    // 直接调用videoData.js中的invertSelection函数
    // 它会负责更新数据模型和所有UI元素
    window.invertSelection();
}

// 批量移除功能
async function batchRemove() {
    // 获取当前页的范围
    const startIndex = (paginationConfig.currentPage - 1) * paginationConfig.pageSize;
    const endIndex = Math.min(startIndex + paginationConfig.pageSize, videoData.length);
    
    // 获取当前页选中的视频
    const currentPageVideos = videoData.slice(startIndex, endIndex);
    const selectedVideos = currentPageVideos.filter(video => video.selected);
    
    if (selectedVideos.length === 0) {
        alert('请先选择要移除的视频');
        return;
    }
    
    // 确认是否移除
    const confirmMessage = `确定要移除当前页选中的 ${selectedVideos.length} 个视频记录吗？\n\n注意：这只会从管理器中移除记录，不会删除实际的视频文件。`;
    if (!confirm(confirmMessage)) {
        return;
    }
    
    try {
        // 逐个删除选中的视频
        for (const video of selectedVideos) {
            await window.electronAPI.deleteVideo(video.id);
            
            // 从本地数据中移除
            const index = videoData.findIndex(v => v.id === video.id);
            if (index !== -1) {
                videoData.splice(index, 1);
            }
        }
        
        // 更新UI
        onVideoDataChanged();
        
        // 更新总视频数量
        document.getElementById('total-count').textContent = videoData.length;
        
        console.log(`成功移除 ${selectedVideos.length} 个视频记录`);
    } catch (error) {
        console.error('批量移除视频失败:', error);
        alert('批量移除视频失败，请查看控制台了解详情');
    }
}

// 批量移动功能
async function batchMove() {
    // 获取当前页的范围
    const startIndex = (paginationConfig.currentPage - 1) * paginationConfig.pageSize;
    const endIndex = Math.min(startIndex + paginationConfig.pageSize, videoData.length);
    
    // 获取当前页选中的视频
    const currentPageVideos = videoData.slice(startIndex, endIndex);
    const selectedVideos = currentPageVideos.filter(video => video.selected);
    
    if (selectedVideos.length === 0) {
        alert('请先选择要移动的视频');
        return;
    }
    
    // TODO: 实现批量移动功能
    alert(`即将移动当前页选中的 ${selectedVideos.length} 个视频记录`);
}

// 初始化功能按钮
function initFunctionBar() {
    // 全选按钮（功能栏）事件
    const selectAllBtn = document.querySelector('.select-all-btn');
    selectAllBtn.addEventListener('click', function() {
        const selectAllTable = document.getElementById('select-all-table');
        selectAllTable.checked = true;
        toggleSelectAll(true);
    });
    
    // 反选按钮事件
    const invertSelectionBtn = document.querySelector('.invert-selection-btn');
    invertSelectionBtn.addEventListener('click', invertSelection);
    
    // 导入按钮事件 - 使用Electron API
    document.querySelector('.import-btn').addEventListener('click', async function() {
        try {
            // 导入导入进度模块
            const { showImportProgressModal } = await import('./importProgress.js');
            
            // 显示导入进度弹窗
            showImportProgressModal();
            
            // 开始导入视频
            const result = await window.electronAPI.importVideos();
            
            // 检查导入结果
            if (result.success > 0 || (result.cancelled && result.success > 0)) {
                // 即使是取消的导入，只要有成功导入的视频，也重新获取所有视频数据
                console.log(`导入结果: 总共 ${result.total} 个视频，成功 ${result.success} 个，失败 ${result.failed} 个${result.cancelled ? '，已取消 ' + (result.canceled || 0) + ' 个' : ''}`);
                
                // 重新获取所有视频数据
                const allVideos = await window.electronAPI.getVideos();
                
                // 更新视频数据
                videoData.length = 0;
                videoData.push(...allVideos);
                
                // 更新UI
                onVideoDataChanged();
                
                // 更新总视频数量
                document.getElementById('total-count').textContent = videoData.length;
                
                console.log(`导入完成: 数据库中现在有 ${videoData.length} 个视频`);
            } else if (result.cancelled) {
                console.log(`用户取消了导入操作，没有成功导入的视频`);
            } else {
                console.log('没有成功导入的视频');
            }
        } catch (error) {
            console.error('导入视频失败:', error);
        }
    });
    
    // 批量操作按钮事件
    document.querySelector('.batch-move-btn').addEventListener('click', function() {
        console.log('批量移动');
        batchMove();
    });
    
    
    document.querySelector('.batch-remove-btn').addEventListener('click', function() {
        console.log('批量移除');
        batchRemove();
    });
    
    // 初始化视图切换按钮
    initViewToggleButton();
}

// 初始化视图切换按钮和新增的排序、设置表头按钮
function initViewToggleButton() {
    console.log('初始化视图切换按钮');
    
    // 获取当前视图状态
    const tableContainer = document.querySelector('.table-container');
    const gridContainer = document.getElementById('video-grid');
    const isTableView = !tableContainer.classList.contains('hidden');
    
    // 创建新的按钮容器
    const viewToggleContainer = document.createElement('div');
    viewToggleContainer.className = 'view-toggle-buttons flex items-center';
    
    // 创建设置表头按钮
    const headerSettingsBtn = document.createElement('button');
    headerSettingsBtn.className = 'header-settings-btn px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-md mr-2';
    headerSettingsBtn.title = '设置表头';
    headerSettingsBtn.innerHTML = '<i class="fas fa-columns"></i>';
    headerSettingsBtn.addEventListener('click', function() {
        console.log('设置表头');
        // TODO: 实现设置表头功能
    });
    
    // 创建排序按钮
    const sortBtn = document.createElement('button');
    sortBtn.className = 'sort-btn px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-md mr-2';
    sortBtn.title = '排序';
    sortBtn.innerHTML = '<i class="fas fa-sort"></i>';
    sortBtn.addEventListener('click', function() {
        console.log('排序');
        // TODO: 实现排序功能
    });
    
    // 创建单个视图切换按钮
    const viewToggleBtn = document.createElement('button');
    viewToggleBtn.className = 'view-toggle-btn px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-md';
    
    // 根据当前视图设置按钮图标和提示
    if (isTableView) {
        viewToggleBtn.innerHTML = '<i class="fas fa-th"></i>';
        viewToggleBtn.title = '切换到画廊视图';
    } else {
        viewToggleBtn.innerHTML = '<i class="fas fa-list"></i>';
        viewToggleBtn.title = '切换到表格视图';
    }
    
    // 添加视图切换事件
    viewToggleBtn.addEventListener('click', function() {
        console.log('视图切换按钮被点击');
        
        // 获取当前视图状态
        const tableContainer = document.querySelector('.table-container');
        const videoTable = document.getElementById('video-table');
        const gridContainer = document.getElementById('video-grid');
        const isCurrentlyTableView = tableContainer.style.display !== 'none';
        
        console.log('当前视图:', isCurrentlyTableView ? '表格视图' : '画廊视图');
        
        // 切换视图
        if (isCurrentlyTableView) {
            // 切换到画廊视图
            tableContainer.style.display = 'none';
            videoTable.style.display = 'none';
            tableContainer.classList.add('hidden');
            videoTable.classList.add('hidden');
            
            gridContainer.style.display = 'grid';
            gridContainer.classList.remove('hidden');
            
            this.innerHTML = '<i class="fas fa-list"></i>';
            this.title = '切换到表格视图';
            
            // 隐藏设置表头按钮
            headerSettingsBtn.style.display = 'none';
            
            console.log('已切换到画廊视图');
        } else {
            // 切换到表格视图
            gridContainer.style.display = 'none';
            gridContainer.classList.add('hidden');
            
            tableContainer.style.display = 'block';
            videoTable.style.display = 'table';
            tableContainer.classList.remove('hidden');
            videoTable.classList.remove('hidden');
            
            this.innerHTML = '<i class="fas fa-th"></i>';
            this.title = '切换到画廊视图';
            
            // 显示设置表头按钮
            headerSettingsBtn.style.display = 'block';
            
            console.log('已切换到表格视图');
        }
        
        // 重新渲染视图
        import('./videoData.js').then(module => {
            module.renderTableView();
            module.renderGridView();
        });
    });
    
    // 添加按钮到容器
    viewToggleContainer.appendChild(headerSettingsBtn);
    viewToggleContainer.appendChild(sortBtn);
    viewToggleContainer.appendChild(viewToggleBtn);
    
    // 替换原有的视图切换按钮
    const oldViewToggle = document.querySelector('.view-toggle');
    if (oldViewToggle) {
        oldViewToggle.parentNode.replaceChild(viewToggleContainer, oldViewToggle);
        console.log('视图切换按钮已替换');
    } else {
        console.warn('未找到原有的视图切换按钮容器');
        // 尝试添加到功能栏
        const functionBar = document.querySelector('.function-bar');
        if (functionBar) {
            functionBar.appendChild(viewToggleContainer);
            console.log('视图切换按钮已添加到功能栏');
        }
    }
    
    // 根据当前视图状态设置设置表头按钮的显示状态
    if (!isTableView) {
        headerSettingsBtn.style.display = 'none';
    }
}

// 导出函数供主模块使用
export { initFunctionBar, updateSelectedCount, toggleSelectAll, invertSelection };