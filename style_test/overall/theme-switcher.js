/**
 * 主题切换器
 * 用于在不同主题之间切换
 */

// 定义可用的主题
const THEMES = [
  {
    id: 'purple-theme',
    name: '紫色主题',
    cssFile: 'purple-theme.css',
    icon: '🟣'
  },
  {
    id: 'blue-theme',
    name: '蓝色主题',
    cssFile: 'blue-theme.css',
    icon: '🔵'
  },
  {
    id: 'dark-theme',
    name: '深色主题',
    cssFile: 'dark-theme.css',
    icon: '🌙'
  }
];

// 默认主题
const DEFAULT_THEME = 'purple-theme';

// 本地存储键名
const STORAGE_KEY = 'preferred-theme';

// DOM 元素ID
const THEME_STYLE_ELEMENT_ID = 'theme-style';
const THEME_SWITCHER_ID = 'theme-switcher';

/**
 * 获取当前应用的主题
 * @returns {string} 当前主题ID
 */
function getCurrentTheme() {
  return localStorage.getItem(STORAGE_KEY) || DEFAULT_THEME;
}

/**
 * 保存主题偏好到本地存储
 * @param {string} themeId - 主题ID
 */
function saveThemePreference(themeId) {
  localStorage.setItem(STORAGE_KEY, themeId);
}

/**
 * 应用主题到页面
 * @param {string} themeId - 主题ID
 */
function applyTheme(themeId) {
  // 移除所有主题类
  document.body.classList.remove(...THEMES.map(theme => theme.id));
  
  // 添加新主题类
  document.body.classList.add(themeId);
  
  // 查找主题配置
  const theme = THEMES.find(t => t.id === themeId);
  if (!theme) return;
  
  // 更新或创建样式链接
  let styleLink = document.getElementById(THEME_STYLE_ELEMENT_ID);
  if (!styleLink) {
    styleLink = document.createElement('link');
    styleLink.id = THEME_STYLE_ELEMENT_ID;
    styleLink.rel = 'stylesheet';
    document.head.appendChild(styleLink);
  }
  
  // 设置样式链接
  styleLink.href = `overall/${theme.cssFile}`;
  
  // 更新主题选择器中的活动项
  updateActiveSwitcherItem(themeId);
  
  // 保存偏好
  saveThemePreference(themeId);
  
  console.log(`已应用主题: ${theme.name}`);
}

/**
 * 更新主题选择器中的活动项
 * @param {string} activeThemeId - 活动主题ID
 */
function updateActiveSwitcherItem(activeThemeId) {
  const switcher = document.getElementById(THEME_SWITCHER_ID);
  if (!switcher) return;
  
  // 更新所有主题项的活动状态
  const items = switcher.querySelectorAll('.theme-item');
  items.forEach(item => {
    if (item.dataset.themeId === activeThemeId) {
      item.classList.add('active');
      item.setAttribute('aria-selected', 'true');
    } else {
      item.classList.remove('active');
      item.setAttribute('aria-selected', 'false');
    }
  });
}

/**
 * 创建主题切换器
 */
function createThemeSwitcher() {
  // 检查是否已存在
  if (document.getElementById(THEME_SWITCHER_ID)) return;
  
  // 创建主题切换器容器
  const switcher = document.createElement('div');
  switcher.id = THEME_SWITCHER_ID;
  switcher.className = 'theme-switcher';
  switcher.setAttribute('role', 'radiogroup');
  switcher.setAttribute('aria-label', '选择主题');
  
  // 添加标题
  const title = document.createElement('div');
  title.className = 'theme-switcher-title';
  title.textContent = '主题';
  switcher.appendChild(title);
  
  // 添加主题选项
  const themeList = document.createElement('div');
  themeList.className = 'theme-list';
  
  THEMES.forEach(theme => {
    const themeItem = document.createElement('button');
    themeItem.className = 'theme-item';
    themeItem.dataset.themeId = theme.id;
    themeItem.setAttribute('role', 'radio');
    themeItem.setAttribute('aria-selected', 'false');
    themeItem.title = theme.name;
    
    const themeIcon = document.createElement('span');
    themeIcon.className = 'theme-icon';
    themeIcon.textContent = theme.icon;
    themeItem.appendChild(themeIcon);
    
    const themeName = document.createElement('span');
    themeName.className = 'theme-name';
    themeName.textContent = theme.name;
    themeItem.appendChild(themeName);
    
    // 添加点击事件
    themeItem.addEventListener('click', () => applyTheme(theme.id));
    
    themeList.appendChild(themeItem);
  });
  
  switcher.appendChild(themeList);
  
  // 添加到页面
  document.body.appendChild(switcher);
  
  // 添加样式
  addThemeSwitcherStyles();
}

/**
 * 添加主题切换器样式
 */
function addThemeSwitcherStyles() {
  // 检查是否已添加样式
  if (document.getElementById('theme-switcher-styles')) return;
  
  // 创建样式元素
  const style = document.createElement('style');
  style.id = 'theme-switcher-styles';
  
  // 设置样式内容
  style.textContent = `
    .theme-switcher {
      position: fixed;
      right: 20px;
      bottom: 20px;
      background-color: #fff;
      border-radius: 10px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      padding: 12px;
      z-index: 1000;
      width: 180px;
      transition: transform 0.3s ease, opacity 0.3s ease;
      transform: translateY(0);
      opacity: 0.9;
    }
    
    .theme-switcher:hover {
      opacity: 1;
      transform: translateY(-5px);
    }
    
    .theme-switcher-title {
      font-weight: 600;
      margin-bottom: 8px;
      color: #4b5563;
      font-size: 14px;
      padding-bottom: 8px;
      border-bottom: 1px solid #e5e7eb;
    }
    
    .theme-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .theme-item {
      padding: 8px 10px;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      border: none;
      background: none;
      text-align: left;
      transition: background-color 0.2s ease;
      width: 100%;
    }
    
    .theme-item:hover {
      background-color: #f3f4f6;
    }
    
    .theme-item.active {
      background-color: #f3f4f6;
      position: relative;
    }
    
    .theme-item.active::after {
      content: "✓";
      position: absolute;
      right: 10px;
      color: #4f46e5;
      font-weight: bold;
    }
    
    .theme-icon {
      margin-right: 8px;
      font-size: 16px;
    }
    
    .theme-name {
      font-size: 14px;
      color: #4b5563;
    }
    
    /* 深色主题下的样式调整 */
    .dark-theme .theme-switcher {
      background-color: #1f2937;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      border: 1px solid #374151;
    }
    
    .dark-theme .theme-switcher-title {
      color: #e5e7eb;
      border-bottom-color: #374151;
    }
    
    .dark-theme .theme-item:hover {
      background-color: #374151;
    }
    
    .dark-theme .theme-item.active {
      background-color: #374151;
    }
    
    .dark-theme .theme-name {
      color: #d1d5db;
    }
    
    .dark-theme .theme-item.active::after {
      color: #8b5cf6;
    }
    
    /* 响应式调整 */
    @media (max-width: 768px) {
      .theme-switcher {
        right: 12px;
        bottom: 12px;
        width: auto;
        padding: 8px;
      }
      
      .theme-switcher-title,
      .theme-name {
        display: none;
      }
      
      .theme-list {
        flex-direction: row;
      }
      
      .theme-item {
        padding: 8px;
      }
      
      .theme-icon {
        margin-right: 0;
        font-size: 18px;
      }
      
      .theme-item.active::after {
        display: none;
      }
    }
  `;
  
  // 添加到页面
  document.head.appendChild(style);
}

/**
 * 初始化主题
 */
function initTheme() {
  // 创建主题切换器
  createThemeSwitcher();
  
  // 应用保存的主题或默认主题
  const currentTheme = getCurrentTheme();
  applyTheme(currentTheme);
}

// 当DOM内容加载完成后初始化主题
document.addEventListener('DOMContentLoaded', initTheme);

// 导出函数供外部使用
window.themeManager = {
  getCurrentTheme,
  applyTheme,
  THEMES
}; 