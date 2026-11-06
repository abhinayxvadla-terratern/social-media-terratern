/**
 * TerraTern Lead Page Engine - Universal Page Connector Script
 * Version: 2.1.0
 * Embed snippet:
 * <script src="https://your-domain.vercel.app/connect.js" data-page-key="YOUR_PAGE_KEY" async></script>
 */

(function () {
  'use strict';

  // Find script element and configuration
  const currentScript =
    document.currentScript ||
    document.querySelector('script[data-page-key]');

  const pageKey =
    (currentScript ? currentScript.getAttribute('data-page-key') : null) ||
    (typeof window !== 'undefined' ? window.__TT_PAGE_KEY__ : null);

  if (!pageKey) {
    console.warn('[TerraTern] data-page-key or window.__TT_PAGE_KEY__ is missing.');
    return;
  }

  // Determine API base host from script URL or page global
  let API_HOST = '';
  if (typeof window !== 'undefined' && window.__TT_API_HOST__) {
    API_HOST = window.__TT_API_HOST__;
  } else if (currentScript && currentScript.src && currentScript.src.startsWith('http')) {
    try {
      API_HOST = new URL(currentScript.src).origin;
    } catch (e) {
      API_HOST = '';
    }
  } else if (typeof window !== 'undefined' && window.location.origin && window.location.origin !== 'null' && !window.location.origin.startsWith('about:')) {
    API_HOST = window.location.origin;
  }

  // Persistent visitor ID (stored in localStorage)
  function getVisitorId() {
    const key = 'tt_visitor_id';
    let vid = null;
    try {
      vid = localStorage.getItem(key);
      if (!vid) {
        vid = 'tt_vis_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
        localStorage.setItem(key, vid);
      }
    } catch (e) {
      vid = 'tt_vis_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
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

  // Active Attached Download URL (Supabase Signed URL for page asset)
  let activeDownloadUrl =
    (typeof window !== 'undefined' && window.__TT_DOWNLOAD_URL__) ? window.__TT_DOWNLOAD_URL__ : null;

  // Track submission state to avoid duplicate submissions
  let lastSubmittedFingerprint = '';
  let isSubmittingLead = false;

  // ---------------------------------------------------------------------------
  // Validation Logic
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
    if (!val || (typeof val !== 'string' && typeof val !== 'number')) return { valid: false, error: 'Phone number is required.' };
    const raw = String(val).trim();
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
  // Download Asset Action Handler
  // ---------------------------------------------------------------------------
  function triggerAssetDownload(urlOverride) {
    let url = urlOverride || activeDownloadUrl || (typeof window !== 'undefined' ? window.__TT_DOWNLOAD_URL__ : null);
    if (!url && pageKey) {
      url = '/api/v1/download?key=' + encodeURIComponent(pageKey);
    }
    if (!url) {
      console.warn('[TerraTern] No attached PDF asset URL available.');
      return false;
    }

    if (url.startsWith('/')) {
      url = (API_HOST || '') + url;
    }

    TTConnector.trackEvent('download', {
      source: 'auto_connector',
      url: url,
    });

    const docName = (TTConnector.pageConfig && TTConnector.pageConfig.pdf_name)
      ? (TTConnector.pageConfig.pdf_name.replace(/[^a-zA-Z0-9_-]/g, '_') + '.pdf')
      : 'TerraTern-Guide.pdf';

    const a = document.createElement('a');
    a.href = url;
    a.download = docName;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      if (a.parentNode) a.parentNode.removeChild(a);
    }, 1000);
    return true;
  }

  function isDownloadElement(el) {
    if (!el) return false;
    const tag = el.tagName ? el.tagName.toLowerCase() : '';
    const id = (el.id || '').toLowerCase();
    const cls = (el.className || '').toString().toLowerCase();
    const text = (el.textContent || el.value || '').toLowerCase().trim();
    const onclickAttr = (el.getAttribute('onclick') || '').toLowerCase();

    // Specific IDs & classes used in templates and custom code
    if (id === 'dl-btn' || id === 'download-guide' || id === 'download-pdf' || id === 'btn-download') return true;
    if (id.includes('download') || cls.includes('download')) return true;

    // Attributes indicating PDF/Download action
    if (el.hasAttribute('data-tt-download')) return true;
    if (onclickAttr.includes('makepdf') || onclickAttr.includes('generatepdf') || onclickAttr.includes('download')) return true;

    // Check text content
    if (/download\s+(my\s+)?(report|pdf|guide|roadmap|assessment|profile)|get\s+(my\s+)?(report|pdf|guide)|save\s+as\s+pdf/i.test(text)) {
      return true;
    }

    if (tag === 'a' && el.getAttribute('href') && (el.getAttribute('href').endsWith('.pdf') || el.hasAttribute('download'))) {
      return true;
    }

    return false;
  }

  // ---------------------------------------------------------------------------
  // Connector API Core
  // ---------------------------------------------------------------------------
  const TTConnector = {
    pageKey: pageKey,
    visitorId: visitorId,
    apiHost: API_HOST,
    pageConfig: null,
    downloadUrl: activeDownloadUrl,

    // Status check
    checkStatus: function () {
      // In preview mode inside Page Studio editor, preview is always live
      if (typeof window !== 'undefined' && (window.__TT_PREVIEW_MODE__ || pageKey === 'pk_preview_live' || (pageKey && pageKey.startsWith('pk_preview')))) {
        return Promise.resolve({ live: true, status: 'live' });
      }

      return fetch(API_HOST + '/api/v1/pages/status?key=' + encodeURIComponent(pageKey))
        .then(function (res) { return res.json(); })
        .then(function (data) {
          TTConnector.pageConfig = data;
          if (data && data.pdf_download_url) {
            activeDownloadUrl = data.pdf_download_url;
            TTConnector.downloadUrl = data.pdf_download_url;
            if (typeof window !== 'undefined') {
              window.__TT_DOWNLOAD_URL__ = data.pdf_download_url;
            }
          }
          // Only show closed banner if page was found in database and explicitly marked not live
          if (data && !data.error && data.live === false) {
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
      }).then(function (res) { return res.json(); }).catch(function () {});
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
      })
        .then(function (res) { return res.json(); })
        .then(function (result) {
          if (result && result.download_url) {
            activeDownloadUrl = result.download_url;
            TTConnector.downloadUrl = result.download_url;
            if (typeof window !== 'undefined') {
              window.__TT_DOWNLOAD_URL__ = result.download_url;
            }
          }
          return result;
        });
    },

    triggerDownload: triggerAssetDownload,

    // Auto Form Binder with live validation and typo fix
    initForm: function (formSelector, options) {
      const opts = options || {};
      const form = typeof formSelector === 'string'
        ? document.querySelector(formSelector)
        : formSelector;

      if (!form) return;

      const nameInput = form.querySelector('[name="name"]') || form.querySelector('#name') || form.querySelector('#f-name');
      const emailInput = form.querySelector('[name="email"]') || form.querySelector('#email') || form.querySelector('#f-email');
      const phoneInput = form.querySelector('[name="phone"]') || form.querySelector('#phone') || form.querySelector('#f-phone');
      const consentInput = form.querySelector('[name="consent"]') || form.querySelector('#consent');
      const submitBtn = form.querySelector('button[type="submit"]') || form.querySelector('[data-tt-submit]');

      function getFeedbackEl(input) {
        let el = input.parentElement ? input.parentElement.querySelector('.tt-feedback') : null;
        if (!el && input.parentElement) {
          el = document.createElement('div');
          el.className = 'tt-feedback';
          el.style.cssText = 'font-size:12px;margin-top:4px;min-height:16px;line-height:1.3;transition:all 0.2s;';
          input.parentElement.appendChild(el);
        }
        return el;
      }

      function updateField(input, valid, message, isSuggestion) {
        const feedback = getFeedbackEl(input);
        if (!feedback) return;
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
        const n = nameInput && nameInput.value ? validateName(nameInput.value) : { valid: true, value: 'Visitor' };
        const e = emailInput && emailInput.value ? validateEmail(emailInput.value) : { valid: false };
        const p = phoneInput && phoneInput.value ? validatePhone(phoneInput.value, 'IN') : { valid: false };
        const c = consentInput ? consentInput.checked : true;

        const hasContact = e.valid || p.valid;
        const allValid = n.valid && hasContact && c;
        if (submitBtn) {
          submitBtn.disabled = !allValid;
          submitBtn.style.opacity = allValid ? '1' : '0.6';
          submitBtn.style.cursor = allValid ? 'pointer' : 'not-allowed';
        }
        return allValid;
      }

      if (nameInput) {
        nameInput.addEventListener('input', function () {
          const res = validateName(nameInput.value);
          if (nameInput.value.length > 1) {
            updateField(nameInput, res.valid, res.error);
          }
          checkAll();
        });
      }

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
            if (feedback) {
              feedback.onclick = function () {
                emailInput.value = res.suggestion;
                updateField(emailInput, true, 'Email corrected.');
                checkAll();
              };
            }
          } else if (emailInput.value.length > 3) {
            updateField(emailInput, res.valid, res.error);
          }
          checkAll();
        });
      }

      if (phoneInput) {
        phoneInput.addEventListener('input', function () {
          const res = validatePhone(phoneInput.value, 'IN');
          if (phoneInput.value.length >= 6) {
            updateField(phoneInput, res.valid, res.error);
          }
          if (res.valid && res.value.length === 10) {
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

      checkAll();

      form.addEventListener('submit', function (evt) {
        evt.preventDefault();
        if (!checkAll()) return;

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.dataset.originalText = submitBtn.textContent;
          submitBtn.textContent = 'Submitting...';
        }

        const nRes = nameInput && nameInput.value ? validateName(nameInput.value) : { value: 'Visitor' };
        const eRes = emailInput && emailInput.value ? validateEmail(emailInput.value) : { value: null };
        const pRes = phoneInput && phoneInput.value ? validatePhone(phoneInput.value, 'IN') : { e164: null };

        const payload = {
          name: nRes.value || 'Visitor',
          email: eRes.value || null,
          phone: pRes.e164 || null,
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
                    ? '<a href="' + result.download_url + '" target="_blank" style="display:inline-block;background:#0F1F6E;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Download Your Guide PDF</a>'
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
          .catch(function () {
            alert('A network error occurred. Please check your connection.');
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.textContent = submitBtn.dataset.originalText || 'Submit';
            }
          });
      });
    },
  };

  // Helper to intelligently detect calculated score & results from any custom calculator/quiz HTML
  function extractScoreAndResult() {
    let score = null;
    let resultText = null;

    // 1. Check window globals (common in custom calculators: window.st, window.quiz_score, window.totalScore, window.crsScore, window.score, window.points)
    if (typeof window !== 'undefined') {
      if (window.st && window.st.sc) {
        // e.g. { Canada: 82, Australia: 74, ... }
        const scEntries = Object.entries(window.st.sc);
        if (scEntries.length > 0) {
          scEntries.sort(function (a, b) { return b[1] - a[1]; });
          score = Math.round(scEntries[0][1]);
          resultText = scEntries[0][0] + ' (' + score + '%)';
        }
      }
      if (score === null) {
        if (typeof window.quiz_score === 'number') score = Math.round(window.quiz_score);
        else if (typeof window.totalScore === 'number') score = Math.round(window.totalScore);
        else if (typeof window.crsScore === 'number') score = Math.round(window.crsScore);
        else if (typeof window.score === 'number') score = Math.round(window.score);
        else if (typeof window.points === 'number') score = Math.round(window.points);
      }
    }

    // 2. Check inputs / hidden inputs / data attributes across document
    if (score === null) {
      const scoreInput = document.querySelector('input[name*="score"], input[name*="point"], input[name*="crs"], input[id*="score"], input[id*="point"], [data-score], [data-points]');
      if (scoreInput) {
        const val = scoreInput.value || scoreInput.getAttribute('data-score') || scoreInput.getAttribute('data-points');
        const num = parseInt(val, 10);
        if (!isNaN(num)) score = num;
      }
    }

    // 3. Check visible text elements with score or points
    if (score === null) {
      const scoreEl = document.querySelector('#score, #total-score, #points, #total-points, #crs-score, .score-value, .points-total, .final-score');
      if (scoreEl) {
        const match = (scoreEl.textContent || '').match(/\b\d{1,4}\b/);
        if (match) score = parseInt(match[0], 10);
      }
    }

    // 4. Check for result summary / eligibility text
    if (!resultText) {
      const resultEl = document.querySelector('#result, #outcome, #qualification, #eligibility, .result-headline, .result-pass, .outcome-text, .qualification-badge');
      if (resultEl) {
        resultText = (resultEl.textContent || '').trim().slice(0, 250);
      }
    }

    return { score: score, resultText: resultText };
  }

  // Universal DOM & JS-state Lead Extractor
  function extractLeadData() {
    let name = '';
    let email = '';
    let phone = '';
    const meta = {};

    // First check window globals (e.g. window.st.user, window.user, window.leadData)
    if (typeof window !== 'undefined') {
      const u = (window.st && window.st.user) || window.user || window.leadData || window.clientUser;
      if (u && typeof u === 'object') {
        if (u.name) name = String(u.name).trim();
        if (u.email) email = String(u.email).trim();
        if (u.phone) phone = String(u.phone).trim();
      }
      if (window.st && window.st.ans) {
        meta.answers = window.st.ans;
      }
    }

    // Scan all inputs in document
    const inputs = document.querySelectorAll('input, select, textarea');
    inputs.forEach(function (inp) {
      const nameAttr = inp.name || '';
      const idAttr = inp.id || '';
      const placeholder = inp.placeholder || '';
      const ariaLabel = inp.getAttribute('aria-label') || '';
      const dataField = inp.getAttribute('data-field') || '';
      const key = (nameAttr || idAttr || dataField || placeholder || ariaLabel || '').toLowerCase().trim();
      const val = inp.value ? String(inp.value).trim() : '';
      if (!val) return;

      if (inp.type === 'radio' || inp.type === 'checkbox') {
        if (inp.checked) meta[nameAttr || idAttr || key] = val;
        return;
      }

      if (inp.type === 'email' || key.includes('email') || key.includes('mail') || idAttr === 'f-email') {
        if (!email) email = val;
      } else if (
        inp.type === 'tel' ||
        key.includes('phone') ||
        key.includes('mobile') ||
        key.includes('whatsapp') ||
        key.includes('contact') ||
        idAttr === 'f-phone'
      ) {
        if (!phone) phone = val;
      } else if (key.includes('name') || key.includes('full') || key.includes('applicant') || idAttr === 'f-name') {
        if (!name) name = val;
      } else {
        meta[nameAttr || idAttr || key] = val;
      }
    });

    return { name: name, email: email, phone: phone, meta: meta };
  }

  // Silent & Non-blocking Lead Sender
  function dispatchLeadSilently(leadData) {
    if (isSubmittingLead) return;

    const name = leadData.name || 'Visitor';
    const email = leadData.email || null;
    let phone = leadData.phone || null;

    // Clean Indian phone if 10 digits
    if (phone) {
      const cleanDigits = String(phone).replace(/\D/g, '');
      if (cleanDigits.length === 10) {
        phone = '+91' + cleanDigits;
      } else if (cleanDigits.length === 12 && cleanDigits.startsWith('91')) {
        phone = '+' + cleanDigits;
      }
    }

    const fingerprint = (email || '') + '|' + (phone || '');
    if (!fingerprint || fingerprint === '|' || fingerprint === lastSubmittedFingerprint) {
      return;
    }

    lastSubmittedFingerprint = fingerprint;
    isSubmittingLead = true;

    const scoreInfo = extractScoreAndResult();
    const finalScore = scoreInfo.score;
    const finalResult = scoreInfo.resultText || leadData.meta.result || null;

    const payload = {
      page_key: pageKey,
      visitor_id: visitorId,
      name: name,
      email: email,
      phone: phone,
      country_code: 'IN',
      consent: true,
      quiz_score: finalScore,
      quiz_result: finalResult,
      utm: Object.assign({}, attribution.utm, leadData.meta),
    };

    // Use keepalive: true so browser delivers payload even during page transition or DOM replacement
    fetch(API_HOST + '/api/v1/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    })
      .then(function (res) { return res.json(); })
      .then(function (res) {
        isSubmittingLead = false;
        if (res && res.download_url) {
          activeDownloadUrl = res.download_url;
          TTConnector.downloadUrl = res.download_url;
          if (typeof window !== 'undefined') {
            window.__TT_DOWNLOAD_URL__ = res.download_url;
          }
        }
      })
      .catch(function () {
        isSubmittingLead = false;
      });
  }

  // ---------------------------------------------------------------------------
  // Global Interceptors (Capture Phase: Always runs BEFORE page listeners)
  // ---------------------------------------------------------------------------

  // 1. Click Interceptor (Download Button Hijacking + Universal Lead Capture)
  document.addEventListener('click', function (e) {
    const target = e.target && e.target.closest ? e.target.closest('button, a, [role="button"], input[type="submit"], input[type="button"]') : null;
    if (!target) return;

    // --- Action A: Intercept Download Button ---
    if (isDownloadElement(target)) {
      const url = activeDownloadUrl || (typeof window !== 'undefined' ? window.__TT_DOWNLOAD_URL__ : null);
      if (url) {
        e.preventDefault();
        e.stopPropagation();
        if (typeof e.stopImmediatePropagation === 'function') {
          e.stopImmediatePropagation();
        }
        triggerAssetDownload(url);
        return;
      }
    }

    // --- Action B: Universal Lead Capture on Click ---
    // If the page contains contact inputs with values, capture the lead in background!
    const lead = extractLeadData();
    if (lead.phone || lead.email) {
      // User has filled at least phone or email and is clicking a button (e.g. "View Match", "Submit", "Next")
      dispatchLeadSilently(lead);
    }
  }, true); // useCapture = true ensures this runs before the page's innerHTML replacement

  // 2. Submit Interceptor for traditional HTML forms
  document.addEventListener('submit', function (e) {
    const lead = extractLeadData();
    if (lead.phone || lead.email) {
      dispatchLeadSilently(lead);
    }
  }, true);

  // 3. Partial Lead Auto-Capture on typing phone
  document.addEventListener('input', function (e) {
    const inp = e.target;
    if (!inp || !inp.value) return;
    const type = (inp.type || '').toLowerCase();
    const id = (inp.id || '').toLowerCase();
    const name = (inp.name || '').toLowerCase();

    if (type === 'tel' || id.includes('phone') || name.includes('phone') || id === 'f-phone') {
      const digits = String(inp.value).replace(/\D/g, '');
      if (digits.length === 10) {
        const lead = extractLeadData();
        TTConnector.trackPartial({
          phone: '+91' + digits,
          name: lead.name || 'Visitor',
        });
      }
    }
  }, true);

  // Wrap window.makePDF or client PDF generators if defined
  function wrapClientPdfGenerator() {
    if (typeof window === 'undefined') return;
    if (typeof window.makePDF === 'function' && !window.makePDF.__tt_wrapped) {
      const orig = window.makePDF;
      window.makePDF = function () {
        const url = activeDownloadUrl || window.__TT_DOWNLOAD_URL__;
        if (url) {
          triggerAssetDownload(url);
          return;
        }
        return orig.apply(this, arguments);
      };
      window.makePDF.__tt_wrapped = true;
    }
  }

  setInterval(wrapClientPdfGenerator, 500);

  // Check page status and send view event on load
  TTConnector.checkStatus().then(function (status) {
    if (status && status.live) {
      TTConnector.trackEvent('view', {
        url: window.location.href,
        referrer: document.referrer,
      });
    }
  });

  // Export to window
  window.TerraTern = TTConnector;
  window.TTConnector = TTConnector;
  window.__TT_DOWNLOAD_URL__ = activeDownloadUrl;
})();
