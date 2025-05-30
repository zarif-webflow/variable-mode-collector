import { getPublishDate as getWfPublishDate } from "@finsweet/ts-utils";

import { getMultipleHtmlElements } from "@/utils/get-html-element";

// Type definitions
type VariableModes = Record<string, Record<string, string>>;

interface CachedVariableModes {
  publishDate: string;
  data: VariableModes;
}

// Worker message types
interface WorkerFetchStylesheetRequest {
  type: "fetchStylesheet";
  url: string;
}

interface WorkerFetchStylesheetResponse {
  type: "stylesheetProcessed";
  classRulesMap: Record<string, Record<string, string>>;
  error?: string;
}

const CACHE_KEY = "webflow-variable-modes-cache";

// Create a worker from a function
function createWorker(fn: () => void): Worker {
  const blob = new Blob([`(${fn.toString()})()`], { type: "application/javascript" });
  const url = URL.createObjectURL(blob);
  const worker = new Worker(url);

  // Clean up the URL
  URL.revokeObjectURL(url);

  return worker;
}

// Worker function that will be converted to a string
function cssWorkerFunction() {
  // Set up worker message handler
  self.addEventListener("message", async (event) => {
    const msg = event.data;

    if (msg.type === "fetchStylesheet") {
      try {
        // Fetch the stylesheet
        const response = await fetch(msg.url);

        if (!response.ok) {
          throw new Error(`Failed to fetch stylesheet: ${response.status} ${response.statusText}`);
        }

        const cssText = await response.text();

        // Parse the CSS text to find class selectors and their properties
        const classRegex = /\.([^\s{,:]+)\s*{([^}]*)}/g;
        const classRulesMap: Record<string, Record<string, string>> = {};

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
            const propName = varMatch[1].trim();
            const propValue = varMatch[2].trim();
            customProps[propName] = propValue;
          }

          // Store the results if any CSS variables were found
          if (Object.keys(customProps).length > 0) {
            classRulesMap[className] = customProps;
          }
        }

        // Send the results back to the main thread
        self.postMessage({
          type: "stylesheetProcessed",
          classRulesMap,
        });
      } catch (e) {
        self.postMessage({
          type: "stylesheetProcessed",
          classRulesMap: {},
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }
  });
}

/**
 * Extracts CSS custom properties using a web worker to avoid blocking the main thread.
 */
async function extractCssCustomProperties(
  elements: HTMLElement[]
): Promise<Map<HTMLElement, Record<string, string>>> {
  // Initialize result map
  const result = new Map<HTMLElement, Record<string, string>>();

  // Find the first loaded stylesheet
  const firstStylesheet = document.styleSheets[0];
  if (!firstStylesheet || !firstStylesheet.href) {
    return result;
  }

  // Get all class names from elements for efficient processing
  const elementClassMap = new Map<string, HTMLElement[]>();

  for (const element of elements) {
    if (!element.classList.length) {
      result.set(element, {});
      continue;
    }

    const className = element.classList[0]!;

    if (!elementClassMap.has(className)) {
      elementClassMap.set(className, []);
    }

    elementClassMap.get(className)!.push(element);
  }

  // Create worker and set up message handling
  const worker = createWorker(cssWorkerFunction);

  try {
    // Process the stylesheet in the worker
    const classRulesMap = await new Promise<Record<string, Record<string, string>>>(
      (resolve, reject) => {
        worker.onmessage = (event) => {
          const response = event.data as WorkerFetchStylesheetResponse;

          if (response.type === "stylesheetProcessed") {
            if (response.error) {
              reject(new Error(response.error));
            } else {
              resolve(response.classRulesMap);
            }
          }
        };

        worker.onerror = (error) => {
          reject(new Error(`Worker error: ${error.message}`));
        };

        // Send request to worker
        worker.postMessage({
          type: "fetchStylesheet",
          url: firstStylesheet.href,
        } as WorkerFetchStylesheetRequest);
      }
    );

    // Map the results back to the elements
    for (const [className, matchingElements] of elementClassMap.entries()) {
      const cssProps = classRulesMap[className] || {};

      for (const element of matchingElements) {
        result.set(element, { ...cssProps });
      }
    }
  } catch (e) {
    console.error("Error in worker processing:", e);
  } finally {
    // Always terminate the worker
    worker.terminate();
  }

  return result;
}

/**
 * Extracts Webflow variable modes from elements with data-variable-mode attribute.
 * Uses caching based on the site's publish date.
 */
const extractWebflowVariableModes = async (): Promise<VariableModes | null> => {
  // Get the current site publish date
  const currentPublishDate = getWfPublishDate();
  const publishDateString = currentPublishDate?.toISOString() || "";

  // Try to get cached data
  try {
    const cachedData = localStorage.getItem(CACHE_KEY) || null;

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

  const variableModeElements = getMultipleHtmlElements({ selector: "[data-variable-mode]" });

  if (!variableModeElements) return null;

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

// Initialize the global object
window.wfVarModes = {
  data: null,
  isReady: false,
};

// Initialize variable modes and dispatch event
const initWfVarModes = async (): Promise<void> => {
  // Extract the variable modes (await the async function)
  const variableModes = await extractWebflowVariableModes();

  if (!variableModes) {
    console.error(
      "No injected variable modes found with [data-variable-mode] or extraction failed."
    );
    return;
  }

  // Update the global object
  if (!window.wfVarModes) return;

  window.wfVarModes.data = variableModes;
  window.wfVarModes.isReady = true;

  // Dispatch the ready event with data
  window.dispatchEvent(
    new CustomEvent("wfVarModesReady", {
      detail: { data: variableModes },
    })
  );

  console.debug("WF Variable Modes ready:", variableModes);
};

// Run initialization asynchronously
(async () => {
  await initWfVarModes();
})();
