import { Link, useLocation } from "@tanstack/react-router";
import { Inbox } from "lucide-react";

import { useLayout } from "@/components/layout/context";
import { ServerHeader } from "@/components/layout/server-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { MenuNode } from "@/lib/menu";

export const ServerOverviewPage = () => {
  const { menu } = useLayout();
  const { pathname } = useLocation();

  const items: MenuNode[] = menu
    .flat()
    .flatMap((node) => node.children ?? [])
    .filter((node) => node.to && node.to !== "/" && node.to !== pathname);

  return (
    <>
      <ServerHeader />
      <div className="scrollbar-custom flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-4 py-8 lg:px-6">
          {items.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <Link key={item.to} to={item.to ?? "/"}>
                  <Card className="hover:border-primary/50 h-full cursor-pointer transition-colors">
                    <CardHeader>
                      <CardTitle>{item.label}</CardTitle>
                      <CardDescription>{item.desc}</CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <Inbox className="text-muted-foreground size-12" />
              <p className="text-muted-foreground">暂无可用的配置选项</p>
              <Button asChild variant="secondary">
                <Link to="/">返回服务器列表</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
