/**
 * Accessibility utility functions
 */

/**
 * Announce a message to screen readers using an ARIA live region
 * @param {string} message - The message to announce
 * @param {string} priority - The priority level ('polite' or 'assertive')
 */
export const announceToScreenReader = (message, priority = 'polite') => {
  // Find or create the live region element
  let liveRegion = document.getElementById(`sr-live-${priority}`);
  
  if (!liveRegion) {
    liveRegion = document.createElement('div');
    liveRegion.id = `sr-live-${priority}`;
    liveRegion.setAttribute('aria-live', priority);
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only';
    document.body.appendChild(liveRegion);
  }
  
  // Update the content to trigger announcement
  liveRegion.textContent = '';
  // Use setTimeout to ensure the DOM update is recognized as a change
  setTimeout(() => {
    liveRegion.textContent = message;
  }, 50);
};

/**
 * Create a unique ID for ARIA attributes
 * @param {string} prefix - Prefix for the ID
 * @returns {string} - Unique ID
 */
export const createAriaId = (prefix) => {
  return `${prefix}-${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Handle keyboard navigation for a list of items
 * @param {Event} event - The keyboard event
 * @param {number} currentIndex - The current focused index
 * @param {number} maxIndex - The maximum index (list length - 1)
 * @param {Function} setIndex - Function to update the index
 * @param {Object} options - Additional options
 */
export const handleListKeyboardNavigation = (
  event,
  currentIndex,
  maxIndex,
  setIndex,
  options = { wrap: true, horizontal: false }
) => {
  const { wrap, horizontal } = options;
  
  // Determine which keys to use based on orientation
  const nextKey = horizontal ? 'ArrowRight' : 'ArrowDown';
  const prevKey = horizontal ? 'ArrowLeft' : 'ArrowUp';
  
  switch (event.key) {
    case nextKey:
      event.preventDefault();
      if (currentIndex < maxIndex) {
        setIndex(currentIndex + 1);
      } else if (wrap) {
        setIndex(0);
      }
      break;
    case prevKey:
      event.preventDefault();
      if (currentIndex > 0) {
        setIndex(currentIndex - 1);
      } else if (wrap) {
        setIndex(maxIndex);
      }
      break;
    case 'Home':
      event.preventDefault();
      setIndex(0);
      break;
    case 'End':
      event.preventDefault();
      setIndex(maxIndex);
      break;
    default:
      break;
  }
};

/**
 * Focus trap for modal dialogs
 * @param {HTMLElement} container - The container element to trap focus within
 * @returns {Function} - Cleanup function to remove event listeners
 */
export const createFocusTrap = (container) => {
  if (!container) return () => {};
  
  const focusableElements = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  
  if (focusableElements.length === 0) return () => {};
  
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];
  
  // Focus the first element when trap is created
  firstElement.focus();
  
  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      // Shift + Tab
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } 
      // Tab
      else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    }
  };
  
  document.addEventListener('keydown', handleKeyDown);
  
  // Return cleanup function
  return () => {
    document.removeEventListener('keydown', handleKeyDown);
  };
};