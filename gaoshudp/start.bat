@echo off
chcp 65001 >nul
cd /d %~dp0
echo 正在启动本地服务器...
echo 请勿关闭此窗口，关闭窗口网页将无法使用。
echo 正在打开浏览器...
start http://localhost:8000
python -m http.server 8000
pause 