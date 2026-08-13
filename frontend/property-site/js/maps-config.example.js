/**
 * Copy to maps-config.js for local/deployed use. The browser key is public by
 * design, but it must be restricted to approved website referrers and the Maps
 * JavaScript API in Google Cloud.
 */
window.ALTUS_MAPS_CONFIG = Object.freeze({
  apiKey: 'YOUR_BROWSER_RESTRICTED_MAPS_JAVASCRIPT_API_KEY',
  mapId: 'YOUR_GOOGLE_MAP_ID',
});
