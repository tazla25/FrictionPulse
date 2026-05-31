(function() {
  'use strict';

  // ─── CONFIG ───
  const scriptTag = document.currentScript || document.querySelector('script[src*="widget.js"],script[src*="widget-v2.js"]');
  const siteKey = scriptTag ? scriptTag.getAttribute('data-site-key') : null;
  if (!siteKey) {
    console.error("[FrictionPulse] Missing data-site-key");
    return;
  }

  const CONFIG = {
    supabaseUrl: "https://amtalgsyuedgayxkxijw.supabase.co",
    supabaseKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtdGFsZ3N5dWVkZ2F5eGt4aWp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5MzQxNjksImV4cCI6MjA5NTUxMDE2OX0.Wan4ywifJJi7w1WEPyeJY6uQhtYsZm3ilZuCC2IEf_Y",
    exitIntent: true,
    exitIntentDelay: 3000,
    leadCapture: true,
    visitorCount: true,
    freeText: true,
    soundEnabled: false,
    position: 'auto', // 'auto' detects mobile/desktop
    primaryColor: '#FF4E11',
    bgColor: '#0D0E12',
  };

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
  const position = isMobile ? 'bottom-center' : 'bottom-right';

  // ─── SESSION ───
  let sessionHash = sessionStorage.getItem('fp_session_hash');
  if (!sessionHash) {
    sessionHash = 'sess_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    sessionStorage.setItem('fp_session_hash', sessionHash);
  }
  let hasInteracted = false;
  let visitorCount = 0;

  // ─── API HELPERS ───
  const headers = {
    "apikey": CONFIG.supabaseKey,
    "Authorization": `Bearer ${CONFIG.supabaseKey}`,
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
  };

  async function post(table, payload) {
    try {
      const res = await fetch(`${CONFIG.supabaseUrl}/rest/v1/${table}`, {
        method: "POST", headers, body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json();
        if (err.code !== "23505") console.error("[FP] POST error:", err);
      }
      return res.ok;
    } catch (e) { console.error("[FP] Network error:", e); return false; }
  }

  async function get(table, query) {
    try {
      const res = await fetch(`${CONFIG.supabaseUrl}/rest/v1/${table}?${query}`, { method: "GET", headers });
      return res.ok ? await res.json() : [];
    } catch (e) { return []; }
  }

  // ─── SHADOW DOM SETUP ───
  const host = document.createElement('div');
  host.id = 'fp-widget-host';
  host.style.cssText = 'position:fixed;z-index:2147483647;bottom:0;left:0;width:100%;height:0;overflow:visible;';
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: 'open' });

  // ─── STYLES ───
  const style = document.createElement('style');
  style.textContent = `
    :host { all: initial; }
    * { box-sizing: border-box; font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }

    .fp-container { position: absolute; bottom: 20px; ${position === 'bottom-center' ? 'left: 50%; transform: translateX(-50%);' : 'right: 20px;'} }
    .fp-btn {
      width: 56px; height: 56px; border-radius: 50%; background: ${CONFIG.bgColor};
      border: 1px solid rgba(255,255,255,0.08); display: flex; align-items: center; justify-content: center;
      cursor: pointer; box-shadow: 0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,78,17,0.1);
      transition: all 0.3s cubic-bezier(0.4,0,0.2,1); position: relative; padding: 0;
    }
    .fp-btn:hover { transform: scale(1.08); box-shadow: 0 12px 40px rgba(255,78,17,0.25); }
    .fp-btn:active { transform: scale(0.95); }

    .fp-badge {
      position: absolute; top: -4px; right: -4px; background: ${CONFIG.primaryColor}; color: #fff;
      font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 10px; min-width: 18px;
      text-align: center; box-shadow: 0 2px 8px rgba(255,78,17,0.4); animation: fp-pop 0.3s ease;
    }
    @keyframes fp-pop { 0%{transform:scale(0)} 80%{transform:scale(1.2)} 100%{transform:scale(1)} }

    .fp-popup {
      position: absolute; bottom: 72px; ${position === 'bottom-center' ? 'left: 50%; transform: translateX(-50%);' : 'right: 0;'}
      width: 340px; max-width: calc(100vw - 32px); max-height: 80vh; overflow-y: auto;
      background: linear-gradient(145deg, rgba(19,21,26,0.98), rgba(13,14,18,0.99));
      border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 24px;
      box-shadow: 0 24px 60px rgba(0,0,0,0.6); backdrop-filter: blur(16px);
      color: #fff; display: none; opacity: 0; transform: translateY(10px);
      transition: opacity 0.3s ease, transform 0.3s ease;
    }
    .fp-popup.open { display: block; opacity: 1; transform: translateY(0); }

    .fp-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .fp-title { font-size: 16px; font-weight: 600; margin: 0; }
    .fp-close { background: none; border: none; color: #8A8F98; cursor: pointer; font-size: 18px; padding: 4px; line-height: 1; }
    .fp-close:hover { color: #fff; }

    .fp-subtitle { font-size: 13px; color: #8A8F98; margin-bottom: 16px; line-height: 1.5; }
    .fp-visitor-count { font-size: 12px; color: ${CONFIG.primaryColor}; margin-bottom: 12px; display: flex; align-items: center; gap: 6px; }
    .fp-dot { width: 6px; height: 6px; background: #22c55e; border-radius: 50%; animation: fp-pulse 2s infinite; }
    @keyframes fp-pulse { 0%{opacity:1;box-shadow:0 0 0 0 rgba(34,197,94,0.4)} 70%{opacity:0.8;box-shadow:0 0 0 6px rgba(34,197,94,0)} 100%{opacity:1;box-shadow:0 0 0 0 rgba(34,197,94,0)} }

    .fp-obj-btn {
      display: flex; align-items: center; justify-content: space-between; width: 100%;
      padding: 12px 14px; margin-bottom: 8px; background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; cursor: pointer;
      color: #fff; font-size: 14px; font-weight: 500; transition: all 0.2s; text-align: left;
    }
    .fp-obj-btn:hover { border-color: rgba(255,78,17,0.4); background: rgba(255,78,17,0.06); }
    .fp-obj-btn .fp-arrow { color: #8A8F98; font-size: 12px; transition: transform 0.2s; }
    .fp-obj-btn:hover .fp-arrow { transform: translateX(3px); color: ${CONFIG.primaryColor}; }

    .fp-counter-box {
      background: rgba(255,78,17,0.08); border: 1px solid rgba(255,78,17,0.2);
      border-radius: 10px; padding: 14px; margin-bottom: 16px; font-size: 14px; line-height: 1.6;
    }
    .fp-counter-box strong { color: ${CONFIG.primaryColor}; display: block; margin-bottom: 4px; }

    .fp-lead-form { margin-top: 12px; }
    .fp-lead-form label { display: block; font-size: 12px; color: #8A8F98; margin-bottom: 6px; }
    .fp-input {
      width: 100%; padding: 10px 12px; background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; color: #fff;
      font-size: 14px; margin-bottom: 10px; outline: none; transition: border-color 0.2s;
    }
    .fp-input:focus { border-color: ${CONFIG.primaryColor}; }
    .fp-input::placeholder { color: #5a5a6a; }

    .fp-submit {
      width: 100%; padding: 12px; background: linear-gradient(135deg, ${CONFIG.primaryColor}, #FF5722);
      border: none; border-radius: 8px; color: #fff; font-size: 14px; font-weight: 600;
      cursor: pointer; transition: all 0.2s; margin-top: 4px;
    }
    .fp-submit:hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(255,78,17,0.3); }
    .fp-submit:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

    .fp-thanks { text-align: center; padding: 20px 0; }
    .fp-thanks-icon { font-size: 40px; margin-bottom: 12px; }
    .fp-thanks h4 { margin: 0 0 8px; font-size: 18px; }
    .fp-thanks p { color: #8A8F98; font-size: 14px; margin: 0 0 16px; }
    .fp-cta-link { display: inline-block; padding: 10px 20px; background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #fff; text-decoration: none;
      font-size: 13px; font-weight: 500; transition: all 0.2s;
    }
    .fp-cta-link:hover { background: rgba(255,78,17,0.1); border-color: rgba(255,78,17,0.3); }

    .fp-textarea { width: 100%; min-height: 80px; resize: vertical; }
    .fp-footer { margin-top: 16px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.04);
      text-align: center; font-size: 11px; color: #5a5a6a;
    }
    .fp-footer a { color: #8A8F98; text-decoration: none; }
    .fp-footer a:hover { color: ${CONFIG.primaryColor}; }

    @media (max-width: 480px) {
      .fp-popup { width: calc(100vw - 32px); left: 50% !important; transform: translateX(-50%) translateY(10px); }
      .fp-popup.open { transform: translateX(-50%) translateY(0); }
    }
  `;
  shadow.appendChild(style);

  // ─── DOM STRUCTURE ───
  const container = document.createElement('div');
  container.className = 'fp-container';

  // Button
  const btn = document.createElement('button');
  btn.className = 'fp-btn';
  btn.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="rgba(255,78,17,0.4)" stroke-width="2"/>
      <circle cx="12" cy="12" r="6" stroke="rgba(255,78,17,0.7)" stroke-width="2"/>
      <circle cx="12" cy="12" r="2" fill="#FF4E11"/>
    </svg>
  `;
  if (CONFIG.visitorCount) {
    const badge = document.createElement('span');
    badge.className = 'fp-badge';
    badge.id = 'fp-badge';
    badge.textContent = '1';
    btn.appendChild(badge);
  }

  // Popup
  const popup = document.createElement('div');
  popup.className = 'fp-popup';
  popup.id = 'fp-popup';

  popup.innerHTML = `
    <div class="fp-header">
      <h3 class="fp-title">Help us improve your experience</h3>
      <button class="fp-close" id="fp-close">&times;</button>
    </div>
    <div class="fp-subtitle">What's stopping you from completing your purchase?</div>
    <div class="fp-visitor-count" id="fp-visitor-line" style="display:none;">
      <span class="fp-dot"></span>
      <span id="fp-visitor-text">3 people viewing this now</span>
    </div>
    <div id="fp-content"></div>
    <div class="fp-footer">Powered by <a href="https://frictionpulse.vercel.app" target="_blank">FrictionPulse</a></div>
  `;

  container.appendChild(popup);
  container.appendChild(btn);
  shadow.appendChild(container);

  // ─── STATE & NAVIGATION ───
  let isOpen = false;
  let objections = [];
  const content = popup.querySelector('#fp-content');

  function toggle(open) {
    isOpen = open !== undefined ? open : !isOpen;
    popup.classList.toggle('open', isOpen);
    if (isOpen && !hasInteracted) loadObjections();
  }

  btn.onclick = () => toggle();
  popup.querySelector('#fp-close').onclick = () => toggle(false);

  // ─── LOAD OBJECTIONS ───
  async function loadObjections() {
    content.innerHTML = '<div style="text-align:center;padding:20px;color:#8A8F98;font-size:13px;">Loading...</div>';
    try {
      const data = await get('objections', `select=*&site_key=eq.${siteKey}`);
      objections = data.length ? data : [
        { id: 1, label: "Price is too high", counter_message: "We offer a 10% first-order discount! Use code WELCOME10 at checkout." },
        { id: 2, label: "Not sure about quality", counter_message: "Check our 500+ 5-star reviews and 30-day money-back guarantee." },
        { id: 3, label: "Shipping cost / time", counter_message: "Free shipping on orders over $50. Delivery in 3-5 business days." },
        { id: 4, label: "Need to think about it", counter_message: "This item is selling fast! 12 people added it to cart today." },
        { id: 5, label: "Out of stock / wrong size", counter_message: "Enter your email below and we'll notify you the moment it's back!" },
      ];
      renderObjections();
    } catch (e) {
      objections = [
        { id: 1, label: "Price is too high", counter_message: "We offer a 10% first-order discount!" },
        { id: 2, label: "Not sure about quality", counter_message: "Check our reviews and 30-day guarantee." },
        { id: 3, label: "Shipping cost / time", counter_message: "Free shipping on orders over $50." },
        { id: 4, label: "Need to think about it", counter_message: "This item is selling fast!" },
        { id: 5, label: "Out of stock / wrong size", counter_message: "We'll notify you when it's back!" },
      ];
      renderObjections();
    }
  }

  function renderObjections() {
    content.innerHTML = '';
    objections.forEach(obj => {
      const b = document.createElement('button');
      b.className = 'fp-obj-btn';
      b.innerHTML = `<span>${obj.label}</span><span class="fp-arrow">→</span>`;
      b.onclick = () => showCounter(obj);
      content.appendChild(b);
    });

    if (CONFIG.freeText) {
      const other = document.createElement('button');
      other.className = 'fp-obj-btn';
      other.style.borderStyle = 'dashed';
      other.innerHTML = `<span>📝 Something else...</span><span class="fp-arrow">→</span>`;
      other.onclick = () => showFreeText();
      content.appendChild(other);
    }
  }

  // ─── COUNTER MESSAGE + LEAD CAPTURE ───
  function showCounter(obj) {
    hasInteracted = true;
    logVote(obj.id);

    const isLeadWorthy = obj.label.toLowerCase().includes('stock') || 
                         obj.label.toLowerCase().includes('size') ||
                         obj.label.toLowerCase().includes('price');

    let html = `
      <div class="fp-counter-box">
        <strong>💡 ${obj.label}</strong>
        ${obj.counter_message}
      </div>
    `;

    if (CONFIG.leadCapture && isLeadWorthy) {
      html += `
        <div class="fp-lead-form">
          <label>📧 Get notified instantly</label>
          <input type="email" class="fp-input" id="fp-email" placeholder="your@email.com" />
          <input type="tel" class="fp-input" id="fp-phone" placeholder="Phone (optional)" />
          <button class="fp-submit" id="fp-lead-submit">Notify Me</button>
        </div>
      `;
    } else {
      html += `
        <div class="fp-thanks">
          <div class="fp-thanks-icon">🙏</div>
          <h4>Thanks for your feedback!</h4>
          <p>We appreciate you taking the time.</p>
          <a href="#" class="fp-cta-link" onclick="document.getElementById('fp-popup').classList.remove('open'); return false;">Close & Continue Shopping</a>
        </div>
      `;
    }

    content.innerHTML = html;

    if (CONFIG.leadCapture && isLeadWorthy) {
      const submitBtn = content.querySelector('#fp-lead-submit');
      submitBtn.onclick = () => {
        const email = content.querySelector('#fp-email').value.trim();
        const phone = content.querySelector('#fp-phone').value.trim();
        if (!email && !phone) {
          alert('Please enter your email or phone');
          return;
        }
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';
        post('leads', {
          site_key: siteKey,
          objection_id: obj.id,
          email: email || null,
          phone: phone || null,
          session_hash: sessionHash,
          page_url: window.location.href
        }).then(ok => {
          content.innerHTML = `
            <div class="fp-thanks">
              <div class="fp-thanks-icon">✅</div>
              <h4>You're on the list!</h4>
              <p>We'll contact you as soon as this is resolved.</p>
            </div>
          `;
        });
      };
    }
  }

  // ─── FREE TEXT FEEDBACK ───
  function showFreeText() {
    hasInteracted = true;
    content.innerHTML = `
      <div class="fp-counter-box">
        <strong>📝 Tell us more</strong>
        What's bothering you? We read every message.
      </div>
      <div class="fp-lead-form">
        <textarea class="fp-input fp-textarea" id="fp-feedback" placeholder="Describe your issue or suggestion..."></textarea>
        <input type="email" class="fp-input" id="fp-email" placeholder="your@email.com (optional)" />
        <button class="fp-submit" id="fp-submit-feedback">Send Feedback</button>
      </div>
    `;

    content.querySelector('#fp-submit-feedback').onclick = () => {
      const text = content.querySelector('#fp-feedback').value.trim();
      const email = content.querySelector('#fp-email').value.trim();
      if (!text) { alert('Please write something'); return; }

      post('feedback', {
        site_key: siteKey,
        message: text,
        email: email || null,
        session_hash: sessionHash,
        page_url: window.location.href
      });

      content.innerHTML = `
        <div class="fp-thanks">
          <div class="fp-thanks-icon">📨</div>
          <h4>Feedback sent!</h4>
          <p>Our team will review it shortly.</p>
        </div>
      `;
    };
  }

  // ─── LOGGING ───
  async function logVote(objectionId) {
    post('votes', { site_key: siteKey, objection_id: objectionId, session_hash: sessionHash });
  }

  async function logView() {
    post('widget_views', { site_key: siteKey, session_hash: sessionHash, page_url: window.location.href });
  }

  // ─── VISITOR COUNT ───
  async function fetchVisitorCount() {
    if (!CONFIG.visitorCount) return;
    try {
      // In production, this should be a real-time endpoint or WebSocket
      // For now, we simulate with a random count based on actual views in last 5 min
      const data = await get('widget_views', `select=session_hash&site_key=eq.${siteKey}&created_at=gte.${new Date(Date.now() - 300000).toISOString()}`);
      const unique = new Set(data.map(d => d.session_hash)).size;
      visitorCount = Math.max(1, unique + Math.floor(Math.random() * 3));
      updateVisitorDisplay();
    } catch (e) {}
  }

  function updateVisitorDisplay() {
    const line = popup.querySelector('#fp-visitor-line');
    const text = popup.querySelector('#fp-visitor-text');
    const badge = btn.querySelector('#fp-badge');
    if (line && text) {
      line.style.display = 'flex';
      text.textContent = `${visitorCount} ${visitorCount === 1 ? 'person' : 'people'} viewing this now`;
    }
    if (badge) {
      badge.textContent = visitorCount;
      badge.style.display = visitorCount > 1 ? 'block' : 'none';
    }
  }

  // ─── EXIT INTENT ───
  if (CONFIG.exitIntent && !isMobile) {
    let exitIntentShown = false;
    document.addEventListener('mouseout', e => {
      if (exitIntentShown || isOpen) return;
      if (e.clientY < 10 && e.relatedTarget === null) {
        setTimeout(() => {
          if (!isOpen) {
            toggle(true);
            exitIntentShown = true;
          }
        }, 500);
      }
    });
  }

  // Mobile: show after scroll depth
  if (isMobile && CONFIG.exitIntent) {
    let scrollShown = false;
    window.addEventListener('scroll', () => {
      if (scrollShown || isOpen) return;
      const scrollPercent = (window.scrollY + window.innerHeight) / document.documentElement.scrollHeight;
      if (scrollPercent > 0.7) {
        setTimeout(() => { if (!isOpen) { toggle(true); scrollShown = true; } }, 2000);
      }
    });
  }

  // ─── INIT ───
  logView();
  fetchVisitorCount();
  setInterval(fetchVisitorCount, 30000); // Refresh every 30s

})();
