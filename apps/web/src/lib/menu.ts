import {
  ArrowLeft,
  ArrowLeftRight,
  Bell,
  Image,
  LayoutDashboard,
  Link as LinkIcon,
  Server,
  Settings,
  Settings2,
  Target,
  Terminal,
  UserCheck,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { t } from "@/i18n";

/** 导航节点：有 `to` 为可点击叶子；有 `children` 为可折叠分组。 */
export interface MenuNode {
  label: string;
  to?: string;
  desc?: string;
  icon?: LucideIcon;
  children?: MenuNode[];
}

export type MenuColumn = MenuNode[];

/** 基础菜单（非服务器编辑态）。 */
export const basicMenu = (): MenuColumn[] => [
  [
    { icon: LayoutDashboard, label: t("总览"), to: "/" },
    { icon: Server, label: t("服务器"), to: "/servers" },
    { icon: LinkIcon, label: t("机器人"), to: "/bots" },
    { icon: Users, label: t("玩家列表"), to: "/players" },
    {
      desc: t("上传与管理图片模板包。"),
      icon: Image,
      label: t("图片模板"),
      to: "/templates",
    },
    {
      desc: t("安全、浏览器与备份。"),
      icon: Settings,
      label: t("设置"),
      to: "/settings",
    },
  ],
];

/** 服务器编辑态菜单。 */
export const serverMenu = (sid: string): MenuColumn[] => [
  [
    {
      desc: t("返回总览。"),
      icon: ArrowLeft,
      label: t("返回"),
      to: "/",
    },
    {
      children: [
        {
          desc: t("配置服务器的基础运行参数和常规设置"),
          icon: Settings2,
          label: t("基础设置"),
          to: `/servers/${sid}/general`,
        },
        {
          desc: t("每个群聊开哪些功能，一张表管完"),
          icon: Target,
          label: t("群聊连接"),
          to: `/servers/${sid}/target`,
        },
      ],
      label: t("接入"),
    },
    {
      children: [
        {
          desc: t("设置社交账号与游戏账号的绑定规则"),
          icon: UserCheck,
          label: t("账号绑定"),
          to: `/servers/${sid}/binding`,
        },
        {
          desc: t("配置服务器的远程指令"),
          icon: Terminal,
          label: t("远程指令"),
          to: `/servers/${sid}/command`,
        },
        {
          desc: t("发个指令，群里就回一张图"),
          icon: Image,
          label: t("图片指令"),
          to: `/servers/${sid}/templates`,
        },
      ],
      label: t("玩法功能"),
    },
    {
      children: [
        {
          desc: t("Minecraft 与 聊天平台消息双向同步配置"),
          icon: ArrowLeftRight,
          label: t("消息互通"),
          to: `/servers/${sid}/msgbridge`,
        },
      ],
      label: t("聊天与消息"),
    },
    {
      children: [
        {
          desc: t("配置服务器的事件通知"),
          icon: Bell,
          label: t("事件通知"),
          to: `/servers/${sid}/notify`,
        },
      ],
      label: t("事件与通知"),
    },
  ],
];

/** 在菜单中按路径查找节点（供 page-header 推导标题）。 */
export const findMenuNode = (
  columns: MenuColumn[],
  path: string,
): MenuNode | null => {
  const walk = (nodes: MenuNode[]): MenuNode | null => {
    for (const node of nodes) {
      if (node.to === path) {
        return node;
      }
      if (node.children) {
        const found = walk(node.children);
        if (found) {
          return found;
        }
      }
    }
    return null;
  };
  return walk(columns.flat());
};
