const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticateToken } = require('../middleware/auth');
const speech = require('@google-cloud/speech');

// Initialize Google Cloud Speech client
const speechClient = new speech.SpeechClient();

// Configure multer for file uploads
const upload = multer({
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  storage: multer.memoryStorage(), // Store in memory for direct streaming to Google API
  fileFilter: (req, file, cb) => {
    // Accept audio files and webm (video) containers that include audio tracks
    if (file.mimetype.startsWith('audio/') ||
        file.mimetype === 'application/octet-stream' ||
        file.mimetype.startsWith('video/webm')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'));
    }
  }
});

// Speech-to-text endpoint using Google Cloud Speech-to-Text
router.post('/', authenticateToken, upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No audio file provided'
      });
    }

    const { language = 'en-US' } = req.body;

    // Map frontend language codes to Google Cloud Speech codes
    const languageMap = {
      'en-US': 'en-US',
      'am-ET': 'am-ET',
      'ti-ET': 'ti-ET', // Tigrigna might have limited support, fallback to Amharic or English if needed
      'om-ET': 'om-ET'
    };

    const speechLanguage = languageMap[language] || 'en-US';

    const audioBytes = req.file.buffer.toString('base64');

    const audio = {
      content: audioBytes,
    };

    // Normalize mimetype to handle variants like "audio/webm;codecs=opus"
    const mime = (req.file.mimetype || '').toLowerCase();
    const isWebm = mime.includes('webm');
    const isWav = mime.includes('wav');
    const isMp3 = mime.includes('mpeg') || mime.includes('mp3');

    const config = {
      encoding: isWav ? 'LINEAR16'
               : isMp3 ? 'MP3'
               : 'WEBM_OPUS', // default for webm/opus
      sampleRateHertz: 48000, // typical for webm/opus from MediaRecorder
      languageCode: speechLanguage,
      alternativeLanguageCodes: ['am-ET', 'en-US'], // Try to detect Amharic or English if primary fails
      enableAutomaticPunctuation: true,
    };
    
    // Adjust sample rate for wav/mp3 if needed
    if (isWav) {
      // Leave sampleRateHertz undefined to let API auto-detect for wav
      delete config.sampleRateHertz;
    } else if (isMp3) {
      // MP3 usually 44100; allow auto-detect
      delete config.sampleRateHertz;
    }

    const request = {
      audio: audio,
      config: config,
    };

    // Detects speech in the audio file
    const [response] = await speechClient.recognize(request);
    
    const transcription = response.results
      .map(result => result.alternatives[0].transcript)
      .join('\n');
      
    const confidence = response.results[0]?.alternatives[0]?.confidence || 0;

    console.log(`Speech-to-text success:`, {
      language: speechLanguage,
      transcriptLength: transcription.length,
      confidence
    });

    res.json({
      success: true,
      transcript: transcription,
      confidence: confidence,
      language: speechLanguage,
      isFallback: false
    });

  } catch (error) {
    console.error('Speech-to-text error:', error);
    
    // Fallback for development/testing if credentials aren't set up
    if (process.env.NODE_ENV === 'development' && error.message.includes('credentials')) {
        return res.json({
            success: true,
            transcript: "This is a simulated transcription because Google Cloud credentials are missing in dev environment.",
            confidence: 0.9,
            language: req.body.language || 'en-US',
            isFallback: true
        });
    }

    res.status(500).json({
      success: false,
      message: 'Speech-to-text processing failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'active',
    service: 'Google Cloud Speech-to-Text',
    configured: !!process.env.GOOGLE_CLOUD_PROJECT,
    supportedLanguages: ['en-US', 'am-ET', 'ti-ET', 'om-ET']
  });
});

module.exports = router;
