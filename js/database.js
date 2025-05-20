/**
 * 数据库模块
 * 负责视频数据的持久化存储和读取
 */

const path = require('path');
const fs = require('fs');
const Datastore = require('nedb');
const { app } = require('electron');

// 获取应用数据目录
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

// 确保目录存在
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// 数据库文件路径
const dbPath = getUserDataPath('videos.db');
// 枚举值数据库文件路径
const enumDbPath = getUserDataPath('enums.db');

// 确保数据库目录存在
const dbDir = path.dirname(dbPath);
ensureDirectoryExists(dbDir);

// 初始化数据库
const db = new Datastore({ 
    filename: dbPath, 
    autoload: true,
    timestampData: true  // 自动添加 createdAt 和 updatedAt 字段
});

// 初始化枚举值数据库
const enumDb = new Datastore({
    filename: enumDbPath,
    autoload: true,
    timestampData: true
});

// 创建索引以提高查询性能
db.ensureIndex({ fieldName: 'id', unique: true });
db.ensureIndex({ fieldName: 'filePath', unique: true });
enumDb.ensureIndex({ fieldName: 'type', unique: true });

// 视频数据缓存
let videoCache = [];
// 枚举值缓存
let enumCache = {};
// 文件检查进度状态
let fileCheckStatus = {
    total: 0,
    checked: 0,
    problems: 0,
    inProgress: false,
    completed: false
};

/**
 * 获取指定类型的枚举值
 * @param {string} enumType 枚举类型，如 'collection', 'actors' 等
 * @returns {Promise<Array<string>>} 枚举值数组
 */
function getEnumValues(enumType) {
    return new Promise((resolve, reject) => {
        // 先尝试从缓存获取
        if (enumCache[enumType]) {
            resolve(enumCache[enumType]);
            return;
        }

        // 从数据库获取
        enumDb.findOne({ type: enumType }, (err, doc) => {
            if (err) {
                console.error(`获取枚举值[${enumType}]失败:`, err);
                reject(err);
                return;
            }
            
            // 如果记录存在，返回其值；否则返回空数组
            const values = doc ? doc.values : [];
            
            // 更新缓存
            enumCache[enumType] = values;
            
            resolve(values);
        });
    });
}

/**
 * 保存枚举值数组
 * @param {string} enumType 枚举类型
 * @param {Array<string>} values 枚举值数组
 * @returns {Promise<Array<string>>} 保存后的枚举值数组
 */
function saveEnumValues(enumType, values) {
    return new Promise((resolve, reject) => {
        // 确保values是数组
        if (!Array.isArray(values)) {
            values = [];
        }
        
        // 去重并排序
        const uniqueValues = [...new Set(values)].sort();
        
        enumDb.update(
            { type: enumType }, 
            { type: enumType, values: uniqueValues },
            { upsert: true },
            (err) => {
                if (err) {
                    console.error(`保存枚举值[${enumType}]失败:`, err);
                    reject(err);
                    return;
                }
                
                // 更新缓存
                enumCache[enumType] = uniqueValues;
                
                resolve(uniqueValues);
            }
        );
    });
}

/**
 * 添加单个枚举值
 * @param {string} enumType 枚举类型
 * @param {string} value 要添加的枚举值
 * @returns {Promise<Array<string>>} 添加后的枚举值数组
 */
function addEnumValue(enumType, value) {
    return new Promise(async (resolve, reject) => {
        try {
            // 空值检查
            if (!value || value.trim() === '') {
                console.warn(`尝试添加空枚举值到[${enumType}]，已忽略`);
                const currentValues = await getEnumValues(enumType);
                resolve(currentValues);
                return;
            }
            
            // 获取当前枚举值
            const currentValues = await getEnumValues(enumType);
            
            // 检查是否已存在
            if (currentValues.includes(value)) {
                console.log(`枚举值[${value}]已存在于[${enumType}]，无需添加`);
                resolve(currentValues);
                return;
            }
            
            // 添加新值并保存
            currentValues.push(value);
            const updatedValues = await saveEnumValues(enumType, currentValues);
            
            resolve(updatedValues);
        } catch (error) {
            console.error(`添加枚举值[${value}]到[${enumType}]失败:`, error);
            reject(error);
        }
    });
}

/**
 * 初始化枚举值缓存
 */
async function initEnumCache() {
    try {
        // 预定义的枚举类型
        const enumTypes = ['collection', 'actors'];
        
        // 加载所有枚举类型的值
        for (const type of enumTypes) {
            const values = await getEnumValues(type);
            console.log(`已加载枚举值[${type}]: ${values.length}个`);
        }
        
        // 确保合集中包含"路径异常"标签
        const collections = await getEnumValues('collection');
        if (!collections.includes('路径异常')) {
            console.log('添加默认标签: 路径异常');
            await addEnumValue('collection', '路径异常');
        }
    } catch (error) {
        console.error('初始化枚举值缓存失败:', error);
    }
}

/**
 * 初始化数据库模块
 */
function initDatabase() {
    // 加载所有视频数据到缓存
    loadAllVideos()
    .then(() => {
        // 检查并清理可能存在的重复记录
        return cleanupDuplicateVideos();
    })
    .then(() => {
        // 初始化枚举值缓存
        return initEnumCache();
    })
    .then(() => {
        // 检查所有视频文件是否存在
        return checkAllVideoFilesExist();
    })
    .then(() => {
        console.log('数据库模块初始化完成');
    })
    .catch(err => {
        console.error('数据库初始化失败:', err);
    });
}

/**
 * 加载所有视频数据到缓存
 */
function loadAllVideos() {
    return new Promise((resolve, reject) => {
        db.find({}).sort({ updatedAt: -1 }).exec((err, docs) => {
            if (err) {
                console.error('加载视频数据失败:', err);
                reject(err);
                return;
            }
            
            videoCache = docs;
            console.log(`已加载 ${docs.length} 个视频记录`);
            resolve(docs);
        });
    });
}

/**
 * 检查并清理可能存在的重复视频记录
 */
function cleanupDuplicateVideos() {
    return new Promise(async (resolve, reject) => {
        try {
            // 没有数据则不处理
            if (videoCache.length === 0) {
                console.log('没有视频数据，无需清理重复');
                resolve(0);
                return;
            }
            
            console.log('开始检查是否存在重复视频记录...');
            
            // 用于规范化路径比较
            const normalizePath = (p) => p ? p.replace(/\\/g, '/').toLowerCase() : '';
            
            // 用于存储已处理过的路径
            const processedPaths = new Map();
            // 用于存储要保留的视频ID
            const keepIds = new Set();
            // 用于存储需要删除的视频ID
            const deleteIds = [];
            
            // 第一步：标记要保留和删除的视频
            videoCache.forEach(video => {
                if (!video.filePath) return; // 忽略没有路径的视频
                
                const normalizedPath = normalizePath(video.filePath);
                
                // 如果这个路径已经处理过，则当前视频是重复的
                if (processedPaths.has(normalizedPath)) {
                    // 已有一个视频用这个路径，当前视频是重复的，标记为删除
                    deleteIds.push(video.id);
                } else {
                    // 这是第一次看到这个路径，标记为保留
                    processedPaths.set(normalizedPath, video.id);
                    keepIds.add(video.id);
                }
            });
            
            // 如果没有重复的，直接返回
            if (deleteIds.length === 0) {
                console.log('没有发现重复视频记录');
                resolve(0);
                return;
            }
            
            console.log(`发现 ${deleteIds.length} 个重复视频记录，准备清理`);
            
            // 第二步：从数据库中删除重复记录
            db.remove({ id: { $in: deleteIds } }, { multi: true }, (err, numRemoved) => {
                if (err) {
                    console.error('清理重复视频记录失败:', err);
                    reject(err);
                    return;
                }
                
                // 第三步：更新缓存
                videoCache = videoCache.filter(video => keepIds.has(video.id));
                
                console.log(`成功清理 ${numRemoved} 个重复视频记录`);
                resolve(numRemoved);
            });
        } catch (error) {
            console.error('清理重复视频时出错:', error);
            reject(error);
        }
    });
}

/**
 * 保存单个视频数据
 * @param {Object} video 视频数据对象
 * @returns {Promise<Object>} 保存后的视频对象
 */
function saveVideo(video) {
    return new Promise((resolve, reject) => {
        // 确保视频对象有唯一ID
        if (!video.id) {
            video.id = Date.now() + Math.floor(Math.random() * 1000);
        }
        
        db.insert(video, (err, newDoc) => {
            if (err) {
                // 如果是重复键错误，尝试更新而不是插入
                if (err.errorType === 'uniqueViolated') {
                    updateVideo(video).then(resolve).catch(reject);
                    return;
                }
                
                console.error('保存视频数据失败:', err);
                reject(err);
                return;
            }
            
            // 更新缓存
            const index = videoCache.findIndex(v => v.id === newDoc.id);
            if (index !== -1) {
                videoCache[index] = newDoc;
            } else {
                videoCache.push(newDoc);
            }
            
            resolve(newDoc);
        });
    });
}

/**
 * 批量保存视频数据
 * @param {Array<Object>} videos 视频数据对象数组
 * @returns {Promise<Array<Object>>} 保存后的视频对象数组
 */
function saveVideos(videos) {
    // 使用Promise.allSettled代替Promise.all，以便部分视频保存失败不影响其他视频
    return new Promise(async (resolve, reject) => {
        try {
            // 使用allSettled而不是all，这样部分失败不会影响整体
            const results = await Promise.allSettled(videos.map(video => saveVideo(video)));
            
            // 过滤出成功保存的视频
            const successfulVideos = results
                .filter(result => result.status === 'fulfilled')
                .map(result => result.value);
            
            // 记录失败的视频
            const failedCount = results.filter(result => result.status === 'rejected').length;
            if (failedCount > 0) {
                console.warn(`${failedCount}个视频保存失败，${successfulVideos.length}个成功`);
            }
            
            resolve(successfulVideos);
        } catch (error) {
            console.error('批量保存视频时出错:', error);
            reject(error);
        }
    });
}

/**
 * 更新视频数据
 * @param {Object} video 视频数据对象
 * @returns {Promise<Object>} 更新后的视频对象
 */
function updateVideo(video) {
    return new Promise((resolve, reject) => {
        if (!video.id) {
            reject(new Error('视频ID不能为空'));
            return;
        }
        
        // 先获取现有视频数据，确保不覆盖importDate
        db.findOne({ id: video.id }, (err, existingVideo) => {
            if (err) {
                console.error('查询现有视频数据失败:', err);
                reject(err);
                return;
            }
            
            // 创建更新数据对象
            const updateData = { ...video };
            
            // 如果存在现有数据且有importDate，则保留原导入日期
            if (existingVideo && existingVideo.importDate) {
                updateData.importDate = existingVideo.importDate;
            }
            
            // 执行更新
            db.update({ id: video.id }, { $set: updateData }, { returnUpdatedDocs: true }, (err, numAffected, updatedDoc) => {
                if (err) {
                    console.error('更新视频数据失败:', err);
                    reject(err);
                    return;
                }
                
                if (numAffected === 0) {
                    reject(new Error(`未找到ID为 ${video.id} 的视频`));
                    return;
                }
                
                // 更新缓存
                const index = videoCache.findIndex(v => v.id === video.id);
                if (index !== -1) {
                    videoCache[index] = updatedDoc;
                }
                
                resolve(updatedDoc);
            });
        });
    });
}

/**
 * 删除视频
 * @param {number} videoId 视频ID
 * @returns {Promise<number>} 删除的记录数
 */
function deleteVideo(videoId) {
    return new Promise((resolve, reject) => {
        db.remove({ id: videoId }, {}, (err, numRemoved) => {
            if (err) {
                console.error('删除视频失败:', err);
                reject(err);
                return;
            }
            
            // 更新缓存
            videoCache = videoCache.filter(v => v.id !== videoId);
            
            resolve(numRemoved);
        });
    });
}

/**
 * 批量删除视频
 * @param {Array<number>} videoIds 视频ID数组
 * @returns {Promise<number>} 删除的记录数
 */
function deleteVideos(videoIds) {
    return new Promise((resolve, reject) => {
        db.remove({ id: { $in: videoIds } }, { multi: true }, (err, numRemoved) => {
            if (err) {
                console.error('批量删除视频失败:', err);
                reject(err);
                return;
            }
            
            // 更新缓存
            videoCache = videoCache.filter(v => !videoIds.includes(v.id));
            
            resolve(numRemoved);
        });
    });
}

/**
 * 更新视频观看信息
 * @param {string} filePath 视频文件路径
 * @returns {Promise<Object>} 更新后的视频对象
 */
function updateVideoViewInfo(filePath) {
    return new Promise((resolve, reject) => {
        const video = videoCache.find(v => v.filePath === filePath);
        if (!video) {
            reject(new Error(`未找到路径为 ${filePath} 的视频`));
            return;
        }
        
        // 更新观看次数和最后观看时间
        video.viewCount = (video.viewCount || 0) + 1;
        video.lastViewDate = new Date().toISOString().split('T')[0];
        
        // 保存到数据库
        updateVideo(video).then(resolve).catch(reject);
    });
}

/**
 * 更新视频文件路径
 * @param {string} id 视频ID
 * @param {string} newFilePath 新的文件路径
 * @returns {Promise<boolean>} 操作是否成功
 */
async function updateVideoFilePath(id, newFilePath) {
  try {
    console.log(`更新视频ID: ${id} 的文件路径为: ${newFilePath}`);
    
    // 查找并更新视频
    const video = videoCache.find(v => v.id === id);
    if (!video) {
      console.error(`找不到ID为 ${id} 的视频`);
      return false;
    }
    
    // 更新缓存中的路径
    video.filePath = newFilePath;
    
    // 更新数据库中的记录
    return new Promise((resolve, reject) => {
      db.update(
        { id: id },
        { $set: { filePath: newFilePath } },
        {},
        (err, numReplaced) => {
          if (err) {
            console.error('更新视频文件路径失败:', err);
            reject(err);
            return;
          }
          
          console.log(`成功更新 ${numReplaced} 条视频记录的文件路径`);
          resolve(numReplaced > 0);
        }
      );
    });
  } catch (error) {
    console.error('更新视频文件路径失败:', error);
    throw error;
  }
}

/**
 * 检查所有视频文件是否存在并更新标签
 * @returns {Promise<void>}
 */
function checkAllVideoFilesExist() {
    return new Promise(async (resolve, reject) => {
        try {
            // 如果没有视频数据，直接返回
            if (videoCache.length === 0) {
                console.log('没有视频数据，无需检查文件存在性');
                resolve();
                return;
            }

            console.log(`开始检查 ${videoCache.length} 个视频文件是否存在...`);
            
            // 初始化检查状态
            fileCheckStatus = {
                total: videoCache.length,
                checked: 0,
                problems: 0,
                inProgress: true,
                completed: false
            };
            
            // 通知主进程显示进度对话框
            if (process.type === 'renderer') {
                window.electronAPI.startFileCheck(fileCheckStatus);
            } else {
                // 在主进程中时，通过相应的通道发送消息
                const { BrowserWindow } = require('electron');
                const mainWindow = BrowserWindow.getAllWindows()[0];
                if (mainWindow) {
                    mainWindow.webContents.send('file-check-progress', fileCheckStatus);
                }
            }
            
            // 使用批量处理，避免一次性处理太多文件导致UI卡顿
            const batchSize = 20; // 每批处理的视频数量
            const batches = Math.ceil(videoCache.length / batchSize);
            
            for (let batchIndex = 0; batchIndex < batches; batchIndex++) {
                // 计算当前批次的起始和结束索引
                const startIndex = batchIndex * batchSize;
                const endIndex = Math.min(startIndex + batchSize, videoCache.length);
                const currentBatch = videoCache.slice(startIndex, endIndex);
                
                // 处理当前批次中的每个视频
                for (const video of currentBatch) {
                    try {
                        // 检查文件是否存在
                        const exists = fs.existsSync(video.filePath);
                        
                        // 获取当前视频的标签
                        const tags = video.collection ? video.collection.split(',').map(tag => tag.trim()).filter(Boolean) : [];
                        const hasPathErrorTag = tags.includes('路径异常');
                        
                        // 更新标签状态
                        let tagUpdated = false;
                        if (!exists && !hasPathErrorTag) {
                            // 文件不存在且没有标签，添加标签
                            tags.push('路径异常');
                            video.collection = tags.join(',');
                            await updateVideo(video);
                            tagUpdated = true;
                            fileCheckStatus.problems++;
                        } else if (exists && hasPathErrorTag) {
                            // 文件存在但有标签，移除标签
                            const newTags = tags.filter(tag => tag !== '路径异常');
                            video.collection = newTags.join(',');
                            await updateVideo(video);
                            tagUpdated = true;
                        }
                        
                        // 只在真正找到问题时记录日志，避免过多输出
                        if (tagUpdated) {
                            console.log(`文件 ${video.fileName} ${exists ? '存在' : '不存在'}, 标签已${exists ? '移除' : '添加'}`);
                        }
                    } catch (error) {
                        console.error(`检查视频 ${video.fileName} 文件时出错:`, error);
                    }
                    
                    // 更新进度
                    fileCheckStatus.checked++;
                    
                    // 发送进度更新
                    if (process.type === 'renderer') {
                        window.electronAPI.updateFileCheck(fileCheckStatus);
                    } else {
                        const { BrowserWindow } = require('electron');
                        const mainWindow = BrowserWindow.getAllWindows()[0];
                        if (mainWindow) {
                            mainWindow.webContents.send('file-check-progress', fileCheckStatus);
                        }
                    }
                }
                
                // 在批次之间等待一小段时间，让UI有机会刷新
                await new Promise(r => setTimeout(r, 10));
            }
            
            // 完成检查
            fileCheckStatus.inProgress = false;
            fileCheckStatus.completed = true;
            
            // 发送最终状态
            if (process.type === 'renderer') {
                window.electronAPI.updateFileCheck(fileCheckStatus);
            } else {
                const { BrowserWindow } = require('electron');
                const mainWindow = BrowserWindow.getAllWindows()[0];
                if (mainWindow) {
                    mainWindow.webContents.send('file-check-progress', fileCheckStatus);
                }
            }
            
            console.log(`视频文件检查完成，共检查 ${fileCheckStatus.checked} 个文件，发现 ${fileCheckStatus.problems} 个问题`);
            resolve();
        } catch (error) {
            console.error('检查视频文件存在性时发生错误:', error);
            
            // 确保错误不会阻止应用启动
            fileCheckStatus.inProgress = false;
            fileCheckStatus.completed = true;
            
            // 即使有错误也标记为完成，避免UI卡在加载状态
            if (process.type === 'renderer') {
                window.electronAPI.updateFileCheck({
                    ...fileCheckStatus,
                    inProgress: false,
                    completed: true,
                    error: error.message
                });
            } else {
                const { BrowserWindow } = require('electron');
                const mainWindow = BrowserWindow.getAllWindows()[0];
                if (mainWindow) {
                    mainWindow.webContents.send('file-check-progress', {
                        ...fileCheckStatus,
                        inProgress: false,
                        completed: true,
                        error: error.message
                    });
                }
            }
            
            // 仍然解析Promise，不要让错误阻止应用启动
            resolve();
        }
    });
}

// 导出模块
module.exports = {
    initDatabase,
    loadAllVideos,
    saveVideo,
    saveVideos,
    updateVideo,
    deleteVideo,
    deleteVideos,
    updateVideoViewInfo,
    cleanupDuplicateVideos,
    getVideoCache: () => videoCache,
    getEnumValues,
    saveEnumValues,
    addEnumValue,
    updateVideoFilePath,
    getFileCheckStatus: () => ({ ...fileCheckStatus }) // 导出文件检查状态的副本
};