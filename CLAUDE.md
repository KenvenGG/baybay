# 残酷育儿模拟器 (Cruel Parenting Simulator)

## 项目概述
纯前端 HTML/CSS/JS 育儿生存模拟游戏。模拟婴儿出生第一年（365 天），管理婴儿属性、父母精力、家庭资金。

## 技术栈
- 原生 HTML/CSS/JavaScript，无框架，无构建工具
- 直接在浏览器打开 `index.html` 即可运行（无需 HTTP 服务器）

## 文件结构
```
index.html          - 入口页面 + UI 模态框
styles.css          - 深色主题样式（CSS Grid 三栏布局）
game.js             - 游戏核心逻辑（状态管理、循环、渲染、事件）
config.js           - CSV 解析器 + 内嵌 CSV 数据 → 全局配置对象
config/             - CSV 配置表（可用 Excel 编辑后同步到 config.js）
  families.csv      - 家庭模式配置（单/双职工）
  purchases.csv     - 开局采购配置（4 类 × 3 档）
  stages.csv        - 发育阶段配置
  actions.csv       - 行动列表配置
  events.csv        - 随机事件配置
assets/
  nursery-bg.svg    - 育儿室背景
```

## 配置修改流程
1. 用 Excel/WPS 编辑 `config/*.csv` 文件
2. 将修改后的 CSV 内容同步到 `config.js` 中对应的 `CSV_*` 模板字符串
3. 刷新浏览器生效

## 关键全局变量
- `FAMILIES` - 家庭模式配置
- `PURCHASES` - 采购配置
- `STAGES` - 发育阶段配置
- `ACTIONS` - 行动配置
- `EVENT_POOLS` - 事件配置
- `state` - 游戏运行时状态

## 历史改动
- 默认家庭总收入设为 10000
- 开局物资抽离为 CSV 配置表（config.js + config/*.csv）
- CSV 文件添加 UTF-8 BOM 解决 Excel 中文乱码

## 远程仓库
https://github.com/KenvenGG/baybay
