// FrictionPulse Serverless AI Objection Suggestion Engine
// Integrates with Google Gemini API via GEMINI_API_KEY environment variable on Vercel

module.exports = async function handler(req, res) {
  // Enable CORS for dashboard and store origins
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-gemini-api-key'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch(e) { body = {}; }
  }
  body = body || {};

  const { label, niche, brand, currency } = body;
  if (!label || typeof label !== 'string' || !label.trim()) {
    return res.status(400).json({ error: 'Objection label is required' });
  }

  // Check for API key: either server environment variable or client header override
  const apiKey = req.headers['x-gemini-api-key'] || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(200).json({
      fallback: true,
      reason: 'GEMINI_API_KEY not configured on server',
      suggestion: null
    });
  }

  const cleanLabel = label.trim();
  const cleanNiche = niche || 'General E-Commerce';
  const cleanBrand = brand || 'Store';
  const cleanCurrency = currency || 'USD';

  const systemPrompt = `You are an elite E-Commerce Conversion Rate Optimization (CRO) expert for FrictionPulse.
A store customer is hesitating before checkout due to this specific objection/hesitation:
"${cleanLabel}"

Store Context:
- Niche: ${cleanNiche}
- Brand Name: ${cleanBrand}
- Currency: ${cleanCurrency}

Your Goal:
Generate ONE compelling, empathetic, conversion-focused counter-message (maximum 35 words).

Strict Guidelines:
1. CONTEXTUAL ACCURACY: Never suggest a coupon or discount if the objection is about UI, website bugs, slow loading, customer service, sizing, quality, warranty, or return policy.
2. If objection is about "Bad UI", navigation, or checkout confusion: Offer instant live chat help, a direct WhatsApp order option, or 1-click guided checkout.
3. If objection is about Price/Cost: Offer a 10% welcome coupon or flexible EMI/installments.
4. If objection is about Shipping/Delivery: Highlight dispatch in 24 hours, free tracked shipping threshold, or express delivery.
5. If objection is about Sizing/Fit: Highlight 100% free doorstep size exchange with courier pickup.
6. If objection is about Trust/Safety: Reassure with 256-bit encryption, buyer protection, or verified reviews.
7. Return ONLY the plain counter-message string. Do not include quotes, greetings, or explanations.`;

  try {
    const geminiModels = ['gemini-2.0-flash', 'gemini-1.5-flash'];
    let suggestion = null;
    let usedModel = null;
    let lastError = null;

    for (const model of geminiModels) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: systemPrompt }] }],
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 120
              }
            })
          }
        );

        if (response.ok) {
          const data = await response.json();
          const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (candidate && candidate.trim()) {
            suggestion = candidate.trim().replace(/^["']|["']$/g, '');
            usedModel = model;
            break;
          }
        } else {
          const errData = await response.text();
          lastError = `Gemini ${model} HTTP ${response.status}: ${errData.substring(0, 150)}`;
        }
      } catch (mErr) {
        lastError = mErr.message;
      }
    }

    if (suggestion) {
      return res.status(200).json({
        success: true,
        suggestion,
        model: usedModel
      });
    } else {
      return res.status(200).json({
        fallback: true,
        error: lastError || 'Failed to generate suggestion with Gemini',
        suggestion: null
      });
    }
  } catch (err) {
    return res.status(200).json({
      fallback: true,
      error: err.message,
      suggestion: null
    });
  }
};
