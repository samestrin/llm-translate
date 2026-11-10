import * as React from 'react';
import * as RadixTooltip from '@radix-ui/react-tooltip';

// A short label shown on hover and keyboard focus. Accepts `title` or `content`.
// The trigger must be a single element that can hold a ref.
const Tooltip = React.memo(({ children, content, title, delayDuration = 300, placement = 'top' }) => {
  const text = title || content;
  if (!text) return children;
  return (
    <RadixTooltip.Provider delayDuration={delayDuration}>
      <RadixTooltip.Root>
        <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
        <RadixTooltip.Portal>
          <RadixTooltip.Content
            side={placement}
            sideOffset={6}
            className="z-50 max-w-xs rounded-md border border-line bg-surface px-3 py-1.5 text-sm font-medium text-ink shadow-md"
          >
            {text}
            <RadixTooltip.Arrow className="fill-surface" />
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  );
});

Tooltip.displayName = 'Tooltip';

export { Tooltip };
export default Tooltip;
