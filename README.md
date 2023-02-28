**用于解析 Honey Hunter World 深境螺旋数据的小工具**


[![actions](https://img.shields.io/github/actions/workflow/status/monsterxcn/parse-hhw-abyss/update.yml?branch=main)](https://github.com/monsterxcn/parse-hhw-abyss/actions)
[![license](https://img.shields.io/github/license/monsterxcn/parse-hhw-abyss)](https://raw.githubusercontent.com/monsterxcn/parse-hhw-abyss/main/LICENSE)
[![cdn](https://img.shields.io/badge/cdn-abyss-brightgreen)](https://cdn.monsterx.cn/bot/abyss.json)
[![cdn](https://img.shields.io/badge/cdn-live-orange)](https://cdn.monsterx.cn/bot/abyss.live.json)
[![cdn](https://img.shields.io/badge/cdn-beta-orange)](https://cdn.monsterx.cn/bot/abyss.beta.json)


### 说明

 - 工具提供 Honey Hunter World 的 [深境螺旋](https://genshin.honeyhunterworld.com/d_1001/) 页面解析数据，不会对页面内容做任何修改。
 - 仓库使用 GitHub Actions 于上海时间每月 1 日、8 日、16 日、23 日 04:15 自动更新解析结果。fork 使用可以自定义 Secret `HHW_LANG` 为需要的语言（即请求时附带的 `?lang=xxx`），本仓库使用的是简体中文 `CHS`。
 - 解析结果 JSON 文件存放在仓库 `assets` 文件夹内，同时提供部署于阿里云 OSS 的 CDN 地址供测试使用。`assets/abyss.live.json` 为 Latest Live 数据，`assets/abyss.beta.json` 为 Latest Beta 数据，`assets/abyss.json` 为 Latest Live、Latest Beta 之一（当 Latest Beta 数据的时间信息无明显错误时为 Latest Beta 数据，否则为 Latest Live 数据）。
 - 解析结果 JSON 文件的数据结构提供一份 [Python Pydantic Model](https://github.com/monsterxcn/nonebot-plugin-gsabyss/blob/main/nonebot_plugin_gsabyss/models/hhw.py) 仅供参考。


> @monsterxcn 是 Node.js 菜鸡，代码糟糕请见谅（
