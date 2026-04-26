const fetch = require('node-fetch');

exports.handler = async (event) => {
  // This pulls the secret "GAPIKEY" you just saved in the Netlify UI
  const apiKey = process.env.GAPIKEY; 

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: event.body // Pass the prompt from your frontend to Gemini
    });

    const data = await response.json();

    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (error) {
    return { statusCode: 500, body: error.toString() };
  }
};
