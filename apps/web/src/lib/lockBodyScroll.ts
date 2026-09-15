/**
 * iOS Safari ignores overflow:hidden on body unless the body is position:fixed.
 * Also restores the pre-lock scroll offset so opening a modal after scrolling
 * does not jump the page (the listing "Message Host" glitch).
 */
export function lockBodyScroll(): () => void {
  if (typeof document === 'undefined') return () => {};

  const html = document.documentElement;
  const { body } = document;
  const scrollY = window.scrollY;
  const prev = {
    htmlOverflow: html.style.overflow,
    htmlOverscroll: html.style.overscrollBehavior,
    bodyOverflow: body.style.overflow,
    bodyPosition: body.style.position,
    bodyTop: body.style.top,
    bodyLeft: body.style.left,
    bodyRight: body.style.right,
    bodyWidth: body.style.width,
    bodyOverscroll: body.style.overscrollBehavior,
  };

  html.style.overflow = 'hidden';
  html.style.overscrollBehavior = 'none';
  body.style.overflow = 'hidden';
  body.style.overscrollBehavior = 'none';
  body.style.position = 'fixed';
  body.style.top = `-${scrollY}px`;
  body.style.left = '0';
  body.style.right = '0';
  body.style.width = '100%';

  return () => {
    html.style.overflow = prev.htmlOverflow;
    html.style.overscrollBehavior = prev.htmlOverscroll;
    body.style.overflow = prev.bodyOverflow;
    body.style.position = prev.bodyPosition;
    body.style.top = prev.bodyTop;
    body.style.left = prev.bodyLeft;
    body.style.right = prev.bodyRight;
    body.style.width = prev.bodyWidth;
    body.style.overscrollBehavior = prev.bodyOverscroll;
    window.scrollTo(0, scrollY);
  };
}
