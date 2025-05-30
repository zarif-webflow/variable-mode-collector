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
    data: VariableModes | null;

    /**
     * Flag indicating if the variable modes data is ready
     */
    isReady: boolean;
  }

  /**
   * Event dispatched when variable modes are ready
   */
  interface WfVarModesReadyEvent extends CustomEvent {
    type: "wfVarModesReady";
    detail: { data: VariableModes };
  }

  interface WindowEventMap {
    /**
     * Event fired when Webflow variable modes are ready
     */
    wfVarModesReady: WfVarModesReadyEvent;
  }

  interface Window {
    /**
     * Global Webflow Variable Modes object
     */
    wfVarModes?: WfVarModesObject;
  }

  type VariableModes = Record<string, Record<string, string>>;
}

// This empty export is needed to make this a module
export {};
