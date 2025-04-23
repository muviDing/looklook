/**
 * 区域B: 搜索和筛选功能
 * 负责处理搜索框和筛选按钮的交互
 */

import { videoData, renderTableView, renderGridView } from './videoData.js';

// 初始化搜索和筛选功能
function initSearchFilter() {
    // 搜索框事件
    const searchInput = document.querySelector('.search-input');
    searchInput.addEventListener('input', function() {
        // 实现搜索功能
        const searchTerm = this.value.toLowerCase();
        filterVideos(searchTerm);
    });
    
    // 筛选按钮事件
    document.querySelector('.filter-btn').addEventListener('click', function() {
        console.log('打开筛选');
        // TODO: 显示筛选面板
    });
}

// 根据搜索词过滤视频
function filterVideos(searchTerm) {
    // 如果搜索词为空，显示所有视频
    if (!searchTerm) {
        renderTableView();
        renderGridView();
        return;
    }
    
    // 过滤视频数据
    const filteredVideos = videoData.filter(video => {
        // 在多个字段中搜索
        return (
            (video.fileName && video.fileName.toLowerCase().includes(searchTerm)) ||
            (video.code && video.code.toLowerCase().includes(searchTerm)) ||
            (video.series && video.series.toLowerCase().includes(searchTerm)) ||
            (video.actors && video.actors.toLowerCase().includes(searchTerm)) ||
            (video.notes && video.notes.toLowerCase().includes(searchTerm))
        );
    });
    
    // 使用过滤后的数据重新渲染视图
    renderTableView(filteredVideos);
    renderGridView(filteredVideos);
    
    // 更新显示的视频数量
    document.getElementById('total-count').textContent = filteredVideos.length;
}

// 导出函数供主模块使用
export { initSearchFilter, filterVideos };