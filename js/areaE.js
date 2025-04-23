/**
 * 区域E: 页脚
 * 负责处理页脚和分页功能的交互
 */

import { videoData, renderTableView, renderGridView, paginationConfig, updatePagination } from './videoData.js';

// 初始化页脚功能
function initFooter() {
    // 更新视频总数
    document.getElementById('total-count').textContent = videoData.length;
    
    // 每页显示数量选择事件
    const pageSizeSelector = document.querySelector('.page-size-selector select');
    pageSizeSelector.addEventListener('change', function() {
        const newPageSize = parseInt(this.value);
        paginationConfig.pageSize = newPageSize;
        paginationConfig.currentPage = 1; // 重置到第一页
        
        // 重新渲染视图和分页
        renderTableView();
        renderGridView();
        updatePagination();
    });
    
    // 页码跳转事件
    const pageJumpInput = document.querySelector('.page-jump input');
    pageJumpInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const pageNum = parseInt(this.value);
            if (pageNum > 0 && pageNum <= paginationConfig.totalPages) {
                paginationConfig.currentPage = pageNum;
                
                // 重新渲染视图和分页
                renderTableView();
                updatePagination();
            } else {
                // 输入的页码无效，重置为当前页码
                this.value = paginationConfig.currentPage;
            }
        }
    });
    
    // 初始化分页
    updatePagination();
}

// 导出函数供主模块使用
export { initFooter };