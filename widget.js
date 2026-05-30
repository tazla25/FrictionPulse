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

  const defaultObjections = [
    { label: "Price is too high", counter_message: "We offer flexible payment plans and a money-back guarantee." },
    { label: "Not sure if it works for me", counter_message: "Check out our case studies to see how we've helped similar customers." },
    { label: "I need to think about it", counter_message: "Don't miss out! This offer might expire soon." },
    { label: "Missing features I need", counter_message: "Contact our support! We might have a workaround." }
  ];

  let objections = [];


  // Create Widget UI
  const widgetContainer = document.createElement('div');
  widgetContainer.id = "frictionpulse-widget";
  widgetContainer.style.cssText = "position: fixed; bottom: 20px; right: 20px; z-index: 9999; font-family: 'Inter', sans-serif;";

  const button = document.createElement('button');
  button.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" stroke="rgba(255, 78, 17, 0.4)" stroke-width="2"/><circle cx="12" cy="12" r="6" stroke="rgba(255, 78, 17, 0.7)" stroke-width="2"/><circle cx="12" cy="12" r="2" fill="#FF4E11"/></svg>';
  button.style.cssText = "width: 56px; height: 56px; border-radius: 28px; background-color: #0D0E12; border: 1px solid rgba(255, 255, 255, 0.08); display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 8px 32px rgba(0,0,0,0.4); transition: transform 0.2s, box-shadow 0.2s;";
  button.onmouseover = () => { button.style.transform = "scale(1.05)"; button.style.boxShadow = "0 12px 40px rgba(255, 78, 17, 0.2)"; };
  button.onmouseout = () => { button.style.transform = "scale(1)"; button.style.boxShadow = "0 8px 32px rgba(0,0,0,0.4)"; };

  const popup = document.createElement('div');
  popup.style.cssText = "display: none; position: absolute; bottom: 70px; right: 0; width: 320px; background: linear-gradient(145deg, rgba(19, 21, 26, 0.95), rgba(13, 14, 18, 0.98)); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 16px; padding: 24px; box-shadow: 0 16px 40px rgba(0,0,0,0.5); backdrop-filter: blur(12px); color: #FFFFFF;";

  const title = document.createElement('h3');
  title.innerText = "Any concerns before you buy?";
  title.style.cssText = "margin-top: 0; margin-bottom: 16px; font-size: 16px; font-weight: 600; color: #FFFFFF;";
  popup.appendChild(title);


  const objectionsContainer = document.createElement('div');
  popup.appendChild(objectionsContainer);

  const messageArea = document.createElement('div');
  messageArea.style.cssText = "margin-top: 16px; font-weight: 500; color: #FF4E11; display: none; line-height: 1.5; font-size: 14px; padding: 12px; background: rgba(255, 78, 17, 0.1); border: 1px solid rgba(255, 78, 17, 0.2); border-radius: 8px;";
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
      btn.style.cssText = "display: block; width: 100%; margin-bottom: 10px; padding: 12px 16px; background: #0D0E12; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; cursor: pointer; text-align: left; color: #FFFFFF; font-size: 14px; font-weight: 500; transition: all 0.2s;";
      btn.onmouseover = () => { btn.style.borderColor = "rgba(255, 78, 17, 0.5)"; btn.style.background = "rgba(255, 78, 17, 0.05)"; };
      btn.onmouseout = () => { btn.style.borderColor = "rgba(255, 255, 255, 0.08)"; btn.style.background = "#0D0E12"; };
      btn.onclick = () => handleVote(obj);
      objectionsContainer.appendChild(btn);
    });
  }

  async function handleVote(obj) {
    // Show counter message
    messageArea.innerText = obj.counter_message;
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