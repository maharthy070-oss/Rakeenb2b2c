// netlify/functions/gemini-proxy.ts
// This file runs on the Netlify server in a TypeScript environment.
import { Handler } from "@netlify/functions";

export const handler: Handler = async (event) => {
  // Netlify automatically provides 'GAPIKEY' from your environment variables
  const apiKey = process.env.GAPIKEY;
  
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "GAPIKEY is not defined in Netlify environment variables." }),
    };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: event.body, // Pass the request from your frontend
    });

    const data = await response.json();

    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to connect to Gemini API", details: error.message }),
    };
  }
};
