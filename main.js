const { app, BrowserWindow, ipcMain, dialog, protocol } = require('electron');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
// 导入ffprobe-static包获取ffprobe路径
const ffprobePath = require('ffprobe-static').path;
const db = require('./js/database');

// 检测是否在打包环境中运行
const isPackaged = app.isPackaged;
console.log(`应用正在${isPackaged ? '打包' : '开发'}环境中运行`);

// 获取FFmpeg和FFprobe的正确路径
function getExecutablePath(rawPath) {
  // 在打包环境中，需要特殊处理可执行文件路径
  if (isPackaged) {
    // 获取app.asar之外的路径
    const appPath = path.dirname(app.getAppPath());
    
    // 根据操作系统设置正确的路径
    if (process.platform === 'win32') {
      // Windows下，检查多个可能的位置
      
      // 1. 检查resources目录中的可执行文件（由extraResources配置项放置）
      const resourcesPath = path.join(path.dirname(process.execPath), 'resources');
      const exeName = path.basename(rawPath);
      
      // 路径可能性列表，按优先级排序
      const possiblePaths = [
        // 通过extraResources复制的文件
        path.join(resourcesPath, path.basename(exeName)),
        
        // 常规node_modules路径
        path.join(resourcesPath, 'node_modules', exeName),
        path.join(resourcesPath, 'node_modules', 'ffmpeg-static', exeName),
        path.join(resourcesPath, 'node_modules', 'ffprobe-static', 'bin', 'win32', 'x64', exeName),
        
        // 可执行文件目录
        path.join(path.dirname(process.execPath), exeName),
        
        // 原始路径
        rawPath
      ];
      
      // 检查每个可能的路径
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          console.log(`在打包环境中找到可执行文件: ${p}`);
          return p;
        }
      }
      
      // 如果没有找到，记录警告并返回原始路径
      console.warn(`在打包环境中未找到可执行文件: ${rawPath}, 将使用原始路径`);
      return rawPath;
    } else if (process.platform === 'darwin') {
      // macOS
      const executablePath = path.join(appPath, 'node_modules', path.basename(rawPath));
      console.log(`macOS环境，转换后的可执行文件路径: ${executablePath}`);
      return fs.existsSync(executablePath) ? executablePath : rawPath;
    } else {
      // Linux
      const executablePath = path.join(appPath, 'node_modules', path.basename(rawPath));
      console.log(`Linux环境，转换后的可执行文件路径: ${executablePath}`);
      return fs.existsSync(executablePath) ? executablePath : rawPath;
    }
  }
  
  // 开发环境下直接使用原始路径
  console.log(`开发环境，使用原始可执行文件路径: ${rawPath}`);
  return rawPath;
}

// 获取适合当前环境的FFmpeg和FFprobe路径
const ffmpegExecutablePath = getExecutablePath(ffmpegPath);
const ffprobeExecutablePath = getExecutablePath(ffprobePath);

// 设置ffmpeg和ffprobe路径
ffmpeg.setFfmpegPath(ffmpegExecutablePath);
ffmpeg.setFfprobePath(ffprobeExecutablePath);

console.log('FFmpeg路径:', ffmpegExecutablePath);
console.log('FFprobe路径:', ffprobeExecutablePath);

// 测试FFmpeg和FFprobe可执行性
function testFFmpegExecution() {
  const fs = require('fs');
  const { execFile } = require('child_process');
  
  console.log('打包状态:', isPackaged ? '已打包' : '开发环境');
  console.log('App Path:', app.getAppPath());
  console.log('Exe Path:', process.execPath);
  console.log('应用目录:', path.dirname(process.execPath));
  console.log('资源目录:', path.join(path.dirname(process.execPath), 'resources'));
  
  logToFile('[TEST] 开始测试FFmpeg和FFprobe可执行性');
  logToFile(`[TEST] 打包状态: ${isPackaged ? '已打包' : '开发环境'}`);
  logToFile(`[TEST] App路径: ${app.getAppPath()}`);
  logToFile(`[TEST] 可执行文件路径: ${process.execPath}`);
  logToFile(`[TEST] 应用目录: ${path.dirname(process.execPath)}`);
  logToFile(`[TEST] 资源目录: ${path.join(path.dirname(process.execPath), 'resources')}`);
  
  // 检查node_modules目录
  const possibleNodeModulesPaths = [
    path.join(path.dirname(process.execPath), 'resources', 'node_modules'),
    path.join(path.dirname(process.execPath), 'node_modules'),
    path.join(app.getAppPath(), 'node_modules')
  ];
  
  possibleNodeModulesPaths.forEach(nodePath => {
    const exists = fs.existsSync(nodePath);
    console.log(`检查node_modules路径: ${nodePath}, 存在: ${exists}`);
    logToFile(`[TEST] 检查node_modules路径: ${nodePath}, 存在: ${exists}`);
    
    if (exists) {
      try {
        // 列出node_modules中的内容
        const items = fs.readdirSync(nodePath);
        logToFile(`[TEST] ${nodePath} 中内容: ${items.join(', ')}`);
        
        // 检查ffmpeg-static和ffprobe-static是否存在
        const ffmpegStaticPath = path.join(nodePath, 'ffmpeg-static');
        const ffprobeStaticPath = path.join(nodePath, 'ffprobe-static');
        
        if (fs.existsSync(ffmpegStaticPath)) {
          logToFile(`[TEST] ffmpeg-static存在于 ${ffmpegStaticPath}`);
          
          // 列出ffmpeg-static中的内容
          try {
            const ffmpegItems = fs.readdirSync(ffmpegStaticPath);
            logToFile(`[TEST] ffmpeg-static内容: ${ffmpegItems.join(', ')}`);
          } catch (e) {
            logToFile(`[TEST] 无法列出ffmpeg-static内容: ${e.message}`);
          }
        }
        
        if (fs.existsSync(ffprobeStaticPath)) {
          logToFile(`[TEST] ffprobe-static存在于 ${ffprobeStaticPath}`);
          
          // 列出ffprobe-static中的内容
          try {
            const ffprobeItems = fs.readdirSync(ffprobeStaticPath);
            logToFile(`[TEST] ffprobe-static内容: ${ffprobeItems.join(', ')}`);
            
            // 检查bin目录
            const binPath = path.join(ffprobeStaticPath, 'bin');
            if (fs.existsSync(binPath)) {
              const binItems = fs.readdirSync(binPath);
              logToFile(`[TEST] ffprobe-static/bin内容: ${binItems.join(', ')}`);
              
              // 检查win32目录
              const winPath = path.join(binPath, 'win32');
              if (fs.existsSync(winPath)) {
                const winItems = fs.readdirSync(winPath);
                logToFile(`[TEST] ffprobe-static/bin/win32内容: ${winItems.join(', ')}`);
                
                // 检查x64目录
                const x64Path = path.join(winPath, 'x64');
                if (fs.existsSync(x64Path)) {
                  const x64Items = fs.readdirSync(x64Path);
                  logToFile(`[TEST] ffprobe-static/bin/win32/x64内容: ${x64Items.join(', ')}`);
                }
              }
            }
          } catch (e) {
            logToFile(`[TEST] 无法列出ffprobe-static内容: ${e.message}`);
          }
        }
      } catch (e) {
        logToFile(`[TEST] 无法列出${nodePath}内容: ${e.message}`);
      }
    }
  });
  
  console.log('测试FFmpeg可执行性...');
  logToFile('[TEST] 开始测试FFmpeg可执行性');
  
  // 测试FFmpeg
  try {
    if (fs.existsSync(ffmpegExecutablePath)) {
      console.log('FFmpeg文件存在:', ffmpegExecutablePath);
      logToFile(`[TEST] FFmpeg文件存在: ${ffmpegExecutablePath}`);
      
      // 检查文件权限
      try {
        fs.accessSync(ffmpegExecutablePath, fs.constants.X_OK);
        console.log('FFmpeg有执行权限');
        logToFile('[TEST] FFmpeg有执行权限');
      } catch (error) {
        console.error('FFmpeg没有执行权限:', error);
        logToFile(`[TEST] FFmpeg没有执行权限: ${error.message}`);
        
        // 尝试添加执行权限
        if (process.platform !== 'win32') {
          try {
            fs.chmodSync(ffmpegExecutablePath, '755');
            console.log('已添加FFmpeg执行权限');
            logToFile('[TEST] 已添加FFmpeg执行权限');
          } catch (chmodError) {
            console.error('添加执行权限失败:', chmodError);
            logToFile(`[TEST] 添加FFmpeg执行权限失败: ${chmodError.message}`);
          }
        }
      }
      
      // 直接调用FFmpeg测试
      execFile(ffmpegExecutablePath, ['-version'], (error, stdout, stderr) => {
        if (error) {
          console.error('FFmpeg执行测试失败:', error);
          console.error('stderr:', stderr);
          logError('FFmpeg执行测试失败', error);
          logToFile(`[TEST] FFmpeg stderr: ${stderr}`);
          
          // 尝试列出父目录内容
          try {
            const parentDir = path.dirname(ffmpegExecutablePath);
            const dirContents = fs.readdirSync(parentDir);
            console.log(`FFmpeg父目录(${parentDir})内容:`, dirContents);
            logToFile(`[TEST] FFmpeg父目录(${parentDir})内容: ${dirContents.join(', ')}`);
          } catch (err) {
            console.error('列出父目录失败:', err);
            logToFile(`[TEST] 列出FFmpeg父目录失败: ${err.message}`);
          }
        } else {
          console.log('FFmpeg执行测试成功:', stdout.split('\n')[0]);
          logToFile(`[TEST] FFmpeg执行测试成功: ${stdout.split('\n')[0]}`);
        }
      });
    } else {
      console.error('FFmpeg文件不存在:', ffmpegExecutablePath);
      // 尝试查找其他可能的位置
      const possiblePaths = [
        path.join(path.dirname(process.execPath), 'ffmpeg.exe'),
        path.join(path.dirname(process.execPath), 'resources', 'ffmpeg.exe'),
        path.join(path.dirname(app.getAppPath()), 'ffmpeg.exe')
      ];
      
      possiblePaths.forEach(p => {
        const exists = fs.existsSync(p);
        console.log(`检查替代路径: ${p}, 存在: ${exists}`);
        if (exists) {
          console.log('找到替代FFmpeg路径:', p);
          ffmpeg.setFfmpegPath(p);
        }
      });
    }
  } catch (error) {
    console.error('FFmpeg文件检查失败:', error);
  }
  
  console.log('测试FFprobe可执行性...');
  // 测试FFprobe
  try {
    if (fs.existsSync(ffprobeExecutablePath)) {
      console.log('FFprobe文件存在:', ffprobeExecutablePath);
      
      // 检查文件权限
      try {
        fs.accessSync(ffprobeExecutablePath, fs.constants.X_OK);
        console.log('FFprobe有执行权限');
      } catch (error) {
        console.error('FFprobe没有执行权限:', error);
        
        // 尝试添加执行权限
        if (process.platform !== 'win32') {
          try {
            fs.chmodSync(ffprobeExecutablePath, '755');
            console.log('已添加FFprobe执行权限');
          } catch (chmodError) {
            console.error('添加执行权限失败:', chmodError);
          }
        }
      }
      
      // 直接调用FFprobe测试
      execFile(ffprobeExecutablePath, ['-version'], (error, stdout, stderr) => {
        if (error) {
          console.error('FFprobe执行测试失败:', error);
          console.error('stderr:', stderr);
          // 尝试列出父目录内容
          try {
            const parentDir = path.dirname(ffprobeExecutablePath);
            console.log(`FFprobe父目录(${parentDir})内容:`, fs.readdirSync(parentDir));
          } catch (err) {
            console.error('列出父目录失败:', err);
          }
        } else {
          console.log('FFprobe执行测试成功:', stdout.split('\n')[0]);
        }
      });
    } else {
      console.error('FFprobe文件不存在:', ffprobeExecutablePath);
      // 尝试查找其他可能的位置
      const possiblePaths = [
        path.join(path.dirname(process.execPath), 'ffprobe.exe'),
        path.join(path.dirname(process.execPath), 'resources', 'ffprobe.exe'),
        path.join(path.dirname(app.getAppPath()), 'ffprobe.exe')
      ];
      
      possiblePaths.forEach(p => {
        const exists = fs.existsSync(p);
        console.log(`检查替代路径: ${p}, 存在: ${exists}`);
        if (exists) {
          console.log('找到替代FFprobe路径:', p);
          ffmpeg.setFfprobePath(p);
        }
      });
    }
  } catch (error) {
    console.error('FFprobe文件检查失败:', error);
  }
}

// 在应用就绪后测试FFmpeg可执行性
app.whenReady().then(() => {
  testFFmpegExecution();
  
  // 直接尝试修复现有的ffprobe.exe文件
  try {
    const resourcesDir = path.join(path.dirname(process.execPath), 'resources');
    const ffprobePath = path.join(resourcesDir, 'ffprobe.exe');
    
    if (fs.existsSync(ffprobePath)) {
      // 尝试验证ffprobe是否真的可用
      const { execFileSync } = require('child_process');
      try {
        execFileSync(ffprobePath, ['-version']);
        console.log('FFprobe文件验证成功，可以执行');
        logToFile('[FIX] FFprobe文件验证成功，可以执行');
      } catch (e) {
        console.log('FFprobe文件无法执行，尝试修复:', e.message);
        logToFile(`[FIX] FFprobe文件无法执行: ${e.message}`);
        
        // 尝试从app.asar.unpacked目录找到可用的ffprobe文件
        const unpackedDir = path.join(resourcesDir, 'app.asar.unpacked');
        searchFileInDir(unpackedDir, 'ffprobe.exe')
          .then(foundPaths => {
            if (foundPaths.length > 0) {
              logToFile(`[FIX] 在unpacked目录中找到ffprobe: ${foundPaths[0]}`);
              try {
                // 尝试复制
                fs.copyFileSync(foundPaths[0], ffprobePath);
                logToFile(`[FIX] 已复制可用的ffprobe文件: ${foundPaths[0]} -> ${ffprobePath}`);
                
                // 尝试设置执行权限
                if (process.platform === 'win32') {
                  const { execSync } = require('child_process');
                  execSync(`icacls "${ffprobePath}" /grant Everyone:RX`);
                  logToFile('[FIX] 已设置FFprobe执行权限');
                } else {
                  fs.chmodSync(ffprobePath, '755');
                  logToFile('[FIX] 已设置FFprobe执行权限');
                }
                
                // 再次测试
                try {
                  execFileSync(ffprobePath, ['-version']);
                  logToFile('[FIX] 修复后FFprobe可以正常执行');
                } catch (testErr) {
                  logToFile(`[FIX] 修复后FFprobe仍然无法执行: ${testErr.message}`);
                }
              } catch (copyErr) {
                logToFile(`[FIX] 复制ffprobe文件失败: ${copyErr.message}`);
              }
            } else {
              logToFile('[FIX] 在unpacked目录中未找到可用的ffprobe文件');
            }
          });
      }
    }
  } catch (e) {
    logToFile(`[FIX] 尝试修复ffprobe时出错: ${e.message}`);
  }
});

// 单实例锁定
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  // 如果没有获得锁，则退出应用
  console.log('应用已经运行，退出');
  app.quit();
} else {
  // 监听第二个实例启动事件
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // 如果有窗口已经打开，则激活窗口并给予焦点
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// 自定义用户数据路径管理
function getUserDataPath(...args) {
  // 在开发环境中使用app.getAppPath()，在生产环境中使用app.getPath('exe')
  let basePath;
  
  if (app.isPackaged) {
    // 生产环境：使用可执行文件所在目录
    basePath = path.dirname(process.execPath);
  } else {
    // 开发环境：使用当前目录
    basePath = app.getAppPath();
  }
  
  // 在基础路径下创建userdata目录
  const userDataDir = path.join(basePath, 'userdata');
  return path.join(userDataDir, ...args);
}

// 确保目录存在的辅助函数
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// 获取缩略图目录路径
function getThumbnailDir() {
  const thumbnailDir = getUserDataPath('thumbnails');
  ensureDirectoryExists(thumbnailDir);
  return thumbnailDir;
}

// 保持对window对象的全局引用，避免JavaScript对象被垃圾回收时，窗口被自动关闭
let mainWindow;

// 避免重复注册IPC处理程序
let ipcHandlersRegistered = false;

// 创建窗口
function createWindow() {
  // 创建浏览器窗口 
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    frame: false, // 无边框窗口，我们将使用自定义标题栏
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), // 预加载脚本
      contextIsolation: true, // 启用上下文隔离
      nodeIntegration: false // 禁用Node集成，提高安全性
    }
  });

  // 加载应用的index.html
  mainWindow.loadFile('index.html');

  // 当window被关闭时，触发下面的事件
  mainWindow.on('closed', function () {
    mainWindow = null;
  });

  // 只有首次创建窗口时才注册IPC处理程序
  if (!ipcHandlersRegistered) {
    registerIpcHandlers();
    ipcHandlersRegistered = true;
  }
}

// 格式化文件大小的辅助函数
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 格式化时长的辅助函数
function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  // 格式化为 HH:MM:SS，如果小时为0则显示为 MM:SS
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}

// 添加获取设置的函数
async function getSettings() {
  try {
    // 从本地文件加载设置，使用自定义用户数据路径
    const settingsPath = getUserDataPath('settings.json');
    
    // 检查设置文件是否存在
    if (!fs.existsSync(settingsPath)) {
      console.log('设置文件不存在，返回默认设置');
      
      // 创建默认设置文件
      await createDefaultSettingsFile();
      
      // 返回默认设置
      return DEFAULT_SETTINGS;
    }
    
    // 读取设置文件
    const settingsData = fs.readFileSync(settingsPath, 'utf8');
    console.log('设置已加载');
    
    try {
      // 尝试解析JSON
    const settings = JSON.parse(settingsData);
    return settings;
    } catch (parseError) {
      console.error('解析设置文件时出错:', parseError.message);
      
      // 文件无法解析，返回默认设置
      console.log('返回默认设置作为备选方案');
      return DEFAULT_SETTINGS;
    }
  } catch (error) {
    console.error('加载设置失败:', error);
    
    // 发生错误时返回默认设置
    console.log('发生错误，返回默认设置');
    return DEFAULT_SETTINGS;
  }
}

// 获取视频分辨率的函数
function getVideoResolution(videoPath) {
  try {
    console.log('获取视频分辨率:', videoPath);
    logToFile(`[MAIN] 开始获取视频分辨率: ${videoPath}`);
    
    if (!videoPath || !fs.existsSync(videoPath)) {
      console.error('视频文件不存在:', videoPath);
      logToFile(`[MAIN] 视频文件不存在: ${videoPath}`);
      return '';
    }
    
    return getResolutionDirect(videoPath);
  } catch (error) {
    console.error('获取视频分辨率时发生错误:', error.message);
    logError('获取视频分辨率时发生错误', error);
    return '';
  }
}

// 直接使用命令行获取分辨率
function getResolutionDirect(videoPath) {
  return new Promise((resolve) => {
    console.log('直接获取视频分辨率');
    logToFile(`[RESOLUTION] 开始获取视频分辨率: ${videoPath}`);
    
    try {
      // 获取ffprobe路径
      const ffprobePath = getFfprobePath();
      if (!ffprobePath) {
        const errMsg = '无法找到ffprobe路径';
        console.error(errMsg);
        logToFile(`[RESOLUTION] ${errMsg}`);
        resolve('');
        return;
      }
      
      logToFile(`[RESOLUTION] 在${isPackaged ? '打包' : '开发'}环境中使用ffprobe路径: ${ffprobePath}`);
      logToFile(`[RESOLUTION] 检查ffprobe可执行文件是否存在: ${fs.existsSync(ffprobePath)}`);
      
      // 使用exec直接执行命令
      const { exec } = require('child_process');
      const command = `"${ffprobePath}" -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "${videoPath}"`;
      
      console.log(`执行命令: ${command}`);
      logToFile(`[RESOLUTION] 开始执行命令获取分辨率: ${command}`);
      
      // 直接执行命令
      exec(command, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
        if (error) {
          console.error('获取分辨率失败:', error.message);
          logError(`获取分辨率失败, 命令: ${command}`, error);
          
          if (stderr) {
            logToFile(`[RESOLUTION] 错误输出: ${stderr}`);
          }
          
          // 尝试列出文件路径的目录内容
          try {
            const videoDir = path.dirname(videoPath);
            const files = fs.readdirSync(videoDir);
            logToFile(`[RESOLUTION] 视频所在目录 ${videoDir} 内容: ${files.join(', ')}`);
          } catch (dirErr) {
            logToFile(`[RESOLUTION] 无法列出视频目录内容: ${dirErr.message}`);
          }
          
          // 尝试使用另一种方式
          console.log('尝试使用备选方法获取分辨率');
          tryAlternativeResolutionMethod(videoPath)
            .then(resolution => {
              logToFile(`[RESOLUTION] 备选方法获取成功: ${resolution}`);
              resolve(resolution);
            })
            .catch(err => {
              logToFile(`[RESOLUTION] 备选方法也失败: ${err.message}`);
              resolve(''); // 解析失败时返回空字符串而不是拒绝，避免应用崩溃
            });
          
          return;
        }
        
        const output = stdout.trim();
        logToFile(`[RESOLUTION] 命令输出: "${output}"`);
        
        if (output && output.includes('x')) {
          // 将'x'替换为'×'以符合UI显示要求
          const resolution = output.replace('x', '×');
          console.log(`成功解析分辨率: ${resolution}`);
          logToFile(`[RESOLUTION] 成功解析分辨率: ${resolution}`);
          resolve(resolution);
        } else {
          const errMsg = '无法从输出中解析分辨率';
          console.error(errMsg);
          logToFile(`[RESOLUTION] ${errMsg}, 输出为空或格式不正确`);
          
          // 尝试使用另一种方式
          console.log('尝试使用备选方法获取分辨率');
          tryAlternativeResolutionMethod(videoPath)
            .then(resolution => {
              logToFile(`[RESOLUTION] 备选方法获取成功: ${resolution}`);
              resolve(resolution);
            })
            .catch(err => {
              logToFile(`[RESOLUTION] 备选方法也失败: ${err.message}`);
              resolve(''); // 解析失败时返回空字符串
            });
        }
      });
    } catch (error) {
      console.error('获取分辨率过程中发生错误:', error.message);
      logError('获取分辨率过程中发生错误', error);
      
      tryAlternativeResolutionMethod(videoPath)
        .then(resolution => {
          logToFile(`[RESOLUTION] 捕获异常后备选方法获取成功: ${resolution}`);
          resolve(resolution);
        })
        .catch(err => {
          logToFile(`[RESOLUTION] 捕获异常后备选方法也失败: ${err.message}`);
          resolve(''); // 解析失败时返回空字符串
        });
    }
  });
}

// 添加一个新的备选方法，使用类似缩略图生成的直接子进程方式
function tryAlternativeResolutionMethod(videoPath) {
  return new Promise((resolve, reject) => {
    logToFile(`[RESOLUTION_ALT2] 尝试使用直接命令行方式获取分辨率: ${videoPath}`);
    
    try {
      // 获取ffprobe路径
      const ffprobePath = getFfprobePath();
      if (!ffprobePath) {
        const errMsg = '无法找到ffprobe路径';
        logToFile(`[RESOLUTION_ALT2] ${errMsg}`);
        reject(new Error(errMsg));
        return;
      }
      
      // 使用命令行运行ffprobe，不用引号
      const { exec } = require('child_process');
      const command = `"${ffprobePath}" -v error -show_streams -select_streams v -print_format csv "${videoPath}"`;
      
      logToFile(`[RESOLUTION_ALT2] 执行命令: ${command}`);
      
      exec(command, (error, stdout, stderr) => {
        if (error) {
          logToFile(`[RESOLUTION_ALT2] 执行命令失败: ${error.message}`);
          if (stderr) {
            logToFile(`[RESOLUTION_ALT2] 错误输出: ${stderr}`);
          }
          reject(error);
          return;
        }
        
        logToFile(`[RESOLUTION_ALT2] 命令输出: ${stdout.substring(0, 200)}${stdout.length > 200 ? '...' : ''}`);
        
        // 解析输出，寻找宽度和高度
        // 输出格式可能是 stream,0,1,h264,1920,1080,... 这样的CSV
        const output = stdout.trim();
        const match = output.match(/[^,]*,[^,]*,[^,]*,[^,]*,(\d+),(\d+)/);
        
        if (match && match[1] && match[2]) {
          const width = match[1];
          const height = match[2];
          const resolution = `${width}×${height}`;
          logToFile(`[RESOLUTION_ALT2] 成功解析分辨率: ${resolution}`);
          resolve(resolution);
        } else {
          // 尝试直接在输出中搜索分辨率格式
          const resPattern = /(\d{2,5})x(\d{2,5})/i;
          const altMatch = output.match(resPattern);
          
          if (altMatch && altMatch[1] && altMatch[2]) {
            const width = altMatch[1];
            const height = altMatch[2];
            const resolution = `${width}×${height}`;
            logToFile(`[RESOLUTION_ALT2] 使用备用正则解析到分辨率: ${resolution}`);
            resolve(resolution);
          } else {
            logToFile(`[RESOLUTION_ALT2] 无法从输出中解析分辨率`);
            reject(new Error('无法解析分辨率'));
          }
        }
      });
    } catch (error) {
      logToFile(`[RESOLUTION_ALT2] 异常: ${error.message}`);
      reject(error);
    }
  });
}

// 获取视频时长的函数
function getVideoDuration(videoPath) {
  try {
    console.log('获取视频时长:', videoPath);
    logToFile(`[MAIN] 开始获取视频时长: ${videoPath}`);
    
    if (!videoPath || !fs.existsSync(videoPath)) {
      console.error('视频文件不存在:', videoPath);
      logToFile(`[MAIN] 视频文件不存在: ${videoPath}`);
      return '';
    }
    
    return getDurationDirect(videoPath);
  } catch (error) {
    console.error('获取视频时长时发生错误:', error.message);
    logError('获取视频时长时发生错误', error);
    return '';
  }
}

// 直接使用命令行获取时长
function getDurationDirect(videoPath) {
  return new Promise((resolve) => {
    console.log('直接获取视频时长');
    logToFile(`[DURATION] 开始获取视频时长: ${videoPath}`);
    
    try {
      // 获取ffprobe路径
      const ffprobePath = getFfprobePath();
      if (!ffprobePath) {
        const errMsg = '无法找到ffprobe路径';
        console.error(errMsg);
        logToFile(`[DURATION] ${errMsg}`);
        resolve('');
        return;
      }
      
      logToFile(`[DURATION] 在${isPackaged ? '打包' : '开发'}环境中使用ffprobe路径: ${ffprobePath}`);
      logToFile(`[DURATION] 检查ffprobe可执行文件是否存在: ${fs.existsSync(ffprobePath)}`);
      
      // 使用exec直接执行命令
      const { exec } = require('child_process');
      const command = `"${ffprobePath}" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`;
      
      console.log(`执行命令: ${command}`);
      logToFile(`[DURATION] 开始执行命令获取时长: ${command}`);
      
      // 直接执行命令
      exec(command, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
        if (error) {
          console.error('获取时长失败:', error.message);
          logError(`获取时长失败, 命令: ${command}`, error);
          
          if (stderr) {
            logToFile(`[DURATION] 错误输出: ${stderr}`);
          }
          
          // 尝试使用另一种方式
          console.log('尝试使用备选方法获取时长');
          tryAlternativeDurationMethod(videoPath)
            .then(duration => {
              logToFile(`[DURATION] 备选方法获取成功: ${duration}`);
              resolve(duration);
            })
            .catch(err => {
              logToFile(`[DURATION] 备选方法也失败: ${err.message}`);
              resolve(''); // 解析失败时返回空字符串而不是拒绝，避免应用崩溃
            });
          
          return;
        }
        
        const output = stdout.trim();
        logToFile(`[DURATION] 命令输出: "${output}"`);
        
        if (output && !isNaN(parseFloat(output))) {
          // 将秒数转换为时分秒格式
          const seconds = parseFloat(output);
          const formattedDuration = formatDuration(seconds);
          console.log(`成功解析时长: ${formattedDuration}`);
          logToFile(`[DURATION] 成功解析时长: ${formattedDuration}`);
          resolve(formattedDuration);
        } else {
          const errMsg = '无法从输出中解析时长';
          console.error(errMsg);
          logToFile(`[DURATION] ${errMsg}, 输出为空或格式不正确`);
          
          // 尝试使用另一种方式
          console.log('尝试使用备选方法获取时长');
          tryAlternativeDurationMethod(videoPath)
            .then(duration => {
              logToFile(`[DURATION] 备选方法获取成功: ${duration}`);
              resolve(duration);
            })
            .catch(err => {
              logToFile(`[DURATION] 备选方法也失败: ${err.message}`);
              resolve(''); // 解析失败时返回空字符串
            });
        }
      });
    } catch (error) {
      console.error('获取时长过程中发生错误:', error.message);
      logError('获取时长过程中发生错误', error);
      
      tryAlternativeDurationMethod(videoPath)
        .then(duration => {
          logToFile(`[DURATION] 捕获异常后备选方法获取成功: ${duration}`);
          resolve(duration);
        })
        .catch(err => {
          logToFile(`[DURATION] 捕获异常后备选方法也失败: ${err.message}`);
          resolve(''); // 解析失败时返回空字符串
        });
    }
  });
}

// 将秒数格式化为时:分:秒格式
function formatDuration(seconds) {
  if (isNaN(seconds) || seconds <= 0) return '';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// 添加一个新的备选方法，使用类似缩略图生成的直接子进程方式
function tryAlternativeDurationMethod(videoPath) {
  return new Promise((resolve, reject) => {
    logToFile(`[DURATION_ALT2] 尝试使用直接命令行方式获取时长: ${videoPath}`);
    
    try {
      // 获取ffprobe路径
      const ffprobePath = getFfprobePath();
      if (!ffprobePath) {
        const errMsg = '无法找到ffprobe路径';
        logToFile(`[DURATION_ALT2] ${errMsg}`);
        reject(new Error(errMsg));
        return;
      }
      
      // 使用命令行运行ffprobe
      const { exec } = require('child_process');
      const command = `"${ffprobePath}" -i "${videoPath}"`;
      
      logToFile(`[DURATION_ALT2] 执行命令: ${command}`);
      
      exec(command, (error, stdout, stderr) => {
        // ffprobe的信息通常输出到stderr
        const output = stderr || stdout;
        
        // 在这里，我们即使有error也继续解析，因为ffprobe会将视频信息输出到stderr
        logToFile(`[DURATION_ALT2] 命令输出: ${output.substring(0, 200)}${output.length > 200 ? '...' : ''}`);
        
        // 解析输出，寻找时长
        // 通常格式如: "Duration: 00:02:23.84"
        const durationPattern = /Duration: (\d{2}):(\d{2}):(\d{2}.\d{2})/;
        const match = output.match(durationPattern);
        
        if (match && match[1] && match[2] && match[3]) {
          const hours = parseInt(match[1]);
          const minutes = parseInt(match[2]);
          const seconds = parseFloat(match[3]);
          
          const totalSeconds = hours * 3600 + minutes * 60 + seconds;
          const formattedDuration = formatDuration(totalSeconds);
          
          logToFile(`[DURATION_ALT2] 成功解析时长: ${formattedDuration}`);
          resolve(formattedDuration);
        } else {
          // 尝试直接在输出中搜索时长格式
          const altPattern = /time=(\d{2}):(\d{2}):(\d{2}.\d{2})/;
          const altMatch = output.match(altPattern);
          
          if (altMatch && altMatch[1] && altMatch[2] && altMatch[3]) {
            const hours = parseInt(altMatch[1]);
            const minutes = parseInt(altMatch[2]);
            const seconds = parseFloat(altMatch[3]);
            
            const totalSeconds = hours * 3600 + minutes * 60 + seconds;
            const formattedDuration = formatDuration(totalSeconds);
            
            logToFile(`[DURATION_ALT2] 使用备用正则解析到时长: ${formattedDuration}`);
            resolve(formattedDuration);
          } else {
            logToFile(`[DURATION_ALT2] 无法从输出中解析时长`);
            reject(new Error('无法解析时长'));
          }
        }
      });
    } catch (error) {
      logToFile(`[DURATION_ALT2] 异常: ${error.message}`);
      reject(error);
    }
  });
}

// 从ffprobe的完整输出中解析时长
function getDurationFromOutput(videoPath) {
  return new Promise((resolve, reject) => {
    console.log('尝试从完整输出中获取时长');
    logToFile(`[DURATION_ALT] 尝试从完整输出中获取时长: ${videoPath}`);
    
    // 获取ffprobe路径
    const ffprobePath = getFfprobePath();
    if (!ffprobePath) {
      const errMsg = '无法找到ffprobe路径';
      logToFile(`[DURATION_ALT] ${errMsg}`);
      reject(new Error(errMsg));
      return;
    }
    
    logToFile(`[DURATION_ALT] 使用ffprobe路径: ${ffprobePath}`);
    
    // 直接使用-i参数获取视频信息
    const { execFile } = require('child_process');
    const args = ['-i', videoPath];
    
    logCommandExecution(ffprobePath, args);
    logToFile(`[DURATION_ALT] 开始执行命令: ${ffprobePath} ${args.join(' ')}`);
    
    execFile(ffprobePath, args, (error, stdout, stderr) => {
      // ffprobe的信息通常输出到stderr
      const output = stderr || stdout;
      logToFile(`[DURATION_ALT] 命令执行完成，输出长度: ${output.length} 字节`);
      
      if (error) {
        // 即使有错误，ffprobe也能输出视频信息到stderr，所以继续处理
        logToFile(`[DURATION_ALT] 命令执行有错误，但继续处理: ${error.message}`);
      }
      
      // 记录输出的前200个字符（避免日志过大）
      const truncatedOutput = output.substring(0, 200) + (output.length > 200 ? '...' : '');
      logToFile(`[DURATION_ALT] 命令输出(截断): ${truncatedOutput}`);
      
      // 使用正则表达式查找时长
      // 匹配格式如: Duration: 00:05:23.43
      const durationRegex = /Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/;
      const match = output.match(durationRegex);
      
      if (match && match[1] && match[2] && match[3]) {
        const hours = parseInt(match[1]);
        const minutes = parseInt(match[2]);
        const seconds = parseFloat(match[3]);
        
        const totalSeconds = hours * 3600 + minutes * 60 + seconds;
        const formattedDuration = formatDuration(totalSeconds);
        
        console.log(`从输出中解析到时长: ${formattedDuration}`);
        logToFile(`[DURATION_ALT] 成功解析到时长: ${formattedDuration} (${totalSeconds}秒)`);
        resolve(formattedDuration);
      } else {
        const errMsg = '无法从输出中查找时长';
        console.error(errMsg);
        logToFile(`[DURATION_ALT] ${errMsg}, 无法匹配时长正则表达式`);
        
        // 尝试使用其他方式——可能一些特殊的格式可能不一样
        const altDurationRegex = /Duration:\s*(\d+:\d+:\d+\.\d+)/;
        const altMatch = output.match(altDurationRegex);
        
        if (altMatch && altMatch[1]) {
          const timeParts = altMatch[1].split(':');
          if (timeParts.length === 3) {
            const hours = parseInt(timeParts[0]);
            const minutes = parseInt(timeParts[1]);
            const seconds = parseFloat(timeParts[2]);
            
            const totalSeconds = hours * 3600 + minutes * 60 + seconds;
            const formattedDuration = formatDuration(totalSeconds);
            
            console.log(`从输出中解析到时长(备选正则): ${formattedDuration}`);
            logToFile(`[DURATION_ALT] 使用备选正则成功解析到时长: ${formattedDuration} (${totalSeconds}秒)`);
            resolve(formattedDuration);
          } else {
            logToFile(`[DURATION_ALT] 备选正则匹配到了时长格式，但无法解析: ${altMatch[1]}`);
            reject(new Error(errMsg));
          }
        } else {
          logToFile(`[DURATION_ALT] 备选正则表达式也无法匹配时长`);
          reject(new Error(errMsg));
        }
      }
    });
  });
}

// 生成视频缩略图的函数
function generateThumbnail(videoPath, outputPath) {
  return new Promise((resolve, reject) => {
    console.log('开始生成缩略图，视频路径:', videoPath);
    console.log('缩略图输出路径:', outputPath);
    
    // 确保视频文件存在
    if (!fs.existsSync(videoPath)) {
      console.error(`视频文件不存在: ${videoPath}`);
      reject(new Error('视频文件不存在'));
        return;
      }
      
    // 确保输出目录存在
    const outputDir = path.dirname(outputPath);
    ensureDirectoryExists(outputDir);
    
    // 生成随机时间点 - 10秒到60秒之间的随机值
    const randomSeconds = Math.floor(10 + Math.random() * 50);
    const timeFormat = `00:00:${randomSeconds}`;
    console.log(`生成随机时间点: ${timeFormat}`);
    
    // 首先尝试直接方法 - 最简单直接的方式
    directFFmpegThumbnail(videoPath, outputPath, timeFormat)
      .then(output => {
        console.log('通过直接ffmpeg命令生成缩略图成功');
        resolve(output);
      })
      .catch(error => {
        console.error('直接ffmpeg命令生成缩略图失败:', error.message);
        
        // 使用更复杂的多步骤方法作为备选
        // 生成一个随机种子
        let randomSeed = Date.now() + videoPath.length;
        // 创建一个安全的随机函数
        const random = () => {
          const newSeed = randomSeed++;
          const x = Math.sin(newSeed) * 10000;
          return x - Math.floor(x);
        };
        
        // 尝试复杂的方法
        tryDirectThumbnailGeneration(videoPath, outputPath, random)
          .then(output => {
            console.log('通过多步骤方法成功生成缩略图');
            resolve(output);
          })
          .catch(error => {
            console.error('多步骤方法生成缩略图失败:', error.message);
            
            // 使用fluent-ffmpeg作为备选方案
            tryFluentFFmpegThumbnail(videoPath, outputPath, random)
              .then(output => {
                console.log('通过fluent-ffmpeg成功生成缩略图');
                resolve(output);
              })
              .catch(error => {
                console.error('fluent-ffmpeg生成缩略图失败:', error.message);
                
                // 最终备选: 空白缩略图
                tryGenerateEmptyThumbnail(outputPath)
                  .then(output => {
                    console.log('使用空白缩略图作为最后的备选方案');
                    resolve(output);
                  })
                  .catch(finalError => {
                    console.error('所有缩略图生成方法均失败:', finalError.message);
                    reject(finalError);
                  });
              });
          });
      });
  });
}

// 直接使用命令行方式生成缩略图
function tryDirectThumbnailGeneration(videoPath, outputPath, randomFunc) {
  return new Promise((resolve, reject) => {
    console.log('尝试使用直接命令行方式生成缩略图');
    
    try {
      // 先尝试获取视频时长
      getVideoDurationDirect(videoPath)
        .then(durationSeconds => {
          console.log(`获取到视频时长: ${durationSeconds} 秒, 准备截取缩略图`);
          
          // 计算随机时间戳
          let screenshotTime;
          if (durationSeconds > 0) {
            // 取前5分钟或视频时长的25%，以较小者为准
            const maxTime = Math.min(300, durationSeconds * 0.25);
            // 使用真正的随机函数在5秒到最大时间之间取随机值
            const randomValue = randomFunc();
            screenshotTime = 5 + randomValue * (maxTime - 5);
            
            // 确保截取时间不超过视频总长度
            screenshotTime = Math.min(screenshotTime, durationSeconds - 3);
            
            // 如果计算结果小于等于0，则使用5秒作为默认值
            if (screenshotTime <= 0) {
              screenshotTime = Math.min(5, durationSeconds / 2);
            }
          } else {
            // 如果无法获取时长，使用随机默认值
            const randomValue = randomFunc();
            screenshotTime = 5 + randomValue * 25;
          }
          
          // 向上取整到整数秒
          screenshotTime = Math.floor(screenshotTime);
          
          console.log(`将在视频的 ${screenshotTime} 秒处截取缩略图 (随机生成)`);
          
          // 获取ffmpeg路径
          const ffmpegPath = getFfmpegPath();
          if (!ffmpegPath) {
            reject(new Error('无法找到ffmpeg路径'));
            return;
          }
          
          // 构建参数
          const args = [
            '-i', videoPath,
            '-ss', String(screenshotTime),
            '-vframes', '1',
            '-s', '320x180',
            '-y', // 覆盖已存在文件
            outputPath
          ];
          
          console.log(`执行命令: ${ffmpegPath} ${args.join(' ')}`);
          
          // 执行命令
          const { execFile } = require('child_process');
          execFile(ffmpegPath, args, (error, stdout, stderr) => {
            if (error) {
              console.error('命令行方式生成缩略图失败:', error.message);
              console.error('STDERR:', stderr);
              reject(error);
              return;
            }
            
            // 检查文件是否生成
            if (fs.existsSync(outputPath)) {
              console.log('命令行方式成功生成缩略图:', outputPath);
              resolve(outputPath);
            } else {
              console.error('命令行方式生成缩略图失败: 文件未创建');
              reject(new Error('缩略图文件未创建'));
            }
          });
        })
        .catch(error => {
          console.error('获取视频时长失败:', error.message);
          reject(error);
        });
    } catch (outerError) {
      console.error('直接生成缩略图外部错误:', outerError.message);
      reject(outerError);
    }
  });
}

// 尝试使用fluent-ffmpeg生成缩略图
function tryFluentFFmpegThumbnail(videoPath, outputPath, randomFunc) {
  return new Promise((resolve, reject) => {
    console.log('尝试使用fluent-ffmpeg生成缩略图');
    
    try {
      // 先计算随机值，避免直接在表达式中调用可能导致的问题
      const randomValue = randomFunc();
      // 随机时间点 (如果无法获取时长，使用10-30秒的随机值)
      const screenshotTime = 10 + randomValue * 20;
      console.log(`fluent-ffmpeg将使用默认时间 ${screenshotTime} 秒尝试生成缩略图`);
        
        ffmpeg(videoPath)
          .screenshots({
            timestamps: [screenshotTime],
            filename: path.basename(outputPath),
            folder: path.dirname(outputPath),
            size: '320x180' // 16:9 缩略图尺寸
          })
          .on('end', () => {
          // 验证生成的文件确实存在
          if (fs.existsSync(outputPath)) {
            console.log('fluent-ffmpeg成功生成缩略图:', outputPath);
            resolve(outputPath);
          } else {
            console.error('fluent-ffmpeg生成缩略图失败: 文件未创建');
            reject(new Error('缩略图文件未创建'));
          }
          })
          .on('error', (err) => {
          console.error('fluent-ffmpeg生成缩略图过程中出错:', err.message);
            reject(err);
          });
      } catch (error) {
      console.error('fluent-ffmpeg缩略图生成初始化失败:', error.message);
        reject(error);
      }
    });
}

// 直接获取视频时长的秒数
function getVideoDurationDirect(videoPath) {
  return new Promise((resolve, reject) => {
    console.log('直接获取视频时长（秒数）');
    
    try {
      // 获取ffprobe路径
      const ffprobePath = getFfprobePath();
      if (!ffprobePath) {
        console.error('无法找到ffprobe路径');
        reject(new Error('无法找到ffprobe路径'));
        return;
      }
      
      console.log(`在${isPackaged ? '打包' : '开发'}环境中使用ffprobe路径: ${ffprobePath}`);
      
      const args = [
        '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        videoPath
      ];
      
      console.log(`执行命令: ${ffprobePath} ${args.join(' ')}`);
      
      const { execFile } = require('child_process');
      execFile(ffprobePath, args, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
        if (error) {
          console.error('获取视频时长失败:', error.message);
          console.error('错误详情:', error);
          if (stderr) console.error('错误输出:', stderr);
          reject(error);
          return;
        }
        
        const output = stdout.trim();
        console.log('时长命令输出:', output);
        
        if (output && !isNaN(parseFloat(output))) {
          const durationSeconds = parseFloat(output);
          console.log(`成功获取视频时长: ${durationSeconds} 秒`);
          resolve(durationSeconds);
        } else {
          console.error('无法解析视频时长');
          reject(new Error('无法解析视频时长'));
        }
      });
    } catch (error) {
      console.error('获取视频时长过程中出错:', error.message);
      reject(error);
    }
  });
}

// 统一获取ffmpeg路径
function getFfmpegPath() {
  logToFile('[PATH] 尝试获取FFmpeg路径');
  
  // 优先检查resources目录中的ffmpeg
  if (isPackaged) {
    logToFile('[PATH] 在打包环境中查找FFmpeg路径');
    // 尝试多个可能的位置
    const possiblePaths = [
      // 主要路径 - resources目录
      path.join(path.dirname(process.execPath), 'resources', 'ffmpeg.exe'),
      // app.asar.unpacked目录中的路径（这很重要，因为大文件可能被放在这里）
      path.join(path.dirname(process.execPath), 'resources', 'app.asar.unpacked', 'node_modules', 'ffmpeg-static', 'ffmpeg.exe'),
      // 备选路径 - 可执行文件同目录
      path.join(path.dirname(process.execPath), 'ffmpeg.exe'),
      // 备选路径 - 应用程序目录
      path.join(app.getAppPath(), 'resources', 'ffmpeg.exe'),
      // 备选路径 - 自定义路径
      path.join(path.dirname(process.execPath), '..', 'resources', 'ffmpeg.exe'),
      // 尝试从app.asar.unpacked目录获取（如果实际被打包到这里）
      path.join(path.dirname(app.getAppPath()), 'app.asar.unpacked', 'node_modules', 'ffmpeg-static', 'ffmpeg.exe')
    ];
    
    logToFile(`[PATH] 将尝试以下FFmpeg路径: ${possiblePaths.join(' | ')}`);
    
    for (const possiblePath of possiblePaths) {
      const exists = fs.existsSync(possiblePath);
      logToFile(`[PATH] 检查FFmpeg路径: ${possiblePath}, 存在: ${exists}`);
      
      if (exists) {
        console.log(`在打包环境中找到FFmpeg: ${possiblePath}`);
        logToFile(`[PATH] 在打包环境中找到FFmpeg: ${possiblePath}`);
        
        // 检查是否可执行
        try {
          fs.accessSync(possiblePath, fs.constants.X_OK);
          logToFile(`[PATH] FFmpeg路径 ${possiblePath} 有执行权限`);
        } catch (e) {
          logToFile(`[PATH] FFmpeg路径 ${possiblePath} 没有执行权限: ${e.message}`);
          // 尝试在Windows上添加执行权限
          try {
            if (process.platform === 'win32') {
              const { execSync } = require('child_process');
              execSync(`icacls "${possiblePath}" /grant Everyone:RX`);
              logToFile(`[PATH] 已尝试为FFmpeg添加执行权限`);
            }
          } catch (permErr) {
            logToFile(`[PATH] 添加执行权限失败: ${permErr.message}`);
          }
        }
        
        return possiblePath;
      }
    }
    
    logToFile('[PATH] 未在打包环境中找到有效的FFmpeg路径，尝试使用配置的路径');
  }
  
  // 然后检查ffmpegExecutablePath
  if (fs.existsSync(ffmpegExecutablePath)) {
    console.log(`使用配置的FFmpeg路径: ${ffmpegExecutablePath}`);
    logToFile(`[PATH] 使用配置的FFmpeg路径: ${ffmpegExecutablePath}`);
    return ffmpegExecutablePath;
  }
  
  // 最后尝试fluent-ffmpeg中的path
  if (ffmpeg.path) {
    console.log(`使用fluent-ffmpeg中的FFmpeg路径: ${ffmpeg.path}`);
    logToFile(`[PATH] 使用fluent-ffmpeg中的FFmpeg路径: ${ffmpeg.path}`);
    return ffmpeg.path;
  }
  
  logToFile('[PATH] 找不到可用的FFmpeg路径');
  console.error('找不到可用的FFmpeg路径');
  return null;
}

// 统一获取ffprobe路径
function getFfprobePath() {
  logToFile('[PATH] 尝试获取FFprobe路径');
  
  // 优先检查resources目录中的ffprobe
  if (isPackaged) {
    logToFile('[PATH] 在打包环境中查找FFprobe路径');
    
    // 尝试多个可能的位置
    const possiblePaths = [
      // 主要路径 - resources目录
      path.join(path.dirname(process.execPath), 'resources', 'ffprobe.exe'),
      
      // app.asar.unpacked目录优先位置
      path.join(path.dirname(process.execPath), 'resources', 'app.asar.unpacked', 'node_modules', 'ffprobe-static', 'bin', 'win32', 'x64', 'ffprobe.exe'),
      path.join(path.dirname(process.execPath), 'resources', 'app.asar.unpacked', 'node_modules', 'ffprobe-static', 'bin', 'win32', 'ia32', 'ffprobe.exe'),
      
      // 备选路径 - 可执行文件同目录
      path.join(path.dirname(process.execPath), 'ffprobe.exe'),
      
      // 备选路径 - 应用程序目录
      path.join(app.getAppPath(), 'resources', 'ffprobe.exe'),
      
      // 备选路径 - 自定义路径
      path.join(path.dirname(process.execPath), '..', 'resources', 'ffprobe.exe'),
      
      // 在node_modules里查找可能的路径
      path.join(path.dirname(process.execPath), 'resources', 'node_modules', 'ffprobe-static', 'bin', 'win32', 'x64', 'ffprobe.exe'),
      
      // 尝试从app.asar.unpacked目录获取（如果实际被打包到这里）
      path.join(path.dirname(app.getAppPath()), 'app.asar.unpacked', 'node_modules', 'ffprobe-static', 'bin', 'win32', 'x64', 'ffprobe.exe')
    ];
    
    logToFile(`[PATH] 将尝试以下FFprobe路径: ${possiblePaths.join(' | ')}`);
    
    for (const possiblePath of possiblePaths) {
      const exists = fs.existsSync(possiblePath);
      logToFile(`[PATH] 检查FFprobe路径: ${possiblePath}, 存在: ${exists}`);
      
      if (exists) {
        console.log(`在打包环境中找到FFprobe: ${possiblePath}`);
        logToFile(`[PATH] 在打包环境中找到FFprobe: ${possiblePath}`);
        
        // 检查是否可执行
        try {
          fs.accessSync(possiblePath, fs.constants.X_OK);
          logToFile(`[PATH] FFprobe路径 ${possiblePath} 有执行权限`);
        } catch (e) {
          logToFile(`[PATH] FFprobe路径 ${possiblePath} 没有执行权限: ${e.message}`);
          // 尝试在Windows上添加执行权限
          try {
            if (process.platform === 'win32') {
              const { execSync } = require('child_process');
              execSync(`icacls "${possiblePath}" /grant Everyone:RX`);
              logToFile(`[PATH] 已尝试为FFprobe添加执行权限`);
            }
          } catch (permErr) {
            logToFile(`[PATH] 添加执行权限失败: ${permErr.message}`);
          }
        }
        
        return possiblePath;
      }
    }
    
    logToFile('[PATH] 未在打包环境中找到有效的FFprobe路径，开始检查app.asar.unpacked目录');
    
    // 特别检查app.asar.unpacked目录，这是electron-builder存放大文件的地方
    try {
      const baseDir = path.dirname(process.execPath);
      const unpackedDir = path.join(baseDir, 'resources', 'app.asar.unpacked');
      
      if (fs.existsSync(unpackedDir)) {
        logToFile(`[PATH] app.asar.unpacked目录存在: ${unpackedDir}`);
        // 递归搜索ffprobe.exe
        searchFileInDir(unpackedDir, 'ffprobe.exe')
          .then(foundPaths => {
            if (foundPaths.length > 0) {
              logToFile(`[PATH] 在app.asar.unpacked中找到ffprobe.exe: ${foundPaths[0]}`);
              return foundPaths[0];
            }
          })
          .catch(err => {
            logToFile(`[PATH] 搜索app.asar.unpacked时出错: ${err.message}`);
          });
      } else {
        logToFile(`[PATH] app.asar.unpacked目录不存在: ${unpackedDir}`);
      }
    } catch (err) {
      logToFile(`[PATH] 检查app.asar.unpacked目录时出错: ${err.message}`);
    }
  }
  
  // 然后检查ffprobeExecutablePath
  if (fs.existsSync(ffprobeExecutablePath)) {
    console.log(`使用配置的FFprobe路径: ${ffprobeExecutablePath}`);
    logToFile(`[PATH] 使用配置的FFprobe路径: ${ffprobeExecutablePath}`);
    return ffprobeExecutablePath;
  }
  
  // 最后尝试fluent-ffmpeg中的ffprobePath
  try {
    const ffprobePath = ffmpeg._getFfprobePath ? ffmpeg._getFfprobePath() : null;
    if (ffprobePath && fs.existsSync(ffprobePath)) {
      console.log(`使用fluent-ffmpeg中的FFprobe路径: ${ffprobePath}`);
      logToFile(`[PATH] 使用fluent-ffmpeg中的FFprobe路径: ${ffprobePath}`);
      return ffprobePath;
    }
  } catch (e) {
    logToFile(`[PATH] 获取fluent-ffmpeg中的FFprobe路径失败: ${e.message}`);
  }
  
  // 如果所有方法都失败，尝试从安装包中推断路径
  try {
    const ffprobeStaticPath = require('ffprobe-static').path;
    if (fs.existsSync(ffprobeStaticPath)) {
      logToFile(`[PATH] 使用ffprobe-static的路径: ${ffprobeStaticPath}`);
      return ffprobeStaticPath;
    } else {
      logToFile(`[PATH] ffprobe-static提供的路径不存在: ${ffprobeStaticPath}`);
    }
  } catch (e) {
    logToFile(`[PATH] 无法获取ffprobe-static的路径: ${e.message}`);
  }
  
  logToFile('[PATH] 找不到可用的FFprobe路径');
  console.error('找不到可用的FFprobe路径');
  return null;
}

// 获取缩略图相对URL
function getThumbnailUrl(thumbnailFileName) {
  // 使用自定义app协议
  return `app://thumbnail/${thumbnailFileName}`;
}

// 获取缩略图绝对文件路径
function getThumbnailPath(thumbnailUrl) {
  if (!thumbnailUrl) {
    return null;
  }
  
  let fileName;
  
  // 处理app://协议的URL
  if (thumbnailUrl.startsWith('app://thumbnail/')) {
    fileName = thumbnailUrl.replace('app://thumbnail/', '');
  } 
  // 兼容处理旧版相对路径格式
  else if (thumbnailUrl.includes('thumbnails/')) {
    fileName = thumbnailUrl.replace('thumbnails/', '');
  }
  else {
    return null;
  }
  
  return path.join(getThumbnailDir(), fileName);
}

// 注册所有IPC事件处理程序
function registerIpcHandlers() {
  console.log('注册IPC事件处理程序...');
  
  // 窗口控制
  ipcMain.on('window-minimize', () => {
    if (mainWindow) mainWindow.minimize();
  });

  ipcMain.on('window-maximize', () => {
    if (!mainWindow) return;
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });

  ipcMain.on('window-close', () => {
    if (mainWindow) mainWindow.close();
  });

  // 读取base64编码的图片文件
  ipcMain.handle('get-base64-image', async (event, filePath) => {
    console.log(`读取base64图片文件: ${filePath}`);
    
    try {
      // 检查文件路径是相对路径还是绝对路径
      const absolutePath = path.isAbsolute(filePath) ? 
        filePath : path.join(__dirname, filePath);
      
      // 检查文件是否存在
      if (!fs.existsSync(absolutePath)) {
        console.error(`文件不存在: ${absolutePath}`);
        return '';
      }
      
      // 读取文件内容
      const data = fs.readFileSync(absolutePath, 'utf8');
      console.log(`成功读取图片文件: ${filePath}`);
      
      return data;
    } catch (error) {
      console.error('读取base64图片文件失败:', error);
      return '';
    }
  });

  // 视频管理
  ipcMain.handle('get-videos', () => {
    console.log('处理get-videos请求');
    return db.getVideoCache();
  });

  // 递归查找文件夹中的所有视频文件
  async function findVideoFiles(folderPath, videoExtensions = ['mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv']) {
    console.log(`搜索文件夹: ${folderPath}`);
    const videoFiles = [];
    
    try {
      const entries = fs.readdirSync(folderPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(folderPath, entry.name);
        
        if (entry.isDirectory()) {
          // 递归处理子文件夹
          const subDirVideos = await findVideoFiles(fullPath, videoExtensions);
          videoFiles.push(...subDirVideos);
        } else if (entry.isFile()) {
          // 检查是否为视频文件
          const fileExt = path.extname(entry.name).toLowerCase().replace('.', '');
          if (videoExtensions.includes(fileExt)) {
            videoFiles.push(fullPath);
          }
        }
      }
    } catch (error) {
      console.error(`读取文件夹 ${folderPath}.失败:`, error.message);
    }
    
    return videoFiles;
  }

  // 导入文件夹中的所有视频
  ipcMain.handle('import-folder', async () => {
    console.log('处理import-folder请求');
    if (!mainWindow) {
      console.error('主窗口不存在');
      return { cancelled: true, total: 0, processed: 0, success: 0, failed: 0, successList: [], failedList: [] };
    }
    
    // 标记是否取消导入
    let isCancelled = false;
    
    // 注册取消导入事件监听器
    const cancelListener = () => {
      isCancelled = true;
      console.log('用户取消了导入过程');
    };
    
    ipcMain.once('cancel-import', cancelListener);
    
    try {
      const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
        title: '选择包含视频的文件夹',
        properties: ['openDirectory']
      });

      if (canceled || filePaths.length === 0) {
        console.log('用户取消了选择或未选择任何文件夹');
        // 发送取消状态到渲染进程
        mainWindow.webContents.send('import-progress', {
          cancelled: true,
          total: 0,
          processed: 0,
          success: 0,
          failed: 0,
          percent: 0,
          successList: [],
          failedList: []
        });
        return { cancelled: true, total: 0, processed: 0, success: 0, failed: 0, successList: [], failedList: [] };
      }
      
      const folderPath = filePaths[0];
      console.log(`用户选择了文件夹: ${folderPath}`);
      
      // 发送初始进度状态（未知总数）
      mainWindow.webContents.send('import-progress', {
        total: 0,
        processed: 0,
        success: 0,
        failed: 0,
        percent: 0,
        successList: [],
        failedList: [],
        scanningFolder: true
      });
      
      // 递归查找文件夹中的所有视频文件
      console.log(`开始搜索文件夹 ${folderPath} 中的视频文件`);
      const videoFiles = await findVideoFiles(folderPath);
      console.log(`在文件夹中找到 ${videoFiles.length} 个视频文件`);
      
      if (videoFiles.length === 0) {
        console.log('文件夹中没有找到视频文件');
        mainWindow.webContents.send('import-progress', {
          cancelled: false,
          total: 0,
          processed: 0,
          success: 0,
          failed: 0,
          percent: 100,
          successList: [],
          failedList: [],
          scanningFolder: false,
          folderEmpty: true
        });
        return { 
          cancelled: false, 
          total: 0,
          processed: 0,
          success: 0,
          failed: 0,
          successList: [],
          failedList: [],
          folderEmpty: true
        };
      }
      
      // 进度状态跟踪
      const total = videoFiles.length;
      let processed = 0;
      let success = 0;
      let failed = 0;
      const successList = [];
      const failedList = [];
      
      // 开始处理文件
      mainWindow.webContents.send('import-progress', {
        total,
        processed: 0,
        success: 0,
        failed: 0,
        percent: 0,
        successList: [],
        failedList: [],
        scanningFolder: false
      });
      
      // 确保缩略图目录存在
      const thumbnailDir = getThumbnailDir();
      
      // 获取现有视频的文件路径列表，用于检查重复
      const existingFilePaths = db.getVideoCache().map(video => video.filePath);
      console.log(`当前数据库中有 ${existingFilePaths.length} 个视频记录`);
      
      // 规范化路径以便比较 - 统一处理为小写并标准化分隔符
      const normalizePath = (p) => {
        if (!p) return '';
        // 将所有反斜杠(\)转换为正斜杠(/)，并转为小写，以便跨平台比较
        return p.replace(/\\/g, '/').toLowerCase();
      };
      
      // 规范化现有路径
      const normalizedExistingPaths = existingFilePaths.map(normalizePath);
      
      // 过滤出新增的视频文件 - 使用规范化路径比较
      const newFilePaths = videoFiles.filter(filePath => {
        const normalizedPath = normalizePath(filePath);
        return !normalizedExistingPaths.includes(normalizedPath);
      });
      
      // 记录重复的视频文件
      const duplicateFilePaths = videoFiles.filter(filePath => {
        const normalizedPath = normalizePath(filePath);
        return normalizedExistingPaths.includes(normalizedPath);
      });
      
      console.log(`其中新增视频 ${newFilePaths.length} 个，重复视频 ${duplicateFilePaths.length} 个`);
      
      // 先处理重复的视频文件
      for (const filePath of duplicateFilePaths) {
        // 检查是否取消
        if (isCancelled) {
          console.log('导入过程被用户取消');
          return {
            cancelled: true,
            total,
            processed,
            success,
            failed,
            successList,
            failedList
          };
        }
        
        const normalizedPath = normalizePath(filePath);
        const existingVideo = db.getVideoCache().find(v => 
          normalizePath(v.filePath) === normalizedPath
        );
        
        if (existingVideo) {
          processed++;
          success++;
          successList.push({
            fileName: existingVideo.fileName,
            isNew: false
          });
          
          // 发送进度更新
          mainWindow.webContents.send('import-progress', {
            total,
            processed,
            success,
            failed,
            percent: Math.round((processed / total) * 100),
            successList,
            failedList
          });
        }
      }
      
      if (newFilePaths.length === 0) {
        console.log('没有新增视频，无需导入');
        return {
          cancelled: false,
          total,
          processed,
          success,
          failed,
          successList,
          failedList
        };
      }
      
      // 处理新增的视频文件
      const newVideos = [];
      
      // 分批处理视频文件，每批最多50个，避免内存问题
      const batchSize = 50;
      
      for (let i = 0; i < newFilePaths.length; i += batchSize) {
        const batch = newFilePaths.slice(i, i + batchSize);
        
        // 逐个处理视频文件
        for (const filePath of batch) {
          try {
            // 检查是否取消
            if (isCancelled) {
              console.log('导入过程被用户取消');
              // 如果有成功处理的视频，先保存它们
              if (newVideos.length > 0) {
                try {
                  console.log(`用户取消导入，但仍保存 ${newVideos.length} 个已处理的视频`);
                  const savedVideos = await db.saveVideos(newVideos);
                  console.log(`成功保存 ${savedVideos.length} 个视频到数据库`);
                } catch (error) {
                  console.error('保存已处理视频失败:', error.message);
                }
              }
              
              // 发送最终取消状态到渲染进程
              mainWindow.webContents.send('import-progress', {
                cancelled: true,
                total,
                processed,
                success,
                failed,
                canceled: total - processed, // 添加未处理的文件数量为取消数量
                percent: Math.round((processed / total) * 100),
                successList,
                failedList
              });
              return {
                cancelled: true,
                total,
                processed,
                success,
                failed,
                canceled: total - processed, // 添加未处理的文件数量为取消数量
                successList,
                failedList
              };
            }
            
            const stats = fs.statSync(filePath);
            // 使用时间戳+路径哈希确保ID唯一
            const pathHash = Buffer.from(filePath).toString('base64').substring(0, 8);
            const videoId = Date.now() + Math.floor(Math.random() * 1000) + '-' + pathHash;
            const fileName = path.basename(filePath);
            
            // 生成缩略图文件名
            const thumbnailFileName = `${videoId}.jpg`;
            const thumbnailPath = path.join(thumbnailDir, thumbnailFileName);
            
            // 获取当前时间作为导入时间
            const now = new Date();
            const importDate = now.toISOString().replace('T', ' ').substr(0, 19);
            
            try {
              // 获取设置
              const settings = await getSettings();
              
              // 获取视频分辨率
              const resolution = await getVideoResolution(filePath);
              
              // 获取视频时长
              const duration = await getVideoDuration(filePath);
              
              // 根据设置解析标题
              let code = '';
              if (settings && settings.import && settings.import.titleRegex) {
                try {
                  const regexObj = new RegExp(settings.import.titleRegex);
                  const match = fileName.match(regexObj);
                  
                  // 如果有匹配，返回完整匹配（group(0)）
                  if (match && match[0]) {
                    code = match[0].trim();
                  }
                } catch (error) {
                  console.error('解析标题时出错:', error.message);
                }
              }
              
              // 生成缩略图
              await generateThumbnail(filePath, thumbnailPath);
              
              // 创建视频对象
              const videoObj = {
                id: videoId,
                fileName: fileName,
                filePath: filePath,
                fileSize: formatFileSize(stats.size),
                createDate: new Date(stats.birthtime).toISOString(),
                importDate: importDate,
                viewCount: 0,
                lastViewDate: '',
                selected: false,
                thumbnailUrl: getThumbnailUrl(thumbnailFileName),
                rating: 0,
                actors: '',
                code: code,
                collection: '',
                resolution: resolution,
                duration: duration,
                notes: '',
                releaseDate: ''
              };
              
              newVideos.push(videoObj);
              
              processed++;
              success++;
              successList.push({
                fileName: fileName,
                isNew: true
              });
            } catch (error) {
              console.error(`为视频 ${fileName} 生成缩略图失败:`, error.message);
              
              // 获取设置
              const settings = await getSettings();
              
              // 获取视频分辨率 - 即使缩略图失败也尝试获取
              const resolution = await getVideoResolution(filePath);
              
              // 获取视频时长 - 即使缩略图失败也尝试获取
              const duration = await getVideoDuration(filePath);
              
              // 根据设置解析标题
              let code = '';
              if (settings && settings.import && settings.import.titleRegex) {
                try {
                  const regexObj = new RegExp(settings.import.titleRegex);
                  const match = fileName.match(regexObj);
                  
                  // 如果有匹配，返回完整匹配（group(0)）
                  if (match && match[0]) {
                    code = match[0].trim();
                  }
                } catch (error) {
                  console.error('解析标题时出错:', error.message);
                }
              }
              
              // 即使缩略图生成失败，也添加视频（使用默认缩略图）
              const videoObj = {
                id: videoId,
                fileName: fileName,
                filePath: filePath,
                fileSize: formatFileSize(stats.size),
                createDate: new Date(stats.birthtime).toISOString(),
                importDate: importDate,
                viewCount: 0,
                lastViewDate: '',
                selected: false,
                thumbnailUrl: '',  // 空缩略图URL
                rating: 0,
                actors: '',
                code: code,
                collection: '',
                resolution: resolution,
                duration: duration,
                notes: '',
                releaseDate: ''
              };
              
              newVideos.push(videoObj);
              
              processed++;
              success++;
              successList.push({
                fileName: fileName,
                isNew: true,
                warning: '缩略图生成失败'
              });
            }
          } catch (error) {
            console.error(`处理视频 ${filePath} 时出错:`, error.message);
            processed++;
            failed++;
            failedList.push({
              fileName: path.basename(filePath),
              error: error.message
            });
          }
          
          // 发送进度更新
          mainWindow.webContents.send('import-progress', {
            total,
            processed,
            success,
            failed,
            percent: Math.round((processed / total) * 100),
            successList,
            failedList
          });
        }
        
        // 批处理结束后保存当前批次的视频，避免内存积累
        if (newVideos.length > 0) {
          try {
            console.log(`保存当前批次的 ${newVideos.length} 个视频到数据库`);
            const savedVideos = await db.saveVideos(newVideos);
            console.log(`成功保存批次中的 ${savedVideos.length} 个视频到数据库`);
            // 清空已保存的视频，准备下一批
            newVideos.length = 0;
          } catch (error) {
            console.error('保存批次视频失败:', error.message);
          }
        }
      }
      
      // 返回导入结果
      return {
        cancelled: isCancelled,
        total,
        processed,
        success,
        failed,
        successList,
        failedList
      };
    } catch (error) {
      console.error('导入文件夹过程中出错:', error.message);
      return {
        error: error.message,
        cancelled: false,
        total: 0,
        processed: 0,
        success: 0,
        failed: 0,
        successList: [],
        failedList: []
      };
    } finally {
      // 确保清理取消导入的监听器
      ipcMain.removeListener('cancel-import', cancelListener);
    }
  });

  ipcMain.handle('import-videos', async () => {
    console.log('处理import-videos请求');
    if (!mainWindow) {
      console.error('主窗口不存在');
      return { cancelled: true, total: 0, processed: 0, success: 0, failed: 0, successList: [], failedList: [] };
    }
    
    // 标记是否取消导入
    let isCancelled = false;
    
    // 注册取消导入事件监听器
    const cancelListener = () => {
      isCancelled = true;
      console.log('用户取消了导入过程');
    };
    
    ipcMain.once('cancel-import', cancelListener);
    
    try {
      const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
        title: '选择视频文件',
        properties: ['openFile', 'multiSelections'],
        filters: [
          { name: '视频文件', extensions: ['mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv'] }
        ]
      });

      if (canceled || filePaths.length === 0) {
        console.log('用户取消了选择或未选择任何文件');
        // 发送取消状态到渲染进程
        mainWindow.webContents.send('import-progress', {
          cancelled: true,
          total: 0,
          processed: 0,
          success: 0,
          failed: 0,
          percent: 0,
          successList: [],
          failedList: []
        });
        return { cancelled: true, total: 0, processed: 0, success: 0, failed: 0, successList: [], failedList: [] };
      }
      
      // 进度状态跟踪
      const total = filePaths.length;
      let processed = 0;
      let success = 0;
      let failed = 0;
      const successList = [];
      const failedList = [];
      
      // 发送初始进度
      mainWindow.webContents.send('import-progress', {
        total,
        processed: 0,
        success: 0,
        failed: 0,
        percent: 0,
        successList: [],
        failedList: []
      });
      
      console.log(`用户选择了 ${filePaths.length} 个视频文件`);
      
      // 确保缩略图目录存在
      const thumbnailDir = getThumbnailDir();
      
      // 获取现有视频的文件路径列表，用于检查重复
      const existingFilePaths = db.getVideoCache().map(video => video.filePath);
      console.log(`当前数据库中有 ${existingFilePaths.length} 个视频记录`);
      
      // 规范化路径以便比较 - 统一处理为小写并标准化分隔符
      const normalizePath = (p) => {
        if (!p) return '';
        // 将所有反斜杠(\)转换为正斜杠(/)，并转为小写，以便跨平台比较
        return p.replace(/\\/g, '/').toLowerCase();
      };
      
      // 规范化现有路径
      const normalizedExistingPaths = existingFilePaths.map(normalizePath);
      
      // 过滤出新增的视频文件 - 使用规范化路径比较
      const newFilePaths = filePaths.filter(filePath => {
        const normalizedPath = normalizePath(filePath);
        return !normalizedExistingPaths.includes(normalizedPath);
      });
      
      // 记录重复的视频文件
      const duplicateFilePaths = filePaths.filter(filePath => {
        const normalizedPath = normalizePath(filePath);
        return normalizedExistingPaths.includes(normalizedPath);
      });
      
      console.log(`其中新增视频 ${newFilePaths.length} 个，重复视频 ${duplicateFilePaths.length} 个`);
      
      // 先处理重复的视频文件
      for (const filePath of duplicateFilePaths) {
        // 检查是否取消
        if (isCancelled) {
          console.log('导入过程被用户取消');
          return {
            cancelled: true,
            total,
            processed,
            success,
            failed,
            successList,
            failedList
          };
        }
        
        const normalizedPath = normalizePath(filePath);
        const existingVideo = db.getVideoCache().find(v => 
          normalizePath(v.filePath) === normalizedPath
        );
        
        if (existingVideo) {
          processed++;
          success++;
          successList.push({
            fileName: existingVideo.fileName,
            isNew: false
          });
          
          // 发送进度更新
          mainWindow.webContents.send('import-progress', {
            total,
            processed,
            success,
            failed,
            percent: Math.round((processed / total) * 100),
            successList,
            failedList
          });
        }
      }
      
      if (newFilePaths.length === 0) {
        console.log('没有新增视频，无需导入');
        return {
          cancelled: false,
          total,
          processed,
          success,
          failed,
          successList,
          failedList
        };
      }
      
      // 处理新增的视频文件
      const newVideos = [];
      
      // 逐个处理视频文件
      for (const filePath of newFilePaths) {
        try {
          // 检查是否取消
          if (isCancelled) {
            console.log('导入过程被用户取消');
            // 如果有成功处理的视频，先保存它们
            if (newVideos.length > 0) {
              try {
                console.log(`用户取消导入，但仍保存 ${newVideos.length} 个已处理的视频`);
                const savedVideos = await db.saveVideos(newVideos);
                console.log(`成功保存 ${savedVideos.length} 个视频到数据库`);
              } catch (error) {
                console.error('保存已处理视频失败:', error.message);
              }
            }
            
            // 发送最终取消状态到渲染进程
            mainWindow.webContents.send('import-progress', {
              cancelled: true,
              total,
              processed,
              success,
              failed,
              canceled: total - processed, // 添加未处理的文件数量为取消数量
              percent: Math.round((processed / total) * 100),
              successList,
              failedList
            });
            return {
              cancelled: true,
              total,
              processed,
              success,
              failed,
              canceled: total - processed, // 添加未处理的文件数量为取消数量
              successList,
              failedList
            };
          }
          
          const stats = fs.statSync(filePath);
          // 使用时间戳+路径哈希确保ID唯一
          const pathHash = Buffer.from(filePath).toString('base64').substring(0, 8);
          const videoId = Date.now() + Math.floor(Math.random() * 1000) + '-' + pathHash;
          const fileName = path.basename(filePath);
          
          // 生成缩略图文件名
          const thumbnailFileName = `${videoId}.jpg`;
          const thumbnailPath = path.join(thumbnailDir, thumbnailFileName);
          
          // 获取当前时间作为导入时间
          const now = new Date();
          const importDate = now.toISOString().replace('T', ' ').substr(0, 19);
          
          try {
            // 获取设置
            const settings = await getSettings();
            
            // 获取视频分辨率
            const resolution = await getVideoResolution(filePath);
            
            // 获取视频时长
            const duration = await getVideoDuration(filePath);
            
            // 根据设置解析标题
            let code = '';
            if (settings && settings.import && settings.import.titleRegex) {
              try {
                const regexObj = new RegExp(settings.import.titleRegex);
                const match = fileName.match(regexObj);
                
                // 如果有匹配，返回完整匹配（group(0)）
                if (match && match[0]) {
                  code = match[0].trim();
                }
              } catch (error) {
                console.error('解析标题时出错:', error.message);
              }
            }
            
            // 生成缩略图
            await generateThumbnail(filePath, thumbnailPath);
            
            // 创建视频对象
            const videoObj = {
              id: videoId,
              fileName: fileName,
              filePath: filePath,
              fileSize: formatFileSize(stats.size),
              createDate: new Date(stats.birthtime).toISOString(),
              importDate: importDate,
              viewCount: 0,
              lastViewDate: '',
              selected: false,
              thumbnailUrl: getThumbnailUrl(thumbnailFileName),
              rating: 0,
              actors: '',
              code: code,
              collection: '',
              resolution: resolution,
              duration: duration,
              notes: '',
              releaseDate: ''
            };
            
            newVideos.push(videoObj);
            
            processed++;
            success++;
            successList.push({
              fileName: fileName,
              isNew: true
            });
          } catch (error) {
            console.error(`为视频 ${fileName} 生成缩略图失败:`, error.message);
            
            // 获取设置
            const settings = await getSettings();
            
            // 获取视频分辨率 - 即使缩略图失败也尝试获取
            const resolution = await getVideoResolution(filePath);
            
            // 获取视频时长 - 即使缩略图失败也尝试获取
            const duration = await getVideoDuration(filePath);
            
            // 根据设置解析标题
            let code = '';
            if (settings && settings.import && settings.import.titleRegex) {
              try {
                const regexObj = new RegExp(settings.import.titleRegex);
                const match = fileName.match(regexObj);
                
                // 如果有匹配，返回完整匹配（group(0)）
                if (match && match[0]) {
                  code = match[0].trim();
                }
              } catch (error) {
                console.error('解析标题时出错:', error.message);
              }
            }
            
            // 即使缩略图生成失败，也添加视频（使用默认缩略图）
            const videoObj = {
              id: videoId,
              fileName: fileName,
              filePath: filePath,
              fileSize: formatFileSize(stats.size),
              createDate: new Date(stats.birthtime).toISOString(),
              importDate: importDate,
              viewCount: 0,
              lastViewDate: '',
              selected: false,
              thumbnailUrl: '',  // 空缩略图URL
              rating: 0,
              actors: '',
              code: code,
              collection: '',
              resolution: resolution,
              duration: duration,
              notes: '',
              releaseDate: ''
            };
            
            newVideos.push(videoObj);
            
            processed++;
            success++;
            successList.push({
              fileName: fileName,
              isNew: true,
              warning: '缩略图生成失败'
            });
          }
        } catch (error) {
          console.error(`处理视频 ${filePath} 时出错:`, error.message);
          processed++;
          failed++;
          failedList.push({
            fileName: path.basename(filePath),
            error: error.message
          });
        }
        
        // 发送进度更新
        mainWindow.webContents.send('import-progress', {
          total,
          processed,
          success,
          failed,
          percent: Math.round((processed / total) * 100),
          successList,
          failedList
        });
      }

      if (newVideos.length > 0) {
        // 将新视频保存到数据库
        const savedVideos = await db.saveVideos(newVideos);
        console.log(`成功保存 ${savedVideos.length} 个视频到数据库`);
      }
      
      // 返回导入结果
      return {
        cancelled: isCancelled,
        total,
        processed,
        success,
        failed,
        successList,
        failedList
      };
    } catch (error) {
      console.error('导入视频时出错:', error.message);
      return {
        error: error.message,
        cancelled: false,
        total: 0,
        processed: 0,
        success: 0,
        failed: 0,
        successList: [],
        failedList: []
      };
    } finally {
      // 移除取消导入事件监听器
      ipcMain.removeListener('cancel-import', cancelListener);
    }
  });

  ipcMain.handle('open-video', async (event, filePath) => {
    console.log(`打开视频: ${filePath}`);
    
    // 先检查文件是否存在
    if (!filePath || !fs.existsSync(filePath)) {
      console.error(`文件不存在: ${filePath}`);
      return { success: false, error: 'file_not_found' };
    }
    
    // 文件存在，使用系统默认应用打开视频文件
    const { shell } = require('electron');
    shell.openPath(filePath);
    
    // 更新观看次数和最后观看时间
    try {
      await db.updateVideoViewInfo(filePath);
      return { success: true };
    } catch (error) {
      console.error('更新视频观看信息失败:', error);
      return { success: true, warning: 'update_view_info_failed' };
    }
  });

  // 检查文件是否存在
  ipcMain.handle('checkFileExists', async (event, filePath) => {
    if (!filePath) return false;
    
    try {
      return fs.existsSync(filePath);
    } catch (error) {
      console.error('检查文件存在性失败:', error);
      return false;
    }
  });

  ipcMain.handle('open-source-folder', async (event, filePath) => {
    console.log(`打开源文件夹: ${filePath}`);
    if (!filePath) {
      console.error('文件路径为空');
      return false;
    }
    
    try {
      // 获取文件所在的文件夹路径
      const folderPath = path.dirname(filePath);
      
      // 使用系统默认文件管理器打开文件夹
      const { shell } = require('electron');
      await shell.openPath(folderPath);
      return true;
    } catch (error) {
      console.error('打开源文件夹失败:', error);
      return false;
    }
  });

  // 打开外部链接
  ipcMain.handle('open-external', async (event, url) => {
    console.log(`打开外部链接: ${url}`);
    try {
      const { shell } = require('electron');
      await shell.openExternal(url);
      return true;
    } catch (error) {
      console.error('打开外部链接失败:', error);
      return false;
    }
  });

  // 数据库操作
  ipcMain.handle('save-video', async (event, video) => {
    console.log(`保存视频: ${video.fileName}`);
    try {
      return await db.saveVideo(video);
    } catch (error) {
      console.error('保存视频数据失败:', error);
      throw error;
    }
  });

  ipcMain.handle('save-videos', async (event, videos) => {
    console.log(`批量保存 ${videos.length} 个视频`);
    try {
      return await db.saveVideos(videos);
    } catch (error) {
      console.error('批量保存视频数据失败:', error);
      throw error;
    }
  });

  ipcMain.handle('update-video', async (event, video) => {
    console.log(`更新视频: ${video.fileName}`);
    try {
      return await db.updateVideo(video);
    } catch (error) {
      console.error('更新视频数据失败:', error);
      throw error;
    }
  });

  ipcMain.handle('delete-video', async (event, videoId) => {
    console.log(`删除视频ID: ${videoId}`);
    try {
      return await db.deleteVideo(videoId);
    } catch (error) {
      console.error('删除视频失败:', error);
      throw error;
    }
  });

  ipcMain.handle('delete-videos', async (event, videoIds) => {
    console.log(`批量删除 ${videoIds.length} 个视频`);
    try {
      return await db.deleteVideos(videoIds);
    } catch (error) {
      console.error('批量删除视频失败:', error);
      throw error;
    }
  });

  // 文件选择对话框
  ipcMain.handle('selectFile', async (event, options) => {
    console.log('打开文件选择对话框:', options);
    if (!mainWindow) {
      console.error('主窗口不存在');
      return null;
    }
    
    try {
      // 确保options.properties是数组
      if (!options.properties) {
        options.properties = ['openFile'];
      }
      
      const result = await dialog.showOpenDialog(mainWindow, options);
      console.log('文件选择结果:', result);
      return result;
    } catch (error) {
      console.error('文件选择对话框出错:', error);
      return null;
    }
  });

  // 复制图片到缩略图目录
  ipcMain.handle('copyImageToThumbnails', async (event, sourcePath, newFileName) => {
    console.log(`复制图片: ${sourcePath} 到缩略图目录, 新文件名: ${newFileName}`);
    
    try {
      // 确保缩略图目录存在
      const thumbnailDir = getThumbnailDir();
      
      // 目标文件路径
      const destPath = path.join(thumbnailDir, newFileName);
      
      // 读取源文件
      const data = fs.readFileSync(sourcePath);
      
      // 写入目标文件
      fs.writeFileSync(destPath, data);
      
      // 返回相对路径
      const relativePath = getThumbnailUrl(newFileName);
      console.log(`图片已复制到: ${relativePath}`);
      
      return relativePath;
    } catch (error) {
      console.error('复制图片失败:', error);
      throw error;
    }
  });

  // 删除缩略图文件
  ipcMain.handle('deleteThumbnail', async (event, thumbnailPath) => {
    console.log(`删除缩略图: ${thumbnailPath}`);
    
    // 如果路径为空，则跳过
    if (!thumbnailPath) {
      console.log('无效的缩略图路径，跳过删除');
      return false;
    }
    
    try {
      // 转换为绝对路径
      const absolutePath = getThumbnailPath(thumbnailPath);
      if (!absolutePath) {
        console.log(`无法解析缩略图路径: ${thumbnailPath}`);
        return false;
      }
      
      // 检查文件是否存在
      if (fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath);
        console.log(`缩略图已成功删除: ${absolutePath}`);
        return true;
      } else {
        console.log(`缩略图文件不存在: ${absolutePath}`);
        return false;
      }
    } catch (error) {
      console.error('删除缩略图失败:', error);
      // 出错时只记录日志不抛出异常，避免影响主流程
      return false;
    }
  });

  ipcMain.handle('cleanup-duplicates', async () => {
    console.log('处理cleanup-duplicates请求');
    try {
      return await db.cleanupDuplicateVideos();
    } catch (error) {
      console.error('清理重复视频失败:', error.message);
      throw error;
    }
  });

  // 枚举值管理
  ipcMain.handle('get-enum-values', async (event, enumType) => {
    console.log(`处理get-enum-values请求: ${enumType}`);
    try {
      const values = await db.getEnumValues(enumType);
      return values;
    } catch (error) {
      console.error(`获取枚举值[${enumType}]失败:`, error);
      return [];
    }
  });

  ipcMain.handle('save-enum-values', async (event, enumType, values) => {
    console.log(`处理save-enum-values请求: ${enumType}, 值数量: ${values.length}`);
    try {
      const savedValues = await db.saveEnumValues(enumType, values);
      return savedValues;
    } catch (error) {
      console.error(`保存枚举值[${enumType}]失败:`, error);
      throw error;
    }
  });

  ipcMain.handle('add-enum-value', async (event, enumType, value) => {
    console.log(`处理add-enum-value请求: ${enumType}, 值: ${value}`);
    try {
      const updatedValues = await db.addEnumValue(enumType, value);
      return updatedValues;
    } catch (error) {
      console.error(`添加枚举值[${value}]到[${enumType}]失败:`, error);
      throw error;
    }
  });
  
  // 设置管理
  ipcMain.handle('save-settings', async (event, settings) => {
    console.log('处理save-settings请求');
    try {
      // 保存设置到本地文件，使用自定义用户数据路径
      const settingsPath = getUserDataPath('settings.json');
      
      // 确保目录存在
      const settingsDir = path.dirname(settingsPath);
      ensureDirectoryExists(settingsDir);
      
      // 写入设置文件
      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
      console.log(`设置已保存到 ${settingsPath}`);
      
      return true;
    } catch (error) {
      console.error('保存设置失败:', error);
      throw error;
    }
  });
  
  ipcMain.handle('get-settings', async (event) => {
    console.log('处理get-settings请求');
    try {
      // 从本地文件加载设置，使用自定义用户数据路径
      const settingsPath = getUserDataPath('settings.json');
      
      // 检查设置文件是否存在
      if (!fs.existsSync(settingsPath)) {
        console.log('设置文件不存在，返回null');
        return null;
      }
      
      // 读取设置文件
      const settingsData = fs.readFileSync(settingsPath, 'utf8');
      const settings = JSON.parse(settingsData);
      console.log('设置已加载');
      
      return settings;
    } catch (error) {
      console.error('加载设置失败:', error);
      return null;
    }
  });
  
  // 视频移动功能
  let isMoveVideoCancelled = false;
  let isMovePaused = false;
  
  // 监听暂停移动事件
  ipcMain.on('pause-move-videos', () => {
    console.log('用户暂停移动视频');
    isMovePaused = true;
    
    // 发送暂停状态到渲染进程
    if (mainWindow) {
      mainWindow.webContents.send('move-progress', { paused: true });
    }
  });
  
  // 监听继续移动事件
  ipcMain.on('resume-move-videos', () => {
    console.log('用户继续移动视频');
    isMovePaused = false;
    
    // 发送继续状态到渲染进程
    if (mainWindow) {
      mainWindow.webContents.send('move-progress', { paused: false });
    }
  });
  
  // 处理移动视频请求
  ipcMain.handle('move-videos', async (event, videos, targetFolder) => {
    console.log(`准备移动 ${videos.length} 个视频到 ${targetFolder}`);
    
    // 重置状态
    isMoveVideoCancelled = false;
    isMovePaused = false;
    
    // 统计信息
    const total = videos.length;
    let processed = 0;
    let success = 0;
    let failed = 0;
    let pending = total;
    const successList = [];
    const failedList = [];
    const pendingList = [...videos.map(v => ({
      id: v.id,
      fileName: v.fileName,
      filePath: v.filePath
    }))];
    
    // 发送初始进度信息
    mainWindow.webContents.send('move-progress', {
      targetFolder,
      total,
      processed: 0,
      success: 0,
      failed: 0,
      pending,
      percent: 0,
      successList: [],
      failedList: [],
      pendingList,
      isCompleted: false
    });
    
    // 逐个处理视频
    for (const video of videos) {
      // 检查是否被取消
      if (isMoveVideoCancelled) {
        console.log('移动操作被用户取消');
        
        // 返回当前状态
        return {
          cancelled: true,
          total,
          processed,
          success,
          failed,
          pending: total - processed,
          successList,
          failedList,
          pendingList: pendingList.slice(processed)
        };
      }
      
      // 如果暂停，等待恢复
      while (isMovePaused) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      try {
        const sourceFilePath = video.filePath;
        const fileName = path.basename(sourceFilePath);
        const targetFilePath = path.join(targetFolder, fileName);
        
        // 更新待处理列表
        const pendingIndex = pendingList.findIndex(item => item.id === video.id);
        if (pendingIndex !== -1) {
          pendingList.splice(pendingIndex, 1);
        }
        pending--;
        
        // 检查目标文件是否已存在
        if (fs.existsSync(targetFilePath)) {
          throw new Error('目标文件已存在');
        }
        
        // 复制文件
        await fs.promises.copyFile(sourceFilePath, targetFilePath);
        
        // 检查复制是否成功
        if (fs.existsSync(targetFilePath)) {
          // 删除原文件
          await fs.promises.unlink(sourceFilePath);
          
          // 更新数据库记录
          await db.updateVideoFilePath(video.id, targetFilePath);
          
          // 添加到成功列表
          successList.push({
            id: video.id,
            fileName: video.fileName,
            filePath: sourceFilePath,
            newPath: targetFilePath
          });
          
          success++;
        } else {
          throw new Error('文件复制失败');
        }
      } catch (error) {
        console.error(`移动视频失败: ${video.fileName}, 错误: ${error.message}`);
        
        // 添加到失败列表
        failedList.push({
          id: video.id,
          fileName: video.fileName,
          filePath: video.filePath,
          error: error.message
        });
        
        failed++;
      }
      
      // 更新进度
      processed++;
      const percent = Math.round((processed / total) * 100);
      
      // 发送进度更新到渲染进程
      mainWindow.webContents.send('move-progress', {
        targetFolder,
        total,
        processed,
        success,
        failed,
        pending,
        percent,
        successList,
        failedList,
        pendingList,
        isCompleted: processed === total
      });
      
      // 短暂暂停，避免UI卡顿
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    console.log(`移动完成: 总共 ${total} 个视频，成功 ${success} 个，失败 ${failed} 个`);
    
    // 返回最终结果
    return {
      targetFolder,
      total,
      processed,
      success,
      failed,
      pending: 0,
      successList,
      failedList,
      pendingList: [],
      isCompleted: true
    };
  });
  
  console.log('IPC事件处理程序注册完成');
}

// 当Electron完成初始化并准备创建浏览器窗口时调用此方法
app.whenReady().then(async () => {
  // 初始化日志系统
  const logPath = initLogger();
  console.log(`日志文件已创建: ${logPath}`);
  
  // 设置控制台输出编码为UTF-8
  try {
    // 在Windows平台上设置控制台输出编码
    if (process.platform === 'win32') {
      process.stdout.setEncoding('utf8');
      process.stderr.setEncoding('utf8');
      // 尝试执行chcp 65001命令设置控制台代码页为UTF-8
      const { execSync } = require('child_process');
      execSync('chcp 65001');
    }
  } catch (error) {
    console.error('设置控制台编码失败:', error.message);
  }

  console.log('应用准备就绪');
  
  // 记录环境信息
  logToFile(`[ENV] 运行模式: ${isPackaged ? '打包环境' : '开发环境'}`);
  logToFile(`[ENV] 应用路径: ${app.getAppPath()}`);
  logToFile(`[ENV] 可执行文件路径: ${process.execPath}`);
  logToFile(`[ENV] 用户数据路径: ${getUserDataPath()}`);
  
  // 尝试确保FFmpeg和FFprobe在打包环境中可用
  await ensureFFmpegAvailable();
  
  // 在打包环境中，尝试查找特定的FFmpeg和FFprobe路径
  if (isPackaged) {
    try {
      // 检查resources目录中的ffmpeg和ffprobe
      const resourcesPath = path.join(path.dirname(process.execPath), 'resources');
      logToFile(`[FFMPEG] 检查resources目录: ${resourcesPath}`);
      
      // 尝试先使用extraResources复制的文件
      const resourceFFmpegPath = path.join(resourcesPath, 'ffmpeg.exe');
      const resourceFFprobePath = path.join(resourcesPath, 'ffprobe.exe');
      
      logToFile(`[FFMPEG] 检查FFmpeg路径: ${resourceFFmpegPath}, 存在: ${fs.existsSync(resourceFFmpegPath)}`);
      logToFile(`[FFMPEG] 检查FFprobe路径: ${resourceFFprobePath}, 存在: ${fs.existsSync(resourceFFprobePath)}`);
      
      if (fs.existsSync(resourceFFmpegPath)) {
        console.log(`使用resources目录中的FFmpeg: ${resourceFFmpegPath}`);
        ffmpeg.setFfmpegPath(resourceFFmpegPath);
      }
      
      if (fs.existsSync(resourceFFprobePath)) {
        console.log(`使用resources目录中的FFprobe: ${resourceFFprobePath}`);
        ffmpeg.setFfprobePath(resourceFFprobePath);
      }
      
      // 再次输出当前路径设置
      const currentFfmpegPath = ffmpeg.path || ffmpegExecutablePath;
      const currentFfprobePath = ffmpeg._getFfprobePath() || ffprobeExecutablePath;
      
      console.log('当前FFmpeg路径:', currentFfmpegPath);
      console.log('当前FFprobe路径:', currentFfprobePath);
      
      logToFile(`[FFMPEG] 当前FFmpeg路径: ${currentFfmpegPath}`);
      logToFile(`[FFMPEG] 当前FFprobe路径: ${currentFfprobePath}`);
    } catch (error) {
      console.error('检查FFmpeg资源文件失败:', error.message);
      logError('检查FFmpeg资源文件失败', error);
    }
  }
  
  // 确保用户数据目录和缩略图目录存在
  const userDataDir = getUserDataPath();
  ensureDirectoryExists(userDataDir);
  console.log('用户数据目录:', userDataDir);
  
  // 确保缩略图目录存在
  const thumbnailDir = getThumbnailDir();
  console.log('缩略图目录:', thumbnailDir);
  
  // 创建默认设置文件（如果不存在）
  await createDefaultSettingsFile();
  
  // 注册自定义协议处理程序以用于处理缩略图URL
  // 注意: 在Electron 9或更高版本中，protocol.registerFileProtocol应当在ready事件后调用
  protocol.registerFileProtocol('app', (request, callback) => {
    const url = request.url;
    console.log('处理自定义协议请求:', url);
    
    if (url.startsWith('app://thumbnail/')) {
      // 从URL提取文件名 (去掉 'app://thumbnail/' 前缀)
      const fileName = url.replace('app://thumbnail/', '');
      const thumbnailPath = path.join(getThumbnailDir(), fileName);
      console.log('缩略图路径:', thumbnailPath);
      callback({ path: thumbnailPath });
    } else {
      console.log('未能处理的协议请求:', url);
      callback({ error: -2 /* ENOENT */ });
    }
  });
  
  // 初始化数据库
  await db.initDatabase();
  
  // 测试FFmpeg执行情况
  testFFmpegExecution();
  
  // 创建主窗口
  createWindow();
});

// 所有窗口关闭时退出应用
app.on('window-all-closed', function () {
  // 在macOS上，除非用户使用Cmd + Q确定地退出
  // 否则绝大部分应用会保持激活
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', function () {
  // 在macOS上，当点击dock图标并且没有其他窗口打开时，
  // 通常会在应用程序中重新创建一个窗口
  if (mainWindow === null) createWindow();
});

/**
 * 尝试生成空白缩略图（最后的后备方案）
 */
function tryGenerateEmptyThumbnail(outputPath) {
  console.log('尝试生成空白缩略图作为最后的后备方案');
  return new Promise((resolve, reject) => {
    try {
      // 直接使用备选方案：创建简单的JPG
      console.log('生成简单的黑色JPG缩略图');
      
      // 创建一个1x1像素的黑色JPG (最小可行JPG)
      const blackJpgBuffer = Buffer.from([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
        0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43, 0x00, 0x03, 0x02, 0x02, 0x02, 0x02, 0x02, 0x03,
        0x02, 0x02, 0x02, 0x03, 0x03, 0x03, 0x03, 0x04, 0x06, 0x04, 0x04, 0x04, 0x04, 0x04, 0x08, 0x06,
        0x06, 0x05, 0x06, 0x09, 0x08, 0x0A, 0x0A, 0x09, 0x08, 0x09, 0x09, 0x0A, 0x0C, 0x0F, 0x0C, 0x0A,
        0x0B, 0x0E, 0x0B, 0x09, 0x09, 0x0D, 0x11, 0x0D, 0x0E, 0x0F, 0x10, 0x10, 0x11, 0x10, 0x0A, 0x0C,
        0x12, 0x13, 0x12, 0x10, 0x13, 0x0F, 0x10, 0x10, 0x10, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
        0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFF, 0xC4, 0x00, 0x14,
        0x10, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3F, 0x00, 0x00, 0xFF, 0xD9
      ]);
      
      // 写入文件
      fs.writeFileSync(outputPath, blackJpgBuffer);
      
      // 验证文件是否创建成功
      if (fs.existsSync(outputPath)) {
        console.log('成功生成简单的黑色JPG缩略图');
        resolve(outputPath);
      } else {
        console.error('生成简单JPG缩略图失败');
        reject(new Error('无法生成缩略图'));
      }
    } catch (error) {
      console.error('创建空白缩略图过程中出错:', error.message);
      reject(error);
    }
  });
}

// 直接使用ffmpeg命令生成缩略图，无需先获取时长
function directFFmpegThumbnail(videoPath, outputPath, randomPoint) {
  return new Promise((resolve, reject) => {
    console.log('使用直接命令行ffmpeg生成缩略图');
    
    try {
      // 获取ffmpeg路径
      const ffmpegPath = getFfmpegPath();
      if (!ffmpegPath) {
        reject(new Error('无法找到ffmpeg路径'));
        return;
      }
      
      // 使用随机时间点
      const screenshotTime = randomPoint || '00:00:10';
      
      console.log(`将使用时间点 ${screenshotTime} 生成缩略图`);
      
      // 构建参数
      const args = [
        '-ss', screenshotTime, // 先指定时间，提高效率
        '-i', videoPath,
        '-vframes', '1',
        '-s', '320x180',
        '-y', // 覆盖已存在文件
        outputPath
      ];
      
      console.log(`执行命令: ${ffmpegPath} ${args.join(' ')}`);
      
      // 执行命令
      const { execFile } = require('child_process');
      execFile(ffmpegPath, args, (error, stdout, stderr) => {
        if (error) {
          console.error('直接ffmpeg生成缩略图失败:', error.message);
          console.error('STDERR:', stderr);
          reject(error);
          return;
        }
        
        // 检查文件是否生成
        if (fs.existsSync(outputPath)) {
          console.log('直接ffmpeg成功生成缩略图:', outputPath);
          resolve(outputPath);
        } else {
          console.error('直接ffmpeg生成缩略图失败: 文件未创建');
          reject(new Error('缩略图文件未创建'));
        }
      });
    } catch (error) {
      console.error('直接ffmpeg缩略图生成错误:', error.message);
      reject(error);
    }
  });
}

// 添加默认设置
const DEFAULT_SETTINGS = {
  "general": {
    "scanFolders": []
  },
  "import": {
    "titleRegex": "([A-Za-z]{2,5})[-_. ]?(\\d{2,6}[A-Za-z]?)"
  },
  "quickTags": []
};

// 创建默认设置文件（如果不存在）
async function createDefaultSettingsFile() {
  try {
    const settingsPath = getUserDataPath('settings.json');
    
    // 检查设置文件是否已存在
    if (!fs.existsSync(settingsPath)) {
      console.log('设置文件不存在，创建默认设置文件');
      
      // 确保目录存在
      const settingsDir = path.dirname(settingsPath);
      ensureDirectoryExists(settingsDir);
      
      // 写入默认设置
      fs.writeFileSync(settingsPath, JSON.stringify(DEFAULT_SETTINGS, null, 2), 'utf8');
      console.log(`已创建默认设置文件: ${settingsPath}`);
      return true;
    } else {
      console.log('设置文件已存在，无需创建默认设置');
      return false;
    }
  } catch (error) {
    console.error('创建默认设置文件失败:', error);
    return false;
  }
}

// 添加日志系统
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

// 当前日志级别 - 开发模式下使用DEBUG，生产模式用INFO
const currentLogLevel = isPackaged ? LOG_LEVELS.DEBUG : LOG_LEVELS.DEBUG;

// 日志文件路径
let logFilePath = '';

// 初始化日志系统
function initLogger() {
  // 创建日志目录
  const logDir = getUserDataPath('logs');
  ensureDirectoryExists(logDir);
  
  // 创建当天的日志文件名
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  logFilePath = path.join(logDir, `app-${dateStr}.log`);
  
  // 将启动信息写入日志
  logToFile(`日志开始 - ${now.toISOString()} - 应用版本: ${app.getVersion()} - 运行环境: ${isPackaged ? '生产' : '开发'}环境`);
  logToFile(`系统信息: ${process.platform} ${process.arch} - Node.js ${process.versions.node}`);
  logToFile(`App路径: ${app.getAppPath()}`);
  logToFile(`可执行文件路径: ${process.execPath}`);
  
  // 拦截console方法
  interceptConsoleMethod('log', LOG_LEVELS.INFO);
  interceptConsoleMethod('info', LOG_LEVELS.INFO);
  interceptConsoleMethod('warn', LOG_LEVELS.WARN);
  interceptConsoleMethod('error', LOG_LEVELS.ERROR);
  
  return logFilePath;
}

// 拦截控制台方法，使其同时写入日志文件
function interceptConsoleMethod(method, level) {
  const originalMethod = console[method];
  console[method] = function(...args) {
    // 调用原始方法
    originalMethod.apply(console, args);
    
    // 如果当前日志级别允许，写入日志文件
    if (level >= currentLogLevel) {
      const message = args.map(arg => {
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg);
          } catch (e) {
            return `[Object: ${Object.prototype.toString.call(arg)}]`;
          }
        }
        return String(arg);
      }).join(' ');
      
      const prefix = `[${method.toUpperCase()}]`;
      logToFile(`${prefix} ${message}`);
    }
  };
}

// 写入日志到文件
function logToFile(message) {
  if (!logFilePath) return;
  
  try {
    const timestamp = new Date().toISOString();
    const logLine = `${timestamp} ${message}\n`;
    
    // 将日志写入文件 (追加模式)
    fs.appendFileSync(logFilePath, logLine, 'utf8');
  } catch (error) {
    // 避免在日志函数中创建无限递归
    const originalError = console.error;
    originalError.call(console, '写入日志失败:', error);
  }
}

// 特殊记录命令执行日志
function logCommandExecution(command, args, cwd) {
  logToFile(`[CMD] 执行命令: ${command} ${args.join(' ')}`);
  if (cwd) logToFile(`[CMD] 工作目录: ${cwd}`);
}

// 特殊记录错误日志
function logError(message, error) {
  const errorDetails = error ? `${error.message}\n${error.stack || '无堆栈'}` : '无详细信息';
  logToFile(`[ERROR] ${message}\n${errorDetails}`);
}

// 特殊记录文件操作日志
function logFileOperation(operation, path, success) {
  logToFile(`[FILE] ${operation} ${path} - ${success ? '成功' : '失败'}`);
}

// 尝试复制FFmpeg和FFprobe到resources目录，确保它们在打包环境中可用
async function ensureFFmpegAvailable() {
  // 只在打包环境中执行
  if (!isPackaged) {
    logToFile('[FFMPEG_COPY] 开发环境中无需复制FFmpeg和FFprobe');
    return;
  }
  
  logToFile('[FFMPEG_COPY] 开始确保FFmpeg和FFprobe在打包环境中可用');
  
  const resourcesDir = path.join(path.dirname(process.execPath), 'resources');
  logToFile(`[FFMPEG_COPY] 目标resources目录: ${resourcesDir}`);
  
  try {
    // 确保resources目录存在
    if (!fs.existsSync(resourcesDir)) {
      logToFile('[FFMPEG_COPY] resources目录不存在，创建目录');
      fs.mkdirSync(resourcesDir, { recursive: true });
    }
    
    // 检查app.asar.unpacked目录
    const unpackedDir = path.join(resourcesDir, 'app.asar.unpacked');
    const unpackedExists = fs.existsSync(unpackedDir);
    logToFile(`[FFMPEG_COPY] app.asar.unpacked目录存在: ${unpackedExists ? '是' : '否'}, 路径: ${unpackedDir}`);
    
    // 尝试从多个可能的源路径查找FFmpeg和FFprobe
    let ffmpegSourcePath = '';
    let ffprobeSourcePath = '';
    
    // 尝试找到可用的FFmpeg和FFprobe路径
    const possibleFFmpegSources = [
      ffmpegPath, // 从ffmpeg-static找到的路径
      path.join(unpackedDir, 'node_modules', 'ffmpeg-static', 'ffmpeg.exe'),
      path.join(app.getAppPath(), 'node_modules', 'ffmpeg-static', 'ffmpeg.exe')
    ];
    
    const possibleFFprobeSources = [
      ffprobePath, // 从ffprobe-static找到的路径
      path.join(unpackedDir, 'node_modules', 'ffprobe-static', 'bin', 'win32', 'x64', 'ffprobe.exe'),
      path.join(app.getAppPath(), 'node_modules', 'ffprobe-static', 'bin', 'win32', 'x64', 'ffprobe.exe')
    ];
    
    // 查找可用的FFmpeg源
    for (const sourcePath of possibleFFmpegSources) {
      if (sourcePath && fs.existsSync(sourcePath)) {
        ffmpegSourcePath = sourcePath;
        logToFile(`[FFMPEG_COPY] 找到可用的FFmpeg源: ${ffmpegSourcePath}`);
        break;
      }
    }
    
    // 查找可用的FFprobe源
    for (const sourcePath of possibleFFprobeSources) {
      if (sourcePath && fs.existsSync(sourcePath)) {
        ffprobeSourcePath = sourcePath;
        logToFile(`[FFMPEG_COPY] 找到可用的FFprobe源: ${ffprobeSourcePath}`);
        break;
      }
    }
    
    // 如果找不到源路径，尝试递归搜索
    if (!ffmpegSourcePath || !ffprobeSourcePath) {
      logToFile('[FFMPEG_COPY] 未找到一个或多个源文件，尝试递归搜索');
      if (unpackedExists) {
        try {
          // 搜索unpacked目录
          const ffmpegPaths = await searchFileInDir(unpackedDir, 'ffmpeg.exe');
          const ffprobePaths = await searchFileInDir(unpackedDir, 'ffprobe.exe');
          
          if (ffmpegPaths.length > 0 && !ffmpegSourcePath) {
            ffmpegSourcePath = ffmpegPaths[0];
            logToFile(`[FFMPEG_COPY] 通过搜索找到FFmpeg: ${ffmpegSourcePath}`);
          }
          
          if (ffprobePaths.length > 0 && !ffprobeSourcePath) {
            ffprobeSourcePath = ffprobePaths[0];
            logToFile(`[FFMPEG_COPY] 通过搜索找到FFprobe: ${ffprobeSourcePath}`);
          }
        } catch (searchErr) {
          logToFile(`[FFMPEG_COPY] 搜索文件时出错: ${searchErr.message}`);
        }
      }
    }
    
    logToFile(`[FFMPEG_COPY] 最终确定的FFmpeg源路径: ${ffmpegSourcePath || '未找到'}`);
    logToFile(`[FFMPEG_COPY] 最终确定的FFprobe源路径: ${ffprobeSourcePath || '未找到'}`);
    
    // 复制FFmpeg
    if (ffmpegSourcePath && fs.existsSync(ffmpegSourcePath)) {
      const ffmpegDest = path.join(resourcesDir, 'ffmpeg.exe');
      
      // 如果目标已存在且大小相同，则跳过复制
      if (fs.existsSync(ffmpegDest)) {
        const srcStats = fs.statSync(ffmpegSourcePath);
        const destStats = fs.statSync(ffmpegDest);
        
        if (srcStats.size === destStats.size) {
          logToFile(`[FFMPEG_COPY] FFmpeg已存在且大小相同，无需复制: ${ffmpegDest} (${srcStats.size} 字节)`);
        } else {
          logToFile(`[FFMPEG_COPY] FFmpeg大小不同，重新复制 - 源: ${srcStats.size} 字节, 目标: ${destStats.size} 字节`);
          fs.copyFileSync(ffmpegSourcePath, ffmpegDest);
          logToFile(`[FFMPEG_COPY] 复制FFmpeg完成: ${ffmpegSourcePath} -> ${ffmpegDest}`);
          
          // 设置执行权限
          try {
            if (process.platform === 'win32') {
              const { execSync } = require('child_process');
              execSync(`icacls "${ffmpegDest}" /grant Everyone:RX`);
              logToFile('[FFMPEG_COPY] 已设置FFmpeg执行权限');
            } else {
              fs.chmodSync(ffmpegDest, '755');
              logToFile('[FFMPEG_COPY] 已设置FFmpeg执行权限');
            }
          } catch (permErr) {
            logToFile(`[FFMPEG_COPY] 设置执行权限失败: ${permErr.message}`);
          }
        }
      } else {
        // 复制文件
        fs.copyFileSync(ffmpegSourcePath, ffmpegDest);
        logToFile(`[FFMPEG_COPY] 复制FFmpeg完成: ${ffmpegSourcePath} -> ${ffmpegDest}`);
        
        // 设置执行权限
        try {
          if (process.platform === 'win32') {
            const { execSync } = require('child_process');
            execSync(`icacls "${ffmpegDest}" /grant Everyone:RX`);
            logToFile('[FFMPEG_COPY] 已设置FFmpeg执行权限');
          } else {
            fs.chmodSync(ffmpegDest, '755');
            logToFile('[FFMPEG_COPY] 已设置FFmpeg执行权限');
          }
        } catch (permErr) {
          logToFile(`[FFMPEG_COPY] 设置执行权限失败: ${permErr.message}`);
        }
      }
    } else {
      logToFile(`[FFMPEG_COPY] 找不到源FFmpeg文件: ${ffmpegSourcePath}`);
    }
    
    // 复制FFprobe
    if (ffprobeSourcePath && fs.existsSync(ffprobeSourcePath)) {
      const ffprobeDest = path.join(resourcesDir, 'ffprobe.exe');
      
      // 如果目标已存在且大小相同，则跳过复制
      if (fs.existsSync(ffprobeDest)) {
        const srcStats = fs.statSync(ffprobeSourcePath);
        const destStats = fs.statSync(ffprobeDest);
        
        if (srcStats.size === destStats.size) {
          logToFile(`[FFMPEG_COPY] FFprobe已存在且大小相同，无需复制: ${ffprobeDest} (${srcStats.size} 字节)`);
        } else {
          logToFile(`[FFMPEG_COPY] FFprobe大小不同，重新复制 - 源: ${srcStats.size} 字节, 目标: ${destStats.size} 字节`);
          fs.copyFileSync(ffprobeSourcePath, ffprobeDest);
          logToFile(`[FFMPEG_COPY] 复制FFprobe完成: ${ffprobeSourcePath} -> ${ffprobeDest}`);
          
          // 设置执行权限
          try {
            if (process.platform === 'win32') {
              const { execSync } = require('child_process');
              execSync(`icacls "${ffprobeDest}" /grant Everyone:RX`);
              logToFile('[FFMPEG_COPY] 已设置FFprobe执行权限');
            } else {
              fs.chmodSync(ffprobeDest, '755');
              logToFile('[FFMPEG_COPY] 已设置FFprobe执行权限');
            }
          } catch (permErr) {
            logToFile(`[FFMPEG_COPY] 设置执行权限失败: ${permErr.message}`);
          }
        }
      } else {
        // 复制文件
        fs.copyFileSync(ffprobeSourcePath, ffprobeDest);
        logToFile(`[FFMPEG_COPY] 复制FFprobe完成: ${ffprobeSourcePath} -> ${ffprobeDest}`);
        
        // 设置执行权限
        try {
          if (process.platform === 'win32') {
            const { execSync } = require('child_process');
            execSync(`icacls "${ffprobeDest}" /grant Everyone:RX`);
            logToFile('[FFMPEG_COPY] 已设置FFprobe执行权限');
          } else {
            fs.chmodSync(ffprobeDest, '755');
            logToFile('[FFMPEG_COPY] 已设置FFprobe执行权限');
          }
        } catch (permErr) {
          logToFile(`[FFMPEG_COPY] 设置执行权限失败: ${permErr.message}`);
        }
      }
    } else {
      logToFile(`[FFMPEG_COPY] 找不到源FFprobe文件: ${ffprobeSourcePath}`);
    }
    
    // 最后验证ffmpeg和ffprobe是否存在且可用
    const finalFFmpegPath = path.join(resourcesDir, 'ffmpeg.exe');
    const finalFFprobePath = path.join(resourcesDir, 'ffprobe.exe');
    
    logToFile(`[FFMPEG_COPY] 最终FFmpeg路径: ${finalFFmpegPath}, 存在: ${fs.existsSync(finalFFmpegPath)}`);
    logToFile(`[FFMPEG_COPY] 最终FFprobe路径: ${finalFFprobePath}, 存在: ${fs.existsSync(finalFFprobePath)}`);
    
    // 测试可执行性
    if (fs.existsSync(finalFFmpegPath)) {
      try {
        const { execFileSync } = require('child_process');
        const output = execFileSync(finalFFmpegPath, ['-version']).toString();
        logToFile(`[FFMPEG_COPY] FFmpeg可执行性测试成功: ${output.split('\n')[0]}`);
      } catch (execErr) {
        logToFile(`[FFMPEG_COPY] FFmpeg可执行性测试失败: ${execErr.message}`);
      }
    }
    
    if (fs.existsSync(finalFFprobePath)) {
      try {
        const { execFileSync } = require('child_process');
        const output = execFileSync(finalFFprobePath, ['-version']).toString();
        logToFile(`[FFMPEG_COPY] FFprobe可执行性测试成功: ${output.split('\n')[0]}`);
      } catch (execErr) {
        logToFile(`[FFMPEG_COPY] FFprobe可执行性测试失败: ${execErr.message}`);
      }
    }
    
    logToFile('[FFMPEG_COPY] FFmpeg和FFprobe复制过程完成');
  } catch (error) {
    logError('[FFMPEG_COPY] 复制FFmpeg和FFprobe过程中出错', error);
  }
}

// 递归查找文件
function searchFileInDir(dir, filename) {
  return new Promise((resolve) => {
    const foundPaths = [];
    
    function searchDir(currentDir) {
      const files = fs.readdirSync(currentDir, { withFileTypes: true });
      
      for (const file of files) {
        const fullPath = path.join(currentDir, file.name);
        
        if (file.isDirectory()) {
          // 跳过node_modules内的node_modules目录，避免无限递归
          if (path.basename(currentDir) === 'node_modules' && file.name === 'node_modules') {
            continue;
          }
          
          try {
            searchDir(fullPath);
          } catch (err) {
            // 忽略无法访问的目录
          }
        } else if (file.name.toLowerCase() === filename.toLowerCase()) {
          foundPaths.push(fullPath);
        }
      }
    }
    
    try {
      searchDir(dir);
    } catch (err) {
      // 忽略错误，返回已找到的路径
    }
    
    resolve(foundPaths);
  });
}

// 添加测试功能
ipcMain.handle('test-ffmpeg', async (event, args) => {
  console.log('测试FFmpeg可用性');
  logToFile(`[TEST] 开始测试FFmpeg和FFprobe可用性`);
  
  const testResults = {
    ffmpegPath: getFfmpegPath(),
    ffprobePath: getFfprobePath(),
    ffmpegExists: false,
    ffprobeExists: false,
    testFile: '',
    resolutionTest: '',
    durationTest: '',
    thumbnailTest: ''
  };
  
  // 检查文件是否存在
  if (testResults.ffmpegPath) {
    testResults.ffmpegExists = fs.existsSync(testResults.ffmpegPath);
    logToFile(`[TEST] FFmpeg路径: ${testResults.ffmpegPath}, 存在: ${testResults.ffmpegExists}`);
  }
  
  if (testResults.ffprobePath) {
    testResults.ffprobeExists = fs.existsSync(testResults.ffprobePath);
    logToFile(`[TEST] FFprobe路径: ${testResults.ffprobePath}, 存在: ${testResults.ffprobeExists}`);
  }
  
  // 如果提供了测试文件，就进行实际测试
  if (args && args.testFile && fs.existsSync(args.testFile)) {
    testResults.testFile = args.testFile;
    logToFile(`[TEST] 使用测试文件: ${testResults.testFile}`);
    
    try {
      // 测试获取分辨率
      const resolution = await getVideoResolution(args.testFile);
      testResults.resolutionTest = resolution || '获取失败';
      logToFile(`[TEST] 分辨率测试结果: ${testResults.resolutionTest}`);
      
      // 测试获取时长
      const duration = await getVideoDuration(args.testFile);
      testResults.durationTest = duration || '获取失败';
      logToFile(`[TEST] 时长测试结果: ${testResults.durationTest}`);
      
      // 测试生成缩略图
      const tempThumbnail = path.join(app.getPath('temp'), 'test-thumbnail.jpg');
      try {
        await generateThumbnail(args.testFile, tempThumbnail);
        testResults.thumbnailTest = fs.existsSync(tempThumbnail) ? '生成成功' : '生成失败，文件不存在';
        logToFile(`[TEST] 缩略图测试结果: ${testResults.thumbnailTest}`);
      } catch (thumbErr) {
        testResults.thumbnailTest = `生成失败: ${thumbErr.message}`;
        logToFile(`[TEST] 缩略图测试失败: ${thumbErr.message}`);
      }
    } catch (err) {
      logToFile(`[TEST] 测试过程中出错: ${err.message}`);
    }
  }
  
  return testResults;
});

// 文件检查相关
ipcMain.handle('start-file-check', async (event, status) => {
  console.log('处理start-file-check请求');
  if (mainWindow) {
    mainWindow.webContents.send('file-check-progress', status);
  }
  return true;
});

ipcMain.on('update-file-check', (event, status) => {
  console.log(`文件检查进度更新: ${status.checked}/${status.total}, 问题: ${status.problems}`);
  if (mainWindow) {
    mainWindow.webContents.send('file-check-progress', status);
  }
});

console.log('IPC事件处理程序注册完成');