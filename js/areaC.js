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

/**
 * 辅助函数：检查是否是有效的缩略图URL
 * @param {string} url - 缩略图URL
 * @returns {boolean} 是否是有效的缩略图URL
 */
function isValidThumbnailUrl(url) {
    // 检查是否为空
    if (!url) return false;
    
    // 检查是否是缩略图URL (支持旧格式和新格式)
    return url.includes('thumbnails/') || url.startsWith('app://thumbnail/');
}

// 批量移除功能
async function batchRemove() {
    // 使用当前所有数据（包括筛选后的）
    const currentData = window.videoData.getVideos();
    
    // 获取所有选中的视频，而不仅仅是当前页的
    const selectedVideos = currentData.filter(video => video.selected);
    
    if (selectedVideos.length === 0) {
        // 使用自定义提示对话框
        showCustomAlert('请先选择要移除的视频');
        return;
    }
    
    // 确认是否移除，使用自定义确认对话框
    const confirmMessage = `即将从管理器中移除 ${selectedVideos.length} 个视频记录。此操作不会删除实际的视频文件，但会永久移除这些记录。`;
    
    // 使用自定义确认对话框，传递回调函数
    showCustomConfirm('确认移除', confirmMessage, async (confirmed) => {
        if (!confirmed) return;
        
        try {
            // 逐个删除选中的视频
            for (const video of selectedVideos) {
                await window.electronAPI.deleteVideo(video.id);
                
                // 删除对应的预览图
                if (video.thumbnailUrl && isValidThumbnailUrl(video.thumbnailUrl)) {
                    await window.electronAPI.deleteThumbnail(video.thumbnailUrl);
                }
                
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
            
            // // 显示成功提示，不自动关闭
            // showCustomAlert(`已成功移除 ${selectedVideos.length} 个视频记录`, 'success', false);

        } catch (error) {
            console.error('批量移除视频失败:', error);
            // 显示错误提示，不自动关闭
            showCustomAlert('批量移除视频失败，请查看控制台了解详情', 'error', true);
        }
    });
}

// 批量迁移功能
async function batchMove() {
    // 使用当前所有数据（包括筛选后的）
    const currentData = window.videoData.getVideos();
    
    // 获取所有选中的视频，而不仅仅是当前页的
    const selectedVideos = currentData.filter(video => video.selected);
    
    if (selectedVideos.length === 0) {
        // 使用自定义提示对话框
        showCustomAlert('请先选择要迁移的视频');
        return;
    }
    
    try {
        // 使用文件选择对话框选择目标文件夹
        const result = await window.electronAPI.selectFile({
            title: '选择目标文件夹',
            properties: ['openDirectory']
        });
        
        // 如果用户取消了选择
        if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
            console.log('用户取消了目标文件夹选择');
            return;
        }
        
        const targetFolder = result.filePaths[0];
        console.log(`选择的目标文件夹: ${targetFolder}`);
        
        // 导入moveProgress模块并启动迁移操作
        const { startMoveVideos } = await import('./moveProgress.js');
        await startMoveVideos(selectedVideos, targetFolder);
        
        // 迁移操作完成后，重新获取视频数据
        const allVideos = await window.electronAPI.getVideos();
        
        // 更新视频数据
        videoData.length = 0;
        videoData.push(...allVideos);
        
        // 更新UI
        onVideoDataChanged();
        
    } catch (error) {
        console.error('批量迁移失败:', error);
        showCustomAlert('批量迁移失败: ' + error.message, 'error');
    }
}

// 表头设置功能
let columnSettings = {};

// 初始化表头设置功能
function initColumnSettings() {
    console.log('初始化表头设置功能');
    
    // 尝试从localStorage加载保存的表头设置
    const savedSettings = localStorage.getItem('columnSettings');
    if (savedSettings) {
        try {
            columnSettings = JSON.parse(savedSettings);
            console.log('从localStorage加载表头设置:', columnSettings);
        } catch (e) {
            console.error('解析表头设置失败:', e);
            // 如果解析失败，使用默认设置
            initDefaultColumnSettings();
        }
    } else {
        // 如果没有保存的设置，使用默认设置
        initDefaultColumnSettings();
    }
    
    // 根据设置更新表头设置浮窗中的复选框状态
    updateColumnCheckboxes();
    
    // 将设置应用到表格
    applyColumnSettings();
    
    // 绑定表头设置选项的即时生效事件
    bindColumnSettingsEvents();
}

// 初始化默认表头设置
function initDefaultColumnSettings() {
    console.log('初始化默认表头设置');
    
    // 获取所有表头列
    const tableHeaders = document.querySelectorAll('.video-table th:not(.checkbox-cell)');
    
    // 设置所有列默认为显示
    tableHeaders.forEach(th => {
        const columnClass = th.className.split(' ').find(cls => cls.startsWith('column-'));
        if (columnClass) {
            const columnId = columnClass.replace('column-', 'col-');
            columnSettings[columnId] = true;
        }
    });
    
    // 保存默认设置
    saveColumnSettings();
}

// 更新表头设置浮窗中的复选框状态
function updateColumnCheckboxes() {
    console.log('更新表头设置复选框状态');
    
    // 获取所有表头设置复选框
    const columnCheckboxes = document.querySelectorAll('#header-settings-float .column-item input[type="checkbox"]');
    
    // 根据当前设置更新复选框状态
    columnCheckboxes.forEach(checkbox => {
        const columnId = checkbox.id;
        if (columnId in columnSettings) {
            checkbox.checked = columnSettings[columnId];
        } else {
            // 默认为选中
            checkbox.checked = true;
            columnSettings[columnId] = true;
        }
    });
}

// 应用表头设置到表格
function applyColumnSettings() {
    console.log('应用表头设置到表格');
    
    // 获取表格所有列
    const tableHeaders = document.querySelectorAll('.video-table th:not(.checkbox-cell)');
    
    // 遍历所有表头
    tableHeaders.forEach(th => {
        const columnClass = th.className.split(' ').find(cls => cls.startsWith('column-'));
        if (columnClass) {
            const columnId = columnClass.replace('column-', 'col-');
            const isVisible = columnSettings[columnId];
            
            // 设置表头可见性
            th.style.display = isVisible ? '' : 'none';
            
            // 获取该列对应的所有单元格
            const cells = document.querySelectorAll(`.video-table td.${columnClass}`);
            
            // 设置所有单元格可见性
            cells.forEach(cell => {
                cell.style.display = isVisible ? '' : 'none';
            });
        }
    });
}

// 保存表头设置到localStorage
function saveColumnSettings() {
    console.log('保存表头设置到localStorage');
    localStorage.setItem('columnSettings', JSON.stringify(columnSettings));
}

// 绑定表头设置选项的即时生效事件
function bindColumnSettingsEvents() {
    console.log('绑定表头设置选项事件');
    
    const columnCheckboxes = document.querySelectorAll('#header-settings-float .column-item input[type="checkbox"]');
    columnCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const columnId = this.id;
            const isChecked = this.checked;
            
            console.log(`表头列 ${columnId} 设置已更改为: ${isChecked ? '显示' : '隐藏'}`);
            
            // 更新设置
            columnSettings[columnId] = isChecked;
            
            // 保存设置
            saveColumnSettings();
            
            // 应用设置到表格
            applyColumnSettings();
        });
    });
}

// 排序功能
let sortSettings = {
    field: 'fileName', // 默认按文件名排序
    direction: 'asc'   // 默认升序
};

// 初始化排序功能
function initSortSettings() {
    console.log('初始化排序功能');
    
    // 尝试从localStorage加载保存的排序设置
    const savedSettings = localStorage.getItem('sortSettings');
    if (savedSettings) {
        try {
            sortSettings = JSON.parse(savedSettings);
            console.log('从localStorage加载排序设置:', sortSettings);
        } catch (e) {
            console.error('解析排序设置失败:', e);
            // 使用默认排序设置
        }
    }
    
    // 更新排序设置浮窗中的选择状态
    updateSortControls();
    
    // 应用排序设置
    applySortSettings();
    
    // 绑定排序设置选项的即时生效事件
    bindSortSettingsEvents();
}

// 更新排序控件的状态
function updateSortControls() {
    console.log('更新排序控件状态');
    
    // 设置字段选择器
    const sortFieldSelect = document.getElementById('sort-field');
    if (sortFieldSelect) {
        sortFieldSelect.value = sortSettings.field;
    }
    
    // 设置方向单选按钮
    const sortDirection = sortSettings.direction;
    const sortDirectionRadio = document.getElementById(`sort-${sortDirection}`);
    if (sortDirectionRadio) {
        sortDirectionRadio.checked = true;
    }
}

// 绑定排序设置事件
function bindSortSettingsEvents() {
    console.log('绑定排序设置事件');
    
    // 排序字段变更事件
    const sortFieldSelect = document.getElementById('sort-field');
    if (sortFieldSelect) {
        sortFieldSelect.addEventListener('change', function() {
            sortSettings.field = this.value;
            saveSortSettings();
            applySortSettings();
        });
    }
    
    // 排序方向变更事件
    const sortDirectionRadios = document.querySelectorAll('input[name="sort-direction"]');
    sortDirectionRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.checked) {
                sortSettings.direction = this.value;
                saveSortSettings();
                applySortSettings();
            }
        });
    });
}

// 保存排序设置
function saveSortSettings() {
    console.log('保存排序设置到localStorage');
    localStorage.setItem('sortSettings', JSON.stringify(sortSettings));
}

// 应用当前排序设置
function applySortSettings() {
    console.log(`应用排序设置: 字段=${sortSettings.field}, 方向=${sortSettings.direction}`);
    
    // 更新UI中的排序指示器
    updateSortIndicators();
    
    // 调用videoData中的排序方法
    import('./videoData.js').then(module => {
        if (typeof module.sortVideos === 'function') {
            module.sortVideos(sortSettings.field, sortSettings.direction);
        } else {
            console.error('videoData模块未提供sortVideos方法');
        }
    }).catch(error => {
        console.error('导入videoData模块失败:', error);
    });
}

// 更新表格头部的排序指示器
function updateSortIndicators() {
    // 移除所有列的排序指示器
    document.querySelectorAll('.video-table th').forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
    });
    
    // 为当前排序列添加指示器
    const columnClass = `column-${sortSettings.field.toLowerCase()}`;
    const th = document.querySelector(`.video-table th.${columnClass}`);
    if (th) {
        th.classList.add(`sort-${sortSettings.direction}`);
    }
}

// 对视频数据进行排序（备用实现）
function sortVideoData() {
    const field = sortSettings.field;
    const direction = sortSettings.direction;
    
    // 获取当前视图（表格或画廊）
    const isTableView = !document.querySelector('.table-container').classList.contains('hidden');
    
    if (isTableView) {
        // 表格视图排序
        sortTableData(field, direction);
    } else {
        // 画廊视图排序
        sortGridData(field, direction);
    }
}

// 表格视图排序实现
function sortTableData(field, direction) {
    const tbody = document.querySelector('.video-table tbody');
    if (!tbody) return;
    
    const rows = Array.from(tbody.querySelectorAll('tr'));
    
    // 根据不同的字段类型，获取合适的列索引和排序比较函数
    const { columnIndex, compareFunction } = getSortConfig(field);
    
    if (columnIndex === -1) return;
    
    // 排序行
    rows.sort((rowA, rowB) => {
        const cellA = rowA.cells[columnIndex];
        const cellB = rowB.cells[columnIndex];
        
        // 使用比较函数
        let result = compareFunction(cellA, cellB);
        
        // 如果是降序则翻转结果
        return direction === 'asc' ? result : -result;
    });
    
    // 清空表格
    while (tbody.firstChild) {
        tbody.removeChild(tbody.firstChild);
    }
    
    // 重新填充表格
    rows.forEach(row => tbody.appendChild(row));
}

// 画廊视图排序实现
function sortGridData(field, direction) {
    const grid = document.getElementById('video-grid');
    if (!grid) return;
    
    const cards = Array.from(grid.querySelectorAll('.video-card'));
    
    // 获取比较函数
    const compareFunction = getCardCompareFunction(field);
    
    // 排序卡片
    cards.sort((cardA, cardB) => {
        let result = compareFunction(cardA, cardB);
        return direction === 'asc' ? result : -result;
    });
    
    // 清空网格
    while (grid.firstChild) {
        grid.removeChild(grid.firstChild);
    }
    
    // 重新填充网格
    cards.forEach(card => grid.appendChild(card));
}

// 获取表格排序配置
function getSortConfig(field) {
    // 默认配置
    let columnIndex = -1;
    let compareFunction = (cellA, cellB) => 0;
    
    // 获取列索引
    const headers = document.querySelectorAll('.video-table th');
    headers.forEach((th, index) => {
        if (th.classList.contains(`column-${field.toLowerCase()}`)) {
            columnIndex = index;
        }
    });
    
    // 根据字段类型选择比较函数
    switch (field) {
        case 'fileName':
        case 'code':
        case 'collection':
        case 'actors':
        case 'notes':
        case 'filePath':
            // 文本字段
            compareFunction = (cellA, cellB) => {
                const textA = cellA.textContent.trim().toLowerCase();
                const textB = cellB.textContent.trim().toLowerCase();
                return textA.localeCompare(textB);
            };
            break;
            
        case 'rating':
        case 'viewCount':
        case 'fileSize':
            // 数值字段
            compareFunction = (cellA, cellB) => {
                const valueA = parseFloat(cellA.textContent.replace(/[^\d.-]/g, '')) || 0;
                const valueB = parseFloat(cellB.textContent.replace(/[^\d.-]/g, '')) || 0;
                return valueA - valueB;
            };
            break;
            
        case 'lastViewDate':
        case 'createdAt':
        case 'importDate':
        case 'releaseDate':
            // 日期字段
            compareFunction = (cellA, cellB) => {
                const dateA = new Date(cellA.textContent);
                const dateB = new Date(cellB.textContent);
                
                // 检查日期是否有效
                const validDateA = !isNaN(dateA.getTime());
                const validDateB = !isNaN(dateB.getTime());
                
                // 处理无效日期
                if (!validDateA && !validDateB) return 0;
                if (!validDateA) return 1;  // 无效日期排在后面
                if (!validDateB) return -1;
                
                return dateA.getTime() - dateB.getTime();
            };
            break;
            
        case 'resolution':
            // 分辨率特殊处理
            compareFunction = (cellA, cellB) => {
                const resA = cellA.textContent.trim();
                const resB = cellB.textContent.trim();
                
                // 提取分辨率数值 (例如从 "1920x1080" 提取宽度和高度)
                const matchA = resA.match(/(\d+)\s*[xX×]\s*(\d+)/);
                const matchB = resB.match(/(\d+)\s*[xX×]\s*(\d+)/);
                
                // 计算像素总数作为比较基础
                const pixelsA = matchA ? parseInt(matchA[1]) * parseInt(matchA[2]) : 0;
                const pixelsB = matchB ? parseInt(matchB[1]) * parseInt(matchB[2]) : 0;
                
                return pixelsA - pixelsB;
            };
            break;
    }
    
    return { columnIndex, compareFunction };
}

// 获取卡片比较函数
function getCardCompareFunction(field) {
    return (cardA, cardB) => {
        // 从卡片数据属性获取比较值
        const valueA = cardA.dataset[field] || '';
        const valueB = cardB.dataset[field] || '';
        
        // 根据字段类型选择比较方式
        switch (field) {
            case 'rating':
            case 'viewCount':
            case 'fileSize':
                // 数值字段
                return (parseFloat(valueA) || 0) - (parseFloat(valueB) || 0);
                
            case 'lastViewDate':
            case 'createdAt':
            case 'importDate':
            case 'releaseDate':
                // 日期字段
                const dateA = new Date(valueA);
                const dateB = new Date(valueB);
                
                // 检查日期是否有效
                const validDateA = !isNaN(dateA.getTime());
                const validDateB = !isNaN(dateB.getTime());
                
                if (!validDateA && !validDateB) return 0;
                if (!validDateA) return 1;
                if (!validDateB) return -1;
                
                return dateA.getTime() - dateB.getTime();
                
            default:
                // 文本字段默认
                return valueA.toString().localeCompare(valueB.toString());
        }
    };
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
    
    // 导入文件夹按钮事件
    document.querySelector('.import-folder-btn').addEventListener('click', async function() {
        try {
            // 导入导入进度模块
            const { showImportProgressModal } = await import('./importProgress.js');
            
            // 显示导入进度弹窗
            showImportProgressModal();
            
            // 开始导入文件夹
            const result = await window.electronAPI.importFolder();
            
            // 检查导入结果
            if (result.success > 0 || (result.cancelled && result.success > 0)) {
                // 即使是取消的导入，只要有成功导入的视频，也重新获取所有视频数据
                console.log(`导入文件夹结果: 总共 ${result.total} 个视频，成功 ${result.success} 个，失败 ${result.failed} 个${result.cancelled ? '，已取消 ' + (result.canceled || 0) + ' 个' : ''}`);
                
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
                console.log(`用户取消了导入文件夹操作，没有成功导入的视频`);
            } else {
                console.log('没有成功导入的视频');
            }
        } catch (error) {
            console.error('导入文件夹失败:', error);
        }
    });
    
    // 初始化视图切换按钮
    initViewToggleButton();
    
    // 初始化表头设置
    initColumnSettings();
    
    // 初始化排序设置
    initSortSettings();
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
    headerSettingsBtn.addEventListener('click', function(e) {
        e.stopPropagation(); // 防止事件冒泡
        console.log('设置表头按钮被点击');
        toggleHeaderSettingsFloat();
    });
    
    // 创建排序按钮
    const sortBtn = document.createElement('button');
    sortBtn.className = 'sort-btn px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-md mr-2';
    sortBtn.title = '排序';
    sortBtn.innerHTML = '<i class="fas fa-sort"></i>';
    sortBtn.addEventListener('click', function(e) {
        e.stopPropagation(); // 防止事件冒泡
        console.log('排序按钮被点击');
        toggleSortSettingsFloat();
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
            
            // 重新应用表头设置
            applyColumnSettings();
            
            console.log('已切换到表格视图');
        }
        
        // 重新渲染视图
        import('./videoData.js').then(module => {
            module.renderTableView();
            module.renderGridView();
        });
        
        // 重新应用排序设置
        applySortSettings();
    });
    
    // 将按钮添加到容器
    viewToggleContainer.appendChild(headerSettingsBtn);
    viewToggleContainer.appendChild(sortBtn);
    viewToggleContainer.appendChild(viewToggleBtn);
    
    // 将按钮容器添加到视图切换区域
    document.querySelector('.view-toggle').appendChild(viewToggleContainer);
    
    // 初始化浮窗关闭事件
    initFloatCloseEvents();
}

// 初始化浮窗相关事件
function initFloatCloseEvents() {
    // 创建遮罩层元素
    const floatBackdrop = document.createElement('div');
    floatBackdrop.className = 'float-backdrop';
    floatBackdrop.id = 'float-backdrop';
    document.body.appendChild(floatBackdrop);
    
    // 点击遮罩层关闭所有浮窗
    floatBackdrop.addEventListener('click', closeAllFloats);
    
    // 监听批量操作浮窗按钮事件
    initBatchOperationsEvents();
}

// 应用当前排序设置 - 原有函数替换为新的实现
function applyCurrentSortSettings() {
    // 获取当前排序设置
    const sortField = document.getElementById('sort-field').value;
    const sortDirection = document.querySelector('input[name="sort-direction"]:checked').value;
    
    // 更新设置
    sortSettings.field = sortField;
    sortSettings.direction = sortDirection;
    
    // 保存设置
    saveSortSettings();
    
    // 应用设置
    applySortSettings();
}

// 初始化批量操作浮窗按钮事件
function initBatchOperationsEvents() {
    // 全选按钮
    const selectAllBtn = document.querySelector('#batch-operations-float .select-all-btn');
    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', function() {
            const selectAllTable = document.getElementById('select-all-table');
            if (selectAllTable) {
                selectAllTable.checked = true;
                toggleSelectAll(true);
            }
        });
    }
    
    // 反选按钮
    const invertSelectionBtn = document.querySelector('#batch-operations-float .invert-selection-btn');
    if (invertSelectionBtn) {
        invertSelectionBtn.addEventListener('click', invertSelection);
    }
    
    // 批量迁移按钮
    const batchMoveBtn = document.querySelector('#batch-operations-float .batch-move-btn');
    if (batchMoveBtn) {
        batchMoveBtn.addEventListener('click', function() {
            console.log('批量迁移');
            batchMove();
        });
    }
    
    // 批量移除按钮
    const batchRemoveBtn = document.querySelector('#batch-operations-float .batch-remove-btn');
    if (batchRemoveBtn) {
        batchRemoveBtn.addEventListener('click', function() {
            console.log('批量移除');
            batchRemove();
        });
    }
}

// 显示/隐藏表头设置浮窗
function toggleHeaderSettingsFloat() {
    const headerSettingsFloat = document.getElementById('header-settings-float');
    const floatBackdrop = document.getElementById('float-backdrop');
    
    // 先关闭所有其他浮窗
    closeAllFloats();
    
    // 切换表头设置浮窗显示状态
    if (headerSettingsFloat.classList.contains('visible')) {
        headerSettingsFloat.classList.remove('visible');
        floatBackdrop.classList.remove('visible');
    } else {
        // 先显示元素
        headerSettingsFloat.style.display = 'flex';
        floatBackdrop.style.display = 'block';
        
        // 强制浏览器重绘
        headerSettingsFloat.offsetHeight;
        
        // 添加动画类
        headerSettingsFloat.classList.add('visible');
        floatBackdrop.classList.add('visible');
        
        // 计算浮窗定位 - 靠近表头设置按钮
        positionHeaderSettingsFloat();
    }
}

// 显示/隐藏排序设置浮窗
function toggleSortSettingsFloat() {
    const sortSettingsFloat = document.getElementById('sort-settings-float');
    const floatBackdrop = document.getElementById('float-backdrop');
    
    // 先关闭所有其他浮窗
    closeAllFloats();
    
    // 切换排序设置浮窗显示状态
    if (sortSettingsFloat.classList.contains('visible')) {
        sortSettingsFloat.classList.remove('visible');
        floatBackdrop.classList.remove('visible');
    } else {
        // 先显示元素
        sortSettingsFloat.style.display = 'flex';
        floatBackdrop.style.display = 'block';
        
        // 强制浏览器重绘
        sortSettingsFloat.offsetHeight;
        
        // 添加动画类
        sortSettingsFloat.classList.add('visible');
        floatBackdrop.classList.add('visible');
        
        // 计算浮窗定位 - 靠近排序按钮
        positionSortSettingsFloat();
    }
}

// 关闭表头设置浮窗
function closeHeaderSettingsFloat() {
    const headerSettingsFloat = document.getElementById('header-settings-float');
    const floatBackdrop = document.getElementById('float-backdrop');
    
    headerSettingsFloat.classList.remove('visible');
    floatBackdrop.classList.remove('visible');
    
    // 动画结束后隐藏元素
    setTimeout(() => {
        headerSettingsFloat.style.display = 'none';
        floatBackdrop.style.display = 'none';
    }, 200);
}

// 关闭排序设置浮窗
function closeSortSettingsFloat() {
    const sortSettingsFloat = document.getElementById('sort-settings-float');
    const floatBackdrop = document.getElementById('float-backdrop');
    
    sortSettingsFloat.classList.remove('visible');
    floatBackdrop.classList.remove('visible');
    
    // 动画结束后隐藏元素
    setTimeout(() => {
        sortSettingsFloat.style.display = 'none';
        floatBackdrop.style.display = 'none';
    }, 200);
}

// 关闭所有浮窗
function closeAllFloats() {
    const headerSettingsFloat = document.getElementById('header-settings-float');
    const sortSettingsFloat = document.getElementById('sort-settings-float');
    const floatBackdrop = document.getElementById('float-backdrop');
    
    // 如果有浮窗正在显示，添加延迟
    if (headerSettingsFloat.classList.contains('visible') || 
        sortSettingsFloat.classList.contains('visible')) {
        
        // 移除动画类
        headerSettingsFloat.classList.remove('visible');
        sortSettingsFloat.classList.remove('visible');
        floatBackdrop.classList.remove('visible');
        
        // 动画结束后隐藏元素
        setTimeout(() => {
            headerSettingsFloat.style.display = 'none';
            sortSettingsFloat.style.display = 'none';
            floatBackdrop.style.display = 'none';
        }, 200);
    }
}

// 计算表头设置浮窗位置
function positionHeaderSettingsFloat() {
    const headerSettingsBtn = document.querySelector('.header-settings-btn');
    const headerSettingsFloat = document.getElementById('header-settings-float');
    
    if (headerSettingsBtn && headerSettingsFloat) {
        const btnRect = headerSettingsBtn.getBoundingClientRect();
        
        // 设置浮窗位置，确保不超出视窗边界，减小垂直间距
        headerSettingsFloat.style.top = (btnRect.bottom + 5) + 'px';
        
        // 计算右侧位置，确保浮窗与按钮右侧对齐
        const rightOffset = window.innerWidth - btnRect.right;
        headerSettingsFloat.style.right = rightOffset + 'px';
    }
}

// 计算排序设置浮窗位置
function positionSortSettingsFloat() {
    const sortBtn = document.querySelector('.sort-btn');
    const sortSettingsFloat = document.getElementById('sort-settings-float');
    
    if (sortBtn && sortSettingsFloat) {
        const btnRect = sortBtn.getBoundingClientRect();
        
        // 设置浮窗位置，确保不超出视窗边界，减小垂直间距
        sortSettingsFloat.style.top = (btnRect.bottom + 5) + 'px';
        
        // 计算右侧位置，确保浮窗与按钮右侧对齐
        const rightOffset = window.innerWidth - btnRect.right;
        sortSettingsFloat.style.right = rightOffset + 'px';
    }
}

// 自定义确认对话框函数
function showCustomConfirm(title, message, callback) {
    // 创建或获取对话框容器
    let dialogBackdrop = document.getElementById('custom-dialog-backdrop');
    
    // 如果不存在则创建
    if (!dialogBackdrop) {
        dialogBackdrop = document.createElement('div');
        dialogBackdrop.id = 'custom-dialog-backdrop';
        dialogBackdrop.className = 'custom-dialog-backdrop';
        document.body.appendChild(dialogBackdrop);
    }
    
    // 清空容器内容
    dialogBackdrop.innerHTML = '';
    
    // 创建对话框
    const dialogHtml = `
        <div class="custom-dialog" id="custom-dialog">
            <div class="custom-dialog-header">
                <h3 class="custom-dialog-title">
                    <i class="fas fa-exclamation-triangle custom-dialog-icon"></i>
                    ${title}
                </h3>
            </div>
            <div class="custom-dialog-body">
                ${message}
            </div>
            <div class="custom-dialog-footer">
                <button class="custom-dialog-btn cancel" id="dialog-cancel-btn">取消</button>
                <button class="custom-dialog-btn confirm" id="dialog-confirm-btn">确认</button>
            </div>
        </div>
    `;
    
    // 设置对话框内容
    dialogBackdrop.innerHTML = dialogHtml;
    
    // 显示背景和对话框
    dialogBackdrop.style.display = 'flex';
    
    // 获取对话框元素
    const dialog = document.getElementById('custom-dialog');
    
    // 强制浏览器重绘
    dialog.offsetHeight;
    
    // 添加可见性类触发动画
    dialogBackdrop.classList.add('visible');
    dialog.classList.add('visible');
    
    // 绑定按钮事件
    document.getElementById('dialog-cancel-btn').addEventListener('click', () => {
        closeCustomDialog();
        if (callback) callback(false);
    });
    
    document.getElementById('dialog-confirm-btn').addEventListener('click', () => {
        closeCustomDialog();
        if (callback) callback(true);
    });
    
    // 点击背景关闭
    dialogBackdrop.addEventListener('click', (e) => {
        if (e.target === dialogBackdrop) {
            closeCustomDialog();
            if (callback) callback(false);
        }
    });
}

// 自定义提示对话框函数
function showCustomAlert(message, type = 'warning', autoClose = true) {
    // 创建或获取对话框容器
    let dialogBackdrop = document.getElementById('custom-dialog-backdrop');
    
    // 如果不存在则创建
    if (!dialogBackdrop) {
        dialogBackdrop = document.createElement('div');
        dialogBackdrop.id = 'custom-dialog-backdrop';
        dialogBackdrop.className = 'custom-dialog-backdrop';
        document.body.appendChild(dialogBackdrop);
    }
    
    // 清空容器内容
    dialogBackdrop.innerHTML = '';
    
    // 根据类型设置图标和标题
    let icon = 'fa-exclamation-circle';
    let title = '提示';
    let iconColor = '#f59e0b'; // 默认警告颜色
    
    if (type === 'success') {
        icon = 'fa-check-circle';
        title = '成功';
        iconColor = '#10b981'; // 绿色
    } else if (type === 'error') {
        icon = 'fa-times-circle';
        title = '错误';
        iconColor = '#ef4444'; // 红色
    } else if (type === 'info') {
        icon = 'fa-info-circle';
        title = '信息';
        iconColor = '#3b82f6'; // 蓝色
    }
    
    // 创建对话框
    const dialogHtml = `
        <div class="custom-dialog" id="custom-dialog">
            <div class="custom-dialog-header">
                <h3 class="custom-dialog-title">
                    <i class="fas ${icon} custom-dialog-icon" style="color: ${iconColor};"></i>
                    ${title}
                </h3>
            </div>
            <div class="custom-dialog-body">
                ${message}
            </div>
            <div class="custom-dialog-footer">
                <button class="custom-dialog-btn confirm" id="dialog-ok-btn" style="background-color: ${type === 'error' ? '#ef4444' : '#3b82f6'};">确定</button>
            </div>
        </div>
    `;
    
    // 设置对话框内容
    dialogBackdrop.innerHTML = dialogHtml;
    
    // 显示背景和对话框
    dialogBackdrop.style.display = 'flex';
    
    // 获取对话框元素
    const dialog = document.getElementById('custom-dialog');
    
    // 强制浏览器重绘
    dialog.offsetHeight;
    
    // 添加可见性类触发动画
    dialogBackdrop.classList.add('visible');
    dialog.classList.add('visible');
    
    // 绑定按钮事件
    document.getElementById('dialog-ok-btn').addEventListener('click', closeCustomDialog);
    
    // 点击背景关闭，只有当autoClose为true时才允许
    if (autoClose) {
        dialogBackdrop.addEventListener('click', (e) => {
            if (e.target === dialogBackdrop) {
                closeCustomDialog();
            }
        });
    } else {
        // 如果不允许自动关闭，点击背景不会关闭对话框
        dialogBackdrop.addEventListener('click', (e) => {
            if (e.target === dialogBackdrop) {
                // 添加一个轻微晃动提示用户需要点击"确定"按钮
                dialog.classList.add('shake');
                setTimeout(() => {
                    dialog.classList.remove('shake');
                }, 500);
                e.stopPropagation();
            }
        });
    }
}

// 关闭自定义对话框
function closeCustomDialog() {
    const dialogBackdrop = document.getElementById('custom-dialog-backdrop');
    const dialog = document.getElementById('custom-dialog');
    
    if (dialogBackdrop && dialog) {
        // 移除动画类
        dialogBackdrop.classList.remove('visible');
        dialog.classList.remove('visible');
        
        // 延迟隐藏元素
        setTimeout(() => {
            dialogBackdrop.style.display = 'none';
        }, 200);
    }
}

// 导出函数供主模块使用
export {
    initFunctionBar,
    updateSelectedCount,
    toggleSelectAll,
    invertSelection,
    // 表头设置相关函数
    applyColumnSettings,
    // 排序相关函数
    applySortSettings,
    sortSettings,
    // 对话框相关函数
    showCustomAlert,
    showCustomConfirm
};