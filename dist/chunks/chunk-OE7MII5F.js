// bin/live-reload.js
new EventSource(`${"http://localhost:3000"}/esbuild`).addEventListener("change", () => location.reload());

// node_modules/.pnpm/@finsweet+ts-utils@0.40.0/node_modules/@finsweet/ts-utils/dist/webflow/getPublishDate.js
var getPublishDate = (page = document) => {
  const publishDatePrefix = "Last Published:";
  for (const node of page.childNodes) {
    if (node.nodeType === Node.COMMENT_NODE && node.textContent?.includes(publishDatePrefix)) {
      const publishDateValue = node.textContent.trim().split(publishDatePrefix)[1];
      if (publishDateValue)
        return new Date(publishDateValue);
    }
  }
};

// src/utils/get-html-element.ts
var getMultipleHtmlElements = ({
  selector,
  parent,
  log = "debug"
}) => {
  const targetElements = Array.from((parent || document).querySelectorAll(selector));
  if (targetElements.length === 0) {
    if (log === false) return null;
    const consoleMethod = log === "debug" ? console.debug : console.error;
    consoleMethod(
      `${log.toUpperCase()}: No elements found with selector "${selector}" in ${parent !== void 0 ? "the specified parent element:" : "the document."}`,
      parent
    );
    return null;
  }
  return targetElements;
};

export {
  getPublishDate,
  getMultipleHtmlElements
};
//# sourceMappingURL=chunk-OE7MII5F.js.map
