(function() {
  // FrictionPulse Widget v2
  const scriptTag = document.currentScript || document.querySelector('script[src*="widget.js"]');
  const siteKey = scriptTag ? scriptTag.getAttribute('data-site-key') : null;

  if (!siteKey) {
    console.error("FrictionPulse: Missing data-site-key attribute. Ensure the script tag includes data-site-key='YOUR_KEY'.");
    return;
  }

  const SUPABASE_URL = "https://amtalgsyuedgayxkxijw.supabase.co";
  const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtdGFsZ3N5dWVkZ2F5eGt4aWp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5MzQxNjksImV4cCI6MjA5NTUxMDE2OX0.Wan4ywifJJi7w1WEPyeJY6uQhtYsZm3ilZuCC2IEf_Y";

  const headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
  };

  let sessionHash = sessionStorage.getItem('fp_session_hash');
  if (!sessionHash) {
    sessionHash = 'sess_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    sessionStorage.setItem('fp_session_hash', sessionHash);
  }

  const defaultObjections = [
    { id: 1, label: "Found a bug / glitch" },
    { id: 2, label: "UI feels confusing" },
    { id: 3, label: "Page loads slowly" },
    { id: 4, label: "Missing core features" }
  ];

  let objections = [];

  // Create Shadow DOM Host
  const host = document.createElement('div');
  host.id = 'frictionpulse-widget-host';
  document.body.appendChild(host);

  const shadowRoot = host.attachShadow({ mode: 'open' });

  // Inject Styles into Shadow DOM
  const style = document.createElement('style');
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');

    #frictionpulse-widget {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 99999;
      font-family: 'Inter', sans-serif;
    }

    .frictionpulse-btn {
      width: 56px;
      height: 56px;
      border-radius: 28px;
      background-color: #0D0E12;
      border: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      padding: 0;
      margin: 0;
    }

    .frictionpulse-btn:hover {
      transform: scale(1.05);
      box-shadow: 0 12px 40px rgba(255, 78, 17, 0.2);
    }

    #frictionpulse-popup {
      position: absolute;
      bottom: 70px;
      right: 0;
      width: 320px;
      background: linear-gradient(145deg, rgba(19, 21, 26, 0.95), rgba(13, 14, 18, 0.98));
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 16px 40px rgba(0,0,0,0.5);
      backdrop-filter: blur(12px);
      color: #FFFFFF;
      box-sizing: border-box;

      /* Hidden state / Smooth sliding */
      opacity: 0;
      visibility: hidden;
      transform: translateY(20px);
      transition: opacity 0.3s ease, transform 0.3s ease, visibility 0.3s;
    }

    #frictionpulse-popup.open {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
    }

    h3 {
      margin-top: 0;
      margin-bottom: 16px;
      font-size: 16px;
      font-weight: 600;
    }

    .objection-btn {
      display: block;
      width: 100%;
      margin-bottom: 10px;
      padding: 12px 16px;
      background: #0D0E12;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      cursor: pointer;
      text-align: left;
      color: #FFFFFF;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.2s;
    }

    .objection-btn:hover {
      border-color: rgba(255, 78, 17, 0.5);
      background: rgba(255, 78, 17, 0.05);
    }

    #message-area {
      margin-top: 16px;
      font-weight: 500;
      color: #FF4E11;
      display: none;
      line-height: 1.5;
      font-size: 14px;
      padding: 12px;
      background: rgba(255, 78, 17, 0.1);
      border: 1px solid rgba(255, 78, 17, 0.2);
      border-radius: 8px;
    }

    #lead-form {
      margin-top: 16px;
      display: none;
      flex-direction: column;
      gap: 10px;
    }

    .lead-input {
      padding: 10px;
      border-radius: 6px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      background: rgba(0, 0, 0, 0.2);
      color: #fff;
      font-size: 14px;
      font-family: 'Inter', sans-serif;
    }

    .lead-submit {
      padding: 10px;
      border-radius: 6px;
      border: none;
      background: #FF4E11;
      color: #fff;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }

    .lead-submit:hover {
      background: #e0440f;
    }

    #lead-success {
      margin-top: 16px;
      display: none;
      color: #27ae60;
      font-size: 14px;
      font-weight: 500;
      text-align: center;
    }
  `;
  shadowRoot.appendChild(style);

  // Widget Container
  const widgetContainer = document.createElement('div');
  widgetContainer.id = "frictionpulse-widget";

  // Button
  const button = document.createElement('button');
  button.className = "frictionpulse-btn";
  button.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: block; margin: auto;"><circle cx="12" cy="12" r="10" stroke="rgba(255, 78, 17, 0.4)" stroke-width="2"/><circle cx="12" cy="12" r="6" stroke="rgba(255, 78, 17, 0.7)" stroke-width="2"/><circle cx="12" cy="12" r="2" fill="#FF4E11"/></svg>';

  // Popup
  const popup = document.createElement('div');
  popup.id = "frictionpulse-popup";

  const title = document.createElement('h3');
  title.innerText = "Any concerns before you buy?";
  popup.appendChild(title);

  const objectionsContainer = document.createElement('div');
  popup.appendChild(objectionsContainer);

  const messageArea = document.createElement('div');
  messageArea.id = "message-area";
  popup.appendChild(messageArea);

  const leadForm = document.createElement('form');
  leadForm.id = "lead-form";

  const leadPrompt = document.createElement('div');
  leadPrompt.innerText = "Drop your email/phone and we'll send you a solution/discount!";
  leadPrompt.style.fontSize = "13px";
  leadPrompt.style.color = "#ccc";
  leadForm.appendChild(leadPrompt);

  const leadInput = document.createElement('input');
  leadInput.type = "text";
  leadInput.className = "lead-input";
  leadInput.placeholder = "Email or Phone number";
  leadInput.required = true;
  leadForm.appendChild(leadInput);

  const leadSubmit = document.createElement('button');
  leadSubmit.type = "submit";
  leadSubmit.className = "lead-submit";
  leadSubmit.innerText = "Submit";
  leadForm.appendChild(leadSubmit);

  popup.appendChild(leadForm);

  const leadSuccess = document.createElement('div');
  leadSuccess.id = "lead-success";
  leadSuccess.innerText = "Thank you! Our team will get back to you shortly.";
  popup.appendChild(leadSuccess);

  widgetContainer.appendChild(popup);
  widgetContainer.appendChild(button);
  shadowRoot.appendChild(widgetContainer);

  let isOpen = false;
  let hasTriggered = false; // Prevent multiple auto-triggers

  function toggleWidget(forceOpen = null) {
    if (forceOpen !== null) {
      isOpen = forceOpen;
    } else {
      isOpen = !isOpen;
    }

    if (isOpen) {
      popup.classList.add('open');
      if (objections.length === 0) {
        loadObjections();
      }
    } else {
      popup.classList.remove('open');
    }
  }

  button.onclick = () => toggleWidget();

  async function loadObjections() {
    objectionsContainer.innerHTML = "Loading...";
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/objections?select=*&site_key=eq.${siteKey}`, {
        method: "GET",
        headers: headers
      });
      if (!response.ok) throw new Error("Failed to load objections");

      objections = await response.json();
      if (!objections || objections.length === 0) {
        objections = defaultObjections;
      }
      renderObjections();
    } catch (err) {
      console.error("FrictionPulse error:", err);
      objections = defaultObjections;
      renderObjections();
    }
  }

  function renderObjections() {
    objectionsContainer.innerHTML = "";
    objections.forEach(obj => {
      const btn = document.createElement('button');
      btn.innerText = obj.label;
      btn.className = 'objection-btn';
      btn.onclick = () => handleVote(obj);
      objectionsContainer.appendChild(btn);
    });
  }

  async function handleVote(obj) {
    // Show counter message
    messageArea.innerText = obj.counter_message || "Thank you for your feedback!";
    messageArea.style.display = "block";

    // Hide buttons
    objectionsContainer.style.display = "none";

    // Show lead form
    leadForm.style.display = "flex";

    // Handle form submit
    leadForm.onsubmit = async (e) => {
      e.preventDefault();
      const val = leadInput.value.trim();
      const isEmail = val.includes('@');

      const payload = {
        site_key: siteKey,
        email: isEmail ? val : null,
        phone: !isEmail ? val : null,
        objection_id: obj.id,
        objection_label: obj.label,
        page_url: window.location.href
      };

      try {
        const leadResponse = await fetch(`${SUPABASE_URL}/rest/v1/leads`, {
          method: "POST",
          headers: headers,
          body: JSON.stringify(payload)
        });

        if (leadResponse.ok) {
          leadForm.style.display = "none";
          leadSuccess.style.display = "block";
        } else {
          console.error("FrictionPulse: Lead submission failed.");
        }
      } catch (err) {
        console.error("FrictionPulse: Lead submission error.", err);
      }
    };

    // Log vote
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/votes`, {
        method: "POST",
        headers: headers,
        body: JSON.stringify({
          site_key: siteKey,
          objection_id: obj.id,
          session_hash: sessionHash
        })
      });
      if (!response.ok) {
        const errData = await response.json();
        if (errData.code === "23505") {
          console.log("FrictionPulse: Duplicate vote detected and handled gracefully.");
          messageArea.innerText = "Thanks! Your feedback has already been recorded.";
        } else {
          console.error("Supabase Error:", errData);
        }
      }
    } catch (err) {
      console.error("Supabase Error:", err);
    }
  }

  // Log view
  async function logView() {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/widget_views`, {
        method: "POST",
        headers: headers,
        body: JSON.stringify({
          site_key: siteKey,
          session_hash: sessionHash
        })
      });
      if (!response.ok) {
        const errData = await response.json();
        console.error("Supabase Error:", errData);
      }
    } catch (err) {
      console.error("Supabase Error:", err);
    }
  }

  // Initial view log
  logView();

  // --- TRIGGERS ---

  function triggerOpen() {
    if (!hasTriggered && !isOpen) {
      hasTriggered = true;
      toggleWidget(true);
    }
  }

  // 1. Exit Intent Trigger (Desktop)
  document.addEventListener("mouseleave", (e) => {
    // If the mouse pointer moves toward the top of the screen (clientY < 20)
    if (e.clientY < 20) {
      triggerOpen();
    }
  });

  // 2. Scroll Depth & Delay Trigger (Mobile/General)
  let scrollTimeout;
  window.addEventListener("scroll", () => {
    if (hasTriggered) return;

    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;

    // Only calculate percentage if there is scrollable content
    if (scrollHeight > 0) {
      const scrollPercentage = (scrollTop / scrollHeight) * 100;

      if (scrollPercentage >= 70) {
        // If not already waiting to trigger
        if (!scrollTimeout) {
          scrollTimeout = setTimeout(() => {
            triggerOpen();
          }, 2000); // 2-second delay
        }
      } else {
        // Clear timeout if user scrolls back up before 2 seconds
        if (scrollTimeout) {
          clearTimeout(scrollTimeout);
          scrollTimeout = null;
        }
      }
    }
  });

})();