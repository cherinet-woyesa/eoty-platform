const { GoogleAuth } = require('google-auth-library');
const axios = require('axios');

async function listModels() {
  try {
    const auth = new GoogleAuth({
      keyFile: './gcp-key.json',
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });
    
    const client = await auth.getClient();
    const projectId = await auth.getProjectId();
    const accessToken = await client.getAccessToken();
    const token = accessToken.token;

    console.log(`Project: ${projectId}`);
    const location = 'us-central1';
    
    // 1. Try listing locations first
    const locationsUrl = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations`;
    console.log(`Checking locations from ${locationsUrl}...`);
    try {
        const locResponse = await axios.get(locationsUrl, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 10000
        });
        console.log('Locations found:', locResponse.data.locations ? locResponse.data.locations.map(l => l.name) : 'None');
    } catch (locError) {
        console.error('Error listing locations:', locError.message);
        if (locError.response) console.error('Loc Response:', locError.response.data);
    }

    // 2. Try listing models (Corrected Path?)
    // Try without project prefix in path, as publisher models are shared resources
    const url = `https://${location}-aiplatform.googleapis.com/v1/publishers/google/models`;

    console.log(`Fetching models from ${url}...`);
    
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`
      },
      timeout: 10000 // 10 seconds timeout
    });

    if (response.data && response.data.models) {
        const models = response.data.models;
        console.log(`Found ${models.length} models.`);
        console.log('--- Gemini Models ---');
        models.forEach(m => {
            const modelId = m.name.split('/').pop();
            if (modelId.toLowerCase().includes('gemini')) {
                console.log(`- ${modelId}`);
            }
        });
    } else {
        console.log('No models found in response.');
    }

  } catch (error) {
    console.error('Error listing models:', error.message);
    if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

listModels();