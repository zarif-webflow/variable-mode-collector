export const afterWebflowReady = (callback: (value?: unknown) => unknown) => {
  window.Webflow ||= [];
  window.Webflow.push(callback);
};
