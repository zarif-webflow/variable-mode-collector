declare global {
  /**
   * Webflow Variable Modes
   * Contains CSS custom properties for different variable modes defined in Webflow
   */
  interface WfVarModesObject {
    /**
     * Variable modes data extracted from CSS
     * Key is the mode name (from data-variable-mode attribute)
     * Value is an object mapping CSS custom properties to their values
     */
    data: Record<string, Record<string, string>> | null;

    /**
     * Flag indicating if the variable modes data is ready
     */
    isReady: boolean;

    /**
     * Register a callback to be executed when variable modes data is ready
     * If data is already ready, the callback will be executed immediately
     * @param callback Function to call when data is ready
     */
    onReady: (callback: (data: Record<string, Record<string, string>>) => void) => void;
  }

  interface Window {
    /**
     * Global Webflow Variable Modes object
     */
    wfVarModes: WfVarModesObject;
  }

  type VariableModes = Record<string, Record<string, string>>;
}

// This empty export is needed to make this a module
export {};
