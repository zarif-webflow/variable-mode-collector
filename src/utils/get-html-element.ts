/**
 * Configuration options for HTML element selection utilities.
 */
type GetHtmlElementProps = {
  /** CSS selector string to target the desired element(s) */
  selector: string;
  /** Optional parent element to scope the search within. Defaults to document if not provided */
  parent?: HTMLElement;
  /** Logging level for when elements are not found. Set to false to disable logging */
  log?: "debug" | "error" | false;
};

/**
 * Safely retrieves a single HTML element using a CSS selector with optional logging.
 *
 * @template TElement - The specific HTML element type to return (extends HTMLElement)
 * @param options - Configuration object for element selection
 * @param options.selector - CSS selector string to target the desired element
 * @param options.parent - Optional parent element to scope the search within
 * @param options.log - Logging level when element is not found ("debug", "error", or false)
 * @returns The found HTML element cast to the specified type, or null if not found
 *
 * @example
 * ```typescript
 * // Get a button element with error logging
 * const button = getHtmlElement<HTMLButtonElement>({
 *   selector: '.submit-btn',
 *   log: 'error'
 * });
 *
 * // Get an element within a specific parent with debug logging
 * const input = getHtmlElement<HTMLInputElement>({
 *   selector: 'input[type="email"]',
 *   parent: formElement,
 *   log: 'debug'
 * });
 *
 * // Silent mode - no logging
 * const element = getHtmlElement({
 *   selector: '.optional-element',
 *   log: false
 * });
 * ```
 */
export const getHtmlElement = <TElement extends HTMLElement = HTMLElement>({
  selector,
  parent,
  log = "debug",
}: GetHtmlElementProps): TElement | null => {
  const targetElement = (parent || document).querySelector<TElement>(selector);

  if (targetElement === null) {
    if (log === false) return null;
    const consoleMethod = log === "debug" ? console.debug : console.error;
    consoleMethod(
      `${log.toUpperCase()}: Element with selector "${selector}" not found in ${
        parent !== undefined ? "the specified parent element:" : "the document."
      }`,
      parent
    );
    return null;
  }

  return targetElement;
};

/**
 * Safely retrieves multiple HTML elements using a CSS selector with optional logging.
 *
 * @template TElement - The specific HTML element type for array items (extends HTMLElement)
 * @param options - Configuration object for element selection
 * @param options.selector - CSS selector string to target the desired elements
 * @param options.parent - Optional parent element to scope the search within
 * @param options.log - Logging level when no elements are found ("debug", "error", or false)
 * @returns Array of found HTML elements cast to the specified type, or null if none found
 *
 * @example
 * ```typescript
 * // Get all list items with debug logging
 * const listItems = getMultipleHtmlElements<HTMLLIElement>({
 *   selector: 'li.item',
 *   log: 'debug'
 * });
 *
 * // Get all inputs within a form with error logging
 * const inputs = getMultipleHtmlElements<HTMLInputElement>({
 *   selector: 'input',
 *   parent: formElement,
 *   log: 'error'
 * });
 *
 * // Silent mode - no logging when elements not found
 * const buttons = getMultipleHtmlElements<HTMLButtonElement>({
 *   selector: '.action-btn',
 *   log: false
 * });
 * ```
 */
export const getMultipleHtmlElements = <TElement extends HTMLElement = HTMLElement>({
  selector,
  parent,
  log = "debug",
}: GetHtmlElementProps): TElement[] | null => {
  const targetElements = Array.from((parent || document).querySelectorAll<TElement>(selector));

  if (targetElements.length === 0) {
    if (log === false) return null;
    const consoleMethod = log === "debug" ? console.debug : console.error;
    consoleMethod(
      `${log.toUpperCase()}: No elements found with selector "${selector}" in ${
        parent !== undefined ? "the specified parent element:" : "the document."
      }`,
      parent
    );
    return null;
  }

  return targetElements;
};
