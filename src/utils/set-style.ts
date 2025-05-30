import type { Properties as CSSProperties } from "csstype";

/**
 * Sets the styles on an HTML element and returns a function to revert them.
 *
 * @param element - The HTML element to set styles on.
 * @param styles - An object containing CSS properties and values to set.
 * @returns An object with a `revert` method to restore previous styles.
 *
 * @example
 * const revert = setStyle(element, { color: 'red', backgroundColor: 'blue' });
 * // Later, to revert the styles:
 * revert();
 **/
export const setStyle = <TElement extends HTMLElement = HTMLElement>(
  element: TElement,
  styles: CSSProperties
): { revert: () => void } => {
  const prevValues: typeof styles = {};

  for (const key of Object.keys(styles)) {
    // @ts-expect-error guarnateed to be a valid CSS property key
    prevValues[key] = element.style.getPropertyValue(key);
    // @ts-expect-error guarnateed to be a valid CSS property key
    element.style[key] = styles[key] || "";
  }

  return {
    revert: () => {
      Object.assign(element.style, prevValues);
    },
  };
};
