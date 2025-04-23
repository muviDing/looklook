/**
 * 区域F: 详情抽屉
 * 负责处理视频详情抽屉的展示和交互，包括查看视图(F-1)和编辑视图(F-2)
 */

// 获取全局视频数据的引用以及渲染函数
import { videoData, renderTableView, renderGridView } from './videoData.js';
// 导入多选下拉组件
import { initMultiSelect } from './multiselect.js';

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
        collectionSelect = await initMultiSelect('collection', 'collection', '搜索或添加新合集...');
        console.log('初始化合集多选组件成功');
        
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
    
    // 编辑视图的取消按钮事件
    cancelEditBtn.addEventListener('click', () => {
        // 恢复预览图到原始状态
        restoreOriginalImage();
        // 切换回查看模式
        switchViewMode('view');
    });
    
    // 编辑视图的保存按钮事件
    saveBtn.addEventListener('click', saveVideoDetails);
    
    // 播放视频按钮事件
    playVideoBtn.addEventListener('click', () => {
        if (currentVideoId) {
            playVideo(currentVideoId);
        }
    });
    
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
    
    // 为表格行和画廊卡片添加详情查看事件
    setupDetailViewEvents();
}

/**
 * 设置表格行和画廊卡片的详情查看事件
 */
function setupDetailViewEvents() {
    // 通用双击事件处理
    document.addEventListener('dblclick', function(event) {
        // 如果点击了复选框或按钮，不触发详情抽屉
        if (event.target.closest('.checkbox-cell') || 
            event.target.closest('input[type="checkbox"]') ||
            event.target.closest('button')) {
            return;
        }
        
        // 表格行双击事件
        const tableRow = event.target.closest('#video-table tbody tr');
        if (tableRow && tableRow.dataset.videoId) {
            openDetailDrawer(tableRow.dataset.videoId);
        }
        
        // 画廊卡片双击事件
        const videoCard = event.target.closest('.video-card');
        if (videoCard && videoCard.dataset.videoId && 
            !event.target.closest('.video-card-checkbox')) {
            openDetailDrawer(videoCard.dataset.videoId);
        }
    });
    
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
        
        // 保存当前预览图URL作为编辑开始时的状态
        editingThumbnailUrl = currentThumbnailUrl;
        
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
        
        // 移除编辑模式的类名
        backdrop.classList.remove('editing');
        
        currentViewMode = 'view';
        
        // 如果有未保存的修改，重新从数据中加载
        if (currentVideoId) {
            const video = videoData.find(v => v.id === currentVideoId);
            if (video) {
                updateViewModeContent(video);
            }
        }
    }
}

/**
 * 打开详情抽屉
 * @param {string} videoId - 视频ID
 */
function openDetailDrawer(videoId) {
    console.log('打开详情抽屉, 视频ID:', videoId);
    
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
    
    // 设置预览图（查看模式）
    const previewImgUrl = currentThumbnailUrl ? 
        currentThumbnailUrl : 'https://via.placeholder.com/500x280?text=No+Preview';
    document.getElementById('detail-preview').style.backgroundImage = `url("${previewImgUrl}")`;
    
    // 设置预览图（编辑模式）
    document.getElementById('detail-preview-edit').style.backgroundImage = `url("${previewImgUrl}")`;
    
    // 默认切换到查看视图
    switchViewMode('view');
    
    // 更新查看视图内容
    updateViewModeContent(video);
    
    // 填充编辑表单
    document.getElementById('detail-code').value = video.code || '';
    
    // 使用多选组件设置合集值
    if (collectionSelect) {
        collectionSelect.setValue(video.collection || '');
    }
    
    // 使用多选组件设置演员值
    if (actorsSelect) {
        actorsSelect.setValue(video.actors || '');
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
    setTextContent('edit-view-resolution', video.resolution);
    setTextContent('edit-view-createdate', createDate);
    setTextContent('edit-view-importdate', importDate);
    setTextContent('edit-view-viewcount', video.viewCount || '0');
    setTextContent('edit-view-lastview', lastViewDate);
    
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
    
    // 清空当前视频ID、评分和预览图
    currentVideoId = null;
    currentRating = 0;
    originalThumbnailUrl = '';
    currentThumbnailUrl = '';
    editingThumbnailUrl = '';
    
    // 重置抽屉内容
    document.getElementById('detail-preview').style.backgroundImage = '';
    document.getElementById('detail-code').value = '';
    // 重置多选组件
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
 * 更换预览图
 */
async function changePreviewImage() {
    try {
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
                
                // 更新当前编辑中的预览图URL (使用相对路径)
                editingThumbnailUrl = thumbnailPath;
                
                // 设置编辑模式下的预览图
                document.getElementById('detail-preview-edit').style.backgroundImage = `url("${thumbnailPath}")`;
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
 * @param {string} videoId - 视频ID
 */
async function playVideo(videoId) {
    console.log(`播放视频: ${videoId}`);
    const video = videoData.find(v => v.id === videoId);
    if (!video || !video.filePath) {
        console.error('无法播放视频: 找不到视频或文件路径');
        return;
    }
    
    try {
        // 使用Electron API打开视频播放器
        await window.electronAPI.openVideo(video.filePath);
        
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
        
        // 重新渲染视图
        renderTableView();
        renderGridView();
    } catch (error) {
        console.error('播放视频失败:', error);
    }
}

/**
 * 保存视频详情
 */
async function saveVideoDetails() {
    if (!currentVideoId) {
        console.error('没有选中的视频');
        return;
    }
    
    // 获取表单数据
    const code = document.getElementById('detail-code').value;
    
    // 使用多选组件获取合集值
    let collection = '';
    if (collectionSelect) {
        collection = collectionSelect.getValue().join(',');
    } else {
        // 兼容旧版本，如果多选组件未初始化，则使用隐藏输入框的值
        collection = document.getElementById('detail-collection').value;
    }
    
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
    
    // 使用当前评分值
    const rating = currentRating;
    
    // 使用编辑中的预览图URL
    let thumbnailUrl = editingThumbnailUrl;
    
    // 如果是默认占位图，则设为空字符串
    if (thumbnailUrl === 'https://via.placeholder.com/500x280?text=No+Preview') {
        thumbnailUrl = '';
    }
    
    // 查找视频对象
    const videoIndex = videoData.findIndex(v => v.id === currentVideoId);
    if (videoIndex === -1) {
        console.error('找不到视频:', currentVideoId);
        return;
    }
    
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
    
    try {
        // 显示保存中提示
        const saveBtn = document.getElementById('save-btn');
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 保存中...';
        saveBtn.disabled = true;
        
        // 调用API更新数据库
        await window.electronAPI.updateVideo(updatedVideo);
        
        // 更新本地数据
        videoData[videoIndex] = updatedVideo;
        
        // 更新当前使用的URL
        currentThumbnailUrl = thumbnailUrl;
        originalThumbnailUrl = thumbnailUrl;
        
        // 重新渲染视图
        renderTableView();
        renderGridView();
        
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
    } catch (error) {
        console.error('保存视频详情失败:', error);
        alert('保存失败: ' + error.message);
        
        // 恢复按钮状态
        const saveBtn = document.getElementById('save-btn');
        saveBtn.innerHTML = '<i class="fas fa-save"></i> 保存更改';
        saveBtn.disabled = false;
    }
}

/**
 * 导出函数供其他模块使用
 */
export { initDetailDrawer, openDetailDrawer, closeDetailDrawer }; 