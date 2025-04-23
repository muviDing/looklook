// preload.js
const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的API给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 窗口控制
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),
  
  // 视频管理
  importVideos: () => ipcRenderer.invoke('import-videos'),
  getVideos: () => ipcRenderer.invoke('get-videos'),
  openVideo: (filePath) => ipcRenderer.invoke('open-video', filePath),
  openSourceFolder: (filePath) => ipcRenderer.invoke('open-source-folder', filePath),
  
  // 导入进度相关
  cancelImport: () => ipcRenderer.send('cancel-import'),
  onImportProgress: (callback) => {
    const progressListener = (event, progress) => {
      callback(progress);
    };
    ipcRenderer.on('import-progress', progressListener);
    return () => {
      ipcRenderer.removeListener('import-progress', progressListener);
    };
  },
  
  // 文件操作
  selectFile: (options) => ipcRenderer.invoke('selectFile', options),
  copyImageToThumbnails: (sourcePath, newFileName) => ipcRenderer.invoke('copyImageToThumbnails', sourcePath, newFileName),
  
  // 数据库操作
  saveVideo: (video) => ipcRenderer.invoke('save-video', video),
  saveVideos: (videos) => ipcRenderer.invoke('save-videos', videos),
  updateVideo: (video) => ipcRenderer.invoke('update-video', video),
  deleteVideo: (videoId) => ipcRenderer.invoke('delete-video', videoId),
  deleteVideos: (videoIds) => ipcRenderer.invoke('delete-videos', videoIds),
  cleanupDuplicates: () => ipcRenderer.invoke('cleanup-duplicates'),
  
  // 枚举值管理
  getEnumValues: (enumType) => ipcRenderer.invoke('get-enum-values', enumType),
  saveEnumValues: (enumType, values) => ipcRenderer.invoke('save-enum-values', enumType, values),
  addEnumValue: (enumType, value) => ipcRenderer.invoke('add-enum-value', enumType, value)
});