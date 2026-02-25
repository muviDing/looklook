/**
 * 重复校验模块
 * 提供视频重复检测和管理功能
 */

import { videoData, onVideoDataChanged } from './videoData.js';

let duplicateGroups = [];
let selectedVideoIds = new Set();
let moveToTrash = true;

function getResolutionLabel(resolution) {
  if (!resolution) return '';
  const parts = resolution.split('×');
  if (parts.length !== 2) return resolution;
  const height = parseInt(parts[1]) || 0;
  if (height >= 2160) return '4K';
  if (height >= 1440) return '2K';
  if (height >= 1080) return '1080p';
  if (height >= 720) return '720p';
  if (height >= 480) return '480p';
  if (height > 0) return `${height}p`;
  return '';
}

function createDuplicateCheckModal() {
  if (document.getElementById('duplicate-check-modal')) {
    return;
  }

  const modalOverlay = document.createElement('div');
  modalOverlay.id = 'duplicate-check-modal';
  modalOverlay.className = 'duplicate-modal-overlay';
  modalOverlay.style.display = 'none';

  modalOverlay.innerHTML = `
    <div class="duplicate-modal">
      <div class="duplicate-modal-header">
        <h2>校验重复文件</h2>
      </div>
      <div class="duplicate-modal-body" id="duplicate-modal-body">
        <div class="duplicate-loading">
          <div class="spinner"></div>
          <p>正在扫描重复文件...</p>
        </div>
      </div>
      <div class="duplicate-modal-footer">
        <div class="duplicate-footer-left">
          <button class="duplicate-btn duplicate-btn-secondary" id="duplicate-close-btn">关闭</button>
        </div>
        <div class="duplicate-footer-right">
          <button class="duplicate-btn duplicate-btn-danger" id="duplicate-confirm-btn" disabled>
            删除选中的重复文件
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modalOverlay);

  document.getElementById('duplicate-close-btn').addEventListener('click', closeDuplicateModal);
  document.getElementById('duplicate-confirm-btn').addEventListener('click', confirmDeleteDuplicates);

  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
      closeDuplicateModal();
    }
  });
}

function renderDuplicateContent(data) {
  const body = document.getElementById('duplicate-modal-body');

  if (!data.groups || data.groups.length === 0) {
    body.innerHTML = `
      <div class="duplicate-empty">
        <i class="fas fa-check-circle"></i>
        <p class="empty-title">未发现重复视频</p>
        <p class="empty-desc">您的视频库中没有重复的文件</p>
      </div>
    `;
    document.getElementById('duplicate-confirm-btn').disabled = true;
    return;
  }

  duplicateGroups = data.groups;
  selectedVideoIds = new Set();
  moveToTrash = true;

  let html = `
    <div class="duplicate-options">
      <div class="duplicate-options-title">附加选项</div>
      <label class="duplicate-option-item">
        <input type="checkbox" id="trash-checkbox" checked>
        <div class="duplicate-option-text">
          <div class="duplicate-option-label">同时将本地文件移入系统回收站</div>
          <div class="duplicate-option-desc">勾选时，相关本地文件将被移入回收站，释放空间且可恢复。</div>
        </div>
      </label>
    </div>
    <div class="duplicate-list-header">
      <div class="duplicate-list-title">
        重复文件列表
        <span class="duplicate-selected-badge" id="duplicate-selected-count">已选0项</span>
      </div>
      <button class="duplicate-auto-select-btn" id="duplicate-auto-select-btn">自动选择</button>
    </div>
    <div class="duplicate-groups" id="duplicate-groups-container">
  `;

  data.groups.forEach((group, groupIndex) => {
    html += `
      <div class="duplicate-group" data-group-id="${group.id}">
        <div class="duplicate-group-header" data-group-index="${groupIndex}">
          <span class="duplicate-group-name">重复组 ${groupIndex + 1}</span>
          <span class="duplicate-group-count">${group.fileCount}个文件</span>
          <span class="duplicate-group-reason">${group.reason}</span>
          <i class="fas fa-chevron-down duplicate-group-toggle"></i>
        </div>
        <div class="duplicate-group-body">
    `;

    group.videos.forEach(video => {
      const resLabel = getResolutionLabel(video.resolution);
      const isRemoveRecommended = video.recommended === 'remove';
      const tagClass = isRemoveRecommended ? 'duplicate-tag-remove' : 'duplicate-tag-keep';
      const tagText = isRemoveRecommended ? '推荐移除' : '推荐保留';

      html += `
        <div class="duplicate-video-item" data-video-id="${video.id}">
          <input type="checkbox" class="duplicate-video-checkbox" data-video-id="${video.id}">
          <span class="duplicate-video-name" title="${escapeHtml(video.filePath || video.fileName)}">${escapeHtml(video.fileName)}</span>
          <span class="duplicate-tag ${tagClass}">${tagText}</span>
          ${resLabel ? `<span class="duplicate-video-meta">${resLabel}</span>` : ''}
          <span class="duplicate-video-meta">${video.fileSize || ''}</span>
          <button class="duplicate-video-open-btn" data-filepath="${escapeHtml(video.filePath || '')}">打开</button>
        </div>
      `;
    });

    html += `
        </div>
      </div>
    `;
  });

  html += '</div>';
  body.innerHTML = html;

  setupDuplicateEventListeners();
  updateSelectedCount();
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function setupDuplicateEventListeners() {
  const trashCheckbox = document.getElementById('trash-checkbox');
  if (trashCheckbox) {
    trashCheckbox.addEventListener('change', (e) => {
      moveToTrash = e.target.checked;
    });
  }

  const autoSelectBtn = document.getElementById('duplicate-auto-select-btn');
  if (autoSelectBtn) {
    autoSelectBtn.addEventListener('click', autoSelectDuplicates);
  }

  document.querySelectorAll('.duplicate-group-header').forEach(header => {
    header.addEventListener('click', () => {
      const group = header.closest('.duplicate-group');
      group.classList.toggle('collapsed');
    });
  });

  document.querySelectorAll('.duplicate-video-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const videoId = e.target.dataset.videoId;
      if (e.target.checked) {
        selectedVideoIds.add(videoId);
      } else {
        selectedVideoIds.delete(videoId);
      }
      updateSelectedCount();
    });
  });

  document.querySelectorAll('.duplicate-video-open-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const filePath = btn.dataset.filepath;
      if (filePath) {
        window.electronAPI.openSourceFolder(filePath);
      }
    });
  });
}

function autoSelectDuplicates() {
  selectedVideoIds.clear();

  duplicateGroups.forEach(group => {
    group.videos.forEach(video => {
      if (video.recommended === 'remove') {
        selectedVideoIds.add(String(video.id));
      }
    });
  });

  document.querySelectorAll('.duplicate-video-checkbox').forEach(checkbox => {
    checkbox.checked = selectedVideoIds.has(checkbox.dataset.videoId);
  });

  updateSelectedCount();
}

function updateSelectedCount() {
  const badge = document.getElementById('duplicate-selected-count');
  if (badge) {
    badge.textContent = `已选${selectedVideoIds.size}项`;
  }

  const confirmBtn = document.getElementById('duplicate-confirm-btn');
  if (confirmBtn) {
    confirmBtn.disabled = selectedVideoIds.size === 0;
    confirmBtn.textContent = selectedVideoIds.size > 0
      ? `删除选中的 ${selectedVideoIds.size} 个重复文件`
      : '删除选中的重复文件';
  }
}

async function confirmDeleteDuplicates() {
  if (selectedVideoIds.size === 0) return;

  const { showCustomConfirm } = await import('./areaC.js');

  showCustomConfirm(
    '确认删除',
    `确定要删除选中的 ${selectedVideoIds.size} 个重复视频${moveToTrash ? '并将本地文件移入回收站' : '记录'}吗？`,
    async () => {
      const confirmBtn = document.getElementById('duplicate-confirm-btn');
      confirmBtn.disabled = true;
      confirmBtn.textContent = '正在处理...';

      try {
        const videoIds = Array.from(selectedVideoIds);
        const result = await window.electronAPI.deleteDuplicateVideos(videoIds, moveToTrash);

        const allVideos = await window.electronAPI.getVideos();
        videoData.length = 0;
        videoData.push(...allVideos);

        document.getElementById('total-count').textContent = videoData.length;
        onVideoDataChanged();

        closeDuplicateModal();

        const { showCustomAlert } = await import('./areaC.js');
        const trashMsg = moveToTrash && result.trashed > 0 ? `，${result.trashed} 个文件已移入回收站` : '';
        showCustomAlert(`已成功删除 ${result.deleted} 个重复视频记录${trashMsg}。`, 'success');
      } catch (error) {
        console.error('删除重复文件失败:', error);
        confirmBtn.disabled = false;
        confirmBtn.textContent = `删除选中的 ${selectedVideoIds.size} 个重复文件`;

        const { showCustomAlert } = await import('./areaC.js');
        showCustomAlert('删除重复文件失败: ' + error.message, 'error');
      }
    }
  );
}

function closeDuplicateModal() {
  const modal = document.getElementById('duplicate-check-modal');
  if (modal) {
    modal.style.display = 'none';
  }
  duplicateGroups = [];
  selectedVideoIds.clear();
}

async function showDuplicateCheckModal() {
  createDuplicateCheckModal();

  const modal = document.getElementById('duplicate-check-modal');
  modal.style.display = 'flex';

  const body = document.getElementById('duplicate-modal-body');
  body.innerHTML = `
    <div class="duplicate-loading">
      <div class="spinner"></div>
      <p>正在扫描重复文件...</p>
    </div>
  `;
  document.getElementById('duplicate-confirm-btn').disabled = true;

  try {
    const data = await window.electronAPI.checkDuplicates();
    renderDuplicateContent(data);
  } catch (error) {
    console.error('校验重复文件失败:', error);
    body.innerHTML = `
      <div class="duplicate-empty">
        <i class="fas fa-exclamation-triangle" style="color: #ef4444;"></i>
        <p class="empty-title" style="color: #ef4444;">校验失败</p>
        <p class="empty-desc">${error.message || '发生未知错误'}</p>
      </div>
    `;
  }
}

export { showDuplicateCheckModal };
