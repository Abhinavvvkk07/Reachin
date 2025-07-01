console.log("Reachin: Background script loaded for AI-powered cold outreach generation.");

async function getSuggestions(text) {
    console.log("Fetching user context and Gemini API key...");

    const settings = await chrome.storage.sync.get(['apiKey', 'userName', 'userMajor', 'userContext']);
    const { apiKey, userName, userMajor, userContext } = settings;

    if (!apiKey) {
        return { error: "Error: Gemini API Key not set. Please click the extension icon to enter your key." };
    }

    const modelName = "gemini-1.5-flash-latest";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    // This prompt is now even more explicit about the expected output.
    const systemPrompt = `You are an expert editor. Your task is to analyze the user's text.
    You MUST provide two things in your response:
    1.  In the "fullRewrite" field, provide a complete, polished rewrite of the entire text. The rewrite must always be based on the user's input, not just the context. Never simply repeat the context as the rewrite.
    2.  In the "inlineCorrections" field, provide a list of ONLY short, specific corrections for individual spelling and grammar mistakes. Each correction's "original" text should be less than 5 words.

    User Context:
    - Name: ${userName || 'Not provided'}
    - Major/Field: ${userMajor || 'Not provided'}
    - Resume/Skills: ${userContext || 'No context'}

    IMPORTANT: You must respond with ONLY a valid JSON object. Do not add any commentary, explanation, or markdown formatting like \`\`\`json. The JSON object must have this exact structure:
    {
      "fullRewrite": "The completely rewritten, improved version of the text.",
      "inlineCorrections": [
        { "original": "a specific incorrect phrase", "suggestion": "the corrected phrase" }
      ]
    }`;

    const requestBody = {
        "contents": [{ "parts": [{ "text": systemPrompt }, { "text": "Here is the user's draft text to analyze:" }, { "text": text }] }],
        "generationConfig": { "responseMimeType": "application/json", "temperature": 0.7 }
    };

    console.log("Sending request to Gemini API...");

    try {
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorBody = await response.json();
            throw new Error(`API request failed: ${errorBody.error.message}`);
        }

        const data = await response.json();
        
        if (data.candidates && data.candidates[0].content.parts[0].text) {
            return JSON.parse(data.candidates[0].content.parts[0].text);
        } else {
            throw new Error("Unexpected API response structure from Gemini.");
        }

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        return { error: `Error connecting to Gemini: ${error.message}` };
    }
}

// Generate personalized cold email using Gemini
async function generateEmail(prompt) {
    console.log("Generating cold email with Gemini...");

    const settings = await chrome.storage.sync.get(['apiKey']);
    const { apiKey } = settings;

    if (!apiKey) {
        return { error: "Error: Gemini API Key not set. Please click the extension icon to enter your key." };
    }

    const modelName = "gemini-1.5-flash-latest";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const requestBody = {
        "contents": [{ "parts": [{ "text": prompt }] }],
        "generationConfig": { 
            "temperature": 0.8,
            "maxOutputTokens": 1000,
            "topP": 0.9
        }
    };

    console.log("Sending email generation request to Gemini API...");

    try {
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorBody = await response.json();
            throw new Error(`API request failed: ${errorBody.error?.message || response.statusText}`);
        }

        const data = await response.json();
        
        if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
            const generatedText = data.candidates[0].content.parts[0].text.trim();
            console.log("Email generated successfully");
            return { email: generatedText };
        } else {
            throw new Error("Unexpected API response structure from Gemini.");
        }

    } catch (error) {
        console.error("Error generating email with Gemini:", error);
        return { error: `Error generating email: ${error.message}` };
    }
}

// Generate personalized cold message using Gemini
async function generateMessage(prompt) {
    console.log("Generating cold message with Gemini...");

    const settings = await chrome.storage.sync.get(['apiKey']);
    const { apiKey } = settings;

    if (!apiKey) {
        return { error: "Error: Gemini API Key not set. Please click the extension icon to enter your key." };
    }

    const modelName = "gemini-1.5-flash-latest";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const requestBody = {
        "contents": [{ "parts": [{ "text": prompt }] }],
        "generationConfig": { 
            "temperature": 0.9,
            "maxOutputTokens": 200,
            "topP": 0.95
        }
    };

    console.log("Sending message generation request to Gemini API...");

    try {
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorBody = await response.json();
            throw new Error(`API request failed: ${errorBody.error?.message || response.statusText}`);
        }

        const data = await response.json();
        
        if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
            const generatedText = data.candidates[0].content.parts[0].text.trim();
            console.log("Message generated successfully");
            return { message: generatedText };
        } else {
            throw new Error("Unexpected API response structure from Gemini.");
        }

    } catch (error) {
        console.error("Error generating message with Gemini:", error);
        return { error: `Error generating message: ${error.message}` };
    }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.text) {
        // Grammar checking
        getSuggestions(request.text)
            .then(suggestions => sendResponse(suggestions))
            .catch(error => sendResponse({ error: error.message }));
        return true;
    } else if (request.action === 'generateEmail' && request.prompt) {
        // Email generation
        generateEmail(request.prompt)
            .then(result => sendResponse(result))
            .catch(error => sendResponse({ error: error.message }));
        return true;
    } else if (request.action === 'generateMessage' && request.prompt) {
        // Message generation
        generateMessage(request.prompt)
            .then(result => sendResponse(result))
            .catch(error => sendResponse({ error: error.message }));
        return true;
    }
});

