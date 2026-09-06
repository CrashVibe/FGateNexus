import type { ReactNode } from "react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * 破坏性操作的统一二次确认。onConfirm 期间按钮转圈，成功后自动关闭；
 * 抛错则保持打开（错误提示交给调用方 toast）。
 */
export const ConfirmDialog = ({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "确认删除",
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmText?: string;
  onConfirm: () => Promise<void> | void;
}) => {
  const [pending, setPending] = useState(false);

  const handleConfirm = async (): Promise<void> => {
    setPending(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            disabled={pending}
            onClick={() => {
              onOpenChange(false);
            }}
            variant="outline"
          >
            取消
          </Button>
          <Button
            loading={pending}
            onClick={() => {
              void handleConfirm();
            }}
            variant="destructive"
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
