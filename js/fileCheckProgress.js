/**
 * 文件检查进度对话框模块
 * 用于显示在应用启动时检查视频文件存在性的进度
 */

// 对话框状态
let isDialogVisible = false;

// 进度对话框元素
let progressDialog;
let progressBar;
let statusText;
let closeButton;

/**
 * 初始化进度对话框
 */
function initProgressDialog() {
    // 如果已存在，则不重复创建
    if (document.getElementById('file-check-dialog')) {
        return;
    }

    // 创建对话框容器
    progressDialog = document.createElement('div');
    progressDialog.id = 'file-check-dialog';
    progressDialog.className = 'progress-dialog hidden';

    // 创建对话框内容
    progressDialog.innerHTML = `
        <div class="progress-dialog-content">
            <div class="progress-dialog-header">
                <h3>正在检查视频文件</h3>
            </div>
            <div class="progress-dialog-body">
                <p id="file-check-status">正在检查视频文件是否存在...</p>
                <div class="progress-container">
                    <div id="file-check-progress-bar" class="progress-bar"></div>
                </div>
                <p id="file-check-detail" class="progress-detail">已检查: 0/0</p>
            </div>
            <div class="progress-dialog-footer">
                <button id="file-check-close-button" class="btn" disabled>关闭</button>
            </div>
        </div>
    `;

    // 添加到文档
    document.body.appendChild(progressDialog);

    // 获取元素引用
    progressBar = document.getElementById('file-check-progress-bar');
    statusText = document.getElementById('file-check-status');
    detailText = document.getElementById('file-check-detail');
    closeButton = document.getElementById('file-check-close-button');

    // 添加关闭按钮事件
    closeButton.addEventListener('click', hideProgressDialog);

    // 添加样式
    addProgressDialogStyles();
}

/**
 * 添加进度对话框样式
 */
function addProgressDialogStyles() {
    // 检查是否已存在样式
    if (document.getElementById('file-check-dialog-styles')) {
        return;
    }

    // 创建样式元素
    const style = document.createElement('style');
    style.id = 'file-check-dialog-styles';
    style.textContent = `
        .progress-dialog {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
            background-color: rgba(0, 0, 0, 0.5);
            z-index: 9999;
            opacity: 1;
            transition: opacity 0.3s ease;
        }
        
        .progress-dialog.hidden {
            opacity: 0;
            pointer-events: none;
        }
        
        .progress-dialog-content {
            background-color: #fff;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
            width: 400px;
            max-width: 90%;
            padding: 20px;
        }
        
        .progress-dialog-header {
            margin-bottom: 15px;
        }
        
        .progress-dialog-header h3 {
            margin: 0;
            color: #333;
            font-size: 18px;
        }
        
        .progress-dialog-body {
            margin-bottom: 15px;
        }
        
        .progress-container {
            background-color: #f3f3f3;
            border-radius: 4px;
            height: 20px;
            margin: 15px 0;
            overflow: hidden;
        }
        
        .progress-bar {
            background-color: #4f46e5;
            height: 100%;
            width: 0%;
            transition: width 0.3s ease;
        }
        
        .progress-detail {
            font-size: 14px;
            color: #666;
            text-align: right;
        }
        
        .progress-dialog-footer {
            display: flex;
            justify-content: flex-end;
        }
        
        .progress-dialog-footer .btn {
            padding: 8px 16px;
            background-color: #4f46e5;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        }
        
        .progress-dialog-footer .btn:disabled {
            background-color: #ccc;
            cursor: not-allowed;
        }
        
        .progress-dialog-footer .btn:not(:disabled):hover {
            background-color: #4338ca;
        }
    `;

    // 添加到文档头部
    document.head.appendChild(style);
}

/**
 * 显示进度对话框
 */
function showProgressDialog() {
    if (!progressDialog) {
        initProgressDialog();
    }
    
    progressDialog.classList.remove('hidden');
    isDialogVisible = true;
}

/**
 * 隐藏进度对话框
 */
function hideProgressDialog() {
    if (progressDialog) {
        progressDialog.classList.add('hidden');
        isDialogVisible = false;
    }
}

/**
 * 更新进度
 * @param {Object} progress 进度信息
 */
function updateProgress(progress) {
    if (!isDialogVisible) {
        showProgressDialog();
    }
    
    if (!progressBar || !statusText || !detailText) {
        initProgressDialog();
    }
    
    // 计算百分比
    const percent = progress.total > 0 ? Math.round((progress.checked / progress.total) * 100) : 0;
    
    // 更新进度条
    progressBar.style.width = `${percent}%`;
    
    // 更新状态文本
    if (progress.error) {
        statusText.textContent = `检查过程中发生错误: ${progress.error}`;
        statusText.style.color = '#ef4444';
    } else if (progress.completed) {
        statusText.textContent = `检查完成，共发现 ${progress.problems} 个问题文件`;
    } else {
        statusText.textContent = `正在检查视频文件是否存在...`;
    }
    
    // 更新详细信息
    detailText.textContent = `已检查: ${progress.checked}/${progress.total}${progress.problems > 0 ? `, 问题: ${progress.problems}` : ''}`;
    
    // 更新关闭按钮状态
    closeButton.disabled = !progress.completed;
}

/**
 * 初始化模块
 */
function init() {
    // 初始化进度对话框
    initProgressDialog();
    
    // 监听进度更新事件
    window.electronAPI.onFileCheckProgress(updateProgress);
}

// 当DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', init);

// 导出模块
export {
    showProgressDialog,
    hideProgressDialog,
    updateProgress
}; 