import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import { LoadingState } from "@/components/common/loading-state";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { t } from "@/i18n";
import { usePlayers } from "@/queries/players";

const PAGE_SIZE = 10;

export const PlayersPage = () => {
  const { data: playerList } = usePlayers();
  const [search, setSearch] = useState("");
  const [pageIndex, setPageIndex] = useState(0);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return (playerList ?? []).filter((p) => {
      if (!q) {
        return true;
      }
      return (
        p.player.name.toLowerCase().includes(q) ||
        p.player.uuid.toLowerCase().includes(q) ||
        (p.player.ip ?? "").toLowerCase().includes(q) ||
        (p.socialAccount?.uid ?? "").toLowerCase().includes(q)
      );
    });
  }, [playerList, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(pageIndex, pageCount - 1);
  const pageRows = filtered.slice(
    safePage * PAGE_SIZE,
    safePage * PAGE_SIZE + PAGE_SIZE,
  );

  return (
    <>
      <PageHeader
        width="full"
        description={t(
          "查看你的玩家，查看玩家的社交账号绑定情况及所在服务器。",
        )}
        title={t("玩家列表")}
      />
      <div className="scrollbar-custom flex-1 overflow-y-auto">
        <div className="border-b">
          <div className="flex items-center gap-2 px-4 lg:px-6">
            <Search className="text-muted-foreground size-4 shrink-0" />
            <Input
              className="border-none px-0 shadow-none focus-visible:ring-0"
              onChange={(e) => {
                setSearch(e.target.value);
                setPageIndex(0);
              }}
              placeholder={t("搜索玩家名、UUID、IP 或社交账号...")}
              value={search}
            />
          </div>
        </div>
        {playerList === undefined ? (
          <LoadingState />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="pl-4 lg:pl-6">{t("玩家名")}</TableHead>
                  <TableHead>UUID</TableHead>
                  <TableHead>{t("IP 地址")}</TableHead>
                  <TableHead>{t("社交账号")}</TableHead>
                  <TableHead className="pr-4 lg:pr-6">
                    {t("所在服务器")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      className="text-muted-foreground py-8 text-center text-sm"
                      colSpan={5}
                    >
                      {t("暂无玩家数据")}
                    </TableCell>
                  </TableRow>
                ) : (
                  pageRows.map((p) => (
                    <TableRow key={p.player.uuid}>
                      <TableCell className="pl-4 lg:pl-6">
                        {p.player.name}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {p.player.uuid}
                      </TableCell>
                      <TableCell>{p.player.ip ?? "—"}</TableCell>
                      <TableCell>
                        {p.socialAccount ? (
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">
                              {p.socialAccount.platform}
                            </Badge>
                            <span className="text-muted-foreground text-sm">
                              {p.socialAccount.nickname ?? ""} (
                              {p.socialAccount.uid})
                            </span>
                          </div>
                        ) : (
                          <Badge variant="destructive">{t("未绑定")}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="pr-4 lg:pr-6">
                        {p.serversName.join(", ") || "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <div className="border-t">
              <div className="flex items-center justify-end gap-2 px-4 py-4 lg:px-6">
                <span className="text-muted-foreground text-sm">
                  {t("第")} {safePage + 1} / {pageCount} {t("页 · 共")}{" "}
                  {filtered.length} {t("条")}
                </span>
                <Button
                  disabled={safePage === 0}
                  onClick={() => {
                    setPageIndex((i) => Math.max(0, i - 1));
                  }}
                  size="sm"
                  variant="outline"
                >
                  {t("上一页")}
                </Button>
                <Button
                  disabled={safePage >= pageCount - 1}
                  onClick={() => {
                    setPageIndex((i) => Math.min(pageCount - 1, i + 1));
                  }}
                  size="sm"
                  variant="outline"
                >
                  {t("下一页")}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
};
