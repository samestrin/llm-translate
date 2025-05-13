import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

const TooltipProvider = TooltipPrimitive.Provider;

const TooltipRoot = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={`z-50 overflow-hidden rounded-md border border-secondary-200 bg-white px-4 py-2 text-sm text-secondary-900 shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 dark:border-secondary-800 dark:bg-secondary-800 dark:text-secondary-100 font-medium ${className}`}
    {...props}
  />
));
TooltipContent.displayName = "TooltipContent";

// Export a complete Tooltip component for easier usage
const Tooltip = ({ children, content, delayDuration = 300, ...props }) => (
  <TooltipRoot delayDuration={delayDuration}>
    <TooltipTrigger asChild>{children}</TooltipTrigger>
    <TooltipContent {...props}>{content}</TooltipContent>
  </TooltipRoot>
);

export { Tooltip, TooltipProvider, TooltipRoot, TooltipTrigger, TooltipContent };