import { useNavigate } from "@tanstack/react-router";
import { Settings2, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

import type { targetResponse } from "#shared/model/server/schema/target";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export const TargetConfigSheet = ({
  targets,
  selectedId,
  onSelectedChange,
  serverId,
  children,
  triggerLabel = "配置目标",
}: {
  targets: targetResponse[];
  selectedId: string | null;
  onSelectedChange: (id: string | null) => void;
  serverId: number;
  children: (target: targetResponse) => ReactNode;
  triggerLabel?: string;
}) => {
  const navigate = useNavigate();
  const selectedTarget = targets.find((t) => t.id === selectedId) ?? null;

  return (
    <>
      {targets.length > 0 ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>
              <Settings2 />
              {triggerLabel}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {targets.map((t) => (
              <DropdownMenuItem
                key={t.id}
                onClick={() => {
                  onSelectedChange(t.id);
                }}
              >
                {t.channelId}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Alert variant="warning">
          <TriangleAlert />
          <AlertDescription>
            <Button
              className="h-auto p-0"
              onClick={() => {
                void navigate({
                  params: { id: String(serverId) },
                  to: "/servers/$id/target",
                });
              }}
              variant="link"
            >
              你还没有创建目标哦（去创建）
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Sheet
        onOpenChange={(o) => {
          if (!o) {
            onSelectedChange(null);
          }
        }}
        open={selectedTarget !== null}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>
              目标配置 · {selectedTarget?.channelId ?? selectedTarget?.id}
            </SheetTitle>
          </SheetHeader>
          {selectedTarget ? children(selectedTarget) : null}
        </SheetContent>
      </Sheet>
    </>
  );
};
