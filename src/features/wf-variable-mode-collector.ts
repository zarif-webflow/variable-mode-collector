import { getWfPublishDate } from '../utils/get-wf-publish-date';

/**
 * Extracts CSS custom properties (variables) applied to multiple elements from their classes.
 * This function assumes each element has exactly one class that contains all its styling.
 * Only extracts properties that start with '--' (CSS variables).
 * The stylesheet is only parsed once for efficiency.
 *
 * @param elements Array of target HTML elements
 * @returns A Map associating each element with its CSS custom properties
 */
function extractCssCustomProperties(
  elements: HTMLElement[]
): Map<HTMLElement, Record<string, string>> {
  // Initialize result map
  const result = new Map<HTMLElement, Record<string, string>>();

  // Find the first loaded stylesheet
  const firstStylesheet = document.styleSheets[0];
  if (!firstStylesheet) {
    // Return empty map if no stylesheets
    return result;
  }

  // Create a map to store class-to-CSS-properties mapping
  const classRulesMap = new Map<string, Record<string, string>>();

  try {
    // Parse the stylesheet once
    const cssRules = firstStylesheet.cssRules || firstStylesheet.rules;

    // Process each element
    for (const element of elements) {
      // Set default empty object for this element
      const elementRules: Record<string, string> = {};
      result.set(element, elementRules);

      // Skip elements without classes
      if (!element.classList.length) {
        continue;
      }

      const className = element.classList[0]!; // Get the first class

      // Check if we've already processed this class
      if (classRulesMap.has(className)) {
        // Reuse the cached rules
        result.set(element, { ...classRulesMap.get(className)! });
        continue;
      }

      // Find the rule for this class
      for (let i = 0; i < cssRules.length; i++) {
        const rule = cssRules[i];

        // Check if this is a style rule and matches our class
        if (rule instanceof CSSStyleRule && rule.selectorText === `.${className}`) {
          // Extract custom properties from the matching rule
          const style = rule.style;
          for (let j = 0; j < style.length; j++) {
            const propertyName = style[j]!;
            // Only include properties that start with -- (CSS variables)
            if (propertyName.startsWith('--')) {
              const propertyValue = style.getPropertyValue(propertyName).trim();
              if (propertyValue) {
                elementRules[propertyName] = propertyValue;
              }
            }
          }

          // Cache the rules for this class
          classRulesMap.set(className, { ...elementRules });
          break; // Stop after finding the first matching rule
        }
      }
    }
  } catch (e) {
    // CORS restrictions can cause security errors when accessing cross-origin stylesheets
    console.warn('Could not access stylesheet rules:', e);
  }

  return result;
}

// Cache interface
interface CachedVariableModes {
  publishDate: string;
  data: VariableModes;
}

const CACHE_KEY = 'webflow-variable-modes-cache';

// Global interface for wfVarModes
interface WfVarModesObject {
  data: VariableModes | null;
  isReady: boolean;
  onReady: (callback: (data: VariableModes) => void) => void;
}

// Initialize global object
declare global {
  interface Window {
    wfVarModes: WfVarModesObject;
  }
}

// Initialize the global object
window.wfVarModes = {
  data: null,
  isReady: false,
  onReady(callback) {
    if (this.isReady && this.data) {
      // If data is already loaded, execute callback immediately
      setTimeout(() => callback(this.data!), 0);
    } else {
      // Otherwise, add event listener
      window.addEventListener('wfVarModesReady', () => callback(this.data!));
    }
  },
};

const extractWebflowVariableModes = (): VariableModes => {
  // Get the current site publish date
  const currentPublishDate = getWfPublishDate();
  const publishDateString = currentPublishDate?.toISOString() || '';

  // Try to get cached data
  try {
    const cachedData = localStorage.getItem(CACHE_KEY);

    if (cachedData && currentPublishDate) {
      const parsedCache = JSON.parse(cachedData) as CachedVariableModes;

      // If the publish date matches, use cached data
      if (parsedCache.publishDate === publishDateString) {
        console.log('Using cached variable modes from', publishDateString);
        return parsedCache.data;
      }
    }
  } catch (e) {
    console.warn('Error accessing localStorage cache:', e);
  }

  // If no cache or invalid cache, calculate fresh data
  console.log('Calculating fresh variable modes data');

  const variableModeElements = Array.from(
    document.querySelectorAll<HTMLElement>('[data-variable-mode]')
  );

  const result = extractCssCustomProperties(variableModeElements);

  const variableModes: VariableModes = {};

  for (const variableModeElement of variableModeElements) {
    const modeName = variableModeElement.dataset.variableMode;
    if (!modeName) continue;

    const variables = result.get(variableModeElement);
    if (!variables) continue;
    variableModes[modeName] = variables;
  }

  // Cache the result with current publish date
  if (currentPublishDate) {
    try {
      const cacheData: CachedVariableModes = {
        publishDate: publishDateString,
        data: variableModes,
      };

      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (e) {
      console.warn('Error caching variable modes:', e);
    }
  }

  return variableModes;
};

// Initialize variable modes and dispatch event
const initWfVarModes = (): void => {
  // Extract the variable modes
  const variableModes = extractWebflowVariableModes();

  // Update the global object
  window.wfVarModes.data = variableModes;
  window.wfVarModes.isReady = true;

  // Dispatch the ready event
  window.dispatchEvent(new CustomEvent('wfVarModesReady'));

  console.log('WF Variable Modes ready:', variableModes);
};

// Run initialization
initWfVarModes();
