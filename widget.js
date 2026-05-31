(function() {
  // FrictionPulse Widget
  // Fallback to querySelector if currentScript is null (e.g. async/defer loading)
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

  let globalCounterMessage = "Pulse captured! Thank you for helping us eliminate friction.";

  const defaultObjections = [
    { id: 1, label: "Found a bug / glitch" },
    { id: 2, label: "UI feels confusing" },
    { id: 3, label: "Page loads slowly" },
    { id: 4, label: "Missing core features" }
  ];

  let objections = [];


  // Create Widget UI
  const widgetContainer = document.createElement('div');
  widgetContainer.id = "frictionpulse-widget";
  widgetContainer.style.cssText = "position: fixed !important; bottom: 20px !important; right: 20px !important; z-index: 99999 !important; font-family: 'Inter', sans-serif !important;";

  const button = document.createElement('button');
  button.className = "frictionpulse-btn-isolated";
  button.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: block !important; margin: auto !important;"><circle cx="12" cy="12" r="10" stroke="rgba(255, 78, 17, 0.4)" stroke-width="2"/><circle cx="12" cy="12" r="6" stroke="rgba(255, 78, 17, 0.7)" stroke-width="2"/><circle cx="12" cy="12" r="2" fill="#FF4E11"/></svg>';

  // Apply isolated CSS text with !important
  const baseButtonStyles = "all: initial !important; width: 56px !important; height: 56px !important; border-radius: 28px !important; background-color: #0D0E12 !important; border: 1px solid rgba(255, 255, 255, 0.08) !important; display: flex !important; align-items: center !important; justify-content: center !important; cursor: pointer !important; box-shadow: 0 8px 32px rgba(0,0,0,0.4) !important; transition: transform 0.2s ease, box-shadow 0.2s ease !important; padding: 0 !important; margin: 0 !important;";
  button.style.cssText = baseButtonStyles;

  button.onmouseover = () => { button.style.cssText = baseButtonStyles + " transform: scale(1.05) !important; box-shadow: 0 12px 40px rgba(255, 78, 17, 0.2) !important;"; };
  button.onmouseout = () => { button.style.cssText = baseButtonStyles; };

  const popup = document.createElement('div');
  popup.style.cssText = "all: initial !important; display: none !important; position: absolute !important; bottom: 70px !important; right: 0 !important; width: 320px !important; background: linear-gradient(145deg, rgba(19, 21, 26, 0.95), rgba(13, 14, 18, 0.98)) !important; border: 1px solid rgba(255, 255, 255, 0.08) !important; border-radius: 16px !important; padding: 24px !important; box-shadow: 0 16px 40px rgba(0,0,0,0.5) !important; backdrop-filter: blur(12px) !important; color: #FFFFFF !important; font-family: 'Inter', sans-serif !important; box-sizing: border-box !important;";

  const title = document.createElement('h3');
  title.innerText = "Any concerns before you buy?";
  title.style.cssText = "margin-top: 0 !important; margin-bottom: 16px !important; font-size: 16px !important; font-weight: 600 !important; color: #FFFFFF !important;";
  popup.appendChild(title);


  const objectionsContainer = document.createElement('div');
  popup.appendChild(objectionsContainer);

  const messageArea = document.createElement('div');
  messageArea.style.cssText = "margin-top: 16px !important; font-weight: 500 !important; color: #FF4E11 !important; display: none !important; line-height: 1.5 !important; font-size: 14px !important; padding: 12px !important; background: rgba(255, 78, 17, 0.1) !important; border: 1px solid rgba(255, 78, 17, 0.2) !important; border-radius: 8px !important;";
  popup.appendChild(messageArea);

  widgetContainer.appendChild(popup);
  widgetContainer.appendChild(button);
  document.body.appendChild(widgetContainer);

  let isOpen = false;

  button.onclick = () => {
    isOpen = !isOpen;
    popup.style.display = isOpen ? "block" : "none";
    if (isOpen && objections.length === 0) {
      loadObjections();
    }
  };

  async function loadObjections() {
    objectionsContainer.innerHTML = "Loading...";
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/sites?select=*&site_key=eq.${siteKey}`, {
        method: "GET",
        headers: headers
      });
      if (!response.ok) throw new Error("Failed to load widget config");

      const sitesData = await response.json();
      if (sitesData && sitesData.length > 0) {
        const config = sitesData[0];
        const loadedLabels = [
          { id: 1, label: config.label_1 },
          { id: 2, label: config.label_2 },
          { id: 3, label: config.label_3 },
          { id: 4, label: config.label_4 }
        ].filter(obj => obj.label && obj.label.trim() !== "");

        objections = loadedLabels.length > 0 ? loadedLabels : defaultObjections;
        globalCounterMessage = config.counter_message || "Pulse captured! Thank you for helping us eliminate friction.";
      } else {
        objections = defaultObjections;
        globalCounterMessage = "Pulse captured! Thank you for helping us eliminate friction.";
      }
      renderObjections();
    } catch (err) {
      console.error("FrictionPulse error:", err);
      objections = defaultObjections;
      globalCounterMessage = "Pulse captured! Thank you for helping us eliminate friction.";
      renderObjections();
    }
  }

  function renderObjections() {
    objectionsContainer.innerHTML = "";
    objections.forEach(obj => {
      const btn = document.createElement('button');
      btn.innerText = obj.label;
      btn.style.cssText = "display: block !important; width: 100% !important; margin-bottom: 10px !important; padding: 12px 16px !important; background: #0D0E12 !important; border: 1px solid rgba(255, 255, 255, 0.08) !important; border-radius: 8px !important; cursor: pointer !important; text-align: left !important; color: #FFFFFF !important; font-size: 14px !important; font-weight: 500 !important; transition: all 0.2s !important;";
      btn.onmouseover = () => { btn.style.setProperty('border-color', 'rgba(255, 78, 17, 0.5)', 'important'); btn.style.setProperty('background', 'rgba(255, 78, 17, 0.05)', 'important'); };
      btn.onmouseout = () => { btn.style.setProperty('border-color', 'rgba(255, 255, 255, 0.08)', 'important'); btn.style.setProperty('background', '#0D0E12', 'important'); };
      btn.onclick = () => handleVote(obj);
      objectionsContainer.appendChild(btn);
    });
  }

  async function handleVote(obj) {
    // Show counter message
    messageArea.innerText = globalCounterMessage;
    messageArea.style.display = "block";

    // Hide buttons
    objectionsContainer.style.display = "none";

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

})();