# Douyin Helper

抖音创作者中心助手 Chrome 插件，在内容管理页面显示今日作品数据，并自动标记限流视频。

## 功能

- **今日数据面板**：悬浮显示今日发布数量、播放、点赞、评论、收藏、分享、转发
- **限流标记**：自动识别限流视频（status_value=143），在封面添加「限流」角标并高亮边框
- **零额外请求**：复用页面原生翻页请求，不产生多余的 API 调用
- **面板可拖拽**：支持拖动定位，拖到边缘自动收起为侧边 tab

## 安装

### 从 Release 安装（推荐）

1. 前往 [Releases](https://github.com/chengjf/douyin-helper/releases) 下载最新的 `douyin-helper-vx.x.x.zip`
2. 解压 zip 文件
3. 打开 Chrome，进入 `chrome://extensions/`
4. 开启右上角「开发者模式」
5. 点击「加载已解压的扩展程序」，选择解压后的文件夹

### 本地构建

```bash
pnpm install
pnpm build
```

构建产物在 `dist/` 目录，按上述步骤加载即可。

## 使用

安装后访问 [抖音创作者中心 - 内容管理](https://creator.douyin.com/creator-micro/content/manage)，页面右侧会自动出现数据面板。

## 开发

```bash
pnpm install
pnpm dev
```

## 技术栈

- TypeScript + React
- Vite
- Chrome Extension Manifest V3
