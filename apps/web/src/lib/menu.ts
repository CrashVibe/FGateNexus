import {
  ArrowLeft,
  ArrowLeftRight,
  Bell,
  Image,
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
    { icon: Server, label: "服务器管理", to: "/" },
    { icon: LinkIcon, label: "Bot 实例", to: "/bots" },
    { icon: Users, label: "玩家列表", to: "/players" },
    {
      desc: "上传与管理图片模板包。",
      icon: Image,
      label: "图片模板",
      to: "/templates",
    },
    {
      desc: "安全设置与浏览器配置。",
      icon: Settings,
      label: "设置",
      to: "/settings",
    },
  ],
];

/** 服务器编辑态菜单。 */
export const serverMenu = (sid: string): MenuColumn[] => [
  [
    { desc: "返回服务器列表主页。", icon: ArrowLeft, label: "返回", to: "/" },
    {
      children: [
        {
          desc: "配置服务器的基础运行参数和常规设置",
          icon: Settings2,
          label: "基础设置",
          to: `/servers/${sid}/general`,
        },
        {
          desc: "配置聊天平台的消息目标",
          icon: Target,
          label: "目标配置",
          to: `/servers/${sid}/target`,
        },
      ],
      label: "基础配置",
    },
    {
      children: [
        {
          desc: "设置社交账号与游戏账号的绑定规则",
          icon: UserCheck,
          label: "账号绑定",
          to: `/servers/${sid}/binding`,
        },
        {
          desc: "配置服务器的远程指令",
          icon: Terminal,
          label: "远程指令",
          to: `/servers/${sid}/command`,
        },
        {
          desc: "为该服务器配置图片模板实例并绑定指令",
          icon: Image,
          label: "图片模板",
          to: `/servers/${sid}/templates`,
        },
      ],
      label: "服务器管理",
    },
    {
      children: [
        {
          desc: "Minecraft 与 聊天平台消息双向同步配置",
          icon: ArrowLeftRight,
          label: "消息互通",
          to: `/servers/${sid}/msgbridge`,
        },
      ],
      label: "聊天与消息",
    },
    {
      children: [
        {
          desc: "配置服务器的事件通知",
          icon: Bell,
          label: "事件通知",
          to: `/servers/${sid}/notify`,
        },
      ],
      label: "事件与通知",
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
