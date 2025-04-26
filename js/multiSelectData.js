/**
 * 多选下拉框数据源管理
 * 负责管理合集和演员等数据源，确保F区域和H区域使用相同的数据
 */

/**
 * 枚举数据存储类
 * 管理合集和演员等数据的统一存储和同步
 */
class EnumDataStore {
    constructor() {
        // 存储所有合集数据
        this.collections = [];
        // 存储所有演员数据
        this.actors = [];
        // 存储事件监听器
        this.listeners = [];
        // 是否已初始化
        this.initialized = false;
        // 上次同步时间
        this.lastSyncTime = 0;
        // 同步锁，防止并发同步
        this.syncing = false;
    }

    /**
     * 初始化数据存储
     * @returns {Promise<boolean>} 初始化是否成功
     */
    async initialize() {
        if (this.initialized) return true;
        
        try {
            console.log('初始化枚举数据存储...');
            await this.loadFromDatabase();
            this.initialized = true;
            console.log(`枚举数据存储初始化完成: 合集=${this.collections.length}, 演员=${this.actors.length}`);
            return true;
        } catch (error) {
            console.error('初始化枚举数据存储失败:', error);
            return false;
        }
    }

    /**
     * 从数据库加载数据
     * @returns {Promise<boolean>} 加载是否成功
     */
    async loadFromDatabase() {
        try {
            // 从电子API获取枚举数据
            const [collections, actors] = await Promise.all([
                window.electronAPI.getEnumValues('collection') || [],
                window.electronAPI.getEnumValues('actors') || []
            ]);
            
            this.collections = [...collections].sort();
            this.actors = [...actors].sort();
            this.lastSyncTime = Date.now();
            
            return true;
        } catch (error) {
            console.error('从数据库加载枚举数据失败:', error);
            return false;
        }
    }

    /**
     * 从视频数据中提取并更新数据源
     * @param {Array} videos 视频数据数组
     * @returns {boolean} 是否有数据更新
     */
    extractFromVideos(videos) {
        if (!videos || !Array.isArray(videos)) return false;
        
        // 记录原始数据量
        const prevCollectionCount = this.collections.length;
        const prevActorsCount = this.actors.length;
        
        // 提取合集数据
        const collectionsSet = new Set(this.collections);
        videos.forEach(video => {
            // 从series字段提取
            if (video.series && typeof video.series === 'string' && video.series.trim() !== '') {
                collectionsSet.add(video.series.trim());
            }
            // 从collection字段提取
            if (video.collection && typeof video.collection === 'string') {
                const collections = video.collection.split(/[,，、]/);
                collections.forEach(collection => {
                    if (collection.trim() !== '') {
                        collectionsSet.add(collection.trim());
                    }
                });
            }
        });
        this.collections = Array.from(collectionsSet).sort();
        
        // 提取演员数据 - 与合集数据完全分开处理
        const actorsSet = new Set(this.actors);
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
        this.actors = Array.from(actorsSet).sort();
        
        // 计算数据变化
        const collectionAdded = this.collections.length - prevCollectionCount;
        const actorsAdded = this.actors.length - prevActorsCount;
        
        if (collectionAdded > 0 || actorsAdded > 0) {
            console.log(`数据源从视频中提取更新: 合集=${this.collections.length} (新增${collectionAdded}项), 演员=${this.actors.length} (新增${actorsAdded}项)`);
            this.notifyDataChange();
            return true;
        }
        
        return false;
    }

    /**
     * 获取所有合集数据
     * @returns {Array} 合集数据数组的副本
     */
    getCollections() {
        return [...this.collections];
    }

    /**
     * 获取所有演员数据
     * @returns {Array} 演员数据数组的副本
     */
    getActors() {
        return [...this.actors];
    }

    /**
     * 添加新合集
     * @param {string} collection 合集名称
     * @returns {Promise<boolean>} 是否添加成功
     */
    async addCollection(collection) {
        if (!collection || typeof collection !== 'string' || collection.trim() === '') {
            return false;
        }
        
        const trimmedCollection = collection.trim();
        if (this.collections.includes(trimmedCollection)) {
            return false;
        }
        
        // 先更新内存
        this.collections.push(trimmedCollection);
        this.collections.sort();
        
        // 再同步到数据库
        try {
            await window.electronAPI.saveEnumValues('collection', this.collections);
            this.notifyDataChange();
            console.log(`已添加合集: ${trimmedCollection}`);
            return true;
        } catch (error) {
            // 同步失败，回滚内存数据
            this.collections = this.collections.filter(item => item !== trimmedCollection);
            console.error(`添加合集[${trimmedCollection}]失败:`, error);
            return false;
        }
    }

    /**
     * 添加新演员
     * @param {string} actor 演员名称
     * @returns {Promise<boolean>} 是否添加成功
     */
    async addActor(actor) {
        if (!actor || typeof actor !== 'string' || actor.trim() === '') {
            return false;
        }
        
        const trimmedActor = actor.trim();
        if (this.actors.includes(trimmedActor)) {
            return false;
        }
        
        // 先更新内存
        this.actors.push(trimmedActor);
        this.actors.sort();
        
        // 再同步到数据库
        try {
            await window.electronAPI.saveEnumValues('actors', this.actors);
            this.notifyDataChange();
            console.log(`已添加演员: ${trimmedActor}`);
            return true;
        } catch (error) {
            // 同步失败，回滚内存数据
            this.actors = this.actors.filter(item => item !== trimmedActor);
            console.error(`添加演员[${trimmedActor}]失败:`, error);
            return false;
        }
    }

    /**
     * 删除合集
     * @param {string} collection 要删除的合集名称
     * @returns {Promise<boolean>} 是否删除成功
     */
    async removeCollection(collection) {
        if (!collection || !this.collections.includes(collection)) {
            return false;
        }
        
        // 先备份当前数据
        const originalCollections = [...this.collections];
        
        // 更新内存
        this.collections = this.collections.filter(item => item !== collection);
        
        // 同步到数据库
        try {
            await window.electronAPI.saveEnumValues('collection', this.collections);
            this.notifyDataChange();
            console.log(`已删除合集: ${collection}`);
            return true;
        } catch (error) {
            // 同步失败，回滚内存数据
            this.collections = originalCollections;
            console.error(`删除合集[${collection}]失败:`, error);
            return false;
        }
    }

    /**
     * 删除演员
     * @param {string} actor 要删除的演员名称
     * @returns {Promise<boolean>} 是否删除成功
     */
    async removeActor(actor) {
        if (!actor || !this.actors.includes(actor)) {
            return false;
        }
        
        // 先备份当前数据
        const originalActors = [...this.actors];
        
        // 更新内存
        this.actors = this.actors.filter(item => item !== actor);
        
        // 同步到数据库
        try {
            await window.electronAPI.saveEnumValues('actors', this.actors);
            this.notifyDataChange();
            console.log(`已删除演员: ${actor}`);
            return true;
        } catch (error) {
            // 同步失败，回滚内存数据
            this.actors = originalActors;
            console.error(`删除演员[${actor}]失败:`, error);
            return false;
        }
    }

    /**
     * 与后端数据库同步
     * @param {boolean} forceUpdate 是否强制更新通知
     * @returns {Promise<boolean>} 是否同步成功
     */
    async syncWithDatabase(forceUpdate = false) {
        // 防止重复同步
        if (this.syncing) {
            console.log('已有同步任务正在进行，忽略此次同步请求');
            return false;
        }
        
        // 检查是否需要同步（除非强制更新）
        const now = Date.now();
        if (!forceUpdate && (now - this.lastSyncTime < 5000)) {
            console.log('数据刚刚同步过，跳过此次同步请求');
            return true; // 返回成功但不做任何事情
        }
        
        // 设置同步锁
        this.syncing = true;
        
        try {
            console.log('开始同步枚举数据...');
            let dataChanged = false;
            
            // 从电子API获取最新数据
            const [collections, actors] = await Promise.all([
                window.electronAPI.getEnumValues('collection') || [],
                window.electronAPI.getEnumValues('actors') || []
            ]);
            
            // 检查合集数据变化
            if (collections.length > 0) {
                const collectionDiff = this.compareArrays(this.collections, collections);
                if (collectionDiff.added.length > 0 || collectionDiff.removed.length > 0) {
                    if (collectionDiff.added.length > 0) {
                        console.log('发现新合集:', collectionDiff.added);
                    }
                    if (collectionDiff.removed.length > 0) {
                        console.log('发现已删除合集:', collectionDiff.removed);
                    }
                    dataChanged = true;
                    this.collections = [...collections].sort();
                }
            }
            
            // 检查演员数据变化
            if (actors.length > 0) {
                const actorsDiff = this.compareArrays(this.actors, actors);
                if (actorsDiff.added.length > 0 || actorsDiff.removed.length > 0) {
                    if (actorsDiff.added.length > 0) {
                        console.log('发现新演员:', actorsDiff.added);
                    }
                    if (actorsDiff.removed.length > 0) {
                        console.log('发现已删除演员:', actorsDiff.removed);
                    }
                    dataChanged = true;
                    this.actors = [...actors].sort();
                }
            }
            
            this.lastSyncTime = now;
            
            // 只在数据有变化或强制更新时通知
            if (dataChanged || forceUpdate) {
                console.log('数据已同步并更新: 合集数量=', this.collections.length, '演员数量=', this.actors.length);
                this.notifyDataChange();
            } else {
                console.log('数据已同步，无变化: 合集数量=', this.collections.length, '演员数量=', this.actors.length);
            }
            
            // 释放同步锁
            this.syncing = false;
            return true;
        } catch (error) {
            console.error('同步枚举数据失败:', error);
            // 释放同步锁
            this.syncing = false;
            return false;
        }
    }

    /**
     * 比较两个数组，找出增加和删除的元素
     * @param {Array} oldArray 旧数组
     * @param {Array} newArray 新数组
     * @returns {Object} 包含added和removed两个数组的对象
     */
    compareArrays(oldArray, newArray) {
        const added = newArray.filter(item => !oldArray.includes(item));
        const removed = oldArray.filter(item => !newArray.includes(item));
        return { added, removed };
    }

    /**
     * 添加数据变化监听器
     * @param {Function} listener 监听器函数
     */
    addListener(listener) {
        if (typeof listener === 'function' && !this.listeners.includes(listener)) {
            this.listeners.push(listener);
        }
    }

    /**
     * 移除数据变化监听器
     * @param {Function} listener 要移除的监听器函数
     */
    removeListener(listener) {
        this.listeners = this.listeners.filter(item => item !== listener);
    }

    /**
     * 通知所有监听器数据已变化
     */
    notifyDataChange() {
        const eventData = {
            collections: this.getCollections(),
            actors: this.getActors(),
            timestamp: Date.now()
        };
        
        console.log('通知数据变化: 合集=', this.collections.length, '演员=', this.actors.length);
        
        // 首先通知注册的直接监听器
        this.listeners.forEach(listener => {
            try {
                listener(eventData);
            } catch (error) {
                console.error('调用监听器时出错:', error);
            }
        });
        
        // 然后通过DOM事件通知组件
        const event = new CustomEvent('multiselect-datasource-updated', {
            detail: eventData
        });
        
        // 延迟触发事件，确保DOM已更新
        setTimeout(() => {
            document.dispatchEvent(event);
            console.log('数据变化事件已触发');
        }, 10);
    }
}

// 创建单例实例
const enumDataStore = new EnumDataStore();

/**
 * 初始化数据源
 * @param {Array} initialCollections 初始合集数据
 * @param {Array} initialActors 初始演员数据
 */
function initializeData(initialCollections = [], initialActors = []) {
    if (initialCollections.length > 0) {
        enumDataStore.collections = [...initialCollections];
    }
    if (initialActors.length > 0) {
        enumDataStore.actors = [...initialActors];
    }
    
    // 如果有数据，则通知变化
    if (initialCollections.length > 0 || initialActors.length > 0) {
        enumDataStore.notifyDataChange();
    }
}

/**
 * 从视频数据中提取并更新数据源
 * @param {Array} videos 视频数据数组
 */
function extractDataFromVideos(videos) {
    enumDataStore.extractFromVideos(videos);
}

/**
 * 添加新合集
 * @param {string} collection 合集名称
 * @returns {Promise<boolean>} 是否添加成功
 */
async function addCollection(collection) {
    return await enumDataStore.addCollection(collection);
}

/**
 * 添加新演员
 * @param {string} actor 演员名称
 * @returns {Promise<boolean>} 是否添加成功
 */
async function addActor(actor) {
    return await enumDataStore.addActor(actor);
}

/**
 * 删除合集
 * @param {string} collection 要删除的合集
 * @returns {Promise<boolean>} 是否删除成功
 */
async function removeCollection(collection) {
    return await enumDataStore.removeCollection(collection);
}

/**
 * 删除演员
 * @param {string} actor 要删除的演员
 * @returns {Promise<boolean>} 是否删除成功
 */
async function removeActor(actor) {
    return await enumDataStore.removeActor(actor);
}

/**
 * 从电子API获取最新的枚举数据并更新数据源
 * 用于确保F区域和H区域的数据一致
 * @param {boolean} forceUpdate 是否强制更新，即使数据没有变化
 */
async function syncDataFromEnum(forceUpdate = false) {
    // 返回缓存的同步请求
    return await enumDataStore.syncWithDatabase(forceUpdate);
}

/**
 * 获取所有合集数据
 * @returns {Array} 合集数据数组
 */
function getCollections() {
    return enumDataStore.getCollections();
}

/**
 * 获取所有演员数据
 * @returns {Array} 演员数据数组
 */
function getActors() {
    return enumDataStore.getActors();
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
        dataType = '', // 数据类型：'collections' 或 'actors'
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
    // 保存组件的数据类型
    const componentType = dataType;
    
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
            // 打开前先获取最新数据
            if (componentType === 'collections') {
                dataSource.length = 0;
                dataSource.push(...enumDataStore.getCollections());
            } else if (componentType === 'actors') {
                dataSource.length = 0;
                dataSource.push(...enumDataStore.getActors());
            }
            
            dropdownElement.classList.add('show');
            searchInput.focus(); // 自动聚焦搜索框
            renderOptions(); // 重新渲染选项
            
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
    const handleDataUpdate = function(e) {
        // 根据明确的数据类型判断是否需要更新
        if (componentType === 'collections') {
            console.log('多选下拉框更新合集数据:', e.detail.collections.length);
            updateDataSource(e.detail.collections);
        } 
        else if (componentType === 'actors') {
            console.log('多选下拉框更新演员数据:', e.detail.actors.length);
            updateDataSource(e.detail.actors);
        }
    };
    
    // 注册DOM事件监听
    document.addEventListener('multiselect-datasource-updated', handleDataUpdate);
    
    // 更新数据源方法
    function updateDataSource(newDataSource) {
        if (Array.isArray(newDataSource)) {
            // 过滤掉不在新数据源中的已选值
            selectedValues = selectedValues.filter(value => newDataSource.includes(value));
            
            // 更新数据源
            dataSource.length = 0;
            dataSource.push(...newDataSource);
            
            renderSelected();
            
            // 如果下拉框当前可见，则更新选项
            if (dropdownElement.classList.contains('show')) {
                renderOptions();
            }
        }
    }
    
    // 初始渲染
    renderOptions();
    
    // 返回组件操作方法，包含清理方法
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
        },
        
        // 获取组件类型
        getType: () => componentType,
        
        // 销毁组件，清理事件监听
        destroy: () => {
            document.removeEventListener('multiselect-datasource-updated', handleDataUpdate);
        }
    };
}

// 创建全局刷新函数，用于在F-2区域编辑后主动通知H区域刷新
let bubbleRefreshTimer = null;

/**
 * 刷新筛选区域的气泡组件
 * 当枚举数据变更后，主动调用此函数以更新H区域
 * @param {boolean} forceRefresh 是否强制刷新
 */
async function refreshFilterBubbles(forceRefresh = true) {
    // 防抖处理，避免短时间内多次刷新
    if (bubbleRefreshTimer) {
        clearTimeout(bubbleRefreshTimer);
    }
    
    return new Promise((resolve) => {
        bubbleRefreshTimer = setTimeout(async () => {
            try {
                // 强制同步最新数据
                await enumDataStore.syncWithDatabase(forceRefresh);
                // 通知筛选区域更新气泡
                document.dispatchEvent(new CustomEvent('filter-bubbles-refresh'));
                console.log('筛选气泡已刷新');
                resolve(true);
            } catch (error) {
                console.error('刷新筛选气泡失败:', error);
                resolve(false);
            }
        }, 200); // 200ms延迟，防抖
    });
}

// 导出方法
export {
    initializeData,
    extractDataFromVideos,
    addCollection,
    addActor,
    removeCollection,
    removeActor,
    getCollections,
    getActors,
    createFilterMultiSelect,
    syncDataFromEnum,
    refreshFilterBubbles
}; 