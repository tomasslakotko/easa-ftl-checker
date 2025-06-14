const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');

// Import our custom modules
const { checkEASACompliance } = require('./utils/easaChecker');
const { validateFlightData } = require('./utils/validator');
const { parseRosterText, ROSTER_FORMAT_EXAMPLE } = require('./utils/rosterParser');
const { parseRosterBusterCalendar, ROSTER_BUSTER_FORMAT_EXAMPLE } = require('./utils/rosterBusterParser');
const { parseFlightData, getAvailableFlights, calculateStandbyStats, FLIGHT_DATA_FORMAT_EXAMPLE } = require('./utils/flightDataParser');

const app = express();
const PORT = process.env.PORT || 3001;

// Security and performance middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));
app.use(compression());

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-app-name.herokuapp.com'] // Replace with your actual Heroku URL
    : ['http://localhost:3000'],
  credentials: true
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from React build
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/build')));
}

// API Routes
app.post('/api/check-compliance', async (req, res) => {
  try {
    const { flightData, dateScope, language = 'en' } = req.body;

    console.log('Received flight data for compliance check:', {
      flights: flightData?.length || 0,
      dateScope,
      language
    });

    // Validate input data
    const validation = validateFlightData(flightData);
    if (!validation.isValid) {
      return res.status(400).json({ 
        error: 'Invalid flight data',
        details: validation.errors 
      });
    }

    // Check EASA compliance
    const complianceResults = checkEASACompliance(flightData, dateScope, language);

    res.json({
      success: true,
      complianceResults: complianceResults,
      summary: {
        totalDays: complianceResults.length,
        legalDays: complianceResults.filter(day => day.status === 'LEGAL').length,
        warningDays: complianceResults.filter(day => day.status === 'WARNING').length,
        illegalDays: complianceResults.filter(day => day.status === 'ILLEGAL').length
      }
    });

  } catch (error) {
    console.error('Error checking compliance:', error);
    res.status(500).json({ 
      error: 'Failed to check compliance',
      details: error.message 
    });
  }
});

// Get EASA FTL limits for reference
app.get('/api/ftl-limits', (req, res) => {
  const { language = 'en' } = req.query;
  
  const limits = {
    maxFDP: {
      '1sector': { start0600: 13, start1800: 11, start0200: 10 },
      '2sectors': { start0600: 12.5, start1800: 10.5, start0200: 9.5 },
      '3sectors': { start0600: 12, start1800: 10, start0200: 9 },
      '4sectors': { start0600: 11.5, start1800: 9.5, start0200: 8.5 },
      '5sectors': { start0600: 11, start1800: 9, start0200: 8 },
      '6+sectors': { start0600: 10.5, start1800: 8.5, start0200: 7.5 }
    },
    minRest: {
      standard: 10, // hours
      extended: 12  // hours after extended FDP
    },
    maxFlightTime: {
      daily: 8,    // hours
      weekly: 60,  // hours
      monthly: 190 // hours
    }
  };

  res.json({ limits, language });
});

// Parse roster text endpoint
app.post('/api/parse-roster', async (req, res) => {
  try {
    const { 
      rosterText, 
      language = 'en', 
      isUTC = false, 
      defaultTimezone = 'Europe/Vienna' 
    } = req.body;

    console.log('Received roster text for parsing:', {
      textLength: rosterText?.length || 0,
      language,
      isUTC,
      defaultTimezone
    });

    if (!rosterText || typeof rosterText !== 'string') {
      return res.status(400).json({ 
        error: 'Invalid roster text',
        details: ['Roster text is required and must be a string'] 
      });
    }

    // Detect roster format and choose appropriate parser
    let parseResult;
    let parserUsed = 'standard';
    
    // Check if it's Roster Buster calendar format
    if (isRosterBusterFormat(rosterText)) {
      console.log('🔍 Detected Roster Buster calendar format');
      parserUsed = 'roster-buster';
      parseResult = parseRosterBusterCalendar(rosterText, {
        isUTC: true, // Roster Buster typically uses UTC
        defaultTimezone
      });
    } else {
      console.log('🔍 Using standard roster parser');
      parseResult = parseRosterText(rosterText, {
        isUTC,
        defaultTimezone
      });
    }

    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Failed to parse roster text',
        details: parseResult.errors,
        example: parserUsed === 'roster-buster' ? ROSTER_BUSTER_FORMAT_EXAMPLE : ROSTER_FORMAT_EXAMPLE,
        parserUsed
      });
    }

    res.json({
      success: true,
      dutyPeriods: parseResult.dutyPeriods,
      summary: parseResult.summary,
      message: `Successfully parsed ${parseResult.dutyPeriods.length} duty periods with ${parseResult.summary.totalFlights} flights using ${parserUsed} parser`,
      timezoneInfo: {
        isUTC: parserUsed === 'roster-buster' ? true : isUTC,
        defaultTimezone,
        conversionApplied: parserUsed === 'roster-buster' ? true : isUTC
      },
      parserUsed
    });

  } catch (error) {
    console.error('Error parsing roster:', error);
    res.status(500).json({ 
      error: 'Failed to parse roster text',
      details: error.message 
    });
  }
});

/**
 * Detect if the roster text is in Roster Buster calendar format
 * @param {string} rosterText - The roster text to analyze
 * @returns {boolean} - True if it appears to be Roster Buster format
 */
function isRosterBusterFormat(rosterText) {
  // Look for characteristic patterns of Roster Buster calendar
  const rosterBusterPatterns = [
    /Monday\s+Tuesday\s+Wednesday\s+Thursday\s+Friday\s+Saturday\s+Sunday/i, // Calendar header
    /\d{1,2}\s+\d{1,2}\s+\d{1,2}\s+\d{1,2}\s+\d{1,2}\s+\d{1,2}\s+\d{1,2}/, // Date row pattern
    /Unknown - DAYOFF/i, // Roster Buster day off format
    /Rep \d{4}Z/i, // Report time with Z suffix
    /Check Out.*DEB/i, // Check out pattern
    /Layover \(\d+:\d+ hours\)/i, // Layover pattern
    /\d{2}:\d{2}-\d{2}:\d{2}\s+[A-Z]{3}\s*-\s*[A-Z]{3}/i // Flight time pattern
  ];
  
  // Count how many patterns match
  let matchCount = 0;
  for (const pattern of rosterBusterPatterns) {
    if (pattern.test(rosterText)) {
      matchCount++;
    }
  }
  
  // If 2 or more patterns match, it's likely Roster Buster format
  return matchCount >= 2;
}

// Parse flight data endpoint for standby preview
app.post('/api/parse-flight-data', async (req, res) => {
  try {
    const { 
      flightText, 
      baseAirport = 'VIE',
      timezone = 'Europe/Vienna'
    } = req.body;

    console.log('Received flight data for parsing:', {
      textLength: flightText?.length || 0,
      baseAirport,
      timezone
    });

    if (!flightText || typeof flightText !== 'string') {
      return res.status(400).json({ 
        error: 'Invalid flight data text',
        details: ['Flight data text is required and must be a string'],
        example: FLIGHT_DATA_FORMAT_EXAMPLE
      });
    }

    const parseResult = parseFlightData(flightText, { baseAirport, timezone });

    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Failed to parse flight data',
        details: parseResult.errors,
        example: FLIGHT_DATA_FORMAT_EXAMPLE
      });
    }

    res.json({
      success: true,
      flights: parseResult.flights,
      summary: parseResult.summary,
      message: `Successfully parsed ${parseResult.flights.length} flights`
    });

  } catch (error) {
    console.error('Error parsing flight data:', error);
    res.status(500).json({ 
      error: 'Failed to parse flight data',
      details: error.message 
    });
  }
});

// Get available flights for standby period
app.post('/api/standby-preview', async (req, res) => {
  try {
    const { 
      flights,
      standbyStart,
      standbyEnd,
      timezone = 'Europe/Vienna',
      standbyType = 'home'
    } = req.body;

    console.log('Received standby preview request:', {
      flightsCount: flights?.length || 0,
      standbyStart,
      standbyEnd,
      timezone,
      standbyType
    });

    if (!flights || !Array.isArray(flights)) {
      return res.status(400).json({ 
        error: 'Invalid flights data',
        details: ['Flights array is required']
      });
    }

    if (!standbyStart || !standbyEnd) {
      return res.status(400).json({ 
        error: 'Invalid standby times',
        details: ['Both standbyStart and standbyEnd times are required (HH:MM format)']
      });
    }

    // Validate time format
    const timePattern = /^\d{2}:\d{2}$/;
    if (!timePattern.test(standbyStart) || !timePattern.test(standbyEnd)) {
      return res.status(400).json({ 
        error: 'Invalid time format',
        details: ['Times must be in HH:MM format (e.g., 08:00, 16:30)']
      });
    }

    const availableFlights = getAvailableFlights(flights, standbyStart, standbyEnd, timezone, { standbyType });
    const stats = calculateStandbyStats(availableFlights, standbyStart, standbyEnd);

    res.json({
      success: true,
      availableFlights,
      stats,
      standbyPeriod: {
        start: standbyStart,
        end: standbyEnd,
        duration: stats.standbyDuration,
        timezone
      },
      message: `Found ${availableFlights.length} flights available during standby period`
    });

  } catch (error) {
    console.error('Error processing standby preview:', error);
    res.status(500).json({ 
      error: 'Failed to process standby preview',
      details: error.message 
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 EASA FTL Checker server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`✈️  Manual flight entry mode - No OCR required`);
}); 