 高等数学学习网页 · 使用说明
============================

【如何打开】
1. 双击 start.bat
2. 会弹出一个黑色命令行窗口（不要关闭它）
3. 浏览器自动打开 http://localhost:8000
4. 使用完毕后，关闭黑色窗口即可

【注意事项】
- 不要直接双击 index.html，那样搜索和内容加载会失败
- 必须通过 start.bat 启动
- 首次打开需要联网（加载 MathJax 公式渲染库）

【以后如何增加内容】
- 每章一个 JSON 文件，放在 data/ 文件夹里
- 新增章节后，在 data/manifest.json 的 chapters 数组里加一行
  例如：{ "file": "ch2.json" }
- 保存后刷新浏览器即可，不需要改任何代码

【文件结构】
gaoshu/
├── index.html        页面框架
├── style.css         样式（改配色改这里）
├── script.js         逻辑（目录、搜索、折叠）
├── start.bat         启动器
├── README.txt        本文件
└── data/
    ├── manifest.json 章节清单
    └── ch1.json      第一章数据