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
    "Prefer": "return=representation"
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
  widgetContainer.style.cssText = "position: fixed; bottom: 20px; right: 20px; z-index: 9999; font-family: sans-serif;";

  const button = document.createElement('button');
  button.innerText = "?";
  button.style.cssText = "width: 50px; height: 50px; border-radius: 25px; background-color: #3498db; color: white; border: none; font-size: 24px; cursor: pointer; box-shadow: 0 4px 6px rgba(0,0,0,0.1);";

  const popup = document.createElement('div');
  popup.style.cssText = "display: none; position: absolute; bottom: 60px; right: 0; width: 300px; background: white; border: 1px solid #ccc; border-radius: 8px; padding: 15px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); color: #333;";

  const title = document.createElement('h3');
  title.innerText = "Any concerns before you buy?";
  title.style.cssText = "margin-top: 0; font-size: 16px; color: #333;";
  popup.appendChild(title);

  const objectionsContainer = document.createElement('div');
  popup.appendChild(objectionsContainer);

  const messageArea = document.createElement('div');
  messageArea.style.cssText = "margin-top: 15px; font-weight: bold; color: #2ecc71; display: none;";
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
      btn.style.cssText = "display: block; width: 100%; margin-bottom: 8px; padding: 8px; background: #f8f9fa; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; text-align: left; color: #333;";
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