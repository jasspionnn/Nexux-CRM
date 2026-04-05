/**
 * Nexus CRM Site Tracking Snippet
 * 
 * This script is injected into customer websites and tracks:
 * - Pageviews (automatic)
 * - Form submissions (automatic detection)
 * - Conversions (manual via NexuxTracker.track())
 * 
 * Usage:
 * <script>
 *   (function() {
 *     var t='YOUR_TRACKING_ID';
 *     var e='https://your-nexus-crm.com';
 *     var s=document.createElement('script');
 *     s.src=e+'/tracker.js';
 *     s.onload=function(){NexuxTracker.init(t,e)};
 *     document.head.appendChild(s);
 *   })();
 * </script>
 */

(function(window) {
  'use strict';

  var NexuxTracker = {
    trackingId: null,
    baseUrl: null,
    visitorId: null,
    initialized: false,

    /**
     * Initialize the tracker
     * @param {string} trackingId - Unique tracking ID for the account
     * @param {string} baseUrl - Base URL of the Nexus CRM instance
     */
    init: function(trackingId, baseUrl) {
      if (this.initialized) return;
      
      this.trackingId = trackingId;
      this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
      this.visitorId = this._generateVisitorId();
      this.initialized = true;

      // Track pageview automatically
      this._trackPageview();

      // Setup form tracking
      this._setupFormTracking();

      // Track page unload
      this._setupPageUnload();

      console.log('[NexusTracker] Initialized with ID:', trackingId);
    },

    /**
     * Manually track a conversion event
     * @param {string} eventName - Name of the conversion event
     * @param {Object} data - Additional data about the conversion
     */
    track: function(eventName, data) {
      if (!this.initialized) {
        console.warn('[NexusTracker] Not initialized. Call NexuxTracker.init() first.');
        return;
      }

      this._sendEvent('conversion', {
        event_name: eventName,
        url: window.location.href,
        referrer: document.referrer || null,
        visitor_id: this.visitorId,
        conversion_data: data || null
      });
    },

    /**
     * Track a custom event
     * @param {string} eventType - Type of event (pageview, form, conversion)
     * @param {Object} data - Event data
     */
    _sendEvent: function(eventType, data) {
      var payload = {
        tracking_id: this.trackingId,
        event_type: eventType,
        visitor_id: this.visitorId,
        url: data.url || window.location.href,
        referrer: data.referrer || document.referrer || null,
        form_data: data.form_data || data.conversion_data || null,
        timestamp: new Date().toISOString()
      };

      // Use sendBeacon for better reliability on page unload, fallback to fetch
      if (navigator.sendBeacon && eventType === 'pageview') {
        var blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        navigator.sendBeacon(this.baseUrl + '/api/tracking/events', blob);
      } else {
        if (typeof fetch !== 'undefined') {
          fetch(this.baseUrl + '/api/tracking/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            keepalive: true
          }).catch(function(err) {
            console.warn('[NexusTracker] Failed to send event:', err);
          });
        }
      }
    },

    /**
     * Track pageview
     * @private
     */
    _trackPageview: function() {
      this._sendEvent('pageview', {
        url: window.location.href,
        referrer: document.referrer || null,
        page_title: document.title
      });
    },

    /**
     * Setup automatic form submission tracking
     * @private
     */
    _setupFormTracking: function() {
      var self = this;

      // Track form submissions
      if (document.addEventListener) {
        document.addEventListener('submit', function(e) {
          var form = e.target;
          if (!form || form.tagName !== 'FORM') return;

          // Collect form data
          var formData = {};
          var formElements = form.elements;
          
          for (var i = 0; i < formElements.length; i++) {
            var element = formElements[i];
            if (element.name && element.type !== 'submit' && element.type !== 'button') {
              if (element.type === 'checkbox' || element.type === 'radio') {
                if (element.checked) {
                  formData[element.name] = element.value;
                }
              } else {
                formData[element.name] = element.value;
              }
            }
          }

          // Track form submission
          self._sendEvent('form', {
            url: window.location.href,
            referrer: document.referrer || null,
            form_data: {
              form_id: form.id || 'unknown',
              form_action: form.action || null,
              form_method: form.method || 'GET',
              fields: formData
            }
          });
        }, true);
      }
    },

    /**
     * Track page unload (for analytics)
     * @private
     */
    _setupPageUnload: function() {
      var self = this;
      if (window.addEventListener) {
        window.addEventListener('beforeunload', function() {
          // Send a final pageview event before unload
          self._sendEvent('pageview', {
            url: window.location.href,
            referrer: document.referrer || null,
            page_title: document.title,
            is_unload: true
          });
        });
      }
    },

    /**
     * Generate a unique visitor ID (stored in sessionStorage)
     * @private
     * @returns {string}
     */
    _generateVisitorId: function() {
      var id = sessionStorage.getItem('nexus_visitor_id');
      if (!id) {
        id = 'vis_' + Math.random().toString(36).substring(2, 15) + 
             Date.now().toString(36);
        sessionStorage.setItem('nexus_visitor_id', id);
      }
      return id;
    }
  };

  // Expose to global scope
  window.NexuxTracker = NexuxTracker;

})(window);
