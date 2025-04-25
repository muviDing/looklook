/**
 * 多选下拉框数据源管理
 * 负责管理合集和演员等数据源，确保F区域和H区域使用相同的数据
 */

// 存储所有合集数据
let collectionData = [];

// 存储所有演员数据
let actorsData = [];

/**
 * 初始化数据源
 * @param {Array} initialCollections 初始合集数据
 * @param {Array} initialActors 初始演员数据
 */
function initializeData(initialCollections = [], initialActors = []) {
    collectionData = [...initialCollections];
    actorsData = [...initialActors];
}

/**
 * 从视频数据中提取并更新数据源
 * @param {Array} videos 视频数据数组
 */
function extractDataFromVideos(videos) {
    if (!videos || !Array.isArray(videos)) return;
    
    // 提取合集数据
    const collectionsSet = new Set(collectionData);
    videos.forEach(video => {
        if (video.series && typeof video.series === 'string' && video.series.trim() !== '') {
            collectionsSet.add(video.series.trim());
        }
        // 同时从collection字段提取
        if (video.collection && typeof video.collection === 'string') {
            const collections = video.collection.split(/[,，、]/);
            collections.forEach(collection => {
                if (collection.trim() !== '') {
                    collectionsSet.add(collection.trim());
                }
            });
        }
    });
    collectionData = Array.from(collectionsSet).sort();
    
    // 提取演员数据
    const actorsSet = new Set(actorsData);
    videos.forEach(video => {
        if (video.actors && typeof video.actors === 'string') {
            const actorsList = video.actors.split(/[,，、]/);
            actorsList.forEach(actor => {
                if (actor.trim() !== '') {
                    actorsSet.add(actor.trim());
                }
            });
        }
    });
    actorsData = Array.from(actorsSet).sort();
    
    console.log('数据源已更新: 合集数量=', collectionData.length, '演员数量=', actorsData.length);
}

/**
 * 添加新合集
 * @param {string} collection 合集名称
 * @returns {boolean} 是否添加成功
 */
function addCollection(collection) {
    if (!collection || typeof collection !== 'string' || collection.trim() === '') {
        return false;
    }
    
    const trimmedCollection = collection.trim();
    if (collectionData.includes(trimmedCollection)) {
        return false;
    }
    
    collectionData.push(trimmedCollection);
    collectionData.sort();
    
    // 通知更新
    notifyDataSourceUpdate();
    return true;
}

/**
 * 添加新演员
 * @param {string} actor 演员名称
 * @returns {boolean} 是否添加成功
 */
function addActor(actor) {
    if (!actor || typeof actor !== 'string' || actor.trim() === '') {
        return false;
    }
    
    const trimmedActor = actor.trim();
    if (actorsData.includes(trimmedActor)) {
        return false;
    }
    
    actorsData.push(trimmedActor);
    actorsData.sort();
    
    // 通知更新
    notifyDataSourceUpdate();
    return true;
}

/**
 * 从电子API获取最新的枚举数据并更新数据源
 * 用于确保F区域和H区域的数据一致
 * @param {boolean} forceUpdate 是否强制更新，即使数据没有变化
 */
async function syncDataFromEnum(forceUpdate = false) {
    try {
        console.log('开始同步枚举数据...');
        let dataChanged = false;
        
        // 从电子API获取最新的合集数据
        const collections = await window.electronAPI.getEnumValues('collection') || [];
        if (collections.length > 0) {
            // 检查是否有新数据
            const newCollections = collections.filter(item => !collectionData.includes(item));
            if (newCollections.length > 0) {
                console.log('发现新合集:', newCollections);
                dataChanged = true;
            }
            
            // 合并数据，避免重复
            const collectionsSet = new Set([...collectionData, ...collections]);
            collectionData = Array.from(collectionsSet).sort();
        }
        
        // 从电子API获取最新的演员数据
        const actors = await window.electronAPI.getEnumValues('actors') || [];
        if (actors.length > 0) {
            // 检查是否有新数据
            const newActors = actors.filter(item => !actorsData.includes(item));
            if (newActors.length > 0) {
                console.log('发现新演员:', newActors);
                dataChanged = true;
            }
            
            // 合并数据，避免重复
            const actorsSet = new Set([...actorsData, ...actors]);
            actorsData = Array.from(actorsSet).sort();
        }
        
        console.log('枚举数据同步完成: 合集数量=', collectionData.length, '演员数量=', actorsData.length);
        
        // 如果数据有变化或强制更新，则通知更新
        if (dataChanged || forceUpdate) {
            notifyDataSourceUpdate();
        }
        
        return true;
    } catch (error) {
        console.error('同步枚举数据失败:', error);
        return false;
    }
}

/**
 * 通知所有使用数据源的组件更新
 * 当数据源发生变化时调用
 */
function notifyDataSourceUpdate() {
    console.log('通知数据源更新: 合集=', collectionData.length, '演员=', actorsData.length);
    
    // 创建自定义事件对象
    const event = new CustomEvent('multiselect-datasource-updated', {
        detail: {
            collections: collectionData,
            actors: actorsData,
            timestamp: Date.now()
        }
    });
    
    // 延迟触发事件，确保DOM已更新
    setTimeout(() => {
        document.dispatchEvent(event);
        console.log('数据源更新事件已触发');
    }, 10);
}

/**
 * 获取所有合集数据
 * @returns {Array} 合集数据数组
 */
function getCollections() {
    return [...collectionData];
}

/**
 * 获取所有演员数据
 * @returns {Array} 演员数据数组
 */
function getActors() {
    return [...actorsData];
}

/**
 * 创建筛选器多选下拉框组件
 * @param {Object} options 配置选项
 * @returns {Object} 组件操作方法
 */
function createFilterMultiSelect(options) {
    const {
        containerElement, // 容器元素
        placeholder = '请选择', // 占位文本
        dataSource = [], // 数据源
        dataType = null, // 数据类型: 'collections' 或 'actors'
        onSelectionChange = null // 选择改变回调
    } = options;
    
    if (!containerElement) {
        console.error('多选下拉框必须提供容器元素');
        return null;
    }
    
    // 创建HTML结构
    containerElement.classList.add('filter-multiselect');
    containerElement.innerHTML = `
        <div class="filter-multiselect-selected">
            <div class="filter-multiselect-placeholder">${placeholder}</div>
        </div>
        <div class="filter-multiselect-dropdown">
            <div class="filter-multiselect-search">
                <input type="text" placeholder="搜索..." class="filter-multiselect-search-input">
            </div>
            <div class="filter-multiselect-options"></div>
        </div>
    `;
    
    const selectedElement = containerElement.querySelector('.filter-multiselect-selected');
    const dropdownElement = containerElement.querySelector('.filter-multiselect-dropdown');
    const optionsElement = containerElement.querySelector('.filter-multiselect-options');
    const placeholderElement = containerElement.querySelector('.filter-multiselect-placeholder');
    const searchInput = containerElement.querySelector('.filter-multiselect-search-input');
    
    // 存储选中的值
    let selectedValues = [];
    // 存储搜索关键词
    let searchKeyword = '';
    
    // 渲染下拉选项
    function renderOptions() {
        optionsElement.innerHTML = '';
        
        // 根据搜索关键词筛选选项
        const filteredOptions = searchKeyword
            ? dataSource.filter(item => item.toLowerCase().includes(searchKeyword.toLowerCase()))
            : dataSource;
        
        if (filteredOptions.length === 0) {
            const noResultElement = document.createElement('div');
            noResultElement.className = 'filter-multiselect-no-result';
            noResultElement.textContent = '没有匹配结果';
            optionsElement.appendChild(noResultElement);
            return;
        }
        
        filteredOptions.forEach(item => {
            const optionElement = document.createElement('div');
            optionElement.className = `filter-multiselect-option ${selectedValues.includes(item) ? 'selected' : ''}`;
            optionElement.innerHTML = `
                <div class="filter-multiselect-checkbox"></div>
                <span>${item}</span>
            `;
            
            optionElement.addEventListener('click', e => {
                e.stopPropagation();
                
                const index = selectedValues.indexOf(item);
                if (index === -1) {
                    selectedValues.push(item);
                } else {
                    selectedValues.splice(index, 1);
                }
                
                renderSelected();
                renderOptions();
                
                if (typeof onSelectionChange === 'function') {
                    onSelectionChange(selectedValues);
                }
            });
            
            optionsElement.appendChild(optionElement);
        });
    }
    
    // 渲染已选项
    function renderSelected() {
        if (selectedValues.length === 0) {
            placeholderElement.style.display = 'block';
            selectedElement.querySelectorAll('.filter-multiselect-tag').forEach(tag => tag.remove());
            return;
        }
        
        placeholderElement.style.display = 'none';
        selectedElement.querySelectorAll('.filter-multiselect-tag').forEach(tag => tag.remove());
        
        selectedValues.forEach(value => {
            const tag = document.createElement('div');
            tag.className = 'filter-multiselect-tag';
            tag.innerHTML = `
                <span>${value}</span>
                <span class="filter-multiselect-tag-remove">×</span>
            `;
            
            tag.querySelector('.filter-multiselect-tag-remove').addEventListener('click', e => {
                e.stopPropagation();
                
                const index = selectedValues.indexOf(value);
                if (index !== -1) {
                    selectedValues.splice(index, 1);
                    renderSelected();
                    renderOptions();
                    
                    if (typeof onSelectionChange === 'function') {
                        onSelectionChange(selectedValues);
                    }
                }
            });
            
            selectedElement.insertBefore(tag, placeholderElement);
        });
    }
    
    // 切换下拉框显示状态
    function toggleDropdown(event) {
        // 阻止冒泡，防止立即触发document点击事件
        event.stopPropagation();
        
        const isVisible = dropdownElement.classList.contains('show');
        
        // 关闭所有其他下拉框
        document.querySelectorAll('.filter-multiselect-dropdown.show').forEach(dropdown => {
            if (dropdown !== dropdownElement) {
                dropdown.classList.remove('show');
            }
        });
        
        // 如果当前不可见，则显示
        if (!isVisible) {
            dropdownElement.classList.add('show');
            searchInput.focus(); // 自动聚焦搜索框
            
            // 延迟添加document点击事件，防止当前点击立即关闭
            setTimeout(() => {
                document.addEventListener('click', closeDropdown);
            }, 0);
        } else {
            closeDropdown();
        }
    }
    
    // 关闭下拉框
    function closeDropdown(e) {
        // 如果点击的是组件内部元素，不关闭
        if (e && containerElement.contains(e.target)) {
            return;
        }
        
        dropdownElement.classList.remove('show');
        searchInput.value = '';
        searchKeyword = '';
        renderOptions();
        document.removeEventListener('click', closeDropdown);
    }
    
    // 绑定事件
    selectedElement.addEventListener('click', toggleDropdown);
    
    // 绑定搜索事件
    searchInput.addEventListener('input', (e) => {
        searchKeyword = e.target.value;
        renderOptions();
    });
    
    // 阻止搜索输入框的点击事件冒泡
    searchInput.addEventListener('click', (e) => {
        e.stopPropagation();
    });
    
    // 阻止下拉框内部的点击事件冒泡到document
    dropdownElement.addEventListener('click', (e) => {
        e.stopPropagation();
    });
    
    // 监听数据源更新事件
    document.addEventListener('multiselect-datasource-updated', function(e) {
        if (dataType === 'collections') {
            const newDataSource = e.detail.collections;
            console.log(`[${placeholder}] 更新合集数据源:`, newDataSource.length);
            updateDataSource(newDataSource);
        } else if (dataType === 'actors') {
            const newDataSource = e.detail.actors;
            console.log(`[${placeholder}] 更新演员数据源:`, newDataSource.length);
            updateDataSource(newDataSource);
        }
    });
    
    // 更新数据源方法
    function updateDataSource(newDataSource) {
        if (Array.isArray(newDataSource)) {
            // 过滤掉不在新数据源中的已选值
            selectedValues = selectedValues.filter(value => newDataSource.includes(value));
            
            // 更新数据源
            dataSource.length = 0;
            dataSource.push(...newDataSource);
            
            renderSelected();
            renderOptions();
        }
    }
    
    // 初始渲染
    renderOptions();
    
    // 返回组件操作方法
    return {
        // 获取选中的值
        getValues: () => [...selectedValues],
        
        // 设置选中的值
        setValues: (values) => {
            if (Array.isArray(values)) {
                selectedValues = values.filter(value => dataSource.includes(value));
                renderSelected();
                renderOptions();
            }
        },
        
        // 更新数据源
        updateDataSource,
        
        // 清空选择
        clear: () => {
            selectedValues = [];
            renderSelected();
            renderOptions();
        }
    };
}

// 导出方法
export {
    initializeData,
    extractDataFromVideos,
    addCollection,
    addActor,
    getCollections,
    getActors,
    createFilterMultiSelect,
    syncDataFromEnum
}; 