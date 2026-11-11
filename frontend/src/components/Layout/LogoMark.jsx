import React, { useId } from 'react';

/**
 * Two overlapping speech bubbles: an "A" in the accent bubble, lines of text in the other.
 * Its colours come from the theme tokens, so it follows light and dark; public/favicon.svg
 * is the same drawing with fixed colours.
 */
const LogoMark = () => {
  const mask = useId();
  return (
    <svg className="logo-mark" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <mask id={mask} maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64">
        <rect width="64" height="64" fill="#fff" />
        {/* A gap between the bubbles: the front one, widened, cut out of the back one. */}
        <path d="M32 25H53A7 7 0 0 1 60 32V45A7 7 0 0 1 53 52V60L45 52H32A7 7 0 0 1 25 45V32A7 7 0 0 1 32 25Z" fill="#000" stroke="#000" strokeWidth="6" strokeLinejoin="round" />
      </mask>
      <path className="logo-mark-back" mask={`url(#${mask})`} d="M11 6H33A7 7 0 0 1 40 13V27A7 7 0 0 1 33 34H20L11 42V34A7 7 0 0 1 4 27V13A7 7 0 0 1 11 6Z" />
      <path className="logo-mark-letter" fillRule="evenodd" d="M7.5 27L12.5 10H15.5L20.5 27H17.3L16.2 23.2H11.8L10.7 27ZM12.6 20.4H15.4L14 15.2Z" />
      <path className="logo-mark-front" d="M32 25H53A7 7 0 0 1 60 32V45A7 7 0 0 1 53 52V60L45 52H32A7 7 0 0 1 25 45V32A7 7 0 0 1 32 25Z" />
      <path className="logo-mark-lines" d="M31 32H54V35.5H31ZM31 38H47V41.5H31ZM31 44H51V47.5H31Z" />
    </svg>
  );
};

export default LogoMark;
