/**
 * 显示自定义确认对话框 (苹果风格)
 * @param {Object} options - 配置选项
 * @param {string} options.title - 对话框标题
 * @param {string} options.message - 对话框消息内容
 * @param {string} options.confirmText - 确认按钮文本 (默认: "确定")
 * @param {string} options.cancelText - 取消按钮文本 (默认: "取消")
 * @param {string} options.type - 对话框类型: "info", "warning", "danger" (默认: "info")
 * @param {boolean} options.closeOnBackdrop - 点击背景是否关闭对话框 (默认: false) 
 * @returns {Promise<boolean>} 点击确认返回true，点击取消返回false
 */
function showCustomConfirm(options) {
  const { 
    title = "确认", 
    message = "", 
    confirmText = "确定", 
    cancelText = "取消", 
    type = "info",
    closeOnBackdrop = false
  } = options;

  return new Promise((resolve) => {
    // 防止多个弹窗同时存在
    const existingModal = document.getElementById('custom-confirm-dialog');
    if (existingModal) {
      existingModal.remove();
    }

    // 创建弹窗容器
    const modal = document.createElement('div');
    modal.id = 'custom-confirm-dialog';
    modal.className = 'modal-overlay';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.right = '0';
    modal.style.bottom = '0';
    modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    modal.style.backdropFilter = 'blur(5px)';
    modal.style.display = 'flex';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    modal.style.zIndex = '9999';
    modal.style.opacity = '0';
    modal.style.transition = 'opacity 0.2s ease';

    // 创建弹窗内容
    const dialog = document.createElement('div');
    dialog.className = 'modal-container';
    dialog.style.backgroundColor = 'white';
    dialog.style.width = '400px';
    dialog.style.maxWidth = '90%';
    dialog.style.borderRadius = '12px';
    dialog.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.15)';
    dialog.style.overflow = 'hidden';
    dialog.style.transform = 'scale(0.9)';
    dialog.style.transition = 'transform 0.3s ease';

    // 设置不同类型的颜色
    let headerColor, confirmBtnColor, confirmBtnHoverColor;
    switch (type) {
      case 'danger':
        headerColor = '#f44336';
        confirmBtnColor = '#f44336';
        confirmBtnHoverColor = '#d32f2f';
        break;
      case 'warning':
        headerColor = '#ff9800';
        confirmBtnColor = '#ff9800';
        confirmBtnHoverColor = '#f57c00';
        break;
      case 'info':
      default:
        headerColor = '#4f46e5';
        confirmBtnColor = '#4f46e5';
        confirmBtnHoverColor = '#4338ca';
    }

    // 创建弹窗头部
    const header = document.createElement('div');
    header.className = 'modal-header';
    header.style.padding = '16px 20px';
    header.style.borderBottom = '1px solid #e5e7eb';
    header.style.display = 'flex';
    header.style.justifyContent = 'center'; // 居中标题
    header.style.alignItems = 'center';
    header.style.position = 'relative';

    // 创建标题
    const titleElement = document.createElement('h3');
    titleElement.style.margin = '0';
    titleElement.style.fontSize = '18px';
    titleElement.style.color = headerColor;
    titleElement.style.fontWeight = '600';
    titleElement.textContent = title;
    header.appendChild(titleElement);

    // 创建弹窗内容
    const body = document.createElement('div');
    body.className = 'modal-body';
    body.style.padding = '20px';
    body.style.textAlign = 'center';
    body.style.color = '#374151';
    body.style.fontSize = '15px';
    body.style.lineHeight = '1.6';

    const messageElement = document.createElement('p');
    messageElement.style.margin = '0 0 5px 0';
    messageElement.textContent = message;
    body.appendChild(messageElement);

    // 创建弹窗底部
    const footer = document.createElement('div');
    footer.className = 'modal-footer';
    footer.style.padding = '12px 20px 16px';
    footer.style.display = 'flex';
    footer.style.justifyContent = 'center';
    footer.style.gap = '10px';

    // 创建按钮
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'modal-btn modal-btn-secondary';
    cancelBtn.style.padding = '8px 16px';
    cancelBtn.style.borderRadius = '6px';
    cancelBtn.style.fontSize = '14px';
    cancelBtn.style.fontWeight = '500';
    cancelBtn.style.border = '1px solid #d1d5db';
    cancelBtn.style.backgroundColor = '#f3f4f6';
    cancelBtn.style.color = '#6b7280';
    cancelBtn.style.cursor = 'pointer';
    cancelBtn.style.transition = 'all 0.2s';
    cancelBtn.style.minWidth = '80px';
    cancelBtn.textContent = cancelText;

    cancelBtn.onmouseover = function() {
      this.style.backgroundColor = '#e5e7eb';
      this.style.color = '#374151';
    };
    cancelBtn.onmouseout = function() {
      this.style.backgroundColor = '#f3f4f6';
      this.style.color = '#6b7280';
    };

    cancelBtn.onclick = function() {
      closeModal(false);
    };

    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'modal-btn modal-btn-primary';
    confirmBtn.style.padding = '8px 16px';
    confirmBtn.style.borderRadius = '6px';
    confirmBtn.style.fontSize = '14px';
    confirmBtn.style.fontWeight = '500';
    confirmBtn.style.border = 'none';
    confirmBtn.style.backgroundColor = confirmBtnColor;
    confirmBtn.style.color = 'white';
    confirmBtn.style.cursor = 'pointer';
    confirmBtn.style.transition = 'all 0.2s';
    confirmBtn.style.minWidth = '80px';
    confirmBtn.textContent = confirmText;

    confirmBtn.onmouseover = function() {
      this.style.backgroundColor = confirmBtnHoverColor;
    };
    confirmBtn.onmouseout = function() {
      this.style.backgroundColor = confirmBtnColor;
    };

    confirmBtn.onclick = function() {
      closeModal(true);
    };

    footer.appendChild(cancelBtn);
    footer.appendChild(confirmBtn);

    // 组装弹窗
    dialog.appendChild(header);
    dialog.appendChild(body);
    dialog.appendChild(footer);
    modal.appendChild(dialog);
    document.body.appendChild(modal);

    // 添加键盘事件
    const handleKeyDown = function(e) {
      if (e.key === 'Escape') {
        closeModal(false);
      } else if (e.key === 'Enter') {
        closeModal(true);
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    // 点击背景关闭
    if (closeOnBackdrop) {
      modal.addEventListener('click', function(e) {
        if (e.target === modal) {
          closeModal(false);
        }
      });
    }

    // 显示动画
    requestAnimationFrame(() => {
      modal.style.opacity = '1';
      dialog.style.transform = 'scale(1)';
    });

    // 关闭弹窗函数
    function closeModal(result) {
      document.removeEventListener('keydown', handleKeyDown);
      modal.style.opacity = '0';
      dialog.style.transform = 'scale(0.9)';
      
      setTimeout(() => {
        modal.remove();
        resolve(result);
      }, 200);
    }
  });
}

/**
 * 从文件名中解析标题
 * @param {string} filename - 文件名
 * @param {string} regex - 正则表达式字符串
 * @returns {string} 解析出的标题，解析失败则返回空字符串
 */
function parseTitleFromFilename(filename, regex) {
  if (!regex || !filename) return '';
  
  try {
    // 创建正则表达式对象，支持全局匹配
    const regexObj = new RegExp(regex);
    const match = filename.match(regexObj);
    
    // 如果有匹配，返回完整匹配（group(0)）
    if (match && match[0]) {
      return match[0].trim();
    }
    
    // 匹配失败返回空字符串
    return '';
  } catch (error) {
    console.error('解析标题时出错:', error);
    return '';
  }
}

/**
 * 检查视频文件是否存在并管理路径异常标签
 * @param {Object} video 视频对象
 * @returns {Promise<Object>} 包含exists和tagUpdated属性的对象
 */
async function checkVideoFileExists(video) {
  try {
    // 检查文件是否存在
    const exists = await window.electronAPI.checkFileExists(video.filePath);
    
    // 获取当前视频的标签
    const tags = video.collection ? video.collection.split(',').map(tag => tag.trim()).filter(Boolean) : [];
    const hasPathErrorTag = tags.includes('路径异常');
    
    // 根据文件是否存在和是否有标签，决定添加或移除标签
    if (!exists && !hasPathErrorTag) {
      // 文件不存在且没有标签，添加标签
      tags.push('路径异常');
      video.collection = tags.join(',');
      await window.electronAPI.updateVideo(video);
      return { exists: false, tagUpdated: true };
    } else if (exists && hasPathErrorTag) {
      // 文件存在但有标签，移除标签
      const newTags = tags.filter(tag => tag !== '路径异常');
      video.collection = newTags.join(',');
      await window.electronAPI.updateVideo(video);
      return { exists: true, tagUpdated: true };
    }
    
    return { exists, tagUpdated: false };
  } catch (error) {
    console.error('检查视频文件存在性失败:', error);
    return { exists: false, error };
  }
}

// 导出函数
export { 
  showCustomConfirm,
  parseTitleFromFilename,
  checkVideoFileExists
}; 