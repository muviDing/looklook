; 自定义NSIS安装脚本
; 解决安装路径问题，允许用户直接选择盘符根目录

; 在安装程序初始化时设置默认路径
!macro customInit
  ; 设置默认安装路径
  StrCpy $INSTDIR "C:\早该看看了"
!macroend

; 自定义安装目录验证
!macro customInstallModeChangeDir
  ; 获取用户选择的路径长度
  StrLen $R1 $INSTDIR
  
  ; 检查是否选择了盘符根目录（如 D:\）
  ${If} $R1 == 3
    StrCpy $R2 $INSTDIR 1 1
    ${If} $R2 == ":"
      ; 如果是盘符根目录，自动添加应用名称
      StrCpy $INSTDIR "$INSTDIR早该看看了"
    ${EndIf}
  ${EndIf}
  
  ; 检查是否只选择了盘符（如 D:）
  ${If} $R1 == 2
    StrCpy $R2 $INSTDIR 1 1
    ${If} $R2 == ":"
      ; 添加反斜杠和应用名称
      StrCpy $INSTDIR "$INSTDIR\早该看看了"
    ${EndIf}
  ${EndIf}
!macroend 