/**
 * 区域F: 详情抽屉
 * 负责处理视频详情抽屉的展示和交互，包括查看视图(F-1)和编辑视图(F-2)
 */

// 获取全局视频数据的引用以及渲染函数
import { videoData, renderTableView, renderGridView, renderCurrentView, onVideoDataChanged } from './videoData.js';
// 导入多选下拉组件
import { initMultiSelect } from './multiselect.js';
import { syncDataFromEnum, refreshFilterBubbles } from './multiSelectData.js';

// 当前选中的视频ID
let currentVideoId = null;
// 当前临时评分值
let currentRating = 0;
// 原始预览图URL，用于取消更改时还原
let originalThumbnailUrl = '';
// 当前临时预览图URL
let currentThumbnailUrl = '';
// 编辑模式下的临时预览图URL，用于编辑过程中
let editingThumbnailUrl = '';
// 保存编辑过程中上传的所有预览图URL
let uploadedThumbnailUrls = [];
// 当前视图模式: 'view' 或 'edit'
let currentViewMode = 'view';
// 多选下拉组件实例
let collectionSelect = null;
let actorsSelect = null;

/**
 * 初始化详情抽屉
 */
async function initDetailDrawer() {
    console.log('初始化详情抽屉');
    
    // 创建背景遮罩
    if (!document.querySelector('.drawer-backdrop')) {
        const backdrop = document.createElement('div');
        backdrop.className = 'drawer-backdrop';
        document.body.appendChild(backdrop);
    }
    
    // 初始化多选下拉组件
    try {
        collectionSelect = await initMultiSelect('collection', 'collection', '搜索或添加新标签...');
        console.log('初始化标签多选组件成功');
        
        actorsSelect = await initMultiSelect('actors', 'actors', '搜索或添加新演员...');
        console.log('初始化演员多选组件成功');
    } catch (error) {
        console.error('初始化多选组件失败:', error);
    }
    
    // 获取DOM元素
    const detailDrawer = document.getElementById('detail-drawer');
    const backdrop = document.querySelector('.drawer-backdrop');
    const viewEditBtn = document.getElementById('view-edit-btn');
    const saveBtn = document.getElementById('save-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const playVideoBtn = document.getElementById('play-video-btn');
    const changePreviewBtnEdit = document.getElementById('change-preview-btn-edit');
    const ratingStars = document.querySelectorAll('#detail-rating i');
    
    // 点击背景遮罩关闭抽屉，仅在非编辑模式下生效
    backdrop.addEventListener('click', (e) => {
        // 仅在非编辑模式下点击遮罩关闭抽屉
        if (currentViewMode !== 'edit') {
            closeDetailDrawer();
        }
    });
    
    // 查看视图的编辑按钮事件
    viewEditBtn.addEventListener('click', () => switchViewMode('edit'));
    
    // 初始化编辑视图的取消按钮事件
    setupCancelEditButton();
    
    // 编辑视图的保存按钮事件
    saveBtn.addEventListener('click', saveVideoDetails);
    
    // 播放视频按钮事件
    playVideoBtn.addEventListener('click', () => {
        if (currentVideoId) {
            playVideo(currentVideoId);
        }
    });
    
    // 标题重新解析按钮事件
    const reparseBtn = document.getElementById('reparse-title-btn');
    if (reparseBtn) {
        reparseBtn.addEventListener('click', async function() {
            if (!currentVideoId) return;
            
            // 获取当前编辑的视频
            const videoIndex = videoData.findIndex(v => v.id === currentVideoId);
            if (videoIndex === -1) return;
            
            const video = videoData[videoIndex];
            const fileName = video.fileName;
            
            try {
                // 获取设置中的标题解析正则表达式
                const settings = await window.electronAPI.getSettings();
                
                if (settings && settings.import && settings.import.titleRegex) {
                    // 导入解析函数
                    const { parseTitleFromFilename } = await import('./utils.js');
                    
                    // 解析标题
                    const parsedTitle = parseTitleFromFilename(fileName, settings.import.titleRegex);
                    
                    if (parsedTitle) {
                        // 更新表单中的标题
                        document.getElementById('detail-code').value = parsedTitle;
                        console.log(`成功解析标题: ${parsedTitle}`);
                        
                        // 显示成功提示
                        import('./areaC.js').then(module => {
                            if (typeof module.showCustomAlert === 'function') {
                                module.showCustomAlert('标题已成功解析', 'success');
                            }
                        });
                    } else {
                        // 解析失败，提示用户
                        console.log('无法使用当前正则表达式解析该标题');
                        import('./areaC.js').then(module => {
                            if (typeof module.showCustomAlert === 'function') {
                                module.showCustomAlert('无法使用当前正则表达式解析该标题，请检查标题规则设置', 'warning');
                            }
                        });
                    }
                } else {
                    // 未设置正则表达式，提示用户
                    console.log('未设置标题解析正则表达式');
                    import('./areaC.js').then(module => {
                        if (typeof module.showCustomAlert === 'function') {
                            module.showCustomAlert('未设置标题解析正则表达式，请先在设置中配置', 'info');
                        }
                    });
                }
            } catch (error) {
                console.error('重新解析标题时出错:', error);
                import('./areaC.js').then(module => {
                    if (typeof module.showCustomAlert === 'function') {
                        module.showCustomAlert('解析标题时出错: ' + error.message, 'error');
                    }
                });
            }
        });
    }
    
    // 上映日期整个输入框的点击事件
    const dateInputGroup = document.querySelector('.date-input-group');
    if (dateInputGroup) {
        dateInputGroup.addEventListener('click', function() {
            // 触发日期输入框点击，打开日期选择器
            const dateInput = document.getElementById('detail-releasedate');
            if (dateInput) {
                // 移除pointer-events: none以允许点击
                dateInput.style.pointerEvents = 'auto';
                dateInput.showPicker ? dateInput.showPicker() : dateInput.click();
                // 点击后恢复pointer-events: none
                setTimeout(() => {
                    dateInput.style.pointerEvents = 'none';
                }, 100);
            }
        });
    }
    
    // 评分星星交互
    ratingStars.forEach(star => {
        // 鼠标悬停事件
        star.addEventListener('mouseenter', function() {
            const value = parseInt(this.dataset.value);
            highlightStars(value);
        });
        
        // 鼠标离开事件
        star.addEventListener('mouseleave', function() {
            if (currentRating > 0) {
                setRatingValue(currentRating);
            } else {
                resetStarsToValue();
            }
        });
        
        // 点击事件
        star.addEventListener('click', function() {
            const value = parseInt(this.dataset.value);
            currentRating = value;
            setRatingValue(currentRating);
        });
    });
    
    // 更换预览图按钮事件（编辑模式）
    changePreviewBtnEdit.addEventListener('click', changePreviewImage);
    
    // 重新生成预览图按钮事件（编辑模式）
    const regeneratePreviewBtnEdit = document.getElementById('regenerate-preview-btn-edit');
    if (regeneratePreviewBtnEdit) {
        regeneratePreviewBtnEdit.addEventListener('click', regeneratePreviewImage);
    }
    
    // 为表格行和画廊卡片添加详情查看事件
    setupDetailViewEvents();
}

/**
 * 设置表格行和画廊卡片的详情查看事件
 */
function setupDetailViewEvents() {
    // 移除双击事件监听器，双击只用于播放视频
    // 详情查看仅通过右键菜单中的"查看详情"触发
    
    // 添加右键菜单中的"查看详情"事件 - 由其他模块调用openDetailDrawer
}

/**
 * 切换视图模式
 * @param {string} mode - 'view' 或 'edit'
 */
function switchViewMode(mode) {
    const viewMode = document.getElementById('detail-view-mode');
    const editMode = document.getElementById('detail-edit-mode');
    const viewFooterActions = document.getElementById('view-footer-actions');
    const editFooterActions = document.getElementById('edit-footer-actions');
    const backdrop = document.querySelector('.drawer-backdrop');
    
    if (mode === 'edit') {
        // 切换到编辑视图
        viewMode.classList.remove('active');
        editMode.classList.add('active');
        
        // 切换底部按钮
        viewFooterActions.style.display = 'none';
        editFooterActions.style.display = 'flex';
        
        // 清除文件名编辑的错误状态
        const filenameInput = document.getElementById('edit-filename');
        const filenameError = document.getElementById('filename-error');
        if (filenameInput) {
            filenameInput.classList.remove('error');
        }
        if (filenameError) {
            filenameError.classList.remove('show');
            filenameError.textContent = '';
        }
        
        // 保存当前预览图URL作为编辑开始时的状态
        editingThumbnailUrl = currentThumbnailUrl;
        
        // 清空上传的预览图URL数组
        uploadedThumbnailUrls = [];
        
        // 添加编辑模式的类名到背景遮罩
        backdrop.classList.add('editing');
        
        currentViewMode = 'edit';
    } else {
        // 切换到查看视图
        editMode.classList.remove('active');
        viewMode.classList.add('active');
        
        // 切换底部按钮
        editFooterActions.style.display = 'none';
        viewFooterActions.style.display = 'flex';
        
        // 清除文件名编辑的错误状态并重置输入框
        const filenameInput = document.getElementById('edit-filename');
        const filenameError = document.getElementById('filename-error');
        if (filenameInput) {
            filenameInput.classList.remove('error');
        }
        if (filenameError) {
            filenameError.classList.remove('show');
            filenameError.textContent = '';
        }
        
        // 移除编辑模式的类名
        backdrop.classList.remove('editing');
        
        currentViewMode = 'view';
        
        // 如果有未保存的修改，重新从数据中加载
        if (currentVideoId) {
            const video = videoData.find(v => v.id === currentVideoId);
            if (video) {
                updateViewModeContent(video);
                // 重新初始化文件名编辑，恢复原始值
                initFileNameEdit(video);
            }
        }
    }
}

/**
 * 打开详情抽屉
 * @param {string} videoId - 视频ID
 * @param {string} defaultMode - 默认模式：'view' 或 'edit'，默认为 'view'
 */
async function openDetailDrawer(videoId, defaultMode = 'view') {
    console.log('打开详情抽屉, 视频ID:', videoId, '默认模式:', defaultMode);
    
    // 获取视频数据
    const video = videoData.find(v => v.id === videoId);
    if (!video) {
        console.error('找不到视频:', videoId);
        return;
    }
    
    // 保存当前视频ID
    currentVideoId = videoId;
    
    // 重置当前评分值
    currentRating = video.rating || 0;
    
    // 保存原始预览图URL
    originalThumbnailUrl = video.thumbnailUrl || '';
    currentThumbnailUrl = originalThumbnailUrl;
    editingThumbnailUrl = originalThumbnailUrl;
    
    // 重置上传的预览图数组
    uploadedThumbnailUrls = [];
    
    // 设置预览图（查看模式）
    const previewImgUrl = currentThumbnailUrl ? 
        currentThumbnailUrl : 'https://via.placeholder.com/500x280?text=No+Preview';
    document.getElementById('detail-preview').style.backgroundImage = `url("${previewImgUrl}")`;
    
    // 设置预览图（编辑模式）
    document.getElementById('detail-preview-edit').style.backgroundImage = `url("${previewImgUrl}")`;
    
    // 根据参数切换到指定视图
    switchViewMode(defaultMode);
    
    // 更新查看视图内容
    updateViewModeContent(video);
    
    // 确保多选组件已初始化，如果没有则重新初始化
    if (!collectionSelect) {
        try {
            collectionSelect = await initMultiSelect('collection', 'collection', '搜索或添加新标签...');
            console.log('重新初始化标签多选组件成功');
        } catch (error) {
            console.error('重新初始化标签多选组件失败:', error);
        }
    }
    
    if (!actorsSelect) {
        try {
            actorsSelect = await initMultiSelect('actors', 'actors', '搜索或添加新演员...');
            console.log('重新初始化演员多选组件成功');
        } catch (error) {
            console.error('重新初始化演员多选组件失败:', error);
        }
    }
    
    // 在填充表单之前强制刷新标签和演员数据
    try {
        const { syncDataFromEnum } = await import('./multiSelectData.js');
        await syncDataFromEnum(true);
        
        // 手动触发组件刷新
        if (collectionSelect || actorsSelect) {
            const collectionsData = await window.electronAPI.getEnumValues('collection');
            const actorsData = await window.electronAPI.getEnumValues('actors');
            
            console.log('打开详情抽屉时刷新枚举数据: 标签=', collectionsData.length, '演员=', actorsData.length);
            
            // 手动触发一次更新事件
            const event = new CustomEvent('multiselect-datasource-updated', {
                detail: {
                    collections: collectionsData,
                    actors: actorsData,
                    timestamp: Date.now()
                }
            });
            document.dispatchEvent(event);
        }
    } catch (error) {
        console.error('刷新枚举数据失败:', error);
    }
    
    // 填充编辑表单
    document.getElementById('detail-code').value = video.code || '';
    
    // 使用多选组件设置标签值
    if (collectionSelect) {
        collectionSelect.setValue(video.collection || '');
        console.log('设置标签值:', video.collection);
    }
    
    // 使用多选组件设置演员值
    if (actorsSelect) {
        actorsSelect.setValue(video.actors || '');
        console.log('设置演员值:', video.actors);
    }
    
    document.getElementById('detail-notes').value = video.notes || '';
    
    if (video.releaseDate) {
        document.getElementById('detail-releasedate').value = video.releaseDate;
    } else {
        document.getElementById('detail-releasedate').value = '';
    }
    
    // 设置星级评分
    setRatingValue(currentRating);
    
    // 显示抽屉和背景遮罩
    document.getElementById('detail-drawer').classList.add('open');
    const backdrop = document.querySelector('.drawer-backdrop');
    backdrop.classList.add('visible');
    
    // 确保不是编辑模式遮罩样式
    if (currentViewMode !== 'edit') {
        backdrop.classList.remove('editing');
    }
}

/**
 * 更新查看视图的内容
 * @param {Object} video - 视频对象
 */
function updateViewModeContent(video) {
    // 更新基本信息
    setTextContent('view-code', video.code);
    setTextContent('view-collection', video.collection);
    setTextContent('view-actors', video.actors);
    setTextContent('view-notes', video.notes);
    
    // 格式化上映时间 - 精确到天
    const releaseDate = video.releaseDate ? formatDateOnly(video.releaseDate) : '';
    setTextContent('view-releasedate', releaseDate);
    
    // 更新文件信息
    setTextContent('view-filename', video.fileName);
    setTextContent('view-filepath', video.filePath);
    setTextContent('view-filesize', video.fileSize);
    setTextContent('view-duration', video.duration);
    setTextContent('view-resolution', video.resolution);
    
    // 格式化时间 - 精确到秒
    const createDate = video.createDate ? formatDateWithTime(video.createDate) : '';
    const importDate = video.importDate ? formatDateWithTime(video.importDate) : '';
    setTextContent('view-createdate', createDate);
    setTextContent('view-importdate', importDate);
    
    // 更新观看统计
    setTextContent('view-viewcount', video.viewCount || '0');
    
    // 格式化最后观看时间 - 精确到秒
    const lastViewDate = video.lastViewDate ? formatDateWithTime(video.lastViewDate) : '从未观看';
    setTextContent('view-lastview', lastViewDate);
    
    // 同时更新编辑模式下的只读信息
    setTextContent('edit-view-filename', video.fileName);
    setTextContent('edit-view-filepath', video.filePath);
    setTextContent('edit-view-filesize', video.fileSize);
    setTextContent('edit-view-duration', video.duration);
    setTextContent('edit-view-resolution', video.resolution);
    setTextContent('edit-view-createdate', createDate);
    setTextContent('edit-view-importdate', importDate);
    setTextContent('edit-view-viewcount', video.viewCount || '0');
    setTextContent('edit-view-lastview', lastViewDate);
    
    // 初始化文件名编辑功能
    initFileNameEdit(video);
    
    // 更新评分星星
    updateViewRating(video.rating || 0);
}

/**
 * 格式化日期，只显示年月日
 * @param {string} dateString - 日期字符串
 * @returns {string} 格式化后的日期
 */
function formatDateOnly(dateString) {
    if (!dateString) return '';
    
    try {
        const date = new Date(dateString);
        return date.toISOString().split('T')[0]; // YYYY-MM-DD
    } catch (error) {
        console.error('日期格式化错误:', error);
        return dateString;
    }
}

/**
 * 格式化日期，精确到秒
 * @param {string} dateString - 日期字符串
 * @returns {string} 格式化后的日期和时间
 */
function formatDateWithTime(dateString) {
    if (!dateString) return '';
    
    try {
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    } catch (error) {
        console.error('日期格式化错误:', error);
        return dateString;
    }
}

/**
 * 设置文本内容，如果为空则显示占位符
 * @param {string} elementId - 元素ID
 * @param {string} content - 内容
 */
function setTextContent(elementId, content) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    if (content) {
        element.textContent = content;
        element.classList.remove('empty');
    } else {
        element.textContent = '-';
        element.classList.add('empty');
    }
}

/**
 * 更新查看视图中的评分星星
 * @param {number} rating - 评分值(0-5)
 */
function updateViewRating(rating) {
    const ratingContainer = document.getElementById('view-rating');
    if (!ratingContainer) return;
    
    // 清空现有内容
    ratingContainer.innerHTML = '';
    
    // 创建星星
    for (let i = 0; i < 5; i++) {
        const star = document.createElement('i');
        
        // 整星
        if (i < Math.floor(rating)) {
            star.className = 'fas fa-star';
        }
        // 半星
        else if (i === Math.floor(rating) && rating % 1 !== 0) {
            star.className = 'fas fa-star-half-alt';
        }
        // 空星
        else {
            star.className = 'far fa-star';
        }
        
        ratingContainer.appendChild(star);
    }
}

/**
 * 关闭详情抽屉
 */
function closeDetailDrawer() {
    document.getElementById('detail-drawer').classList.remove('open');
    
    const backdrop = document.querySelector('.drawer-backdrop');
    backdrop.classList.remove('visible');
    backdrop.classList.remove('editing');
    
    // 删除所有未使用的上传预览图
    cleanupUnusedThumbnails();
    
    // 清空当前视频ID、评分和预览图
    currentVideoId = null;
    currentRating = 0;
    originalThumbnailUrl = '';
    currentThumbnailUrl = '';
    editingThumbnailUrl = '';
    uploadedThumbnailUrls = [];
    
    // 重置抽屉内容
    document.getElementById('detail-preview').style.backgroundImage = '';
    document.getElementById('detail-code').value = '';
    
    // 清理多选组件的值，但不销毁组件
    if (collectionSelect) {
        collectionSelect.setValue('');
    }
    if (actorsSelect) {
        actorsSelect.setValue('');
    }
    
    document.getElementById('detail-releasedate').value = '';
    document.getElementById('detail-notes').value = '';
    resetStarsToValue();
}

/**
 * 清理未使用的预览图
 */
async function cleanupUnusedThumbnails() {
    try {
        // 如果有上传的预览图但未被保存使用，删除它们
        for (const thumbnailUrl of uploadedThumbnailUrls) {
            // 如果不是当前使用的预览图，则删除
            if (thumbnailUrl !== currentThumbnailUrl) {
                console.log(`删除未使用的预览图: ${thumbnailUrl}`);
                await window.electronAPI.deleteThumbnail(thumbnailUrl);
            }
        }
        // 清空上传列表
        uploadedThumbnailUrls = [];
    } catch (error) {
        console.error('清理未使用预览图失败:', error);
    }
}

/**
 * 更换预览图
 */
async function changePreviewImage() {
    try {
        // 保存旧的预览图URL，方便在取消编辑时恢复
        const oldThumbnailUrl = editingThumbnailUrl;
        
        // 调用主进程的文件选择对话框
        const result = await window.electronAPI.selectFile({
            title: '选择新的预览图',
            defaultPath: '',
            filters: [
                { name: '图片文件', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }
            ],
            properties: ['openFile']
        });
        
        // 如果用户选择了文件
        if (result && result.filePaths && result.filePaths.length > 0) {
            const filePath = result.filePaths[0];
            console.log('选中的图片路径:', filePath);
            
            try {
                // 生成唯一文件名
                const timestamp = new Date().getTime();
                const randomStr = Math.random().toString(36).substring(2, 8);
                const newFileName = `thumbnail_${timestamp}_${randomStr}.jpg`;
                
                // 复制图片到应用的缩略图目录 (使用主进程复制文件)
                const thumbnailPath = await window.electronAPI.copyImageToThumbnails(filePath, newFileName);
                console.log('复制后的缩略图路径:', thumbnailPath);
                
                // 添加到上传预览图列表
                uploadedThumbnailUrls.push(thumbnailPath);
                
                // 更新当前编辑中的预览图URL (使用相对路径)
                editingThumbnailUrl = thumbnailPath;
                
                // 设置编辑模式下的预览图
                document.getElementById('detail-preview-edit').style.backgroundImage = `url("${thumbnailPath}")`;
                
                // 重新设置取消编辑按钮事件
                setupCancelEditButton();
            } catch (copyError) {
                console.error('复制图片失败:', copyError);
                alert('无法复制选中的图片，请重试或选择其他图片');
            }
        }
    } catch (error) {
        console.error('选择预览图失败:', error);
        alert('选择预览图失败: ' + error.message);
    }
}

/**
 * 重新生成预览图
 */
async function regeneratePreviewImage() {
    if (!currentVideoId) {
        console.error('没有选中的视频');
        return;
    }
    
    const video = videoData.find(v => v.id === currentVideoId);
    if (!video || !video.filePath) {
        console.error('无法找到视频或视频文件路径');
        return;
    }
    
    const regenerateBtn = document.getElementById('regenerate-preview-btn-edit');
    if (!regenerateBtn) return;
    
    try {
        // 显示加载状态
        regenerateBtn.classList.add('loading');
        regenerateBtn.disabled = true;
        
        console.log('开始重新生成预览图:', video.filePath);
        
        // 调用主进程重新生成缩略图
        const result = await window.electronAPI.regenerateThumbnail(video.filePath, video.id);
        
        if (result.success) {
            console.log('重新生成预览图成功:', result.thumbnailUrl);
            
            // 添加到上传预览图列表
            uploadedThumbnailUrls.push(result.thumbnailUrl);
            
            // 更新当前编辑中的预览图URL
            editingThumbnailUrl = result.thumbnailUrl;
            
            // 更新编辑模式下的预览图显示
            document.getElementById('detail-preview-edit').style.backgroundImage = `url("${result.thumbnailUrl}")`;
            
            // 显示成功提示
            const { showCustomAlert } = await import('./areaC.js');
            // showCustomAlert('预览图重新生成成功', 'success');
            
            // 重新设置取消编辑按钮事件
            setupCancelEditButton();
        } else {
            console.error('重新生成预览图失败:', result.error);
            
            // 显示错误提示
            const { showCustomAlert } = await import('./areaC.js');
            showCustomAlert('重新生成预览图失败: ' + (result.error || '未知错误'), 'error');
        }
    } catch (error) {
        console.error('重新生成预览图过程中出错:', error);
        
        // 显示错误提示
        const { showCustomAlert } = await import('./areaC.js');
        showCustomAlert('重新生成预览图失败: ' + error.message, 'error');
    } finally {
        // 恢复按钮状态
        regenerateBtn.classList.remove('loading');
        regenerateBtn.disabled = false;
    }
}

/**
 * 设置取消编辑按钮的事件处理
 */
function setupCancelEditButton() {
    const cancelBtn = document.getElementById('cancel-edit-btn');
    if (!cancelBtn) return;
    
    // 移除之前的事件监听器，避免重复添加
    const newCancelBtn = cancelBtn.cloneNode(true);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
    
    // 添加新的事件监听器
    newCancelBtn.addEventListener('click', () => {
        // 清理所有上传但未使用的预览图
        cleanupUnusedThumbnails();
        
        // 恢复预览图到原始状态
        restoreOriginalImage();
        
        // 切换回查看模式
        switchViewMode('view');
    });
}

/**
 * 恢复原始预览图
 */
function restoreOriginalImage() {
    const previewImgUrl = originalThumbnailUrl ? 
        originalThumbnailUrl : 'https://via.placeholder.com/500x280?text=No+Preview';
    
    // 恢复编辑模式下的预览图
    document.getElementById('detail-preview-edit').style.backgroundImage = `url("${previewImgUrl}")`;
    
    // 重置编辑中的预览图URL为原始值
    editingThumbnailUrl = originalThumbnailUrl;
    
    console.log('已恢复到原图:', originalThumbnailUrl);
    
    // 移除恢复按钮
    const restoreBtn = document.getElementById('restore-preview-btn');
    if (restoreBtn) {
        restoreBtn.remove();
    }
}

/**
 * 高亮显示星星
 * @param {number} count - 星星数量
 */
function highlightStars(count) {
    const stars = document.querySelectorAll('#detail-rating i');
    
    stars.forEach((star, index) => {
        const value = index + 1;
        
        // 如果是整数评分
        if (value <= count) {
            star.className = 'fas fa-star hovered';
        } else {
            star.className = 'far fa-star';
        }
    });
}

/**
 * 根据当前评分值重置星星显示
 */
function resetStarsToValue() {
    if (!currentVideoId) {
        // 如果没有选中视频，清空星星
        const stars = document.querySelectorAll('#detail-rating i');
        stars.forEach(star => {
            star.className = 'far fa-star';
        });
        return;
    }
    
    const video = videoData.find(v => v.id === currentVideoId);
    if (!video) return;
    
    setRatingValue(video.rating || 0);
}

/**
 * 设置评分值并更新星星显示
 * @param {number} value - 评分值(0-5)
 */
function setRatingValue(value) {
    const stars = document.querySelectorAll('#detail-rating i');
    
    stars.forEach((star, index) => {
        const starValue = index + 1;
        
        // 整星
        if (starValue <= Math.floor(value)) {
            star.className = 'fas fa-star';
        }
        // 半星
        else if (starValue === Math.ceil(value) && value % 1 !== 0) {
            star.className = 'fas fa-star-half-alt';
        }
        // 空星
        else {
            star.className = 'far fa-star';
        }
    });
}

/**
 * 播放视频
 */
async function playVideo(videoId) {
    console.log(`播放视频: ${videoId}`);
    const video = videoData.find(v => v.id === videoId);
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
        video.viewCount = (video.viewCount || 0) + 1;
        video.lastViewDate = new Date().toISOString();
        
        // 更新数据库
        await window.electronAPI.updateVideo(video);
        
        // 如果抽屉打开且显示的是当前视频，更新查看视图
        if (currentVideoId === videoId) {
            // 更新观看统计信息
            const formattedLastView = formatDateWithTime(video.lastViewDate);
            setTextContent('view-viewcount', video.viewCount);
            setTextContent('view-lastview', formattedLastView);
            
            // 同时更新编辑模式下的只读信息
            setTextContent('edit-view-viewcount', video.viewCount);
            setTextContent('edit-view-lastview', formattedLastView);
        }
        
        // 如果标签被更新，或者视频被成功播放，重新渲染视图
        if (tagUpdated || result.success) {
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

/**
 * 保存视频详情
 */
async function saveVideoDetails() {
    console.log('开始保存视频详情');
    
    // 检查表单是否有错误
    const filenameInput = document.getElementById('edit-filename');
    const filenameError = document.getElementById('filename-error');
    
    if (filenameInput && (filenameInput.classList.contains('error') || filenameError.classList.contains('show'))) {
        showMessage('请先修正文件名错误', 'error');
        return;
    }
    
    const saveBtn = document.getElementById('save-btn');
    const originalText = saveBtn.innerHTML;
    
    if (!currentVideoId) {
        console.error('没有选中的视频');
        return;
    }
    
    // 获取表单数据
    const code = document.getElementById('detail-code').value;
    
    // 使用多选组件获取标签值
    let collection = '';
    if (collectionSelect) {
        collection = collectionSelect.getValue().join(',');
    } else {
        // 兼容旧版本，如果多选组件未初始化，则使用隐藏输入框的值
        collection = document.getElementById('detail-collection').value;
    }
    console.log('标签:', collection);


    // 使用多选组件获取演员值
    let actors = '';
    if (actorsSelect) {
        actors = actorsSelect.getValue().join(',');
    } else {
        // 兼容旧版本，如果多选组件未初始化，则使用隐藏输入框的值
        actors = document.getElementById('detail-actors').value;
    }
    
    const notes = document.getElementById('detail-notes').value;
    const releaseDate = document.getElementById('detail-releasedate').value;
    console.log('演员:', actors);

    // 使用当前评分值
    const rating = currentRating;
    
    // 使用编辑中的预览图URL
    let thumbnailUrl = editingThumbnailUrl;
    
    // 如果是默认占位图，则设为空字符串
    if (thumbnailUrl === 'https://via.placeholder.com/500x280?text=No+Preview') {
        thumbnailUrl = '';
    }
    
    // 检查文件名是否有更改
    const editedFileNameInfo = getEditedFileName();
    
    // 查找视频对象
    const videoIndex = videoData.findIndex(v => v.id === currentVideoId);
    if (videoIndex === -1) {
        console.error('找不到视频:', currentVideoId);
        return;
    }
    
    // 保存原视频的预览图路径
    const oldThumbnailUrl = videoData[videoIndex].thumbnailUrl;
    
    // 更新视频数据
    const updatedVideo = {
        ...videoData[videoIndex],
        code,
        collection,
        actors,
        notes,
        rating,
        thumbnailUrl,
        releaseDate
    };
    
    // 如果文件名有更改，添加到更新对象中
    if (editedFileNameInfo) {
        // 先检查目标文件是否已存在
        const targetExists = await window.electronAPI.checkFileExists(editedFileNameInfo.newFilePath);
        if (targetExists) {
            // 显示错误信息
            const filenameError = document.getElementById('filename-error');
            const filenameInput = document.getElementById('edit-filename');
            filenameError.textContent = '目标文件已存在，无法保存';
            filenameError.classList.add('show');
            filenameInput.classList.add('error');
            showMessage('文件名冲突，无法保存', 'error');
            return;
        }
        
        // 重命名物理文件
        try {
            const renameResult = await window.electronAPI.renameVideoFile(
                editedFileNameInfo.oldFilePath, 
                editedFileNameInfo.newFilePath
            );
            
            if (!renameResult.success) {
                showMessage(`重命名文件失败: ${renameResult.error}`, 'error');
                return;
            }
            
            console.log('物理文件重命名成功');
        } catch (error) {
            console.error('重命名物理文件失败:', error);
            showMessage('重命名文件失败', 'error');
            return;
        }
        
        updatedVideo.fileName = editedFileNameInfo.newFileName;
        updatedVideo.filePath = editedFileNameInfo.newFilePath;
    }
    
    try {
        // 显示保存中提示
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 保存中...';
        saveBtn.disabled = true;
        
        // 调用API更新数据库
        await window.electronAPI.updateVideo(updatedVideo);
        
        // 如果预览图已更新，删除旧预览图
        if (oldThumbnailUrl && oldThumbnailUrl !== thumbnailUrl && isValidThumbnailUrl(oldThumbnailUrl)) {
            await window.electronAPI.deleteThumbnail(oldThumbnailUrl);
            console.log(`旧预览图已删除: ${oldThumbnailUrl}`);
        }
        
        // 删除所有已上传但未使用的预览图
        for (const uploadedUrl of uploadedThumbnailUrls) {
            if (uploadedUrl !== thumbnailUrl) {
                await window.electronAPI.deleteThumbnail(uploadedUrl);
                console.log(`未使用的预览图已删除: ${uploadedUrl}`);
            }
        }
        
        // 清空上传列表
        uploadedThumbnailUrls = [];
        
        // 更新本地数据
        videoData[videoIndex] = updatedVideo;
        
        // 更新当前使用的URL
        currentThumbnailUrl = thumbnailUrl;
        originalThumbnailUrl = thumbnailUrl;
        
        // 触发视频数据变化事件，完整更新视图
        if (typeof onVideoDataChanged === 'function') {
            onVideoDataChanged();
        } else {
            // 如果找不到函数，则使用向后兼容的渲染方式
            renderCurrentView();
        }
        
        console.log('视频详情已保存');
        
        // 恢复按钮状态
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
        
        // 更新查看视图的预览图
        const previewImgUrl = currentThumbnailUrl ? 
            currentThumbnailUrl : 'https://via.placeholder.com/500x280?text=No+Preview';
        document.getElementById('detail-preview').style.backgroundImage = `url("${previewImgUrl}")`;
        
        // 切换到查看视图
        switchViewMode('view');
        
        // 更新查看视图内容
        updateViewModeContent(updatedVideo);
        
        // 同步枚举数据到H区域
        console.log('保存视频详情后同步数据并刷新筛选浮窗');
        // 主动刷新筛选区域，确保H区域能立即获取到新值
        await refreshFilterBubbles(true);
        
    } catch (error) {
        console.error('保存视频详情失败:', error);
        alert('保存失败: ' + error.message);
        
        // 恢复按钮状态
        saveBtn.innerHTML = '<i class="fas fa-save"></i> 保存更改';
        saveBtn.disabled = false;
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
    
    // 检查是否是预设的占位图片
    if (url === 'https://via.placeholder.com/500x280?text=No+Preview') return false;
    
    // 检查是否是缩略图URL (支持旧格式和新格式)
    return url.includes('thumbnails/') || url.startsWith('app://thumbnail/');
}

/**
 * 初始化文件名编辑功能
 * @param {Object} video - 视频对象
 */
function initFileNameEdit(video) {
    const filenameInput = document.getElementById('edit-filename');
    const fileExtension = document.getElementById('file-extension');
    const filenameError = document.getElementById('filename-error');
    
    if (!filenameInput || !fileExtension) return;
    
    // 清除所有错误状态
    filenameInput.classList.remove('error');
    filenameError.classList.remove('show');
    filenameError.textContent = '';
    
    // 解析文件名和扩展名
    const fileName = video.fileName || '';
    const lastDotIndex = fileName.lastIndexOf('.');
    
    if (lastDotIndex > 0) {
        const nameWithoutExt = fileName.substring(0, lastDotIndex);
        const extension = fileName.substring(lastDotIndex);
        
        filenameInput.value = nameWithoutExt;
        fileExtension.textContent = extension;
    } else {
        filenameInput.value = fileName;
        fileExtension.textContent = '';
    }
    
    // 清除之前的事件监听器
    filenameInput.removeEventListener('input', handleFilenameInput);
    filenameInput.removeEventListener('blur', handleFilenameBlur);
    
    // 添加输入验证事件
    filenameInput.addEventListener('input', handleFilenameInput);
    filenameInput.addEventListener('blur', handleFilenameBlur);
}

/**
 * 处理文件名输入事件
 */
function handleFilenameInput() {
    const filenameInput = document.getElementById('edit-filename');
    const filenameError = document.getElementById('filename-error');
    
    // 清除错误状态
    filenameInput.classList.remove('error');
    filenameError.classList.remove('show');
    
    // 验证文件名格式
    const filename = filenameInput.value.trim();
    if (filename && !isValidFilename(filename)) {
        filenameInput.classList.add('error');
        filenameError.textContent = '文件名包含非法字符';
        filenameError.classList.add('show');
    }
}

/**
 * 处理文件名失焦事件
 */
async function handleFilenameBlur() {
    const filenameInput = document.getElementById('edit-filename');
    const fileExtension = document.getElementById('file-extension');
    const filenameError = document.getElementById('filename-error');
    
    const newName = filenameInput.value.trim();
    const extension = fileExtension.textContent;
    
    if (!newName) return;
    
    // 检查文件名冲突
    const fullNewName = newName + extension;
    const currentVideo = videoData.find(v => v.id === currentVideoId);
    
    if (currentVideo && fullNewName !== currentVideo.fileName) {
        const conflict = await checkFilenameConflict(newName, currentVideo.filePath);
        if (conflict) {
            filenameInput.classList.add('error');
            filenameError.textContent = '文件名已存在，请使用其他名称';
            filenameError.classList.add('show');
        }
    }
}

/**
 * 检查文件名是否有效
 * @param {string} filename - 文件名
 * @returns {boolean} 是否有效
 */
function isValidFilename(filename) {
    // Windows文件名非法字符
    const invalidChars = /[<>:"/\\|?*]/;
    return !invalidChars.test(filename) && filename.length > 0 && filename.length <= 255;
}

/**
 * 检查文件名冲突（检查物理文件是否存在）
 * @param {string} newFileNameWithoutExt - 新文件名（不含扩展名）
 * @param {string} currentFilePath - 当前文件路径
 * @returns {boolean} 是否存在冲突
 */
async function checkFilenameConflict(newFileNameWithoutExt, currentFilePath) {
    try {
        // 获取当前文件的目录和扩展名
        const currentDir = currentFilePath.substring(0, currentFilePath.lastIndexOf('/'));
        const fileExtension = currentFilePath.substring(currentFilePath.lastIndexOf('.'));
        
        // 构建新的文件路径
        const newFilePath = `${currentDir}/${newFileNameWithoutExt}${fileExtension}`;
        
        // 如果新路径和当前路径相同，说明没有修改
        if (newFilePath === currentFilePath) {
            return false;
        }
        
        // 检查物理文件是否存在
        const exists = await window.electronAPI.checkFileExists(newFilePath);
        return exists;
    } catch (error) {
        console.error('检查文件名冲突失败:', error);
        return false;
    }
}

/**
 * 获取编辑后的文件名信息
 * @returns {Object|null} 包含新文件名和路径的对象，如果没有修改或有错误则返回null
 */
function getEditedFileName() {
    const filenameInput = document.getElementById('edit-filename');
    const filenameError = document.getElementById('filename-error');
    
    if (!filenameInput || filenameError.classList.contains('show')) {
        return null;
    }
    
    const newName = filenameInput.value.trim();
    if (!newName) {
        return null;
    }
    
    // 获取当前视频信息
    const currentVideo = videoData.find(v => v.id === currentVideoId);
    if (!currentVideo) {
        return null;
    }
    
    const currentFilePath = currentVideo.filePath;
    const fileExtension = currentFilePath.substring(currentFilePath.lastIndexOf('.'));
    const fullNewFileName = newName + fileExtension;
    
    // 如果文件名没有变化，返回null
    if (fullNewFileName === currentVideo.fileName) {
        return null;
    }
    
    // 构建新的文件路径
    const currentDir = currentFilePath.substring(0, currentFilePath.lastIndexOf('/'));
    const newFilePath = `${currentDir}/${fullNewFileName}`;
    
    return {
        newFileName: fullNewFileName,
        newFilePath: newFilePath,
        oldFilePath: currentFilePath
    };
}

/**
 * 导出函数供其他模块使用
 */
export { initDetailDrawer, openDetailDrawer, closeDetailDrawer }; 