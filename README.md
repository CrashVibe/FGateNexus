# FGATE Nexus

> A Minecraft Server Chat Bridge

![Issues](https://img.shields.io/github/issues/CrashVibe/FGateNexus)
![Stars](https://img.shields.io/github/stars/CrashVibe/FGateNexus?style=flat)
![Version](https://img.shields.io/github/v/release/CrashVibe/FGateNexus)
[![Build Release](https://github.com/CrashVibe/FGateNexus/actions/workflows/release.yml/badge.svg)](https://github.com/CrashVibe/FGateNexus/actions/workflows/release.yml)
![License](https://img.shields.io/github/license/CrashVibe/FGateNexus)

![Screenshot](/.github/screenshots/FGate.png)

## 说明

- 本项目后端采用 [Hono](https://hono.dev/) on [Bun](https://bun.sh/)，前端采用 [React](https://react.dev/) +
  [Vite](https://vite.dev/) + [shadcn/ui](https://ui.shadcn.com/)，以 [TypeScript](https://www.typescriptlang.org/)
  开发，最终编译为单文件二进制分发
- 需要配合 [FGATE Client](https://github.com/CrashVibe/FGateClient) 一起使用
- 跨平台支持，适用于 Windows、Linux、macOS 等操作系统
- 仅对移动端做了基础适配，不保证功能全部可用
  > 所以说，建议在 PC 上使用，但如果你想在手机上使用，还是可以的。如果你发现了移动端的 bug 或问题，也欢迎提交 issue
- 我们以深色主题为主
  > 如果你遇到了浅色或深色主题问题或有更好的界面建议，欢迎提交 issue 或 PR
- 适配器支持 OneBot/QQ、Discord，后续会添加更多适配器
  > 如果你需要特定适配器的支持，可以在 issue 中提出
- 欢迎各位大佬 Star ❤️

## 安装

详细安装教程请参考文档：[安装教程](https://fgate.crashvibe.cn/docs/core)

## 🎉 功能

- [x] 多服务器 / 多聊天适配器桥接管理
- [x] 聊天适配器（如 OneBot/QQ、Discord）支持
- [x] 公网 密码、2fa 认证
- [x] 账号绑定 / 解绑
- [x] 服务器事件通知
- [x] 远程命令执行
- [x] 消息同步
- [ ] 其它的还在做......

## 隐私与安全

- 不会上传或收集用户数据，所有数据都在本地服务器处理
- 如未来要集成第三方服务 / API，会提前告知并提供配置选项
  > 当然我们都会尽量避免使用第三方服务，除非必要，除非很好用，嘻嘻~

## 许可证

本项目基于 GPLv3 协议开源。
