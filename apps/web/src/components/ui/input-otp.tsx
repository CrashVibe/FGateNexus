import { OTPInput, OTPInputContext } from "input-otp";
import { MinusIcon } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

export const InputOTP = ({
  className,
  containerClassName,
  ...props
}: React.ComponentProps<typeof OTPInput> & {
  containerClassName?: string;
}) => (
  <OTPInput
    className={cn("disabled:cursor-not-allowed", className)}
    containerClassName={cn(
      "flex items-center gap-2 has-disabled:opacity-50",
      containerClassName,
    )}
    data-slot="input-otp"
    {...props}
  />
);

export const InputOTPGroup = ({
  className,
  ...props
}: React.ComponentProps<"div">) => (
  <div
    className={cn("flex items-center", className)}
    data-slot="input-otp-group"
    {...props}
  />
);

export const InputOTPSlot = ({
  index,
  className,
  ...props
}: React.ComponentProps<"div"> & { index: number }) => {
  const inputOTPContext = React.useContext(OTPInputContext);
  const slot = inputOTPContext.slots[index];
  const char = slot?.char;
  const hasFakeCaret = slot?.hasFakeCaret;
  const isActive = slot?.isActive;

  return (
    <div
      className={cn(
        "border-input data-[active=true]:border-ring data-[active=true]:ring-ring/50 relative flex h-9 w-9 items-center justify-center border-y border-r text-sm shadow-xs transition-all first:rounded-l-md first:border-l last:rounded-r-md data-[active=true]:z-10 data-[active=true]:ring-[3px]",
        className,
      )}
      data-active={isActive}
      data-slot="input-otp-slot"
      {...props}
    >
      {char}
      {hasFakeCaret ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="animate-caret-blink bg-foreground h-4 w-px duration-1000" />
        </div>
      ) : null}
    </div>
  );
};

export const InputOTPSeparator = (props: React.ComponentProps<"div">) => (
  // shadcn 原语：分隔符为装饰性图标容器，保留 role 属性
  // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
  <div data-slot="input-otp-separator" role="separator" {...props}>
    <MinusIcon className="size-4" />
  </div>
);
