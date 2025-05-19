/**
 * 区域D: 视频列表
 * 负责处理视频列表的渲染和交互，包括表格视图和画廊视图
 */

import { videoData, renderTableView, renderGridView, updateSelectedCount, paginationConfig, updateBatchActionsVisibility, renderCurrentView } from './videoData.js';
import { openDetailDrawer } from './areaF.js';

// 视图切换功能
function toggleView(event) {
    const tableView = document.querySelector('.table-container');
    const gridView = document.getElementById('video-grid');
    const tableViewBtn = document.querySelector('.table-view-btn');
    const gridViewBtn = document.querySelector('.grid-view-btn');
    const videoTable = document.getElementById('video-table');
    
    // 在视图切换前，保存全选按钮的状态
    const selectAllTable = document.getElementById('select-all-table');
    const isAllSelected = selectAllTable ? selectAllTable.checked : false;
    
    // 确定是哪个按钮被点击
    const isGridViewClicked = event.currentTarget.classList.contains('grid-view-btn');
    
    if (isGridViewClicked) {
        // 切换到画廊视图
        gridViewBtn.classList.add('active');
        tableViewBtn.classList.remove('active');
        tableView.classList.add('hidden');
        gridView.classList.remove('hidden');
        
        // 更新全选按钮状态
        const selectAllGrid = document.getElementById('select-all-grid');
        if (selectAllGrid) {
            selectAllGrid.checked = isAllSelected;
        }
    } else {
        // 切换到表格视图
        tableViewBtn.classList.add('active');
        gridViewBtn.classList.remove('active');
        tableView.classList.remove('hidden');
        gridView.classList.add('hidden');
    }
    
    // 重新渲染两个视图，确保选择状态同步
    import('./videoData.js').then(module => {
        module.renderTableView();
        module.renderGridView();
    });
}

// 初始化视频列表
function initVideoList() {
    console.log('初始化视频列表区域，当前视频数量:', videoData.length);
    
    // 获取视图容器
    const tableContainer = document.querySelector('.table-container');
    const gridContainer = document.getElementById('video-grid');
    const videoTable = document.getElementById('video-table');
    
    // 默认显示表格视图
    tableContainer.classList.remove('hidden');
    videoTable.classList.remove('hidden');
    gridContainer.classList.add('hidden');
    
    // 强制设置display属性确保视图切换正确
    tableContainer.style.display = 'block';
    videoTable.style.display = 'table';
    gridContainer.style.display = 'none';
    
    // 视图切换按钮事件
    const viewToggleBtn = document.querySelector('.view-toggle-btn');
    if (viewToggleBtn) {
        viewToggleBtn.addEventListener('click', toggleView);
    } else {
        console.warn('未找到视图切换按钮');
    }
    
    // 恢复表头的全选按钮
    const selectAllTable = document.getElementById('select-all-table');
    if (selectAllTable) {
        selectAllTable.style.display = '';
        // 添加全选按钮事件
        selectAllTable.addEventListener('change', function() {
            const isChecked = this.checked;
            
            // 调用videoData中的全选函数，选择所有视频
            import('./videoData.js').then(module => {
                module.toggleSelectAll(isChecked);
            });
        });
    }
    
    // 添加画廊视图的全选按钮事件
    const selectAllGrid = document.getElementById('select-all-grid');
    if (selectAllGrid) {
        selectAllGrid.addEventListener('change', function() {
            const isChecked = this.checked;
            
            // 调用videoData中的全选函数，选择所有视频
            import('./videoData.js').then(module => {
                module.toggleSelectAll(isChecked);
            });
            
            // 同步表格视图的全选按钮状态
            if (selectAllTable) {
                selectAllTable.checked = isChecked;
            }
        });
    }
    
    // 初始渲染视图
    renderTableView();
    renderGridView();
    
    // 设置视频项的事件处理
    setupVideoItemEvents();
    
    // 初始化表格列宽调整功能
    initColumnResizer();
}

// 初始化表格列宽调整功能
function initColumnResizer() {
    const table = document.getElementById('video-table');
    const headers = table.querySelectorAll('th');
    
    // 定义变量用于跟踪调整状态
    let isResizing = false;
    let currentHeader = null;
    let currentColumnClass = '';
    let startX = 0;
    let startWidth = 0;
    
    // 保存列宽到本地存储的函数
    function saveColumnWidths() {
        const widths = {};
        headers.forEach(header => {
            // 使用列类名作为键
            if (header.className) {
                // 从类名列表中找到column-开头的类名
                const columnClass = Array.from(header.classList).find(cls => cls.startsWith('column-'));
                if (columnClass) {
                    widths[columnClass] = header.offsetWidth;
                }
            }
        });
        localStorage.setItem('videoTableColumnWidths', JSON.stringify(widths));
    }
    
    // 加载保存的列宽
    function loadColumnWidths() {
        const savedWidths = localStorage.getItem('videoTableColumnWidths');
        if (savedWidths) {
            try {
                const widths = JSON.parse(savedWidths);
                headers.forEach(header => {
                    if (header.className) {
                        // 从类名列表中找到column-开头的类名
                        const columnClass = Array.from(header.classList).find(cls => cls.startsWith('column-'));
                        if (columnClass && widths[columnClass]) {
                            const width = widths[columnClass];
                            header.style.width = `${width}px`;
                            
                            // 应用到表格单元格
                            applyWidthToColumn(columnClass, width);
                        }
                    }
                });
            } catch (error) {
                console.error('加载保存的列宽失败:', error);
            }
        }
    }
    
    // 将宽度应用到列的所有单元格
    function applyWidthToColumn(columnClass, width) {
        if (!columnClass || !width) return;
        
        const cells = table.querySelectorAll(`td.${columnClass}`);
        cells.forEach(cell => {
            cell.style.width = `${width}px`;
            
            // 确保固定列的背景色一致
            if (cell.classList.contains('sticky-left')) {
                // 在滚动或悬停时保持背景色一致
                cell.addEventListener('mouseenter', () => {
                    const tr = cell.closest('tr');
                    if (tr && tr.matches(':hover')) {
                        cell.style.backgroundColor = '#f3f4f6'; // 与悬停背景色相同
                    }
                });
                
                cell.addEventListener('mouseleave', () => {
                    if (!cell.closest('tr').matches(':hover')) {
                        cell.style.backgroundColor = '';
                    }
                });
            }
        });
    }
    
    // 为表格容器添加滚动事件，确保固定列背景色正确
    const tableContainer = table.closest('.table-container');
    if (tableContainer) {
        tableContainer.addEventListener('scroll', () => {
            // 获取所有固定列单元格
            const fixedCells = table.querySelectorAll('td.sticky-left');
            fixedCells.forEach(cell => {
                // 检查行是否处于悬停状态
                if (cell.closest('tr').matches(':hover')) {
                    cell.style.backgroundColor = '#f3f4f6'; // 悬停背景色
                } else {
                    cell.style.backgroundColor = ''; // 恢复默认背景色
                }
            });
        });
    }
    
    // 尝试加载保存的列宽
    loadColumnWidths();
    
    // 为每个表头添加鼠标事件
    headers.forEach(header => {
        // 跳过复选框列的宽度调整
        if (header.classList.contains('checkbox-column')) {
            return;
        }
        
        header.addEventListener('mousedown', function(e) {
            // 只有点击右边缘时才触发调整
            const headerRect = header.getBoundingClientRect();
            if (e.clientX - headerRect.left < headerRect.width - 5) {
                return;
            }
            
            isResizing = true;
            currentHeader = header;
            // 获取当前列的类名
            currentColumnClass = Array.from(header.classList).find(cls => cls.startsWith('column-'));
            startX = e.clientX;
            startWidth = header.offsetWidth;
            
            // 添加调整时的样式
            document.body.style.cursor = 'col-resize';
            header.classList.add('resizing');
            
            // 阻止默认行为和冒泡
            e.preventDefault();
            e.stopPropagation();
        });
    });
    
    // 添加全局鼠标移动和抬起事件
    document.addEventListener('mousemove', function(e) {
        if (!isResizing) return;
        
        const diffX = e.clientX - startX;
        const newWidth = Math.max(50, startWidth + diffX); // 最小宽度50px
        
        // 应用到表头
        currentHeader.style.width = `${newWidth}px`;
        
        // 应用到表格单元格
        if (currentColumnClass) {
            applyWidthToColumn(currentColumnClass, newWidth);
        }
        
        // 阻止默认行为
        e.preventDefault();
    });
    
    document.addEventListener('mouseup', function() {
        if (isResizing) {
            // 恢复正常状态
            document.body.style.cursor = '';
            if (currentHeader) {
                currentHeader.classList.remove('resizing');
                
                // 保存列宽
                saveColumnWidths();
            }
            
            isResizing = false;
            currentHeader = null;
            currentColumnClass = '';
        }
    });
}

// 设置视频项的事件处理
function setupVideoItemEvents() {
    // 创建右键菜单元素
    const contextMenu = document.createElement('div');
    contextMenu.className = 'video-context-menu';
    contextMenu.style.display = 'none';
    document.body.appendChild(contextMenu);
    
    // 当前右键点击的视频对象
    let currentVideo = null;
    
    // 关闭右键菜单
    function closeContextMenu() {
        contextMenu.style.display = 'none';
    }
    
    // 显示右键菜单
    function showContextMenu(x, y, video) {
        // 设置当前视频
        currentVideo = video;
        
        // 清空菜单内容
        contextMenu.innerHTML = '';
        
        // 添加菜单项
        const playItem = document.createElement('div');
        playItem.className = 'context-menu-item';
        playItem.innerHTML = '<i class="fas fa-play mr-2"></i>播放';
        playItem.addEventListener('click', function() {
            closeContextMenu();
            if (currentVideo) {
                playVideo(currentVideo.id);
            }
        });
        contextMenu.appendChild(playItem);
        
        // 添加快捷标签菜单项
        const quickTagsItem = document.createElement('div');
        quickTagsItem.className = 'context-menu-item has-submenu';
        quickTagsItem.innerHTML = '<i class="fas fa-tags mr-2"></i>快捷标签<i class="fas fa-chevron-right submenu-arrow"></i>';
        
        // 创建快捷标签子菜单
        const quickTagsSubmenu = document.createElement('div');
        quickTagsSubmenu.className = 'context-submenu';
        quickTagsItem.appendChild(quickTagsSubmenu);
        
        // 获取当前设置中的快捷标签
        let quickTags = [];
        window.electronAPI.getSettings().then(settings => {
            if (settings && settings.quickTags && Array.isArray(settings.quickTags)) {
                quickTags = settings.quickTags;
                
                // 如果没有快捷标签，显示提示
                if (quickTags.length === 0) {
                    const noTagsItem = document.createElement('div');
                    noTagsItem.className = 'context-menu-item disabled';
                    noTagsItem.textContent = '未设置快捷标签';
                    quickTagsSubmenu.appendChild(noTagsItem);
                } else {
                    // 添加每个快捷标签为子菜单项
                    quickTags.forEach(tag => {
                        const tagItem = document.createElement('div');
                        tagItem.className = 'context-menu-item';
                        tagItem.textContent = tag;
                        
                        // 点击标签时添加到视频
                        tagItem.addEventListener('click', function() {
                            closeContextMenu();
                            if (currentVideo) {
                                addTagToVideo(currentVideo.id, tag);
                            }
                        });
                        
                        quickTagsSubmenu.appendChild(tagItem);
                    });
                }
            } else {
                // 如果没有设置，显示提示
                const noTagsItem = document.createElement('div');
                noTagsItem.className = 'context-menu-item disabled';
                noTagsItem.textContent = '未设置快捷标签';
                quickTagsSubmenu.appendChild(noTagsItem);
            }
        }).catch(error => {
            console.error('获取快捷标签设置失败:', error);
            const errorItem = document.createElement('div');
            errorItem.className = 'context-menu-item disabled';
            errorItem.textContent = '加载标签失败';
            quickTagsSubmenu.appendChild(errorItem);
        });
        
        contextMenu.appendChild(quickTagsItem);
        
        const editItem = document.createElement('div');
        editItem.className = 'context-menu-item';
        editItem.innerHTML = '<i class="fas fa-info-circle mr-2"></i>查看详情';
        editItem.addEventListener('click', function() {
            closeContextMenu();
            if (currentVideo) {
                editVideo(currentVideo.id);
            }
        });
        contextMenu.appendChild(editItem);
        
        const folderItem = document.createElement('div');
        folderItem.className = 'context-menu-item';
        folderItem.innerHTML = '<i class="fas fa-folder-open mr-2"></i>打开源文件夹';
        folderItem.addEventListener('click', function() {
            closeContextMenu();
            if (currentVideo) {
                openSourceFolder(currentVideo.filePath);
            }
        });
        contextMenu.appendChild(folderItem);
        
        // 计算菜单位置（智能定位）
        contextMenu.style.display = 'block'; // 临时显示以获取宽度
        
        // 获取菜单实际尺寸
        const menuWidth = contextMenu.offsetWidth;
        const menuHeight = contextMenu.offsetHeight;
        
        // 获取窗口尺寸
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        
        // 计算右侧可用空间
        const rightSpace = windowWidth - x;
        
        // 判断是否应该显示在左侧
        const showOnLeft = rightSpace < menuWidth + 20; // 20px为安全边距
        
        if (showOnLeft) {
            // 显示在鼠标左侧
            contextMenu.style.left = `${x - menuWidth}px`;
            contextMenu.classList.add('left-position');
        } else {
            // 显示在鼠标右侧
            contextMenu.style.left = `${x}px`;
            contextMenu.classList.remove('left-position');
        }
        
        // 计算垂直位置，确保不超出视口底部
        let topPosition = y;
        if (y + menuHeight > windowHeight) {
            topPosition = windowHeight - menuHeight - 10; // 10px为安全底边距
        }
        contextMenu.style.top = `${topPosition}px`;
        
        // 为子菜单项添加智能定位逻辑
        quickTagsItem.addEventListener('mouseenter', function() {
            // 获取当前右键菜单的位置信息
            const menuRect = contextMenu.getBoundingClientRect();
            const submenuWidth = quickTagsSubmenu.offsetWidth;
            
            // 判断子菜单是否应该显示在左侧
            if (showOnLeft || menuRect.right + submenuWidth > windowWidth) {
                quickTagsSubmenu.classList.add('left-position');
            } else {
                quickTagsSubmenu.classList.remove('left-position');
            }
            
            // 确保子菜单垂直方向不超出窗口
            const submenuHeight = quickTagsSubmenu.offsetHeight;
            const spaceBelow = windowHeight - menuRect.top;
            
            if (submenuHeight > spaceBelow) {
                // 如果下方空间不足，向上偏移
                quickTagsSubmenu.style.top = `${Math.max(0, spaceBelow - submenuHeight)}px`;
            } else {
                quickTagsSubmenu.style.top = '0';
            }
        });
        
        contextMenu.style.display = 'block';
    }
    
    // 在文档上点击时关闭右键菜单
    document.addEventListener('click', function(e) {
        if (!contextMenu.contains(e.target)) {
            closeContextMenu();
        }
    });
    
    // 为动态生成的视频项添加事件
    document.addEventListener('click', function(event) {
        // 处理视频复选框点击
        if (event.target.classList.contains('video-checkbox')) {
            updateSelectedCount();
        }
    });
    
    // 处理表格行右键菜单
    document.addEventListener('contextmenu', function(event) {
        // 检查是否点击了表格行
        const tableRow = event.target.closest('#video-table tbody tr');
        if (tableRow && tableRow.dataset.videoId) {
            event.preventDefault();
            
            // 根据视频ID查找视频对象
            const videoId = tableRow.dataset.videoId;
            const video = videoData.find(v => v.id === videoId);
            if (video) {
                showContextMenu(event.pageX, event.pageY, video);
            }
        }
        
        // 检查是否点击了画廊视图卡片
        const videoCard = event.target.closest('.video-card');
        if (videoCard && videoCard.dataset.videoId) {
            event.preventDefault();
            
            // 根据视频ID查找视频对象
            const videoId = videoCard.dataset.videoId;
            const video = videoData.find(v => v.id === videoId);
            if (video) {
                showContextMenu(event.pageX, event.pageY, video);
            }
        }
    });
    
    // 处理表格行双击播放视频
    document.addEventListener('dblclick', function(event) {
        // 检查是否点击了表格行
        const tableRow = event.target.closest('#video-table tbody tr');
        if (tableRow && tableRow.dataset.videoId && !event.target.closest('.checkbox-cell')) {
            const videoId = tableRow.dataset.videoId;
            const video = videoData.find(v => v.id === videoId);
            if (video) {
                playVideo(videoId);
            }
        }
        
        // 检查是否点击了画廊视图卡片
        const videoCard = event.target.closest('.video-card');
        if (videoCard && videoCard.dataset.videoId) {
            const videoId = videoCard.dataset.videoId;
            playVideo(videoId);
        }
    });
}

// 打开视频所在文件夹
async function openSourceFolder(filePath) {
    if (!filePath) {
        console.error('无法打开文件夹: 文件路径为空');
        return;
    }
    
    try {
        console.log(`打开文件夹: ${filePath}`);
        await window.electronAPI.openSourceFolder(filePath);
    } catch (error) {
        console.error('打开文件夹失败:', error);
        alert('无法打开文件夹，请确认文件存在且有访问权限');
    }
}

// 处理视频操作
function handleVideoAction(videoId, action) {
    const video = videoData.find(v => v.id === videoId);
    if (!video) return;
    
    switch (action) {
        case 'play':
            playVideo(videoId);
            break;
        case 'edit':
            editVideo(videoId);
            break;
        case 'delete':
            deleteVideo(videoId);
            break;
        case 'rate':
            rateVideo(videoId);
            break;
        default:
            console.log(`未知操作: ${action}`);
    }
}

// 播放视频
async function playVideo(videoId) {
    console.log(`播放视频: ${videoId}`);
    const video = videoData.find(v => v.id === videoId || v.filePath === videoId);
    if (!video || !video.filePath) {
        console.error('无法播放视频: 找不到视频或文件路径');
        return;
    }
    
    try {
        // 先进行文件存在性检查
        const { checkVideoFileExists } = await import('./utils.js');
        const { exists, tagUpdated } = await checkVideoFileExists(video);
        
        if (!exists) {
            // 文件不存在，使用自定义提示
            const { showCustomAlert } = await import('./areaC.js');
            showCustomAlert(`无法播放视频"${video.fileName}"，文件不存在或已被移动。`, 'error');
            
            // 如果标签已更新，触发数据变化事件
            if (tagUpdated) {
                document.dispatchEvent(new CustomEvent('videoDataChanged', {
                    detail: { video, action: 'update' }
                }));
            }
            return;
        }
        
        // 文件存在，播放视频
        const result = await window.electronAPI.openVideo(video.filePath);
        
        if (!result.success) {
            // 播放失败
            const { showCustomAlert } = await import('./areaC.js');
            showCustomAlert(`播放视频"${video.fileName}"失败。`, 'error');
            return;
        }
        
        // 更新本地数据的观看次数和最后观看时间
        // 注意: 实际的数据更新会在主进程中通过数据库完成
        // 这里只是更新UI显示
        video.viewCount = (video.viewCount || 0) + 1;
        video.lastViewDate = new Date().toISOString();
        
        // 如果标签被更新，或者视频被成功播放，重新渲染视图
        if (tagUpdated || result.success) {
            const { renderTableView, renderGridView } = await import('./videoData.js');
            renderTableView();
            renderGridView();
        }
    } catch (error) {
        console.error('播放视频失败:', error);
        import('./areaC.js').then(module => {
            if (typeof module.showCustomAlert === 'function') {
                module.showCustomAlert('播放视频时发生错误，请查看控制台了解详情。', 'error');
            }
        });
    }
}

// 编辑视频
async function editVideo(videoId) {
    console.log(`查看视频详情: ${videoId}`);
    const video = videoData.find(v => v.id === videoId);
    if (!video) return;
    
    try {
        // 导入areaF.js中的openDetailDrawer函数并调用
        const module = await import('./areaF.js');
        if (typeof module.openDetailDrawer === 'function') {
            await module.openDetailDrawer(videoId);
        } else {
            console.error('无法打开详情抽屉: openDetailDrawer函数不存在');
        }
    } catch (error) {
        console.error('导入areaF.js或打开详情抽屉失败:', error);
    }
}

// 删除视频
async function deleteVideo(videoId) {
    console.log(`删除视频: ${videoId}`);
    const video = videoData.find(v => v.id === videoId);
    if (!video) return;
    
    // TODO: 显示确认对话框
    const confirmDelete = confirm(`确定要删除视频 "${video.fileName}" 吗？`);
    if (!confirmDelete) return;
    
    try {
        // 从数据库中删除
        await window.electronAPI.deleteVideo(videoId);
        
        // 删除对应的缩略图
        if (video.thumbnailUrl && isValidThumbnailUrl(video.thumbnailUrl)) {
            await window.electronAPI.deleteThumbnail(video.thumbnailUrl);
        }
        
        // 从本地数据中删除
        const index = videoData.findIndex(v => v.id === videoId);
        if (index !== -1) {
            videoData.splice(index, 1);
        }
        
        // 重新渲染视图
        renderTableView();
        renderGridView();
        updateSelectedCount();
        
        // 触发数据变化事件
        document.dispatchEvent(new CustomEvent('videoDataChanged', {
            detail: { video, action: 'delete' }
        }));
    } catch (error) {
        console.error('删除视频失败:', error);
    }
}

// 评分视频
async function rateVideo(videoId) {
    console.log(`评分视频: ${videoId}`);
    const video = videoData.find(v => v.id === videoId);
    if (!video) return;
    
    // 简单的评分对话框
    const rating = prompt(`为视频 "${video.fileName}" 评分 (1-5):`, video.rating || '0');
    if (rating === null) return; // 用户取消
    
    // 验证评分
    const ratingNum = parseFloat(rating);
    if (isNaN(ratingNum) || ratingNum < 0 || ratingNum > 5) {
        alert('请输入0-5之间的评分');
        return;
    }
    
    // 更新评分
    video.rating = ratingNum;
    
    try {
        // 将更新同步到数据库
        await window.electronAPI.updateVideoInfo(video);
        
        // 重新渲染视图
        renderTableView();
        renderGridView();
        
        // 触发数据变化事件
        document.dispatchEvent(new CustomEvent('videoDataChanged', {
            detail: { video, action: 'update' }
        }));
    } catch (error) {
        console.error('更新视频评分失败:', error);
    }
}

// 渲染表格行函数
function renderTableRow(video) {
    // ... existing code ...
    
    // 在文件创建时间后添加导入时间
    const createDateCell = cells.find(cell => cell.className.includes('createdate-cell'));
    if (createDateCell) {
        const importDateCell = document.createElement('td');
        importDateCell.className = 'importdate-cell';
        importDateCell.textContent = video.importDate || '未知';
        
        // 在文件创建时间后插入导入时间
        const insertAfterIndex = Array.from(row.children).indexOf(createDateCell);
        if (insertAfterIndex !== -1 && insertAfterIndex + 1 < row.children.length) {
            row.insertBefore(importDateCell, row.children[insertAfterIndex + 1]);
        } else {
            row.appendChild(importDateCell);
        }
    }
    
    // ... existing code ...
}

// 添加标签到视频
async function addTagToVideo(videoId, tagToAdd) {
    // 查找视频
    const videoIndex = videoData.findIndex(v => v.id === videoId);
    if (videoIndex === -1) {
        console.error(`找不到视频: ${videoId}`);
        return;
    }
    
    const video = videoData[videoIndex];
    
    // 解析当前标签
    const currentTags = video.collection ? 
        video.collection.split(',').map(tag => tag.trim()).filter(Boolean) : [];
    
    // 检查标签是否已存在
    if (currentTags.includes(tagToAdd)) {
        console.log(`视频已有标签: ${tagToAdd}`);
        
        // 显示提示
        import('./areaC.js').then(module => {
            if (typeof module.showCustomAlert === 'function') {
                module.showCustomAlert(`${video.fileName} 已存在标签 "${tagToAdd}" `, 'info');
            }
        });
        
        return;
    }
    
    // 添加新标签
    currentTags.push(tagToAdd);
    
    // 更新视频对象
    const updatedVideo = {
        ...video,
        collection: currentTags.join(',')
    };
    
    try {
        // 保存到数据库
        await window.electronAPI.updateVideo(updatedVideo);
        
        // 更新本地数据
        videoData[videoIndex] = updatedVideo;

        // 触发数据变化事件，通知其他模块数据已更新
        document.dispatchEvent(new CustomEvent('videoDataChanged', {
            detail: { video: updatedVideo, action: 'update' }
        }));

        // 直接使用导入的videoData.js模块中的函数，避免循环依赖问题
        const { renderTableView, renderGridView } = await import('./videoData.js');
        
        // 手动调用两个渲染函数，确保两个视图都更新
        renderTableView();
        renderGridView();
        
        console.log(`已添加标签 "${tagToAdd}" 到视频: ${video.fileName}`);
    } catch (error) {
        console.error(`添加标签失败:`, error);
        
        // 显示错误提示
        import('./areaC.js').then(module => {
            if (typeof module.showCustomAlert === 'function') {
                module.showCustomAlert(`添加标签失败: ${error.message}`, 'error');
            }
        });
    }
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

// 导出函数供主模块使用
export {
    toggleView,
    initVideoList,
    setupVideoItemEvents,
    openSourceFolder,
    playVideo,
    editVideo,
    addTagToVideo
};