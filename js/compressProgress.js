/**
 * 压缩进度模块
 * 提供视频压缩进度显示功能
 */

// 创建压缩进度弹窗的HTML结构
function createCompressProgressModal() {
  // 如果已经存在则不再创建
  if (document.getElementById('compress-progress-modal')) {
    return;
  }
  
  // 创建模态框容器
  const modalOverlay = document.createElement('div');
  modalOverlay.id = 'compress-progress-modal';
  modalOverlay.className = 'modal-overlay';
  modalOverlay.style.display = 'none';
  
  // 创建模态框内容
  modalOverlay.innerHTML = `
    <div class="modal-container">
      <div class="modal-header">
        <h2>批量压缩视频</h2>
      </div>
      <div class="modal-body">
        <!-- 压缩模式选择 -->
        <div class="compress-mode-container">
          <div class="compress-mode-title">压缩模式:</div>
          <div class="compress-mode-options">
            <div class="mode-option">
              <label>
                <input type="radio" name="compress-mode" value="perceptual" checked>
                高效感知无损
              </label>
              <div class="tooltip-wrapper">
                <i class="fas fa-question-circle info-icon"></i>
                <div class="tooltip">智能压缩，画质几乎无损，文件大幅变小，适合日常存储。</div>
              </div>
            </div>
            <div class="mode-option">
              <label>
                <input type="radio" name="compress-mode" value="lossless">
                完全无损
              </label>
              <div class="tooltip-wrapper">
                <i class="fas fa-question-circle info-icon"></i>
                <div class="tooltip">100%无损压缩，仅优化封装，最大兼容性，体积变化有限。</div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 操作选项 -->
        <div class="compress-options">
          <div class="option-item">
            <input type="checkbox" id="auto-tag" checked>
            <label for="auto-tag">压缩成功时自动打标签</label>
            <div class="tooltip-wrapper">
              <i class="fas fa-question-circle info-icon"></i>
              <div class="tooltip">自动为原文件和压缩文件添加标签，便于管理。</div>
            </div>
          </div>
          <div class="option-item">
            <input type="checkbox" id="auto-delete">
            <label for="auto-delete">压缩成功时自动删除原文件</label>
            <div class="tooltip-wrapper">
              <i class="fas fa-question-circle info-icon"></i>
              <div class="tooltip">原文件移入回收站，释放空间且可恢复。</div>
            </div>
          </div>
          <div class="option-item">
            <input type="checkbox" id="use-gpu">
            <label for="use-gpu">启用GPU加速</label>
            <div class="tooltip-wrapper">
              <i class="fas fa-question-circle info-icon"></i>
              <div class="tooltip">使用显卡加速编码，大幅提升速度。硬件不支持时会失败。</div>
            </div>
          </div>
        </div>
        
        <!-- 特别提示 -->
        <div class="special-note">
          压缩成功后，原文件名将自动加后缀"_原文件"，压缩后文件继承原文件所有属性（如标签、备注等），确保信息完整。
        </div>
        
        <!-- 进度条 -->
        <div class="progress-container">
          <div class="progress-bar">
            <div class="progress-fill" id="compress-progress-fill" style="width: 0%"></div>
          </div>
          <div class="progress-text">
            <span>进度：<span id="compress-progress-percent">0</span>%</span>
            <span><span id="compress-progress-processed">0</span>/<span id="compress-progress-total">0</span></span>
          </div>
          <!-- 当前处理文件 -->
          <div class="current-file-container">
            <div class="current-file-info">
              <div class="current-file-label">当前处理：</div>
              <div class="current-file-name" id="compress-current-file">-</div>
            </div>
            <div class="current-file-stats" id="compress-current-file-progress" style="display: none;">
              <div class="stat-item">
                <span class="stat-label">进度</span>
                <span class="stat-value" id="compress-current-percent">0%</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">速度</span>
                <span class="stat-value" id="compress-current-speed">-</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">剩余时间</span>
                <span class="stat-value" id="compress-current-eta">-</span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 统计数据 -->
        <div class="stats-container">
          <div class="stat-item success">
            <div class="stat-label">成功压缩</div>
            <div class="stat-count" id="compress-success-count" data-panel="compress-success-panel">0</div>
          </div>
          <div class="stat-item failure">
            <div class="stat-label">压缩失败</div>
            <div class="stat-count" id="compress-failed-count" data-panel="compress-failed-panel">0</div>
          </div>
          <div class="stat-item pending">
            <div class="stat-label">待压缩</div>
            <div class="stat-count" id="compress-pending-count" data-panel="compress-pending-panel">0</div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-primary" id="compress-start-btn">开始压缩</button>
        <button class="btn btn-secondary" id="compress-pause-btn" style="display: none;">暂停</button>
        <button class="btn btn-primary" id="compress-close-btn">关闭</button>
      </div>
      
      <!-- 侧边抽屉面板 -->
      <div class="side-panel" id="compress-success-panel">
        <div class="side-panel-header">
          <div class="side-panel-title">成功压缩的文件</div>
          <button class="side-panel-close" aria-label="关闭面板">&times;</button>
        </div>
        <div class="side-panel-content">
          <div id="compress-saved-space" class="rounded text-xs text-green-700 bg-green-50 px-3 py-2 font-medium flex items-center mb-3">
            总计节省空间 <span class="ml-2 text-base font-bold text-green-600">0MB</span>
          </div>
          <ul class="file-list" id="compress-success-list"></ul>
        </div>
      </div>
      
      <div class="side-panel" id="compress-failed-panel">
        <div class="side-panel-header">
          <div class="side-panel-title">压缩失败的文件</div>
          <button class="side-panel-close" aria-label="关闭面板">&times;</button>
        </div>
        <div class="side-panel-content">
          <ul class="file-list" id="compress-failed-list"></ul>
        </div>
      </div>
      
      <div class="side-panel" id="compress-pending-panel">
        <div class="side-panel-header">
          <div class="side-panel-title">待压缩的文件</div>
          <button class="side-panel-close" aria-label="关闭面板">&times;</button>
        </div>
        <div class="side-panel-content">
          <ul class="file-list" id="compress-pending-list"></ul>
        </div>
      </div>
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
  const closeBtn = document.getElementById('compress-close-btn');
  closeBtn.addEventListener('click', hideCompressProgressModal);
  
  // 开始按钮事件
  const startBtn = document.getElementById('compress-start-btn');
  startBtn.addEventListener('click', function() {
    // 隐藏开始按钮，显示暂停按钮
    startBtn.style.display = 'none';
    document.getElementById('compress-pause-btn').style.display = 'block';
    
    // 禁用关闭按钮（压缩过程中不允许关闭）
    closeBtn.disabled = true;
    
    // 开始压缩
    startCompression();
  });
  
  // 暂停/继续按钮事件
  const pauseBtn = document.getElementById('compress-pause-btn');
  pauseBtn.addEventListener('click', function() {
    const isPaused = pauseBtn.textContent === '继续';
    
    if (isPaused) {
      // 继续压缩
      pauseBtn.textContent = '暂停';
      // 禁用关闭按钮（压缩过程中不允许关闭）
      closeBtn.disabled = true;
      resumeCompression();
    } else {
      // 暂停压缩
      pauseBtn.textContent = '继续';
      // 启用关闭按钮（暂停时允许关闭）
      closeBtn.disabled = false;
      pauseCompression();
    }
  });
  
  // 侧边栏打开事件 - 点击统计数字
  const statCounts = document.querySelectorAll('#compress-progress-modal .stat-count');
  statCounts.forEach(statCount => {
    statCount.addEventListener('click', function() {
      const panelId = this.dataset.panel;
      if (panelId) {
        openSidePanel(panelId);
      }
    });
  });
  
  // 侧边栏关闭事件
  const closeBtns = document.querySelectorAll('#compress-progress-modal .side-panel-close');
  closeBtns.forEach(btn => {
    btn.addEventListener('click', closeSidePanel);
  });
}

// 打开侧边面板
function openSidePanel(panelId) {
  // 关闭其他面板
  document.querySelectorAll('#compress-progress-modal .side-panel').forEach(panel => {
    panel.classList.remove('active');
  });
  
  // 打开指定面板
  const panel = document.getElementById(panelId);
  if (panel) {
    panel.classList.add('active');
    
    // 添加with-side-panel类到modal-container
    const container = document.querySelector('#compress-progress-modal .modal-container');
    if (container) {
      container.classList.add('with-side-panel');
    }
  }
}

// 关闭侧边面板
function closeSidePanel() {
  // 关闭所有面板
  document.querySelectorAll('#compress-progress-modal .side-panel').forEach(panel => {
    panel.classList.remove('active');
  });
  
  // 移除with-side-panel类
  const container = document.querySelector('#compress-progress-modal .modal-container');
  if (container) {
    container.classList.remove('with-side-panel');
  }
}

// 显示压缩进度弹窗
function showCompressProgressModal() {
  // 确保弹窗已创建
  createCompressProgressModal();
  
  // 获取元素
  const modal = document.getElementById('compress-progress-modal');
  const progressFill = document.getElementById('compress-progress-fill');
  const progressPercent = document.getElementById('compress-progress-percent');
  const progressProcessed = document.getElementById('compress-progress-processed');
  const progressTotal = document.getElementById('compress-progress-total');
  const successCount = document.getElementById('compress-success-count');
  const failedCount = document.getElementById('compress-failed-count');
  const pendingCount = document.getElementById('compress-pending-count');
  const successList = document.getElementById('compress-success-list');
  const failedList = document.getElementById('compress-failed-list');
  const pendingList = document.getElementById('compress-pending-list');
  const startBtn = document.getElementById('compress-start-btn');
  const pauseBtn = document.getElementById('compress-pause-btn');
  const closeBtn = document.getElementById('compress-close-btn');
  const savedSpace = document.getElementById('compress-saved-space');
  const currentFile = document.getElementById('compress-current-file');
  
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
  startBtn.style.display = 'block';
  pauseBtn.style.display = 'none';
  pauseBtn.textContent = '暂停';
  closeBtn.disabled = false;
  savedSpace.querySelector('span').textContent = '0MB';
  currentFile.textContent = '-';
  
  // 确保所有侧边面板都处于关闭状态
  closeSidePanel();
  
  // 准备待压缩文件列表但不开始压缩
  prepareCompression();
  
  // 显示弹窗
  modal.style.display = 'flex';
}

// 隐藏压缩进度弹窗
function hideCompressProgressModal() {
  const modal = document.getElementById('compress-progress-modal');
  if (modal) {
    modal.style.display = 'none';
  }
  
  // 如果有正在进行的压缩，取消它
  if (window.compressionUnsubscribe) {
    window.electronAPI.cancelCompression();
    window.compressionUnsubscribe();
    window.compressionUnsubscribe = null;
  }
}

// 准备压缩处理
function prepareCompression() {
  // 获取选中的视频文件
  const selectedVideos = window.videoData.getVideos().filter(video => video.selected);
  
  if (selectedVideos.length === 0) {
    // 如果没有选中的视频，显示提示并关闭弹窗
    const customAlert = window.showCustomAlert || alert;
    customAlert('请先选择要压缩的视频');
    hideCompressProgressModal();
    return;
  }
  
  // 显示总数量
  const progressTotal = document.getElementById('compress-progress-total');
  const pendingCount = document.getElementById('compress-pending-count');
  progressTotal.textContent = selectedVideos.length;
  pendingCount.textContent = selectedVideos.length;
  
  // 更新待压缩列表
  const pendingList = document.getElementById('compress-pending-list');
  pendingList.innerHTML = '';
  selectedVideos.forEach(video => {
    const li = document.createElement('li');
    li.className = 'bg-blue-50 rounded-lg p-3 mb-3 shadow-sm';
    li.innerHTML = `
      <div class="text-sm text-gray-800 truncate font-medium">${video.fileName}</div>
    `;
    pendingList.appendChild(li);
  });
  
  // 保存选中的视频列表，等待开始按钮点击
  window.selectedVideosToCompress = selectedVideos;
}

// 开始压缩处理
function startCompression() {
  // 获取之前准备好的视频列表
  const videos = window.selectedVideosToCompress;
  
  if (!videos || videos.length === 0) {
    const customAlert = window.showCustomAlert || alert;
    customAlert('没有找到要压缩的视频');
    hideCompressProgressModal();
    return;
  }
  
  // 获取压缩选项
  const mode = document.querySelector('input[name="compress-mode"]:checked').value;
  const autoTag = document.getElementById('auto-tag').checked;
  const autoDelete = document.getElementById('auto-delete').checked;
  const useGpu = document.getElementById('use-gpu').checked;
  
  // 如果启用GPU加速，先检查是否支持
  if (useGpu) {
    checkGpuSupport(() => {
      // 启动真实压缩
      startRealCompression(videos, mode, autoTag, autoDelete, useGpu);
    });
  } else {
    // 直接启动压缩
    startRealCompression(videos, mode, autoTag, autoDelete, useGpu);
  }
}

// 检查GPU支持
function checkGpuSupport(callback) {
  try {
    window.electronAPI.checkGpuSupport().then(result => {
      if (!result.supported) {
        // 显示GPU不支持的错误
        const customAlert = window.showCustomAlert || alert;
        customAlert('您的系统不支持GPU加速，请使用标准模式压缩');
        
        // 取消选择GPU选项
        document.getElementById('use-gpu').checked = false;
        
        callback();
      } else {
        // GPU支持，继续
        callback();
      }
    }).catch(error => {
      console.error('检查GPU支持失败:', error);
      const customAlert = window.showCustomAlert || alert;
      customAlert('检查GPU支持失败，将使用标准模式压缩');
      
      // 取消选择GPU选项
      document.getElementById('use-gpu').checked = false;
      
      callback();
    });
  } catch (error) {
    console.error('检查GPU支持时出错:', error);
    const customAlert = window.showCustomAlert || alert;
    customAlert('检查GPU支持失败，将使用标准模式压缩');
    
    // 取消选择GPU选项
    document.getElementById('use-gpu').checked = false;
    
    callback();
  }
}

// 启动真实压缩
function startRealCompression(videos, mode, autoTag, autoDelete, useGpu) {
  // 获取UI元素
  const closeBtn = document.getElementById('compress-close-btn');
  const pauseBtn = document.getElementById('compress-pause-btn');
  const startBtn = document.getElementById('compress-start-btn');
  
  // 更新UI状态
  startBtn.style.display = 'none';
  pauseBtn.style.display = 'block';
  closeBtn.disabled = true;
  
  // 创建压缩选项
  const options = {
    mode,
    autoTag,
    autoDelete,
    useGpu
  };
  
  // 创建进度监听器
  const unsubscribe = window.electronAPI.onCompressionProgress(progress => {
    updateCompressionProgress(progress);
  });
  
  // 保存取消监听器，以便在关闭弹窗时取消
  window.compressionUnsubscribe = unsubscribe;
  
  // 调用Electron API开始压缩
  window.electronAPI.compressVideos(videos, options)
    .then(response => {
      console.log('压缩任务已启动:', response);
    })
    .catch(error => {
      console.error('启动压缩任务失败:', error);
      const customAlert = window.showCustomAlert || alert;
      customAlert('启动压缩任务失败: ' + error.message);
      
      // 恢复UI状态
      startBtn.style.display = 'block';
      pauseBtn.style.display = 'none';
      closeBtn.disabled = false;
    });
}

// 更新压缩进度
function updateCompressionProgress(progress) {
  // 检查是否取消了操作
  if (progress.cancelled) {
    console.log('压缩操作已取消');
    return;
  }
  
  // 获取UI元素
  const progressFill = document.getElementById('compress-progress-fill');
  const progressPercent = document.getElementById('compress-progress-percent');
  const progressProcessed = document.getElementById('compress-progress-processed');
  const successCountEl = document.getElementById('compress-success-count');
  const failedCountEl = document.getElementById('compress-failed-count');
  const pendingCountEl = document.getElementById('compress-pending-count');
  const successList = document.getElementById('compress-success-list');
  const failedList = document.getElementById('compress-failed-list');
  const pendingList = document.getElementById('compress-pending-list');
  const closeBtn = document.getElementById('compress-close-btn');
  const pauseBtn = document.getElementById('compress-pause-btn');
  const savedSpaceEl = document.getElementById('compress-saved-space').querySelector('span');
  const currentFile = document.getElementById('compress-current-file');
  
  // 当前文件进度相关元素
  const currentFileProgress = document.getElementById('compress-current-file-progress');
  const currentPercent = document.getElementById('compress-current-percent');
  const currentSpeed = document.getElementById('compress-current-speed');
  const currentEta = document.getElementById('compress-current-eta');
  
  // 更新进度条
  progressFill.style.width = `${progress.percent}%`;
  progressPercent.textContent = progress.percent;
  progressProcessed.textContent = progress.processed;
  
  // 更新统计数据
  successCountEl.textContent = progress.success;
  failedCountEl.textContent = progress.failed;
  pendingCountEl.textContent = progress.pending;
  
  // 更新节省空间
  if (progress.totalSavedSpace) {
    savedSpaceEl.textContent = `${progress.totalSavedSpace}MB`;
  }
  
  // 处理当前文件进度显示
  if (progress.currentFileProgress) {
    currentFileProgress.style.display = 'flex';
    currentPercent.textContent = `${progress.currentFileProgress.percent}%`;
    
    // 显示速度信息
    if (progress.currentFileProgress.speed) {
      currentSpeed.textContent = `${progress.currentFileProgress.speed}x`;
    } else {
      currentSpeed.textContent = '-';
    }
    
    // 显示预估时间
    if (progress.currentFileProgress.eta) {
      currentEta.textContent = progress.currentFileProgress.eta;
    } else {
      currentEta.textContent = '-';
    }
  } else {
    currentFileProgress.style.display = 'none';
  }
  
  // 处理暂停/继续状态
  if (progress.paused !== undefined) {
    if (progress.paused) {
      pauseBtn.textContent = '继续';
      closeBtn.disabled = false;
      // 暂停时清空当前处理文件显示
      currentFile.textContent = '-';
      currentFileProgress.style.display = 'none';
    } else {
      pauseBtn.textContent = '暂停';
      closeBtn.disabled = true;
    }
  }
  
  // 处理成功列表更新
  if (progress.successList && progress.successList.length > 0) {
    // 清空列表，然后重新填充（避免重复）
    successList.innerHTML = '';
    
    progress.successList.forEach(item => {
      const li = document.createElement('li');
      li.className = 'bg-gray-50 rounded-lg p-4 mb-3 shadow-sm border border-gray-200';
      
      // 获取模式文本
      const modeName = item.mode === 'perceptual' ? '高效感知无损' : '完全无损';
      const modeText = item.useGpu ? `${modeName}_GPU` : modeName;
      
      li.innerHTML = `
        <div class="mb-3">
          <div class="text-sm text-gray-800 font-medium truncate" title="${item.fileName}">${item.fileName}</div>
        </div>
        <div class="flex items-center justify-between flex-wrap gap-2">
          <div class="flex items-center gap-2">
            <span class="text-xs text-gray-500">${item.originalSize}MB</span>
            <i class="fas fa-arrow-right text-xs text-gray-400"></i>
            <span class="text-xs font-semibold text-green-700">${item.compressedSize}MB</span>
            <span class="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">节省${item.savedSpace}MB</span>
          </div>
          <div class="flex items-center gap-1">
            <i class="fas fa-tag text-xs ${item.autoTag ? 'text-blue-500' : 'text-gray-300'}" title="${item.autoTag ? '已添加标签' : '未添加标签'}"></i>
            <i class="fas fa-trash-alt text-xs ${item.autoDelete ? 'text-red-500' : 'text-gray-300'}" title="${item.autoDelete ? '已删除原文件' : '未删除原文件'}"></i>
            <i class="fas fa-microchip text-xs ${item.useGpu ? 'text-purple-500' : 'text-gray-300'}" title="${item.useGpu ? '已使用GPU加速' : '未使用GPU加速'}"></i>
          </div>
        </div>
      `;
      
      successList.appendChild(li);
    });
  }
  
  // 处理失败列表更新
  if (progress.failedList && progress.failedList.length > 0) {
    // 清空列表，然后重新填充（避免重复）
    failedList.innerHTML = '';
    
    progress.failedList.forEach(item => {
      const li = document.createElement('li');
      li.className = 'bg-red-50 rounded-lg p-4 mb-3 shadow-sm border border-red-200';
      
      // 简化错误信息显示
      let errorText = item.error;
      if (errorText.length > 80) {
        errorText = errorText.substring(0, 80) + '...';
      }
      
      li.innerHTML = `
        <div class="mb-2">
          <div class="text-sm text-gray-800 font-medium truncate" title="${item.fileName}">${item.fileName}</div>
        </div>
        <div class="flex items-start">
          <i class="fas fa-exclamation-triangle text-red-500 text-xs mt-0.5 mr-2 flex-shrink-0"></i>
          <span class="text-xs text-red-600 leading-relaxed" title="${item.error}">${errorText}</span>
        </div>
      `;
      
      failedList.appendChild(li);
    });
  }
  
  // 处理待处理列表更新
  if (progress.pendingList) {
    // 清空列表，然后重新填充（避免重复）
    pendingList.innerHTML = '';
    
    progress.pendingList.forEach(item => {
      const li = document.createElement('li');
      li.className = 'bg-blue-50 rounded-lg p-3 mb-3 shadow-sm';
      li.innerHTML = `
        <div class="text-sm text-gray-800 truncate font-medium">${item.fileName}</div>
      `;
      pendingList.appendChild(li);
    });
  }
  
  // 处理完成状态
  if (progress.isCompleted) {
    closeBtn.disabled = false;
    pauseBtn.style.display = 'none';
    // 完成时清空当前处理文件显示
    currentFile.textContent = '-';
    currentFileProgress.style.display = 'none';
  }
  
  // 更新当前处理文件
  if (progress.currentFile) {
    currentFile.textContent = progress.currentFile;
  }
}

// 暂停压缩
function pauseCompression() {
  console.log('暂停压缩');
  window.electronAPI.pauseCompression();
}

// 继续压缩
function resumeCompression() {
  console.log('继续压缩');
  
  // 重新读取当前弹窗中的参数设置
  const mode = document.querySelector('input[name="compress-mode"]:checked').value;
  const autoTag = document.getElementById('auto-tag').checked;
  const autoDelete = document.getElementById('auto-delete').checked;
  const useGpu = document.getElementById('use-gpu').checked;
  
  const newOptions = {
    mode,
    autoTag,
    autoDelete,
    useGpu
  };
  
  console.log('继续压缩时使用新参数:', newOptions);
  
  // 使用新的API方法传递更新的参数
  window.electronAPI.resumeCompressionWithOptions(newOptions);
}

// 启动批量压缩
async function startCompressVideos() {
  // 显示压缩进度弹窗
  showCompressProgressModal();
}

// 导出模块
export {
  showCompressProgressModal,
  hideCompressProgressModal,
  startCompressVideos
}; 