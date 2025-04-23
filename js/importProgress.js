/**
 * 导入进度模块
 * 提供视频导入进度显示功能
 */

// 创建导入进度弹窗的HTML结构
function createImportProgressModal() {
  // 如果已经存在则不再创建
  if (document.getElementById('import-progress-modal')) {
    return;
  }
  
  // 创建模态框容器
  const modalOverlay = document.createElement('div');
  modalOverlay.id = 'import-progress-modal';
  modalOverlay.className = 'modal-overlay';
  modalOverlay.style.display = 'none';
  
  // 创建模态框内容
  modalOverlay.innerHTML = `
    <div class="modal-container">
      <div class="modal-header">
        <h2>导入视频</h2>
      </div>
      <div class="modal-body">
        <div class="progress-container">
          <div class="progress-bar">
            <div class="progress-fill" id="progress-fill" style="width: 0%"></div>
          </div>
          <div class="progress-text">
            <span>进度：<span id="progress-percent">0</span>%</span>
            <span><span id="progress-processed">0</span>/<span id="progress-total">0</span></span>
          </div>
        </div>
        
        <div class="stats-container">
          <div class="stat-item success">
            <div class="stat-label">成功导入</div>
            <div class="stat-count" id="success-count" data-panel="success-panel">0</div>
          </div>
          <div class="stat-item failure">
            <div class="stat-label">导入失败</div>
            <div class="stat-count" id="failed-count" data-panel="failed-panel">0</div>
          </div>
          <div class="stat-item canceled">
            <div class="stat-label">已取消</div>
            <div class="stat-count" id="canceled-count" data-panel="canceled-panel">0</div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="cancel-import-btn">取消</button>
        <button class="btn btn-primary" id="confirm-import-btn" disabled>确定</button>
      </div>
      
      <!-- 侧边抽屉面板 -->
      <div class="side-panel" id="success-panel">
        <div class="side-panel-header">
          <div class="side-panel-title">成功导入的文件</div>
          <button class="side-panel-close" aria-label="关闭面板">&times;</button>
        </div>
        <div class="side-panel-content">
          <ul class="file-list" id="success-list"></ul>
        </div>
      </div>
      
      <div class="side-panel" id="failed-panel">
        <div class="side-panel-header">
          <div class="side-panel-title">导入失败的文件</div>
          <button class="side-panel-close" aria-label="关闭面板">&times;</button>
        </div>
        <div class="side-panel-content">
          <ul class="file-list" id="failed-list"></ul>
        </div>
      </div>
      
      <div class="side-panel" id="canceled-panel">
        <div class="side-panel-header">
          <div class="side-panel-title">已取消导入的文件</div>
          <button class="side-panel-close" aria-label="关闭面板">&times;</button>
        </div>
        <div class="side-panel-content">
          <ul class="file-list" id="canceled-list"></ul>
        </div>
      </div>
      
      <!-- 遮罩层，用于点击关闭侧边面板 -->
      <div class="side-panel-overlay"></div>
    </div>
  `;
  
  // 添加到文档
  document.body.appendChild(modalOverlay);
  
  // 添加事件监听器
  setupEventListeners();
}

// 设置事件监听器
function setupEventListeners() {
  // 获取元素
  const modal = document.getElementById('import-progress-modal');
  const cancelBtn = document.getElementById('cancel-import-btn');
  const confirmBtn = document.getElementById('confirm-import-btn');
  const successCount = document.getElementById('success-count');
  const failedCount = document.getElementById('failed-count');
  
  // 取消导入按钮
  cancelBtn.addEventListener('click', () => {
    if (cancelBtn.textContent === '确定') {
      // 导入完成，点击确定关闭弹窗
      hideImportProgressModal();
    } else {
      // 导入进行中，点击取消
      // 先关闭所有侧边面板，避免误导
      closeSidePanel();
      window.electronAPI.cancelImport();
      cancelBtn.disabled = true;
      cancelBtn.textContent = '正在取消...';
    }
  });
  
  // 确认按钮
  confirmBtn.addEventListener('click', () => {
    hideImportProgressModal();
  });
  
  // 侧边面板打开按钮 - 使用data-panel属性绑定对应面板
  document.querySelectorAll('[data-panel]').forEach(el => {
    el.addEventListener('click', () => {
      // 无论数量是否为0都允许打开面板
      const panelId = el.getAttribute('data-panel');
      openSidePanel(panelId);
    });
  });
  
  // 关闭按钮
  document.querySelectorAll('.side-panel-close').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation(); // 阻止事件冒泡
      closeSidePanel();
    });
  });
  
  // ESC键关闭面板
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      // 如果有打开的侧边面板，先关闭面板
      const openPanel = document.querySelector('.side-panel.active');
      if (openPanel) {
        closeSidePanel();
      } else if (modal.style.display === 'flex') {
        // 否则关闭整个弹窗
        hideImportProgressModal();
      }
    }
  });
}

// 打开侧边面板
function openSidePanel(panelId) {
  // 获取所有面板并隐藏
  const panels = document.querySelectorAll('.side-panel');
  panels.forEach(panel => {
    panel.classList.remove('active');
  });
  
  // 激活选中的面板
  const selectedPanel = document.getElementById(panelId);
  if (selectedPanel) {
    selectedPanel.classList.add('active');
    // 给主容器添加侧边面板活跃状态类
    document.querySelector('.modal-container').classList.add('with-side-panel');
  }
}

// 关闭侧边面板
function closeSidePanel() {
  // 移除主容器的侧边面板活跃状态类
  document.querySelector('.modal-container').classList.remove('with-side-panel');
  
  // 同时移除所有面板的激活状态
  document.querySelectorAll('.side-panel').forEach(panel => {
    panel.classList.remove('active');
  });
}

// 显示导入进度弹窗
function showImportProgressModal() {
  // 确保弹窗已创建
  createImportProgressModal();
  
  // 获取元素
  const modal = document.getElementById('import-progress-modal');
  const progressFill = document.getElementById('progress-fill');
  const progressPercent = document.getElementById('progress-percent');
  const progressProcessed = document.getElementById('progress-processed');
  const progressTotal = document.getElementById('progress-total');
  const successCount = document.getElementById('success-count');
  const failedCount = document.getElementById('failed-count');
  const canceledCount = document.getElementById('canceled-count');
  const successList = document.getElementById('success-list');
  const failedList = document.getElementById('failed-list');
  const cancelBtn = document.getElementById('cancel-import-btn');
  const confirmBtn = document.getElementById('confirm-import-btn');
  const modalContainer = document.querySelector('.modal-container');
  
  // 重置弹窗状态
  progressFill.style.width = '0%';
  progressPercent.textContent = '0';
  progressProcessed.textContent = '0';
  progressTotal.textContent = '0';
  successCount.textContent = '0';
  failedCount.textContent = '0';
  canceledCount.textContent = '0';
  successList.innerHTML = '';
  failedList.innerHTML = '';
  cancelBtn.disabled = false;
  cancelBtn.textContent = '取消';
  confirmBtn.disabled = true;
  
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

// 隐藏导入进度弹窗
function hideImportProgressModal() {
  const modal = document.getElementById('import-progress-modal');
  if (modal) {
    modal.style.display = 'none';
  }
  
  // 移除进度更新回调
  if (window.removeImportProgressCallback) {
    window.removeImportProgressCallback();
    window.removeImportProgressCallback = null;
  }
}

// 设置进度更新回调
function setupProgressCallback() {
  // 移除之前的回调
  if (window.removeImportProgressCallback) {
    window.removeImportProgressCallback();
  }
  
  // 注册新的回调
  window.removeImportProgressCallback = window.electronAPI.onImportProgress(updateProgress);
}

// 更新进度显示
function updateProgress(progress) {
  // 获取元素
  const progressFill = document.getElementById('progress-fill');
  const progressPercent = document.getElementById('progress-percent');
  const progressProcessed = document.getElementById('progress-processed');
  const progressTotal = document.getElementById('progress-total');
  const successCount = document.getElementById('success-count');
  const failedCount = document.getElementById('failed-count');
  const canceledCount = document.getElementById('canceled-count');
  const successList = document.getElementById('success-list');
  const failedList = document.getElementById('failed-list');
  const canceledList = document.getElementById('canceled-list');
  const cancelBtn = document.getElementById('cancel-import-btn');
  const confirmBtn = document.getElementById('confirm-import-btn');
  
  // 处理取消导入的情况
  if (progress.cancelled) {
    // 用户已取消导入，转换为"确定"按钮用于关闭弹窗
    cancelBtn.textContent = '确定';
    cancelBtn.disabled = false;
    confirmBtn.style.display = 'none';
    
    // 确保侧边面板已关闭
    closeSidePanel();
    
    // 更新"已取消"计数 - 显示未处理的文件数量
    if (progress.canceled) {
      canceledCount.textContent = progress.canceled;
      
      // 更新已取消列表 - 如果我们有取消的文件列表
      if (progress.canceledList && progress.canceledList.length > 0) {
        canceledList.innerHTML = '';
        progress.canceledList.forEach(item => {
          const li = document.createElement('li');
          li.textContent = item.fileName || '未命名文件';
          canceledList.appendChild(li);
        });
      } else if (progress.canceled > 0) {
        // 如果没有具体的取消列表，但有取消数量，添加一个通用消息
        canceledList.innerHTML = '';
        const li = document.createElement('li');
        li.textContent = `${progress.canceled} 个文件取消导入`;
        li.className = 'generic-message';
        canceledList.appendChild(li);
      }
    }
    
    // 在进度条下方显示已取消的状态
    const statusText = document.createElement('div');
    statusText.textContent = '导入已取消';
    statusText.className = 'text-center text-gray-500 mt-2 mb-2';
    
    const progressContainer = document.querySelector('.progress-container');
    // 确保我们不会重复添加状态文本
    if (!document.querySelector('.progress-container .text-center')) {
      progressContainer.appendChild(statusText);
    }
    
    return;
  }
  
  // 更新进度显示
  progressFill.style.width = `${progress.percent}%`;
  progressPercent.textContent = progress.percent;
  progressProcessed.textContent = progress.processed;
  progressTotal.textContent = progress.total;
  successCount.textContent = progress.success;
  failedCount.textContent = progress.failed;
  
  // 更新已取消计数（如果有）
  if (progress.canceled) {
    canceledCount.textContent = progress.canceled;
    
    // 更新已取消列表 - 与上面的逻辑相同
    if (progress.canceledList && progress.canceledList.length > 0) {
      canceledList.innerHTML = '';
      progress.canceledList.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item.fileName || '未命名文件';
        canceledList.appendChild(li);
      });
    } else if (progress.canceled > 0) {
      canceledList.innerHTML = '';
      const li = document.createElement('li');
      li.textContent = `${progress.canceled} 个文件取消导入`;
      li.className = 'generic-message';
      canceledList.appendChild(li);
    }
  }
  
  // 更新成功列表
  successList.innerHTML = '';
  if (progress.successList && progress.successList.length > 0) {
    progress.successList.forEach(item => {
      const li = document.createElement('li');
      li.textContent = item.fileName;
      
      // 添加标签
      if (!item.isNew) {
        const tag = document.createElement('span');
        tag.className = 'tag existing-tag';
        tag.textContent = '已存在';
        li.appendChild(tag);
      } else if (item.warning) {
        const tag = document.createElement('span');
        tag.className = 'tag warning-tag';
        tag.textContent = item.warning;
        li.appendChild(tag);
      }
      
      successList.appendChild(li);
    });
  }
  
  // 更新失败列表
  failedList.innerHTML = '';
  if (progress.failedList && progress.failedList.length > 0) {
    progress.failedList.forEach(item => {
      const li = document.createElement('li');
      li.textContent = item.fileName;
      
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
  
  // 判断是否完成
  if (progress.processed === progress.total && progress.total > 0) {
    cancelBtn.textContent = '确定';
    cancelBtn.disabled = false;
    confirmBtn.style.display = 'none';
    
    // 自动打开有问题的面板
    if (progress.failed > 0) {
      setTimeout(() => openSidePanel('failed-panel'), 500);
    } else if (progress.success > 0) {
      // 如果没有失败但有成功，自动打开成功面板（如果成功数量不多，否则让用户自己点击）
      if (progress.success <= 10) {
        setTimeout(() => openSidePanel('success-panel'), 500);
      }
    }
  }
}

// 导出模块
export {
  showImportProgressModal,
  hideImportProgressModal
}; 