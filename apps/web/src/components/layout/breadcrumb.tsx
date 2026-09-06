import { Link, useLocation } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { Fragment } from "react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { useServer } from "@/queries/servers";

export interface Crumb {
  key: string;
  content: ReactNode;
}

/** 单行面包屑：最后一级是当前位置，前面的都可点。 */
export const Breadcrumb = ({ items }: { items: Crumb[] }) => (
  <nav
    aria-label="面包屑"
    className="flex min-w-0 items-center gap-1.5 text-sm"
  >
    {items.map((item, i) => (
      <Fragment key={item.key}>
        {i > 0 ? (
          <ChevronRight className="text-muted-foreground/40 size-3.5 shrink-0" />
        ) : null}
        <span
          className={cn(
            "truncate",
            i === items.length - 1
              ? "text-foreground font-medium"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {item.content}
        </span>
      </Fragment>
    ))}
  </nav>
);

/**
 * 服务器路径下的前两级：服务器 › 某台服务器。
 * 不在 /servers/:id 下时返回空数组，调用方直接展开即可。
 */
export const useServerCrumbs = (): Crumb[] => {
  const { pathname } = useLocation();
  const id = /^\/servers\/(?<sid>[^/]+)/u.exec(pathname)?.groups?.sid;
  const { data: server } = useServer(Number(id));

  if (!id) {
    return [];
  }
  return [
    { content: <Link to="/servers">服务器</Link>, key: "servers" },
    {
      content: (
        <Link params={{ id }} to="/servers/$id/general">
          {server?.name ?? `#${id}`}
        </Link>
      ),
      key: "server",
    },
  ];
};
