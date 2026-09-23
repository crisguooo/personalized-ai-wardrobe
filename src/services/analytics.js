/** Provider-neutral, local-only event records. No network telemetry. */
export const event = (name, properties = {}) => ({
  name,
  properties,
  timestamp: new Date().toISOString(),
});
export const appendEvents = (state, ...events) => ({
  ...state,
  events: [...state.events, ...events].slice(-500),
});
