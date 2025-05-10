/**
 * 迁移进度模块
 * 提供视频迁移进度显示功能
 */

// 创建迁移进度弹窗的HTML结构
function createMoveProgressModal() {
  // 如果已经存在则不再创建
  if (document.getElementById('move-progress-modal')) {
    return;
  }
  
  // 创建模态框容器
  const modalOverlay = document.createElement('div');
  modalOverlay.id = 'move-progress-modal';
  modalOverlay.className = 'modal-overlay';
  modalOverlay.style.display = 'none';
  
  // 创建模态框内容
  modalOverlay.innerHTML = `
    <div class="modal-container">
      <div class="modal-header">
        <h2>批量迁移视频</h2>
      </div>
      <div class="modal-body">
        <div class="target-folder-info">
          <div class="target-label">目标文件夹:</div>
          <div id="move-target-folder-path" class="target-folder-path">等待选择...</div>
        </div>
        
        <div class="progress-container">
          <div class="progress-bar">
            <div class="progress-fill" id="move-progress-fill" style="width: 0%"></div>
          </div>
          <div class="progress-text">
            <span>进度：<span id="move-progress-percent">0</span>%</span>
            <span><span id="move-progress-processed">0</span>/<span id="move-progress-total">0</span></span>
          </div>
        </div>
        
        <div class="stats-container">
          <div class="stat-item success">
            <div class="stat-label">成功迁移</div>
            <div class="stat-count" id="move-success-count" data-panel="move-success-panel">0</div>
          </div>
          <div class="stat-item failure">
            <div class="stat-label">迁移失败</div>
            <div class="stat-count" id="move-failed-count" data-panel="move-failed-panel">0</div>
          </div>
          <div class="stat-item pending">
            <div class="stat-label">待迁移</div>
            <div class="stat-count" id="move-pending-count" data-panel="move-pending-panel">0</div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="move-pause-btn">暂停</button>
        <button class="btn btn-primary" id="move-close-btn" disabled>关闭</button>
      </div>
      
      <!-- 侧边抽屉面板 -->
      <div class="side-panel" id="move-success-panel">
        <div class="side-panel-header">
          <div class="side-panel-title">成功迁移的文件</div>
          <button class="side-panel-close" aria-label="关闭面板">&times;</button>
        </div>
        <div class="side-panel-content">
          <ul class="file-list" id="move-success-list"></ul>
        </div>
      </div>
      
      <div class="side-panel" id="move-failed-panel">
        <div class="side-panel-header">
          <div class="side-panel-title">迁移失败的文件</div>
          <button class="side-panel-close" aria-label="关闭面板">&times;</button>
        </div>
        <div class="side-panel-content">
          <ul class="file-list" id="move-failed-list"></ul>
        </div>
      </div>
      
      <div class="side-panel" id="move-pending-panel">
        <div class="side-panel-header">
          <div class="side-panel-title">待迁移的文件</div>
          <button class="side-panel-close" aria-label="关闭面板">&times;</button>
        </div>
        <div class="side-panel-content">
          <ul class="file-list" id="move-pending-list"></ul>
        </div>
      </div>
      
      <!-- 遮罩层，用于点击关闭侧边面板 -->
      <div class="side-panel-overlay"></div>
    </div>
  `;
  
  // 添加到body
  document.body.appendChild(modalOverlay);
  
  // 设置事件监听器
  setupEventListeners();
}

// 设置事件处理
function setupEventListeners() {
  // 关闭按钮事件
  const closeBtn = document.getElementById('move-close-btn');
  closeBtn.addEventListener('click', hideMoveProgressModal);
  
  // 暂停按钮事件
  const pauseBtn = document.getElementById('move-pause-btn');
  pauseBtn.addEventListener('click', function() {
    const isPaused = pauseBtn.textContent === '继续';
    
    if (isPaused) {
      // 继续迁移
      pauseBtn.textContent = '暂停';
      window.electronAPI.resumeMoveVideos();
    } else {
      // 暂停迁移
      pauseBtn.textContent = '继续';
      window.electronAPI.pauseMoveVideos();
    }
  });
  
  // 侧边栏打开事件 - 点击统计数字
  const statCounts = document.querySelectorAll('.stat-count');
  statCounts.forEach(statCount => {
    statCount.addEventListener('click', function() {
      const panelId = this.dataset.panel;
      if (panelId) {
        openSidePanel(panelId);
      }
    });
  });
  
  // 侧边栏关闭事件
  const closeBtns = document.querySelectorAll('.side-panel-close');
  closeBtns.forEach(btn => {
    btn.addEventListener('click', closeSidePanel);
  });
  
  // 点击遮罩层关闭侧边栏
  const overlay = document.querySelector('.side-panel-overlay');
  if (overlay) {
    overlay.addEventListener('click', closeSidePanel);
  }
}

// 打开侧边面板
function openSidePanel(panelId) {
  // 关闭其他面板
  document.querySelectorAll('.side-panel').forEach(panel => {
    panel.classList.remove('active');
  });
  
  // 打开指定面板
  const panel = document.getElementById(panelId);
  if (panel) {
    panel.classList.add('active');
    
    // 添加with-side-panel类到modal-container
    const container = document.querySelector('.modal-container');
    if (container) {
      container.classList.add('with-side-panel');
    }
  }
}

// 关闭侧边面板
function closeSidePanel() {
  // 关闭所有面板
  document.querySelectorAll('.side-panel').forEach(panel => {
    panel.classList.remove('active');
  });
  
  // 移除with-side-panel类
  const container = document.querySelector('.modal-container');
  if (container) {
    container.classList.remove('with-side-panel');
  }
}

// 显示迁移进度弹窗
function showMoveProgressModal() {
  // 确保弹窗已创建
  createMoveProgressModal();
  
  // 获取元素
  const modal = document.getElementById('move-progress-modal');
  const progressFill = document.getElementById('move-progress-fill');
  const progressPercent = document.getElementById('move-progress-percent');
  const progressProcessed = document.getElementById('move-progress-processed');
  const progressTotal = document.getElementById('move-progress-total');
  const successCount = document.getElementById('move-success-count');
  const failedCount = document.getElementById('move-failed-count');
  const pendingCount = document.getElementById('move-pending-count');
  const successList = document.getElementById('move-success-list');
  const failedList = document.getElementById('move-failed-list');
  const pendingList = document.getElementById('move-pending-list');
  const pauseBtn = document.getElementById('move-pause-btn');
  const closeBtn = document.getElementById('move-close-btn');
  
  // 重置弹窗状态
  progressFill.style.width = '0%';
  progressPercent.textContent = '0';
  progressProcessed.textContent = '0';
  progressTotal.textContent = '0';
  successCount.textContent = '0';
  failedCount.textContent = '0';
  pendingCount.textContent = '0';
  successList.innerHTML = '';
  failedList.innerHTML = '';
  pendingList.innerHTML = '';
  pauseBtn.textContent = '暂停';
  pauseBtn.disabled = false;
  closeBtn.disabled = true;
  
  // 确保所有侧边面板都处于关闭状态
  closeSidePanel();
  
  // 移除可能存在的状态文本
  const statusText = document.querySelector('.progress-container .text-center');
  if (statusText) {
    statusText.remove();
  }
  
  // 显示弹窗
  modal.style.display = 'flex';
  
  // 注册进度更新回调
  setupProgressCallback();
}

// 隐藏迁移进度弹窗
function hideMoveProgressModal() {
  const modal = document.getElementById('move-progress-modal');
  if (modal) {
    modal.style.display = 'none';
    
    // 移除进度更新回调
    if (window.removeMoveProgressCallback) {
      window.removeMoveProgressCallback();
    }
  }
}

// 设置进度更新回调
function setupProgressCallback() {
  // 移除之前的回调
  if (window.removeMoveProgressCallback) {
    window.removeMoveProgressCallback();
  }
  
  // 注册新的回调
  window.removeMoveProgressCallback = window.electronAPI.onMoveProgress(updateProgress);
}

// 更新进度显示
function updateProgress(progress) {
  // 获取元素
  const progressFill = document.getElementById('move-progress-fill');
  const progressPercent = document.getElementById('move-progress-percent');
  const progressProcessed = document.getElementById('move-progress-processed');
  const progressTotal = document.getElementById('move-progress-total');
  const successCount = document.getElementById('move-success-count');
  const failedCount = document.getElementById('move-failed-count');
  const pendingCount = document.getElementById('move-pending-count');
  const successList = document.getElementById('move-success-list');
  const failedList = document.getElementById('move-failed-list');
  const pendingList = document.getElementById('move-pending-list');
  const pauseBtn = document.getElementById('move-pause-btn');
  const closeBtn = document.getElementById('move-close-btn');
  const targetFolderPath = document.getElementById('move-target-folder-path');
  
  // 更新目标文件夹路径
  if (progress.targetFolder) {
    targetFolderPath.textContent = progress.targetFolder;
    targetFolderPath.title = progress.targetFolder;
  }
  
  // 处理暂停迁移的情况
  if (progress.paused) {
    pauseBtn.textContent = '继续';
    
    // 在进度条下方显示暂停状态
    const statusText = document.createElement('div');
    statusText.textContent = '迁移已暂停';
    statusText.className = 'text-center text-gray-500 mt-2 mb-2';
    
    const progressContainer = document.querySelector('.progress-container');
    // 确保我们不会重复添加状态文本
    if (!document.querySelector('.progress-container .text-center')) {
      progressContainer.appendChild(statusText);
    }
    
    return;
  } else {
    pauseBtn.textContent = '暂停';
    
    // 移除暂停状态文本
    const statusText = document.querySelector('.progress-container .text-center');
    if (statusText) {
      statusText.remove();
    }
  }
  
  // 更新进度显示
  progressFill.style.width = `${progress.percent}%`;
  progressPercent.textContent = progress.percent;
  progressProcessed.textContent = progress.processed;
  progressTotal.textContent = progress.total;
  successCount.textContent = progress.success;
  failedCount.textContent = progress.failed;
  pendingCount.textContent = progress.pending;
  
  // 更新成功列表
  successList.innerHTML = '';
  if (progress.successList && progress.successList.length > 0) {
    progress.successList.forEach(item => {
      const li = document.createElement('li');
      li.textContent = item.fileName || item.filePath.split('/').pop().split('\\').pop();
      
      // 添加目标路径为提示
      if (item.newPath) {
        li.title = item.newPath;
      }
      
      successList.appendChild(li);
    });
  }
  
  // 更新失败列表
  failedList.innerHTML = '';
  if (progress.failedList && progress.failedList.length > 0) {
    progress.failedList.forEach(item => {
      const li = document.createElement('li');
      li.textContent = item.fileName || item.filePath.split('/').pop().split('\\').pop();
      
      // 添加错误标签
      if (item.error) {
        const tag = document.createElement('span');
        tag.className = 'tag error-tag';
        tag.textContent = item.error;
        li.appendChild(tag);
      }
      
      failedList.appendChild(li);
    });
  }
  
  // 更新等待列表
  pendingList.innerHTML = '';
  if (progress.pendingList && progress.pendingList.length > 0) {
    progress.pendingList.forEach(item => {
      const li = document.createElement('li');
      li.textContent = item.fileName || item.filePath.split('/').pop().split('\\').pop();
      pendingList.appendChild(li);
    });
  }
  
  // 判断是否完成
  if (progress.isCompleted) {
    pauseBtn.disabled = true;
    closeBtn.disabled = false;
    
    // 在进度条下方显示完成状态
    const statusText = document.createElement('div');
    statusText.textContent = '迁移完成';
    statusText.className = 'text-center text-gray-500 mt-2 mb-2';
    
    const progressContainer = document.querySelector('.progress-container');
    // 确保我们不会重复添加状态文本
    if (!document.querySelector('.progress-container .text-center')) {
      progressContainer.appendChild(statusText);
    }
    
    // 自动打开有问题的面板
    if (progress.failed > 0) {
      setTimeout(() => openSidePanel('move-failed-panel'), 500);
    } else if (progress.success > 0) {
      // 如果没有失败但有成功，自动打开成功面板（如果成功数量不多，否则让用户自己点击）
      if (progress.success <= 10) {
        setTimeout(() => openSidePanel('move-success-panel'), 500);
      }
    }
  }
}

// 启动迁移操作
async function startMoveVideos(selectedVideos, targetFolder) {
  try {
    // 显示迁移进度弹窗
    showMoveProgressModal();
    
    // 调用主进程方法迁移视频
    const result = await window.electronAPI.moveVideos(selectedVideos, targetFolder);
    
    console.log('迁移结果:', result);
    return result;
  } catch (error) {
    console.error('迁移视频失败:', error);
    
    // 自动关闭弹窗
    hideMoveProgressModal();
    
    // 显示错误提示
    import('./areaC.js').then(module => {
      if (typeof module.showCustomAlert === 'function') {
        module.showCustomAlert('迁移视频失败: ' + error.message, 'error');
      } else {
        alert('迁移视频失败: ' + error.message);
      }
    });
    
    return { error: error.message };
  }
}

// 导出模块
export {
  showMoveProgressModal,
  hideMoveProgressModal,
  startMoveVideos
}; 