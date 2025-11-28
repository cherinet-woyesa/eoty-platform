const { VertexAI } = require('@google-cloud/vertexai');
const path = require('path');
process.env.GOOGLE_APPLICATION_CREDENTIALS = path.join(__dirname, 'gcp-key.json');

async function testGenerativeModel() {
  console.log('Initializing Vertex AI for project: eotconnect');
  
  // Try a different location that is definitely supported for Gemini
  // us-central1 is the main one, but let's try to be explicit
  const vertexAI = new VertexAI({
    project: 'eotconnect',
    location: 'us-central1'
  });

  // Try the most basic model name that often redirects to the default version
  const modelName = 'gemini-pro'; 

  console.log(`Attempting to access model: ${modelName} in us-central1`);
  
  try {
    const model = vertexAI.preview.getGenerativeModel({ model: modelName });
    const result = await model.generateContent('Hello');
    const response = await result.response;
    console.log('✅ SUCCESS! Response:', response.candidates[0].content.parts[0].text);
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    
    if (error.message.includes('404')) {
      console.log('\n--- TROUBLESHOOTING ---');
      console.log('Since billing is enabled and the API is enabled, this 404 usually means:');
      console.log('1. The "Vertex AI User" role is missing for the service account.');
      console.log('2. The API was just enabled and needs a few minutes.');
      console.log('3. The project ID in the key file does not match the project ID in the console.');
    }
  }
}

testGenerativeModel();