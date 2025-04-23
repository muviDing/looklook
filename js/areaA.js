/**
 * 区域A: 标题栏功能
 * 负责处理标题栏和窗口控制按钮的交互
 */

// 初始化标题栏功能
function initTitleBar() {
    // 窗口控制按钮事件 - 使用Electron API
    document.getElementById('minimize-btn').addEventListener('click', function() {
        window.electronAPI.minimizeWindow();
    });
    
    document.getElementById('maximize-btn').addEventListener('click', function() {
        window.electronAPI.maximizeWindow();
    });
    
    document.getElementById('close-btn').addEventListener('click', function() {
        window.electronAPI.closeWindow();
    });
    
    document.getElementById('settings-btn').addEventListener('click', function() {
        console.log('打开设置');
        // TODO: 实现设置面板
    });
}

// 导出函数供主模块使用
export { initTitleBar };