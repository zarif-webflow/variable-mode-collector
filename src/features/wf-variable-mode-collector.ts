import { getPublishDate as getWfPublishDate } from "@finsweet/ts-utils";

/**
 * Extracts CSS custom properties (variables) applied to multiple elements from their classes.
 * This function assumes each element has exactly one class that contains all its styling.
 * Only extracts properties that start with '--' (CSS variables).
 * The stylesheet is fetched and parsed once for efficiency.
 *
 * @param elements Array of target HTML elements
 * @returns A Promise resolving to a Map associating each element with its CSS custom properties
 */
async function extractCssCustomProperties(
  elements: HTMLElement[]
): Promise<Map<HTMLElement, Record<string, string>>> {
  // Initialize result map
  const result = new Map<HTMLElement, Record<string, string>>();

  // Find the first loaded stylesheet
  const firstStylesheet = document.styleSheets[0];
  if (!firstStylesheet || !firstStylesheet.href) {
    // Return empty map if no stylesheets or no href
    return result;
  }

  // Create a map to store class-to-CSS-properties mapping
  const classRulesMap = new Map<string, Record<string, string>>();

  try {
    // Fetch the stylesheet directly instead of accessing through DOM
    const stylesheetUrl = firstStylesheet.href;
    const response = await fetch(stylesheetUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch stylesheet: ${response.status} ${response.statusText}`);
    }

    const cssText = await response.text();

    // Parse the CSS text using regex to find class selectors and their properties
    const classRegex = /\.([^\s{,:]+)\s*{([^}]*)}/g;
    let match;

    while ((match = classRegex.exec(cssText)) !== null) {
      const className = match[1];
      const styleBlock = match[2];

      if (!className || !styleBlock) continue;

      // Extract CSS variables
      const variableRegex = /(--[^:]+):\s*([^;]+);/g;
      let varMatch;
      const customProps: Record<string, string> = {};

      while ((varMatch = variableRegex.exec(styleBlock)) !== null) {
        const propName = varMatch[1]!.trim();
        const propValue = varMatch[2]!.trim();
        customProps[propName] = propValue;
      }

      // Store the results in the class map if any CSS variables were found
      if (Object.keys(customProps).length > 0) {
        classRulesMap.set(className, customProps);
      }
    }

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
      }
    }
  } catch (e) {
    console.error("Error fetching or parsing stylesheet:", e);
  }

  return result;
}

// Cache interface
interface CachedVariableModes {
  publishDate: string;
  data: VariableModes;
}

const CACHE_KEY = "webflow-variable-modes-cache";

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
      window.addEventListener("wfVarModesReady", () => callback(this.data!));
    }
  },
};

const extractWebflowVariableModes = async (): Promise<VariableModes> => {
  // Get the current site publish date
  const currentPublishDate = getWfPublishDate();
  const publishDateString = currentPublishDate?.toISOString() || "";

  // Try to get cached data
  try {
    const cachedData = localStorage.getItem(CACHE_KEY);

    if (cachedData && currentPublishDate) {
      const parsedCache = JSON.parse(cachedData) as CachedVariableModes;

      // If the publish date matches, use cached data
      if (parsedCache.publishDate === publishDateString) {
        console.debug("Using cached variable modes from", publishDateString);
        return parsedCache.data;
      }
    }
  } catch (e) {
    console.error("Error accessing localStorage cache:", e);
  }

  // If no cache or invalid cache, calculate fresh data
  console.debug("Calculating fresh variable modes data");

  const variableModeElements = Array.from(
    document.querySelectorAll<HTMLElement>("[data-variable-mode]")
  );

  // Await the async extraction function
  const result = await extractCssCustomProperties(variableModeElements);

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
      console.error("Error caching variable modes:", e);
    }
  }

  return variableModes;
};

// Initialize variable modes and dispatch event
const initWfVarModes = async (): Promise<void> => {
  // Extract the variable modes (await the async function)
  const variableModes = await extractWebflowVariableModes();

  // Update the global object
  window.wfVarModes.data = variableModes;
  window.wfVarModes.isReady = true;

  // Dispatch the ready event
  window.dispatchEvent(new CustomEvent("wfVarModesReady"));

  console.debug("WF Variable Modes ready:", variableModes);
};

// Run initialization asynchronously
(async () => {
  await initWfVarModes();
})();
