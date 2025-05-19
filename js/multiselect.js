/**
 * 多选下拉组件
 * 实现带有枚举值管理功能的标签式多选下拉组件
 */

import { showCustomConfirm } from './utils.js';
import { addCollection, addActor, syncDataFromEnum } from './multiSelectData.js';

/**
 * 初始化一个多选下拉组件
 * @param {string} enumType 枚举类型，例如 'collection', 'actors'
 * @param {string} elementId 组件根元素ID，不包含前缀，例如 'collection'，将自动添加 'detail-' 前缀
 * @param {string} placeholder 搜索框占位符文本
 * @param {string} delimiter 多值之间的分隔符，默认为逗号
 */
async function initMultiSelect(enumType, elementId, placeholder = '', delimiter = ',') {
    // 组件元素ID
    const prefix = 'detail-';
    const containerId = `${prefix}${elementId}-container`;
    const inputId = `${prefix}${elementId}`;
    const tagsId = `${prefix}${elementId}-tags`;
    const dropdownId = `${prefix}${elementId}-dropdown`;
    const searchId = `${prefix}${elementId}-search`;
    const addBtnId = `${prefix}${elementId}-add`;
    const itemsId = `${prefix}${elementId}-items`;
    
    // 获取DOM元素
    const container = document.getElementById(containerId);
    const hiddenInput = document.getElementById(inputId);
    const tagsContainer = document.getElementById(tagsId);
    const dropdown = document.getElementById(dropdownId);
    const searchInput = document.getElementById(searchId);
    const addBtn = document.getElementById(addBtnId);
    const itemsContainer = document.getElementById(itemsId);
    
    // 如果缺少必要的元素，则停止初始化
    if (!container || !hiddenInput || !tagsContainer || !dropdown || !searchInput || !addBtn || !itemsContainer) {
        console.error(`初始化多选组件失败: 缺少必要的DOM元素 (${elementId})`);
        return;
    }
    
    // 当前选中的项目
    let selectedItems = [];
    // 所有可选项
    let allItems = [];
    
    // 加载初始枚举值
    try {
        allItems = await window.electronAPI.getEnumValues(enumType) || [];
        console.log(`已加载${enumType}枚举值:`, allItems);
    } catch (error) {
        console.error(`获取${enumType}枚举值失败:`, error);
        allItems = [];
    }
    
    /**
     * 更新隐藏输入框的值
     */
    function updateHiddenInputValue() {
        hiddenInput.value = selectedItems.join(delimiter);
    }
    
    /**
     * 渲染选中的标签
     */
    function renderTags() {
        tagsContainer.innerHTML = '';
        
        selectedItems.forEach(item => {
            const tag = document.createElement('div');
            tag.className = 'multi-select-tag';
            
            const tagText = document.createElement('span');
            tagText.className = 'multi-select-tag-text';
            tagText.textContent = item;
            tag.appendChild(tagText);
            
            const removeBtn = document.createElement('span');
            removeBtn.className = 'multi-select-tag-remove';
            removeBtn.innerHTML = '&times;';
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                removeItem(item);
            });
            tag.appendChild(removeBtn);
            
            tagsContainer.appendChild(tag);
        });
    }
    
    /**
     * 渲染下拉选项
     * @param {string} searchTerm 搜索关键字
     */
    function renderDropdownItems(searchTerm = '') {
        itemsContainer.innerHTML = '';
        
        const lowerSearchTerm = searchTerm.toLowerCase();
        let filteredItems = allItems;
        
        // 如果有搜索词，过滤项目
        if (searchTerm) {
            filteredItems = allItems.filter(item => 
                item.toLowerCase().includes(lowerSearchTerm)
            );
        }
        
        // 如果没有匹配项
        if (filteredItems.length === 0) {
            const noResults = document.createElement('div');
            noResults.className = 'multi-select-no-results';
            noResults.textContent = searchTerm ? '没有匹配的选项' : '没有可选项';
            itemsContainer.appendChild(noResults);
            return;
        }
        
        // 渲染所有匹配的选项
        filteredItems.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'multi-select-item';
            
            if (selectedItems.includes(item)) {
                itemElement.classList.add('selected');
            }
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'multi-select-checkbox';
            checkbox.checked = selectedItems.includes(item);
            itemElement.appendChild(checkbox);
            
            const itemText = document.createElement('span');
            itemText.textContent = item;
            itemElement.appendChild(itemText);
            
            // 添加删除枚举值按钮
            const deleteBtn = document.createElement('span');
            deleteBtn.className = 'multi-select-item-delete';
            deleteBtn.innerHTML = '&times;';
            deleteBtn.title = '删除此选项';
            itemElement.appendChild(deleteBtn);
            
            // 点击项目切换选中状态
            itemElement.addEventListener('click', (e) => {
                // 如果点击的是删除按钮，则不切换选中状态
                if (e.target !== deleteBtn) {
                    toggleItem(item);
                }
                
                // 阻止事件冒泡，防止下拉框关闭
                e.stopPropagation();
            });
            
            // 点击删除按钮删除枚举值
            deleteBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                await deleteEnumValue(item);
            });
            
            itemsContainer.appendChild(itemElement);
        });
    }
    
    /**
     * 打开下拉框
     */
    function openDropdown() {
        dropdown.classList.add('open');
        searchInput.focus();
        renderDropdownItems();
        
        // 添加点击外部关闭下拉框的事件监听
        setTimeout(() => {
            document.addEventListener('click', closeDropdownOnClickOutside);
        }, 0);
    }
    
    /**
     * 关闭下拉框
     */
    function closeDropdown() {
        dropdown.classList.remove('open');
        searchInput.value = '';
        document.removeEventListener('click', closeDropdownOnClickOutside);
    }
    
    /**
     * 点击外部区域关闭下拉框
     */
    function closeDropdownOnClickOutside(e) {
        // 确保点击的不是下拉项或下拉框内的元素
        if (!container.contains(e.target) || 
            (e.target.closest('.multi-select-add-btn') && !e.target.closest('.multi-select-item'))) {
            closeDropdown();
        }
    }
    
    /**
     * 切换选项的选中状态
     * @param {string} item 选项文本
     */
    function toggleItem(item) {
        const index = selectedItems.indexOf(item);
        if (index === -1) {
            // 添加项目
            selectedItems.push(item);
        } else {
            // 移除项目
            selectedItems.splice(index, 1);
        }
        
        // 更新UI
        updateHiddenInputValue();
        renderTags();
        renderDropdownItems(searchInput.value);
    }
    
    /**
     * 移除选中的项目
     * @param {string} item 要移除的项目
     */
    function removeItem(item) {
        const index = selectedItems.indexOf(item);
        if (index !== -1) {
            selectedItems.splice(index, 1);
            updateHiddenInputValue();
            renderTags();
            renderDropdownItems(searchInput.value);
        }
    }
    
    /**
     * 删除枚举值
     * @param {string} item 要删除的枚举值
     */
    async function deleteEnumValue(item) {
        try {
            const confirmed = await showCustomConfirm({
                title: "删除选项",
                message: `确定要删除选项"${item}"吗？\n删除后仍会保留已选择的值，但不会再出现在下拉列表中。`,
                confirmText: "删除",
                cancelText: "取消",
                type: "danger"
            });
            
            if (!confirmed) return;
            
            // 从枚举列表中删除项
            const newItems = allItems.filter(i => i !== item);
            const updatedItems = await window.electronAPI.saveEnumValues(enumType, newItems);
            allItems = updatedItems;
            
            // 更新下拉列表
            renderDropdownItems(searchInput.value);
            
            // 通知H区域数据更新
            await syncDataFromEnum();
        } catch (error) {
            console.error(`删除枚举值[${item}]失败:`, error);
            alert(`删除选项"${item}"失败: ${error.message || '未知错误'}`);
        }
    }
    
    /**
     * 添加新的枚举值
     */
    async function addNewItem() {
        const value = searchInput.value.trim();
        if (!value) return;
        
        // 检查是否已存在
        if (allItems.includes(value)) {
            // 如果存在但未选中，则选中它
            if (!selectedItems.includes(value)) {
                toggleItem(value);
            }
            return;
        }
        
        try {
            // 添加到枚举值列表
            const updatedItems = await window.electronAPI.addEnumValue(enumType, value);
            allItems = updatedItems;
            
            // 选中新添加的项
            if (!selectedItems.includes(value)) {
                selectedItems.push(value);
                updateHiddenInputValue();
                renderTags();
            }
            
            // 清空搜索框并更新下拉列表
            searchInput.value = '';
            renderDropdownItems();
            
            // 根据枚举类型更新全局数据存储
            if (enumType === 'collection') {
                addCollection(value);
            } else if (enumType === 'actors') {
                addActor(value);
            }
            
            // 主动触发同步，以便H区域立即更新
            console.log(`添加新${enumType}值"${value}"后触发同步`);
            await syncDataFromEnum();
        } catch (error) {
            console.error(`添加${enumType}枚举值失败:`, error);
        }
    }
    
    /**
     * 设置组件值
     * @param {string|Array} value 字符串或数组
     */
    function setValue(value) {
        if (!value) {
            selectedItems = [];
        } else if (typeof value === 'string') {
            // 如果是字符串，按分隔符拆分
            selectedItems = value.split(delimiter).map(item => item.trim()).filter(Boolean);
        } else if (Array.isArray(value)) {
            // 如果是数组，直接使用
            selectedItems = [...value];
        }
        
        // 将选中项添加到枚举值中（如果不存在）
        selectedItems.forEach(async (item) => {
            if (!allItems.includes(item)) {
                try {
                    const updatedItems = await window.electronAPI.addEnumValue(enumType, item);
                    allItems = updatedItems;
                    
                    // 根据枚举类型更新全局数据存储
                    if (enumType === 'collection') {
                        addCollection(item);
                    } else if (enumType === 'actors') {
                        addActor(item);
                    }
                    
                    // 触发同步
                    await syncDataFromEnum();
                } catch (error) {
                    console.error(`添加${enumType}枚举值失败:`, error);
                }
            }
        });
        
        updateHiddenInputValue();
        renderTags();
    }
    
    /**
     * 获取组件值
     * @returns {Array} 选中项数组
     */
    function getValue() {
        return [...selectedItems];
    }
    
    // 初始化事件监听
    // 点击输入容器打开下拉框
    container.querySelector('.multi-select-input-container').addEventListener('click', () => {
        if (!dropdown.classList.contains('open')) {
            openDropdown();
        }
    });
    
    // 搜索框输入事件
    searchInput.addEventListener('input', () => {
        renderDropdownItems(searchInput.value);
    });
    
    // 防止搜索框的点击事件冒泡
    searchInput.addEventListener('click', (e) => {
        e.stopPropagation();
    });
    
    // 按下回车键添加新项
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addNewItem();
        }
    });
    
    // 添加按钮点击事件
    addBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        addNewItem();
    });
    
    // 防止下拉框内部的点击事件关闭下拉框
    dropdown.addEventListener('click', (e) => {
        e.stopPropagation();
    });
    
    // 添加对标签库更新事件的监听
    const handleDataSourceUpdate = (e) => {
        if (e.detail) {
            // 根据组件类型获取对应的数据
            const newData = enumType === 'collection' ? e.detail.collections : 
                           (enumType === 'actors' ? e.detail.actors : null);
            
            if (Array.isArray(newData)) {
                console.log(`多选组件(${enumType})收到数据更新:`, newData.length);
                
                // 更新所有可选项
                allItems = [...newData];
                
                // 如果下拉框是打开的，重新渲染下拉选项
                if (dropdown.classList.contains('open')) {
                    renderDropdownItems(searchInput.value);
                }
            }
        }
    };
    
    // 注册事件监听
    document.addEventListener('multiselect-datasource-updated', handleDataSourceUpdate);
    
    // 公开的方法
    return {
        setValue,
        getValue,
        element: container,
        // 添加销毁方法，用于清理事件监听器
        destroy: () => {
            document.removeEventListener('multiselect-datasource-updated', handleDataSourceUpdate);
            document.removeEventListener('click', closeDropdownOnClickOutside);
        }
    };
}

export { initMultiSelect }; 