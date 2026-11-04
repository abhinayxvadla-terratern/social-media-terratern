/**
 * TerraTern Lead Page Engine - Embed Script
 * Usage:
 * <script src="https://your-domain.vercel.app/embed.js" data-page-key="..." data-slug="..." async></script>
 * <div id="terrateern-lead-engine" data-slug="..."></div>
 */
(function() {
  'use strict';

  function initTerraTernEngine() {
    const scripts = document.querySelectorAll('script[data-page-key]');
    const targetScript = scripts[scripts.length - 1];
    if (!targetScript) return;

    const pageKey = targetScript.getAttribute('data-page-key');
    const slug = targetScript.getAttribute('data-slug');
    const targetEl = document.getElementById('terrateern-lead-engine') || 
                     document.querySelector(`[data-slug="${slug}"]`);

    if (!targetEl) {
      console.warn('[TerraTern] Target mount container #terrateern-lead-engine not found.');
      return;
    }

    console.log(`[TerraTern] Lead Engine initialized for slug: "${slug}" (key: ${pageKey ? pageKey.slice(0, 8) + '...' : 'none'})`);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTerraTernEngine);
  } else {
    initTerraTernEngine();
  }
})();
