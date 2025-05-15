/**
 * 设置模块
 * 提供应用设置弹窗功能
 */

// 默认设置
const DEFAULT_SETTINGS = {
  general: {
    scanFolders: []
  },
  import: {
    titleRegex: "([A-Za-z]{2,5})[-_. ]?(\\d{2,6}[A-Za-z]?)"
  },
  quickTags: []
};

// 当前设置，在打开弹窗时加载
let currentSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));

// 创建设置弹窗HTML
async function createSettingsModal() {
  // 如果已经存在则不再创建
  if (document.getElementById('settings-modal')) {
    return;
  }
  
  // 预先加载头像图片（从assets/avatar.mw文件中读取base64数据）
  let avatarData = '';
  try {
    avatarData = await window.electronAPI.getBase64Image('assets/avatar.mw');
    console.log('成功加载头像图片');
  } catch (error) {
    console.error('加载头像图片失败:', error);
  }
  
  // 创建设置弹窗容器
  const backdrop = document.createElement('div');
  backdrop.id = 'settings-backdrop';
  backdrop.className = 'settings-backdrop';
  
  // 创建设置弹窗内容
  backdrop.innerHTML = `
    <div id="settings-modal" class="settings-modal">
      <div class="settings-header">
        <h2>应用设置</h2>
        <button class="settings-close-btn" id="settings-close-btn" aria-label="关闭设置">
          <i class="fas fa-times"></i>
        </button>
      </div>
      
      <div class="settings-body">
        <div class="settings-sidebar">
          <ul class="settings-nav">
            <li class="settings-nav-item active" data-section="general">常规</li>
            <li class="settings-nav-item" data-section="import">导入</li>
            <li class="settings-nav-item" data-section="quickTags">快捷标签</li>
            <li class="settings-nav-item" data-section="about">关于</li>
          </ul>
        </div>
        
        <div class="settings-content">
          <!-- 常规设置 -->
          <div id="general-section" class="settings-section active">
            <div class="section-header">
              <h3 class="settings-section-title">常规设置</h3>
              <button class="section-reset-btn" data-section="general" title="重置此栏目">
                <i class="fas fa-undo"></i>
              </button>
            </div>
            
            <div class="settings-form-group">
              <label>启动时扫描文件夹</label>
              <div class="folder-paths-panel" id="folder-paths-panel">
                <!-- 默认为空 -->
              </div>
              
              <button class="add-folder-btn" id="add-folder-btn">
                <i class="fas fa-plus"></i> 添加文件夹
              </button>
            </div>
          </div>
          
          <!-- 导入设置 -->
          <div id="import-section" class="settings-section">
            <div class="section-header">
              <h3 class="settings-section-title">导入设置</h3>
              <button class="section-reset-btn" data-section="import" title="重置此栏目">
                <i class="fas fa-undo"></i>
              </button>
            </div>
            
            <div class="settings-form-group">
              <label for="title-regex">标题正则解析式</label>
              <input type="text" id="title-regex" placeholder="为空时将不自动解析标题" value="">
              <span class="settings-form-hint">使用正则表达式从文件名中提取标题</span>
            </div>
          </div>
          
          <!-- 快捷标签设置 -->
          <div id="quickTags-section" class="settings-section">
            <div class="section-header">
              <h3 class="settings-section-title">快捷标签设置</h3>
              <button class="section-reset-btn" data-section="quickTags" title="重置此栏目">
                <i class="fas fa-undo"></i>
              </button>
            </div>
            
            <div class="settings-form-group">
              <label>快捷标签列表</label>
              <div class="settings-hint">设置常用的标签，可在视频右键菜单中快速添加</div>
              
              <!-- 快捷标签多选组件 -->
              <div id="quick-tags-container" class="multi-select-container">
                <div class="multi-select-input-container">
                  <div class="multi-select-tags" id="quick-tags-tags"></div>
                </div>
                <div class="multi-select-dropdown" id="quick-tags-dropdown">
                  <div class="multi-select-search-container">
                    <input type="text" class="multi-select-search" id="quick-tags-search" placeholder="搜索或添加新标签...">
                    <button class="multi-select-add-btn" id="quick-tags-add">添加</button>
                  </div>
                  <div class="multi-select-items" id="quick-tags-items"></div>
                </div>
                <!-- 隐藏的输入字段，用于保存实际值 -->
                <input type="hidden" id="quick-tags" value="">
              </div>
            </div>
          </div>
          
          <!-- 关于 -->
          <div id="about-section" class="settings-section">
            <div class="section-header">
              <h3 class="settings-section-title">关于应用</h3>
            </div>
            
            <div class="about-version">
              <span class="about-version-label">当前版本</span>
              <span class="about-version-number">V2.1.0</span>
            </div>
            
            <div class="feedback-card">
              <div class="feedback-avatar">
                <img src="${avatarData}" alt="用户头像">
              </div>
              <div class="feedback-info">
                <h4 class="feedback-name">牧威</h4>
                <p class="feedback-desc">有任何使用问题或建议，欢迎联系我</p>
                <a href="https://www.zhihu.com/people/mu-wei-33-5" target="_blank" class="feedback-link" id="zhihu-link">
                  <i class="fas fa-external-link-alt"></i> 前往知乎
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="settings-footer">
        <button class="settings-btn settings-btn-primary" id="settings-save-btn">保存</button>
      </div>
    </div>
  `;
  
  // 添加到body
  document.body.appendChild(backdrop);
  
  // 设置事件监听器
  setupSettingsEventListeners();
}

// 加载设置
async function loadSettings() {
  try {
    // 从数据库加载设置
    const settings = await window.electronAPI.getSettings();
    
    // 如果有保存的设置，则使用它们
    if (settings) {
      currentSettings = settings;
    }
    
    // 应用设置到UI
    applySettingsToUI();
    
    console.log('设置已加载:', currentSettings);
  } catch (error) {
    console.error('加载设置失败:', error);
    // 加载失败时使用默认设置
    currentSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    applySettingsToUI();
  }
}

// 将设置应用到UI元素
function applySettingsToUI() {
  // 常规设置 - 扫描文件夹
  const folderPathsPanel = document.getElementById('folder-paths-panel');
  if (folderPathsPanel) {
    folderPathsPanel.innerHTML = '';
    
    if (currentSettings.general && currentSettings.general.scanFolders) {
      currentSettings.general.scanFolders.forEach(folder => {
        const folderItem = document.createElement('div');
        folderItem.className = 'folder-path-item';
        folderItem.innerHTML = `
          <span class="folder-path">${folder}</span>
          <button class="folder-path-remove"><i class="fas fa-times"></i></button>
        `;
        folderPathsPanel.appendChild(folderItem);
        
        // 绑定删除按钮事件
        const removeBtn = folderItem.querySelector('.folder-path-remove');
        removeBtn.addEventListener('click', function() {
          folderItem.remove();
        });
      });
    }
  }
  
  // 导入设置 - 标题正则
  const titleRegexInput = document.getElementById('title-regex');
  if (titleRegexInput && currentSettings.import) {
    // 确保使用实际存储的值，即使是空字符串
    titleRegexInput.value = currentSettings.import.titleRegex !== undefined ? currentSettings.import.titleRegex : '';
  }
  
  // 快捷标签设置
  initQuickTagsComponent();
}

// 从UI收集当前设置
function collectSettingsFromUI() {
  const settings = {
    general: {
      scanFolders: []
    },
    import: {
      titleRegex: document.getElementById('title-regex').value
    },
    quickTags: []
  };
  
  // 收集扫描文件夹
  const folderItems = document.querySelectorAll('#folder-paths-panel .folder-path-item');
  folderItems.forEach(item => {
    const folderPath = item.querySelector('.folder-path').textContent;
    settings.general.scanFolders.push(folderPath);
  });
  
  // 收集快捷标签
  const quickTagsInput = document.getElementById('quick-tags');
  if (quickTagsInput && quickTagsInput.value) {
    settings.quickTags = quickTagsInput.value.split(',').map(tag => tag.trim()).filter(Boolean);
  }
  
  return settings;
}

// 保存设置
function saveSettings() {
  // 获取所有扫描文件夹
  const folderElements = document.querySelectorAll('.folder-path-item .folder-path');
  const folders = Array.from(folderElements).map(el => el.textContent);
  
  // 更新当前设置
  if (!currentSettings.general) currentSettings.general = {};
  currentSettings.general.scanFolders = folders;
  
  // 获取导入设置 - 标题正则
  const titleRegexInput = document.getElementById('title-regex');
  if (!currentSettings.import) currentSettings.import = {};
  // 确保保存实际输入的值，即使是空字符串
  currentSettings.import.titleRegex = titleRegexInput.value;
  
  // 获取快捷标签
  const quickTagsInput = document.getElementById('quick-tags');
  currentSettings.quickTags = quickTagsInput.value ? 
    quickTagsInput.value.split(',').map(tag => tag.trim()).filter(Boolean) : [];
  
  // 调用preload API保存设置
  window.electronAPI.saveSettings(currentSettings);
  
  // 显示保存成功提示
  showSaveSuccess();
  
  return true;
}

// 初始化快捷标签多选组件
async function initQuickTagsComponent() {
  try {
    console.log('开始初始化快捷标签组件...');
    
    /* 
     * 改进说明:
     * 1. 筛选记忆问题：维护一个完整的标签列表(allTags)，所有搜索均基于此列表，
     *    而不是基于之前筛选的结果进行二次筛选
     * 2. 持久化筛选问题：提供resetSearch函数并暴露给外部，在关闭设置弹窗或切换标签页时调用
     * 3. 添加按钮功能：现在正确添加标签并更新UI，成功添加后清空搜索框并显示完整列表
     * 4. 添加外部接口：组件现在通过container.resetSearch提供外部访问方法
     */
    
    // 先检查DOM元素是否存在
    const container = document.getElementById('quick-tags-container');
    const tagsContainer = document.getElementById('quick-tags-tags');
    const dropdown = document.getElementById('quick-tags-dropdown');
    const searchInput = document.getElementById('quick-tags-search');
    const addBtn = document.getElementById('quick-tags-add');
    const itemsContainer = document.getElementById('quick-tags-items');
    const hiddenInput = document.getElementById('quick-tags');
    
    if (!container || !tagsContainer || !dropdown || !searchInput || !addBtn || !itemsContainer || !hiddenInput) {
      console.error('快捷标签DOM元素不完整:', {
        container: !!container,
        tagsContainer: !!tagsContainer,
        dropdown: !!dropdown,
        searchInput: !!searchInput,
        addBtn: !!addBtn,
        itemsContainer: !!itemsContainer,
        hiddenInput: !!hiddenInput
      });
      return;
    }
    
    console.log('快捷标签DOM元素检查完成，准备导入组件...');
    
    // 导入多选组件
    const { initMultiSelect } = await import('./multiselect.js');
    
    // 导入数据同步函数
    const { syncDataFromEnum } = await import('./multiSelectData.js');
    
    console.log('依赖模块加载完成，准备初始化多选组件...');
    
    // 存储所有可用标签的完整列表
    let allTags = [];
    
    // 手动添加点击事件以确保下拉菜单可以打开
    const inputContainer = container.querySelector('.multi-select-input-container');
    if (inputContainer) {
      inputContainer.addEventListener('click', function(e) {
        console.log('快捷标签输入容器被点击');
        dropdown.classList.toggle('open');
        searchInput.focus();
      });
    }
    
    // 防止搜索框的点击事件冒泡导致下拉框关闭
    searchInput.addEventListener('click', function(e) {
      console.log('快捷标签搜索框被点击');
      e.stopPropagation();
    });
    
    // 添加按钮点击事件
    addBtn.addEventListener('click', function(e) {
      console.log('快捷标签添加按钮被点击');
      e.stopPropagation();
      const value = searchInput.value.trim();
      if (value) {
        addTagToQuickTags(value);
        // 清空搜索框
        searchInput.value = '';
        // 重新渲染下拉列表，显示所有选项
        renderDropdownItems(allTags, '');
      }
    });
    
    // 添加搜索框回车事件
    searchInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        console.log('快捷标签搜索框回车键被按下');
        e.preventDefault();
        const value = this.value.trim();
        if (value) {
          addTagToQuickTags(value);
          // 清空搜索框
          searchInput.value = '';
          // 重新渲染下拉列表，显示所有选项
          renderDropdownItems(allTags, '');
        }
      }
    });
    
    // 添加文档点击事件关闭下拉框
    document.addEventListener('click', function closeDropdown(e) {
      if (!container.contains(e.target)) {
        dropdown.classList.remove('open');
      }
    });
    
    // 添加标签到快捷标签的函数
    async function addTagToQuickTags(tag) {
      console.log(`尝试添加标签: ${tag}`);
      
      try {
        // 确保标签不重复
        const currentValue = hiddenInput.value;
        const tags = currentValue ? currentValue.split(',').map(t => t.trim()) : [];
        
        if (tags.includes(tag)) {
          console.log(`标签 "${tag}" 已存在，不重复添加`);
          return;
        }
        
        // 添加新标签
        tags.push(tag);
        hiddenInput.value = tags.join(',');
        console.log(`成功添加标签: ${tag}, 当前所有标签: ${hiddenInput.value}`);
        
        // 更新显示
        renderTags();
        
        // 如果全部标签列表中不包含这个新标签，添加到列表中
        if (!allTags.includes(tag)) {
          allTags.push(tag);
          allTags.sort();
        }
        
        // 同步到数据源
        await syncDataFromEnum(true);
        
        // 同步到当前设置
        currentSettings.quickTags = tags;
      } catch (error) {
        console.error('添加标签出错:', error);
      }
    }
    
    // 渲染标签的函数
    function renderTags() {
      console.log('渲染快捷标签...');
      
      // 清空标签容器
      tagsContainer.innerHTML = '';
      
      // 获取当前标签列表
      const currentValue = hiddenInput.value;
      const tags = currentValue ? currentValue.split(',').map(t => t.trim()).filter(Boolean) : [];
      
      console.log(`正在渲染 ${tags.length} 个标签:`, tags);
      
      // 为每个标签创建元素
      tags.forEach(tag => {
        const tagElement = document.createElement('div');
        tagElement.className = 'multi-select-tag';
        
        const tagText = document.createElement('span');
        tagText.className = 'multi-select-tag-text';
        tagText.textContent = tag;
        tagElement.appendChild(tagText);
        
        const removeBtn = document.createElement('span');
        removeBtn.className = 'multi-select-tag-remove';
        removeBtn.innerHTML = '&times;';
        removeBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          removeTag(tag);
        });
        tagElement.appendChild(removeBtn);
        
        tagsContainer.appendChild(tagElement);
      });
    }
    
    // 移除标签的函数
    function removeTag(tag) {
      console.log(`移除标签: ${tag}`);
      
      // 获取当前标签列表
      const currentValue = hiddenInput.value;
      const tags = currentValue ? currentValue.split(',').map(t => t.trim()) : [];
      
      // 移除标签
      const index = tags.indexOf(tag);
      if (index !== -1) {
        tags.splice(index, 1);
        hiddenInput.value = tags.join(',');
        console.log(`成功移除标签，当前所有标签: ${hiddenInput.value}`);
        
        // 更新显示
        renderTags();
        
        // 更新当前设置
        currentSettings.quickTags = tags;
      }
    }
    
    // 渲染下拉选项，接受完整的项目列表和筛选文本
    function renderDropdownItems(items, filter = '') {
      console.log(`渲染下拉选项，共 ${items.length} 项, 过滤条件: "${filter}"`);
      
      // 清空列表
      itemsContainer.innerHTML = '';
      
      // 如果有过滤条件，过滤列表
      let filteredItems = items;
      if (filter) {
        filteredItems = items.filter(item => 
          item.toLowerCase().includes(filter.toLowerCase())
        );
        console.log(`过滤后剩余 ${filteredItems.length} 项`);
      }
      
      // 如果没有匹配项
      if (filteredItems.length === 0) {
        const noResults = document.createElement('div');
        noResults.className = 'multi-select-no-results';
        noResults.textContent = filter ? '没有匹配的选项' : '没有可选项';
        itemsContainer.appendChild(noResults);
        return;
      }
      
      // 获取当前已选值
      const currentValue = hiddenInput.value;
      const selectedItems = currentValue ? currentValue.split(',').map(t => t.trim()) : [];
      
      // 渲染每个选项
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
        
        // 点击项切换选中状态
        itemElement.addEventListener('click', function() {
          console.log(`选项 "${item}" 被点击`);
          toggleItem(item);
        });
        
        itemsContainer.appendChild(itemElement);
      });
    }
    
    // 切换选项选中状态
    function toggleItem(item) {
      console.log(`切换选项 "${item}" 的选中状态`);
      
      // 获取当前已选值
      const currentValue = hiddenInput.value;
      const selectedItems = currentValue ? currentValue.split(',').map(t => t.trim()).filter(Boolean) : [];
      
      // 切换选中状态
      const index = selectedItems.indexOf(item);
      if (index === -1) {
        // 添加项目
        selectedItems.push(item);
        console.log(`添加标签 "${item}"`);
      } else {
        // 移除项目
        selectedItems.splice(index, 1);
        console.log(`移除标签 "${item}"`);
      }
      
      // 更新隐藏输入值
      hiddenInput.value = selectedItems.join(',');
      console.log(`更新后的值: ${hiddenInput.value}`);
      
      // 更新显示
      renderTags();
      
      // 重新渲染下拉列表
      renderDropdownItems(allTags, searchInput.value);
      
      // 更新当前设置
      currentSettings.quickTags = selectedItems;
    }
    
    // 添加搜索框输入事件
    searchInput.addEventListener('input', function() {
      const searchValue = this.value.trim();
      console.log(`搜索框输入: "${searchValue}"`);
      
      // 始终基于完整的标签列表进行筛选
      renderDropdownItems(allTags, searchValue);
    });
    
    // 重置搜索框和筛选状态的函数
    function resetSearch() {
      console.log('重置搜索框状态');
      searchInput.value = '';
      renderDropdownItems(allTags, '');
    }
    
    // 初始化数据
    async function initializeData() {
      console.log('初始化快捷标签数据...');
      
      try {
        // 从数据库加载所有标签
        const collections = await window.electronAPI.getEnumValues('collection') || [];
        console.log(`从数据库加载了 ${collections.length} 个标签`);
        
        // 存储完整的标签列表
        allTags = [...collections].sort();
        
        // 初始化下拉列表
        renderDropdownItems(allTags, '');
        
        // 初始化当前选中的值
        if (currentSettings.quickTags && Array.isArray(currentSettings.quickTags)) {
          hiddenInput.value = currentSettings.quickTags.join(',');
          console.log(`设置初始值: ${hiddenInput.value}`);
          renderTags();
        }
      } catch (error) {
        console.error('初始化标签数据出错:', error);
      }
    }
    
    // 设置外部访问接口
    container.resetSearch = resetSearch;
    
    // 初始化数据
    await initializeData();
    
    // 确保标签数据同步刷新
    await syncDataFromEnum(true);
    
    console.log('快捷标签组件初始化成功');
  } catch (error) {
    console.error('初始化快捷标签组件失败:', error);
  }
}

// 保存成功提示
function showSaveSuccess() {
  // 显示保存成功提示
  import('./areaC.js').then(module => {
    // 保存成功后自动关闭弹窗
    hideSettingsModal();
    // setTimeout(() => {
      
    // }, 500);

    if (typeof module.showCustomAlert === 'function') {
      module.showCustomAlert('设置已保存', 'success');
    }
    
  });
}

// 设置事件监听器
function setupSettingsEventListeners() {
  // 获取元素
  const backdrop = document.getElementById('settings-backdrop');
  const modal = document.getElementById('settings-modal');
  const closeBtn = document.getElementById('settings-close-btn');
  const saveBtn = document.getElementById('settings-save-btn');
  const addFolderBtn = document.getElementById('add-folder-btn');
  const navItems = document.querySelectorAll('.settings-nav-item');
  const sectionResetBtns = document.querySelectorAll('.section-reset-btn');
  const zhihuLink = document.getElementById('zhihu-link');
  
  // 关闭按钮事件
  closeBtn.addEventListener('click', function() {
    // 重置快捷标签搜索状态
    resetQuickTagsSearch();
    hideSettingsModal();
  });
  
  // 点击背景关闭弹窗
  backdrop.addEventListener('click', function(event) {
    if (event.target === backdrop) {
      // 禁用点击背景关闭弹窗，避免误操作
      // hideSettingsModal();
    }
  });
  
  // 保存按钮事件
  saveBtn.addEventListener('click', async function() {
    console.log('保存设置');
    
    // 保存设置
    const success = await saveSettings();
    
    if (!success) {
      // 显示保存失败提示
      import('./areaC.js').then(module => {
        if (typeof module.showCustomAlert === 'function') {
          module.showCustomAlert('保存设置失败', 'error');
        }
      });
    }
  });
  
  // 栏目重置按钮事件
  sectionResetBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      const sectionId = this.getAttribute('data-section');
      console.log(`重置 ${sectionId} 栏目`);
      
      // 显示重置确认对话框
      import('./areaC.js').then(module => {
        if (typeof module.showCustomConfirm === 'function') {
          module.showCustomConfirm('确认重置', `确定要重置"${getSectionName(sectionId)}"栏目的所有设置吗？`, (confirmed) => {
            if (confirmed) {
              console.log(`确认重置 ${sectionId} 栏目，执行重置操作`);
              // 执行重置
              if (sectionId === 'general') {
                // 重置常规设置
                const folderPathsPanel = document.getElementById('folder-paths-panel');
                folderPathsPanel.innerHTML = '';
                currentSettings.general.scanFolders = [];
              } else if (sectionId === 'import') {
                // 重置导入设置
                document.getElementById('title-regex').value = DEFAULT_SETTINGS.import.titleRegex;
                currentSettings.import.titleRegex = DEFAULT_SETTINGS.import.titleRegex;
              } else if (sectionId === 'quickTags') {
                // 重置快捷标签设置
                document.getElementById('quick-tags').value = '';
                currentSettings.quickTags = [];
                
                // 重新渲染标签
                const container = document.getElementById('quick-tags-container');
                if (container && container.querySelector) {
                  // 尝试找到并调用渲染标签的函数
                  const tagsContainer = document.getElementById('quick-tags-tags');
                  if (tagsContainer) {
                    // 清空标签容器
                    tagsContainer.innerHTML = '';
                  }
                  
                  // 如果容器有重置搜索方法，调用它
                  if (typeof container.resetSearch === 'function') {
                    container.resetSearch();
                  }
                }
              }
              
              // 显示重置成功的提示
              if (typeof module.showCustomAlert === 'function') {
                module.showCustomAlert(`${getSectionName(sectionId)}栏目已重置`, 'success');
              }
            } else {
              console.log(`取消重置 ${sectionId} 栏目`);
            }
          });
        } else {
          console.error('找不到showCustomConfirm函数');
        }
      }).catch(error => {
        console.error('加载areaC.js失败:', error);
      });
    });
  });
  
  // 添加文件夹按钮事件
  addFolderBtn.addEventListener('click', async function() {
    console.log('添加文件夹');
    
    try {
      // 调用文件选择对话框
      const result = await window.electronAPI.selectFile({
        title: '选择文件夹',
        properties: ['openDirectory']
      });
      
      // 如果用户取消了选择
      if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
        console.log('用户取消了文件夹选择');
        return;
      }
      
      // 获取选择的文件夹路径
      const folderPath = result.filePaths[0];
      console.log(`选择的文件夹: ${folderPath}`);
      
      // 获取当前所有文件夹路径
      const existingFolders = [];
      document.querySelectorAll('#folder-paths-panel .folder-path').forEach(el => {
        existingFolders.push(el.textContent);
      });
      
      // 1. 检查是否重复
      if (existingFolders.includes(folderPath)) {
        console.log('文件夹已存在，不重复添加');
        import('./areaC.js').then(module => {
          if (typeof module.showCustomAlert === 'function') {
            module.showCustomAlert('该文件夹已添加，不需要重复添加', 'info');
          }
        });
        return;
      }
      
      // 2. 检查是否是现有文件夹的父文件夹，如果是则移除子文件夹
      const foldersToRemove = [];
      const normalizedNewPath = folderPath.replace(/\\/g, '/').toLowerCase();
      
      existingFolders.forEach(existingFolder => {
        const normalizedExistingPath = existingFolder.replace(/\\/g, '/').toLowerCase();
        
        // 检查现有文件夹是否是新文件夹的子文件夹
        if (normalizedExistingPath.startsWith(normalizedNewPath + '/')) {
          console.log(`发现子文件夹: ${existingFolder}`);
          foldersToRemove.push(existingFolder);
        }
      });
      
      // 如果有需要移除的子文件夹，显示确认对话框
      if (foldersToRemove.length > 0) {
        import('./areaC.js').then(module => {
          if (typeof module.showCustomConfirm === 'function') {
            const message = `检测到${foldersToRemove.length}个子文件夹已添加。添加父文件夹后，将自动移除这些子文件夹，您确定要继续吗？`;
            module.showCustomConfirm('确认添加父文件夹', message, (confirmed) => {
              if (confirmed) {
                // 移除子文件夹
                document.querySelectorAll('#folder-paths-panel .folder-path').forEach(el => {
                  if (foldersToRemove.includes(el.textContent)) {
                    el.closest('.folder-path-item').remove();
                  }
                });
                // 添加新文件夹
                addFolderToPanel(folderPath);
              }
            });
          }
        });
      } else {
        // 3. 检查新文件夹是否是现有文件夹的子文件夹
        let isSubFolder = false;
        let parentFolder = '';
        
        existingFolders.forEach(existingFolder => {
          const normalizedExistingPath = existingFolder.replace(/\\/g, '/').toLowerCase();
          
          if (normalizedNewPath.startsWith(normalizedExistingPath + '/')) {
            isSubFolder = true;
            parentFolder = existingFolder;
          }
        });
        
        if (isSubFolder) {
          import('./areaC.js').then(module => {
            if (typeof module.showCustomAlert === 'function') {
              module.showCustomAlert(`该文件夹是已添加文件夹"${parentFolder}"的子文件夹，无需单独添加`, 'info');
            }
          });
          return;
        }
        
        // 添加新文件夹
        addFolderToPanel(folderPath);
      }
    } catch (error) {
      console.error('选择文件夹失败:', error);
      
      // 显示错误提示
      import('./areaC.js').then(module => {
        if (typeof module.showCustomAlert === 'function') {
          module.showCustomAlert('选择文件夹失败', 'error');
        }
      });
    }
  });
  
  // 辅助函数：向面板添加文件夹
  function addFolderToPanel(folderPath) {
    const folderPathsPanel = document.getElementById('folder-paths-panel');
    const newFolderPath = document.createElement('div');
    newFolderPath.className = 'folder-path-item';
    newFolderPath.innerHTML = `
      <span class="folder-path">${folderPath}</span>
      <button class="folder-path-remove"><i class="fas fa-times"></i></button>
    `;
    folderPathsPanel.appendChild(newFolderPath);
    
    // 为新添加的删除按钮绑定事件
    const removeBtn = newFolderPath.querySelector('.folder-path-remove');
    removeBtn.addEventListener('click', function() {
      newFolderPath.remove();
    });
  }
  
  // 知乎链接点击事件，使用默认浏览器打开
  zhihuLink.addEventListener('click', function(e) {
    e.preventDefault();
    const url = this.getAttribute('href');
    window.electronAPI.openExternal(url);
  });
  
  // 已有的文件夹删除按钮事件
  document.querySelectorAll('.folder-path-remove').forEach(btn => {
    btn.addEventListener('click', function() {
      this.closest('.folder-path-item').remove();
    });
  });
  
  // 重置快捷标签搜索状态的函数
  function resetQuickTagsSearch() {
    const container = document.getElementById('quick-tags-container');
    if (container && typeof container.resetSearch === 'function') {
      container.resetSearch();
    }
  }
  
  // 导航选项卡切换事件
  navItems.forEach(item => {
    item.addEventListener('click', function() {
      // 重置之前标签的搜索状态（如果是从快捷标签切换出去）
      const previousActiveTab = document.querySelector('.settings-nav-item.active');
      if (previousActiveTab && previousActiveTab.getAttribute('data-section') === 'quickTags') {
        resetQuickTagsSearch();
      }
      
      // 移除所有导航项和内容区域的active类
      navItems.forEach(navItem => navItem.classList.remove('active'));
      document.querySelectorAll('.settings-section').forEach(section => {
        section.classList.remove('active');
      });
      
      // 添加active类到当前选中的导航项
      this.classList.add('active');
      
      // 显示对应的内容区域
      const sectionId = this.getAttribute('data-section');
      const section = document.getElementById(`${sectionId}-section`);
      if (section) {
        section.classList.add('active');
        
        // 如果切换到快捷标签，确保初始化组件
        if (sectionId === 'quickTags') {
          console.log('导航切换到快捷标签，初始化组件');
          setTimeout(() => {
            initQuickTagsComponent();
          }, 10);
        }
      }
    });
  });
  
  // 阻止事件冒泡
  modal.addEventListener('click', function(event) {
    event.stopPropagation();
  });
}

// 获取栏目名称
function getSectionName(sectionId) {
  switch (sectionId) {
    case 'general':
      return '常规';
    case 'import':
      return '导入';
    case 'quickTags':
      return '快捷标签';
    case 'about':
      return '关于';
    default:
      return sectionId;
  }
}

// 显示设置弹窗
async function showSettingsModal() {
  // 确保弹窗已创建
  await createSettingsModal();
  
  // 重新加载设置，确保显示最新保存的值
  loadSettings();
  
  // 显示弹窗
  const backdrop = document.getElementById('settings-backdrop');
  const modal = document.getElementById('settings-modal');
  
  backdrop.style.display = 'flex';
  
  // 使用setTimeout触发过渡效果
  setTimeout(() => {
    backdrop.classList.add('visible');
    modal.classList.add('visible');
    
    // 显示弹窗后，确保快捷标签组件正确初始化
    console.log('设置弹窗已显示，重新初始化快捷标签组件');
    
    // 等待DOM完全渲染后初始化
    setTimeout(() => {
      initQuickTagsComponent();
    }, 100);
  }, 10);
}

// 隐藏设置弹窗
function hideSettingsModal() {
  const backdrop = document.getElementById('settings-backdrop');
  const modal = document.getElementById('settings-modal');
  
  // 重置快捷标签搜索状态
  const container = document.getElementById('quick-tags-container');
  if (container && typeof container.resetSearch === 'function') {
    container.resetSearch();
  }
  
  // 移除可见性类
  backdrop.classList.remove('visible');
  modal.classList.remove('visible');
  
  // 等待过渡效果完成后隐藏元素
  setTimeout(() => {
    backdrop.style.display = 'none';
  }, 200);
}

// 导出模块
export {
  showSettingsModal,
  hideSettingsModal
}; 