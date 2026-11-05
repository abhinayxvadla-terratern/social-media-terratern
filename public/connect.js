/**
 * TerraTern Lead Page Engine - Universal Page Connector Script
 * Version: 1.0.0
 * Embed snippet:
 * <script src="https://your-domain.vercel.app/connect.js" data-page-key="YOUR_PAGE_KEY" async></script>
 */

(function () {
  'use strict';

  // Find script element and configuration
  const currentScript =
    document.currentScript ||
    document.querySelector('script[data-page-key]');

  if (!currentScript) {
    console.warn('[TerraTern] <script data-page-key="..."> tag not detected.');
    return;
  }

  const pageKey = currentScript.getAttribute('data-page-key');
  if (!pageKey) {
    console.warn('[TerraTern] data-page-key attribute is missing.');
    return;
  }

  // Determine API base host from script URL
  const scriptUrl = new URL(currentScript.src, window.location.href);
  const API_HOST = scriptUrl.origin;

  // Persistent visitor ID (stored in localStorage)
  function getVisitorId() {
    const key = 'tt_visitor_id';
    let vid = localStorage.getItem(key);
    if (!vid) {
      vid = 'tt_vis_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
      try {
        localStorage.setItem(key, vid);
      } catch (e) {}
    }
    return vid;
  }

  const visitorId = getVisitorId();

  // Extract UTM and source attribution from URL
  function getUrlAttribution() {
    const params = new URLSearchParams(window.location.search);
    const utm = {};
    const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
    utmKeys.forEach(function (k) {
      const val = params.get(k);
      if (val) utm[k] = val;
    });

    const source = utm.utm_source || params.get('src') || params.get('source') || 'direct';
    const keyword = utm.utm_term || params.get('kw') || params.get('keyword') || null;
    const postId = utm.utm_content || params.get('post_id') || params.get('post') || utm.utm_campaign || null;

    return { source: source, keyword: keyword, post_id: postId, utm: utm };
  }

  const attribution = getUrlAttribution();

  // ---------------------------------------------------------------------------
  // Validation Logic (Shared with Engine)
  // ---------------------------------------------------------------------------
  const DISPOSABLE_DOMAINS = new Set([
    'mailinator.com', 'tempmail.com', '10minutemail.com', 'guerrillamail.com',
    'throwawaymail.com', 'sharklasers.com', 'yopmail.com', 'getairmail.com',
    'temp-mail.org', 'fakeinbox.com', 'dispostable.com', 'trashmail.com'
  ]);

  const EMAIL_TYPO_MAP = {
    'gmial.com': 'gmail.com',
    'gamil.com': 'gmail.com',
    'gmaill.com': 'gmail.com',
    'gmai.com': 'gmail.com',
    'gmal.com': 'gmail.com',
    'yahooo.com': 'yahoo.com',
    'yaho.com': 'yahoo.com',
    'hotmial.com': 'hotmail.com',
    'outlok.com': 'outlook.com',
    'iclod.com': 'icloud.com',
    'redifmail.com': 'rediffmail.com'
  };

  const JUNK_NAMES = new Set([
    'asdf', 'test', 'xxx', 'qwerty', 'foo', 'bar', 'admin', 'user',
    'null', 'undefined', 'fake', 'dummy', 'testing', 'sample', 'na'
  ]);

  const FAKE_PHONES = new Set([
    '9999999999', '8888888888', '7777777777', '6666666666',
    '0000000000', '1111111111', '1234567890', '0123456789', '9876543210'
  ]);

  function validateName(val) {
    if (!val || typeof val !== 'string') return { valid: false, error: 'Full name is required.' };
    const str = val.trim();
    if (str.length < 2 || str.length > 60) return { valid: false, error: 'Name must be 2-60 characters.' };
    if (!/^[a-zA-Z\u00C0-\u024F\s.'-]+$/.test(str)) return { valid: false, error: 'Letters and spaces only.' };
    const uniqueChars = new Set(str.toLowerCase().replace(/[\s.'-]/g, ''));
    if (uniqueChars.size <= 1) return { valid: false, error: 'Please enter your real name.' };
    if (JUNK_NAMES.has(str.toLowerCase())) return { valid: false, error: 'Please enter your real full name.' };
    return { valid: true, value: str };
  }

  function validateEmail(val) {
    if (!val || typeof val !== 'string') return { valid: false, error: 'Email address is required.' };
    const str = val.trim().toLowerCase();
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regex.test(str)) return { valid: false, error: 'Please enter a valid email address.' };
    const parts = str.split('@');
    const domain = parts[1];
    let suggestion = null;
    if (EMAIL_TYPO_MAP[domain]) {
      suggestion = parts[0] + '@' + EMAIL_TYPO_MAP[domain];
    }
    if (DISPOSABLE_DOMAINS.has(domain)) {
      return { valid: false, error: 'Please use a permanent personal or business email.' };
    }
    return { valid: true, value: str, suggestion: suggestion };
  }

  function validatePhone(val, countryCode) {
    if (!val || typeof val !== 'string') return { valid: false, error: 'Phone number is required.' };
    const raw = val.trim();
    const country = (countryCode || 'IN').toUpperCase();

    if (country === 'IN' || raw.startsWith('+91') || (raw.length === 10 && !raw.startsWith('+'))) {
      const digits = raw.replace(/\D/g, '');
      const ten = digits.length === 12 && digits.startsWith('91')
        ? digits.slice(2)
        : digits.length === 11 && digits.startsWith('0')
        ? digits.slice(1)
        : digits;

      if (ten.length !== 10) return { valid: false, error: 'Mobile number must be 10 digits.' };
      if (!/^[6-9]/.test(ten)) return { valid: false, error: 'Mobile number must start with 6, 7, 8, or 9.' };
      if (FAKE_PHONES.has(ten)) return { valid: false, error: 'Please enter a real phone number.' };
      const unique = new Set(ten);
      if (unique.size <= 2) return { valid: false, error: 'Please enter a valid active number.' };
      return { valid: true, e164: '+91' + ten, value: ten };
    }

    const clean = raw.replace(/[^\d+]/g, '');
    if (clean.length < 8 || clean.length > 15) return { valid: false, error: 'Invalid phone number length.' };
    return { valid: true, e164: clean.startsWith('+') ? clean : '+' + clean, value: clean };
  }

  // ---------------------------------------------------------------------------
  // Connector API Core
  // ---------------------------------------------------------------------------
  const TTConnector = {
    pageKey: pageKey,
    visitorId: visitorId,
    apiHost: API_HOST,
    pageConfig: null,

    // Status check
    checkStatus: function () {
      return fetch(API_HOST + '/api/v1/pages/status?key=' + encodeURIComponent(pageKey))
        .then(function (res) { return res.json(); })
        .then(function (data) {
          TTConnector.pageConfig = data;
          if (data && !data.live) {
            TTConnector.handleClosedPage(data);
          }
          return data;
        })
        .catch(function (err) {
          console.error('[TerraTern] Failed to check page status:', err);
        });
    },

    // Handle closed or paused campaigns
    handleClosedPage: function (config) {
      if (config.closed_redirect_url) {
        window.location.href = config.closed_redirect_url;
        return;
      }

      // Display clean modal or banner
      const banner = document.createElement('div');
      banner.id = 'tt-closed-banner';
      banner.style.cssText =
        'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(15,31,110,0.95);' +
        'display:flex;align-items:center;justify-content:center;z-index:999999;padding:20px;font-family:sans-serif;';
      banner.innerHTML =
        '<div style="background:#fff;border-radius:16px;padding:32px;max-width:440px;text-align:center;box-shadow:0 20px 25px -5px rgba(0,0,0,0.1);">' +
        '<div style="width:48px;height:48px;background:#FEE2E2;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">' +
        '<span style="color:#DC2626;font-size:24px;font-weight:bold;">!</span></div>' +
        '<h2 style="margin:0 0 8px;color:#0F1F6E;font-size:20px;font-weight:700;">Assessment Paused</h2>' +
        '<p style="margin:0 0 20px;color:#4B5563;font-size:14px;line-height:1.5;">' +
        (config.closed_message || 'This lead page is temporarily closed for updates.') +
        '</p>' +
        '</div>';
      document.body.appendChild(banner);
    },

    // Track event
    trackEvent: function (type, meta) {
      return fetch(API_HOST + '/api/v1/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page_key: pageKey,
          visitor_id: visitorId,
          type: type,
          meta: meta || {},
        }),
      }).catch(function (e) {
        console.warn('[TerraTern] Event track failed:', e);
      });
    },

    trackStart: function (meta) {
      return TTConnector.trackEvent('start', meta);
    },

    trackAnswer: function (questionNumber, answerMeta) {
      return TTConnector.trackEvent('answer', Object.assign({ question_number: questionNumber }, answerMeta || {}));
    },

    // Track partial lead when user fills phone
    trackPartial: function (data) {
      return fetch(API_HOST + '/api/v1/leads/partial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.assign({
          page_key: pageKey,
          visitor_id: visitorId,
          source: attribution.source,
          keyword: attribution.keyword,
          post_id: attribution.post_id,
          utm: attribution.utm,
        }, data || {})),
      }).then(function (res) { return res.json(); });
    },

    // Complete Lead Submission
    submitLead: function (formData) {
      return fetch(API_HOST + '/api/v1/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.assign({
          page_key: pageKey,
          visitor_id: visitorId,
          source: attribution.source,
          keyword: attribution.keyword,
          post_id: attribution.post_id,
          utm: attribution.utm,
        }, formData || {})),
      }).then(function (res) { return res.json(); });
    },

    // Auto Form Binder with live validation and typo fix
    initForm: function (formSelector, options) {
      const opts = options || {};
      const form = typeof formSelector === 'string'
        ? document.querySelector(formSelector)
        : formSelector;

      if (!form) return;

      const nameInput = form.querySelector('[name="name"]') || form.querySelector('#name');
      const emailInput = form.querySelector('[name="email"]') || form.querySelector('#email');
      const phoneInput = form.querySelector('[name="phone"]') || form.querySelector('#phone');
      const consentInput = form.querySelector('[name="consent"]') || form.querySelector('#consent');
      const submitBtn = form.querySelector('button[type="submit"]') || form.querySelector('[data-tt-submit]');

      // Create inline feedback containers if not present
      function getFeedbackEl(input) {
        let el = input.parentElement.querySelector('.tt-feedback');
        if (!el) {
          el = document.createElement('div');
          el.className = 'tt-feedback';
          el.style.cssText = 'font-size:12px;margin-top:4px;min-height:16px;line-height:1.3;transition:all 0.2s;';
          input.parentElement.appendChild(el);
        }
        return el;
      }

      function updateField(input, valid, message, isSuggestion) {
        const feedback = getFeedbackEl(input);
        if (valid) {
          input.style.borderColor = '#10B981';
          feedback.style.color = '#059669';
          feedback.textContent = message || '';
        } else {
          input.style.borderColor = '#EF4444';
          feedback.style.color = '#DC2626';
          feedback.textContent = message || '';
        }

        if (isSuggestion) {
          feedback.style.color = '#1E3AE2';
          feedback.style.cursor = 'pointer';
          feedback.innerHTML = message;
        }
      }

      function checkAll() {
        const n = validateName(nameInput ? nameInput.value : '');
        const e = validateEmail(emailInput ? emailInput.value : '');
        const p = validatePhone(phoneInput ? phoneInput.value : '', 'IN');
        const c = consentInput ? consentInput.checked : true;

        const allValid = n.valid && e.valid && p.valid && c;
        if (submitBtn) {
          submitBtn.disabled = !allValid;
          submitBtn.style.opacity = allValid ? '1' : '0.6';
          submitBtn.style.cursor = allValid ? 'pointer' : 'not-allowed';
        }
        return allValid;
      }

      // Name listener
      if (nameInput) {
        nameInput.addEventListener('input', function () {
          const res = validateName(nameInput.value);
          if (nameInput.value.length > 1) {
            updateField(nameInput, res.valid, res.error);
          }
          checkAll();
        });
      }

      // Email listener with did-you-mean suggestion
      if (emailInput) {
        emailInput.addEventListener('input', function () {
          const res = validateEmail(emailInput.value);
          if (res.suggestion) {
            updateField(
              emailInput,
              true,
              'Did you mean <strong style="text-decoration:underline;">' + res.suggestion + '</strong>? Click to apply',
              true
            );
            const feedback = getFeedbackEl(emailInput);
            feedback.onclick = function () {
              emailInput.value = res.suggestion;
              updateField(emailInput, true, 'Email corrected.');
              checkAll();
            };
          } else if (emailInput.value.length > 3) {
            updateField(emailInput, res.valid, res.error);
          }
          checkAll();
        });
      }

      // Phone listener with auto partial lead trigger
      if (phoneInput) {
        phoneInput.addEventListener('input', function () {
          const res = validatePhone(phoneInput.value, 'IN');
          if (phoneInput.value.length >= 6) {
            updateField(phoneInput, res.valid, res.error);
          }
          if (res.valid && res.value.length === 10) {
            // Trigger background partial lead capture
            TTConnector.trackPartial({
              name: nameInput ? nameInput.value : 'Visitor',
              phone: res.e164,
            });
          }
          checkAll();
        });
      }

      if (consentInput) {
        consentInput.addEventListener('change', checkAll);
      }

      // Initial check
      checkAll();

      // Form submission
      form.addEventListener('submit', function (evt) {
        evt.preventDefault();
        if (!checkAll()) return;

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.dataset.originalText = submitBtn.textContent;
          submitBtn.textContent = 'Submitting...';
        }

        const nRes = validateName(nameInput ? nameInput.value : '');
        const eRes = validateEmail(emailInput ? emailInput.value : '');
        const pRes = validatePhone(phoneInput ? phoneInput.value : '', 'IN');

        const payload = {
          name: nRes.value,
          email: eRes.value,
          phone: pRes.e164,
          country_code: 'IN',
          consent: true,
          quiz_score: opts.quizScore || null,
          quiz_result: opts.quizResult || null,
        };

        TTConnector.submitLead(payload)
          .then(function (result) {
            if (result.success) {
              if (typeof opts.onSuccess === 'function') {
                opts.onSuccess(result);
              } else {
                form.innerHTML =
                  '<div style="text-align:center;padding:24px;background:#F0FDF4;border:1px solid #BBF7D0;border-radius:12px;">' +
                  '<div style="font-size:24px;margin-bottom:8px;">✅</div>' +
                  '<h3 style="margin:0 0 8px;color:#166534;font-size:18px;font-weight:700;">Submission Received!</h3>' +
                  '<p style="margin:0 0 16px;color:#15803D;font-size:14px;">Our immigration specialists will review your profile shortly.</p>' +
                  (result.download_url
                    ? '<a href="' + result.download_url + '" target="_blank" style="display:inline-block;background:#0F1F6E;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Download Your Guide PDF (10 min link)</a>'
                    : '') +
                  '</div>';
              }
            } else {
              alert(result.error || 'Submission failed. Please try again.');
              if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = submitBtn.dataset.originalText || 'Submit';
              }
            }
          })
          .catch(function (err) {
            alert('A network error occurred. Please check your connection.');
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.textContent = submitBtn.dataset.originalText || 'Submit';
            }
          });
      });
    },
  };

  // Check page status and send view event on load
  TTConnector.checkStatus().then(function (status) {
    if (status && status.live) {
      TTConnector.trackEvent('view', {
        url: window.location.href,
        referrer: document.referrer,
      });
    }
  });

  // Auto-bind form if element with id 'terrateern-lead-form' or data-tt-form is present
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      const autoForm = document.querySelector('#terrateern-lead-form, form[data-tt-form]');
      if (autoForm) TTConnector.initForm(autoForm);
    });
  } else {
    const autoForm = document.querySelector('#terrateern-lead-form, form[data-tt-form]');
    if (autoForm) TTConnector.initForm(autoForm);
  }

  // Export to window
  window.TerraTern = TTConnector;
  window.TTConnector = TTConnector;
})();
