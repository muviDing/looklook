// 筛选浮窗功能
function initFilterPopup() {
    const filterPopup = document.getElementById('filter-popup');
    const filterBackdrop = document.getElementById('filter-backdrop');
    const filterButton = document.getElementById('filter-button');
    const filterCloseButton = document.getElementById('filter-close');
    const filterResetButton = document.getElementById('filter-reset');
    const filterApplyButton = document.getElementById('filter-apply');
    const filterRatingStars = document.getElementById('filter-rating-stars');
    const filterRatingValue = document.getElementById('filter-rating-value');

    // 打开筛选浮窗
    if (filterButton) {
        filterButton.addEventListener('click', function() {
            filterPopup.classList.add('active');
            filterBackdrop.classList.add('active');
        });
    }

    // 关闭筛选浮窗
    if (filterCloseButton) {
        filterCloseButton.addEventListener('click', closeFilterPopup);
    }

    if (filterBackdrop) {
        filterBackdrop.addEventListener('click', closeFilterPopup);
    }

    // 评分星级功能
    if (filterRatingStars) {
        const stars = filterRatingStars.querySelectorAll('i');
        stars.forEach(star => {
            star.addEventListener('click', function() {
                const value = parseInt(this.getAttribute('data-value'));
                updateStarRating(value);
                if (filterRatingValue) {
                    filterRatingValue.textContent = value;
                }
            });

            star.addEventListener('mouseover', function() {
                const value = parseInt(this.getAttribute('data-value'));
                previewStarRating(value);
            });

            star.addEventListener('mouseout', function() {
                const currentValue = parseInt(filterRatingValue.textContent) || 0;
                updateStarRating(currentValue);
            });
        });
    }

    // 重置按钮
    if (filterResetButton) {
        filterResetButton.addEventListener('click', function() {
            // 重置所有表单输入
            const inputs = filterPopup.querySelectorAll('input');
            inputs.forEach(input => {
                input.value = '';
            });

            // 重置下拉框
            const selects = filterPopup.querySelectorAll('select');
            selects.forEach(select => {
                select.selectedIndex = 0;
            });

            // 重置评分
            updateStarRating(0);
            if (filterRatingValue) {
                filterRatingValue.textContent = '0';
            }
        });
    }

    // 应用按钮
    if (filterApplyButton) {
        filterApplyButton.addEventListener('click', function() {
            // 这里收集筛选条件，并应用到视频列表
            const filterData = collectFilterData();
            applyFilters(filterData);
            closeFilterPopup();
        });
    }

    // 辅助函数：更新星级评分显示
    function updateStarRating(rating) {
        if (!filterRatingStars) return;
        
        const stars = filterRatingStars.querySelectorAll('i');
        stars.forEach((star, index) => {
            if (index < rating) {
                star.classList.remove('far');
                star.classList.add('fas');
            } else {
                star.classList.remove('fas');
                star.classList.add('far');
            }
        });
    }

    // 辅助函数：预览星级评分
    function previewStarRating(rating) {
        if (!filterRatingStars) return;
        
        const stars = filterRatingStars.querySelectorAll('i');
        stars.forEach((star, index) => {
            if (index < rating) {
                star.classList.remove('far');
                star.classList.add('fas');
            } else {
                star.classList.remove('fas');
                star.classList.add('far');
            }
        });
    }

    // 辅助函数：关闭筛选浮窗
    function closeFilterPopup() {
        filterPopup.classList.remove('active');
        filterBackdrop.classList.remove('active');
    }

    // 辅助函数：收集筛选数据
    function collectFilterData() {
        return {
            collection: document.getElementById('filter-collection')?.value || '',
            actors: document.getElementById('filter-actors')?.value || '',
            rating: parseInt(filterRatingValue?.textContent) || 0,
            resolution: document.getElementById('filter-resolution')?.value || '',
            duration: {
                min: document.getElementById('filter-duration-min')?.value || '',
                max: document.getElementById('filter-duration-max')?.value || ''
            },
            path: document.getElementById('filter-path')?.value || ''
        };
    }

    // 辅助函数：应用筛选条件
    function applyFilters(filterData) {
        // 这里将实现筛选逻辑，根据筛选条件过滤视频列表
        console.log('应用筛选条件:', filterData);
        // TODO: 实现实际的筛选逻辑
    }
}

// 在页面加载完成后初始化筛选浮窗
document.addEventListener('DOMContentLoaded', function() {
    // ... existing code ...
    
    // 初始化筛选浮窗
    initFilterPopup();
}); 