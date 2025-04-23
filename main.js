const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
// 导入ffprobe-static包获取ffprobe路径
const ffprobePath = require('ffprobe-static').path;

// 导入数据库模块
const db = require('./js/database');

// 设置ffmpeg和ffprobe路径
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

console.log('FFmpeg路径:', ffmpegPath);
console.log('FFprobe路径:', ffprobePath);

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

// 生成视频缩略图的函数
function generateThumbnail(videoPath, outputPath) {
  return new Promise((resolve, reject) => {
    console.log('开始生成缩略图，视频路径:', videoPath);
    console.log('缩略图输出路径:', outputPath);
    
    // 获取视频时长
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        console.error('获取视频元数据失败:', err.message);
        reject(err);
        return;
      }
      
      try {
        // 获取视频时长（秒）
        const duration = metadata.format.duration;
        console.log('视频时长:', duration, '秒');
        
        // 在视频中间位置截取一帧作为缩略图
        // 为避免黑屏，取视频时长的30%位置
        const screenshotTime = duration * 0.3;
        
        ffmpeg(videoPath)
          .screenshots({
            timestamps: [screenshotTime],
            filename: path.basename(outputPath),
            folder: path.dirname(outputPath),
            size: '320x180' // 16:9 缩略图尺寸
          })
          .on('end', () => {
            console.log('缩略图生成成功:', outputPath);
            resolve(outputPath);
          })
          .on('error', (err) => {
            console.error('生成缩略图过程中出错:', err.message);
            reject(err);
          });
      } catch (error) {
        console.error('生成缩略图过程中出错:', error.message);
        reject(error);
      }
    });
  });
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

  // 视频管理
  ipcMain.handle('get-videos', () => {
    console.log('处理get-videos请求');
    return db.getVideoCache();
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
      const thumbnailDir = path.join(__dirname, 'thumbnails');
      if (!fs.existsSync(thumbnailDir)) {
        fs.mkdirSync(thumbnailDir, { recursive: true });
      }
      
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
            // 生成缩略图
            await generateThumbnail(filePath, thumbnailPath);
            
            // 创建视频对象
            const videoObj = {
              id: videoId,
              fileName: fileName,
              filePath: filePath,
              fileSize: formatFileSize(stats.size),
              createDate: new Date(stats.birthtime).toISOString().split('T')[0],
              importDate: importDate,
              viewCount: 0,
              lastViewDate: '',
              selected: false,
              thumbnailUrl: `thumbnails/${thumbnailFileName}`,
              rating: 0,
              actors: '',
              code: '',
              collection: '',
              resolution: '',
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
            
            // 即使缩略图生成失败，也添加视频（使用默认缩略图）
            const videoObj = {
              id: videoId,
              fileName: fileName,
              filePath: filePath,
              fileSize: formatFileSize(stats.size),
              createDate: new Date(stats.birthtime).toISOString().split('T')[0],
              importDate: importDate,
              viewCount: 0,
              lastViewDate: '',
              selected: false,
              thumbnailUrl: '',  // 空缩略图URL
              rating: 0,
              actors: '',
              code: '',
              collection: '',
              resolution: '',
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
    // 使用系统默认应用打开视频文件
    const { shell } = require('electron');
    shell.openPath(filePath);
    
    // 更新观看次数和最后观看时间
    try {
      await db.updateVideoViewInfo(filePath);
    } catch (error) {
      console.error('更新视频观看信息失败:', error);
    }
    
    return true;
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
      const thumbnailDir = path.join(__dirname, 'thumbnails');
      if (!fs.existsSync(thumbnailDir)) {
        fs.mkdirSync(thumbnailDir, { recursive: true });
      }
      
      // 目标文件路径
      const destPath = path.join(thumbnailDir, newFileName);
      
      // 读取源文件
      const data = fs.readFileSync(sourcePath);
      
      // 写入目标文件
      fs.writeFileSync(destPath, data);
      
      // 返回相对路径
      const relativePath = path.join('thumbnails', newFileName).replace(/\\/g, '/');
      console.log(`图片已复制到: ${relativePath}`);
      
      return relativePath;
    } catch (error) {
      console.error('复制图片失败:', error);
      throw error;
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
  
  console.log('IPC事件处理程序注册完成');
}

// 当Electron完成初始化并准备创建浏览器窗口时调用此方法
app.whenReady().then(async () => {
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
  
  // 初始化数据库
  await db.initDatabase();
  
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