const moment = require('moment-timezone');

/**
 * Parse flight data text into structured flight information
 * @param {string} flightText - Raw flight data text
 * @param {Object} options - Parsing options
 * @param {string} options.baseAirport - Base airport code (default: 'VIE')
 * @param {string} options.timezone - Timezone for flight times (default: 'Europe/Vienna')
 * @returns {Object} - Parsed flight data with flights array and any errors
 */
function parseFlightData(flightText, options = {}) {
  const { baseAirport = 'VIE', timezone = 'Europe/Vienna' } = options;
  const errors = [];
  const flights = [];
  
  if (!flightText || typeof flightText !== 'string') {
    return {
      success: false,
      errors: ['Invalid flight data text provided'],
      flights: []
    };
  }

  try {
    console.log('🛫 Parsing flight data...', {
      textLength: flightText.length,
      baseAirport,
      timezone
    });

    // Split text into lines and filter out empty lines
    const lines = flightText.trim().split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    // Find the start of flight data (after headers)
    let dataStartIndex = 0;
    for (let i = 0; i < lines.length; i++) {
      // Skip header lines - look for first line with time pattern
      if (/^\d{2}:\d{2}/.test(lines[i])) {
        dataStartIndex = i;
        break;
      }
    }

    // Parse each flight line
    for (let i = dataStartIndex; i < lines.length; i++) {
      const line = lines[i];
      
      // Skip header lines and empty lines
      if (!line || 
          line.length < 10 ||
          !(/^\d{2}:\d{2}/.test(line))) {
        continue;
      }

      const flight = parseFlightLine(line, baseAirport, timezone);
      if (flight) {
        flights.push(flight);
      }
    }

    console.log(`✅ Parsed ${flights.length} flights`);

    return {
      success: true,
      errors: [],
      flights: flights,
      summary: {
        totalFlights: flights.length,
        arrivals: flights.filter(f => f.type === 'ARR').length,
        departures: flights.filter(f => f.type === 'DEP').length,
        scheduled: flights.filter(f => f.status === 'SKD').length,
        landed: flights.filter(f => f.status === 'LDM').length,
        closed: flights.filter(f => f.status === 'CLOSED').length
      }
    };

  } catch (error) {
    console.error('❌ Flight data parsing error:', error);
    return {
      success: false,
      errors: [`Parsing error: ${error.message}`],
      flights: []
    };
  }
}

/**
 * Parse a single flight line into structured data
 * @param {string} line - Flight line text
 * @param {string} baseAirport - Base airport code
 * @param {string} timezone - Timezone for times
 * @returns {Object|null} - Parsed flight object or null if parsing fails
 */
function parseFlightLine(line, baseAirport, timezone) {
  try {
    // Split line by whitespace and filter empty elements
    const parts = line.split(/\s+/).filter(part => part.length > 0);
    
    if (parts.length < 8) {
      return null; // Not enough data
    }

    // Parse the actual OCCGROUND format:
    // scheduledTime delay actualTime delay flightNumber route aircraft type status gate
    // Example: 09:50 +25 11:34 +29 SN2902 VIE - BRU YL-ABL ARR LDM
    
    let scheduledTime = '';
    let scheduledDelay = '';
    let actualTime = '';
    let actualDelay = '';
    let flightNumber = '';
    let route = '';
    let aircraft = '';
    let type = '';
    let status = '';
    let gate = '';

    // Extract times and delays from the beginning
    const timePattern = /^\d{2}:\d{2}$/;
    const delayPattern = /^[+-]\d+$/;
    
    let index = 0;
    
    // First time (scheduled)
    if (index < parts.length && timePattern.test(parts[index])) {
      scheduledTime = parts[index];
      index++;
    }
    
    // First delay (scheduled delay)
    if (index < parts.length && delayPattern.test(parts[index])) {
      scheduledDelay = parts[index];
      index++;
    }
    
    // Second time (actual)
    if (index < parts.length && timePattern.test(parts[index])) {
      actualTime = parts[index];
      index++;
    }
    
    // Second delay (actual delay)
    if (index < parts.length && delayPattern.test(parts[index])) {
      actualDelay = parts[index];
      index++;
    }

    // Flight number (format: XX123 or similar)
    if (index < parts.length && /^[A-Z]{2}\d{3,4}$/.test(parts[index])) {
      flightNumber = parts[index];
      index++;
    }

    // Route (format: XXX - XXX)
    if (index + 2 < parts.length && parts[index + 1] === '-') {
      route = `${parts[index]} - ${parts[index + 2]}`;
      index += 3;
    }

    // Aircraft registration (format: YL-XXX)
    if (index < parts.length && /^YL-[A-Z]{3}$/.test(parts[index])) {
      aircraft = parts[index];
      index++;
    }

    // Type (ARR/DEP)
    if (index < parts.length && (parts[index] === 'ARR' || parts[index] === 'DEP')) {
      type = parts[index];
      index++;
    }

    // Gate (optional, numeric)
    if (index < parts.length && /^\d{3}$/.test(parts[index])) {
      gate = parts[index];
      index++;
    }

    // Status (remaining parts)
    const remainingParts = parts.slice(index);
    if (remainingParts.includes('CLOSED')) {
      status = 'CLOSED';
    } else if (remainingParts.includes('LDM')) {
      status = 'LDM'; // Load Message - flight is active and can be assigned
    } else if (remainingParts.includes('SKD')) {
      status = 'SKD'; // Scheduled
    } else {
      status = 'SKD'; // Default
    }

    // If type is not determined, infer from route and base airport
    if (!type && route.includes(baseAirport)) {
      if (route.endsWith(baseAirport)) {
        type = 'ARR';
      } else if (route.startsWith(baseAirport)) {
        type = 'DEP';
      }
    }

    // Use the most relevant delay (actual delay if available, otherwise scheduled delay)
    const delay = actualDelay || scheduledDelay || '0';

    // Create moment objects for time comparison
    const today = moment().tz(timezone);
    const flightMoment = moment(`${today.format('YYYY-MM-DD')} ${scheduledTime}`, 'YYYY-MM-DD HH:mm').tz(timezone);
    
    // If flight time is in the past, assume it's tomorrow
    if (flightMoment.isBefore(today)) {
      flightMoment.add(1, 'day');
    }

    return {
      flightNumber,
      route,
      aircraft,
      scheduledTime,
      actualTime,
      delay,
      type,
      status,
      gate,
      scheduledDateTime: flightMoment.toISOString(),
      delayMinutes: delay ? parseInt(delay) : 0,
      isDelayed: delay && parseInt(delay) !== 0,
      canBeAssigned: status !== 'CLOSED' // LDM (Load Message) means flight is active and assignable
    };

  } catch (error) {
    console.warn('⚠️ Failed to parse flight line:', line, error.message);
    return null;
  }
}

/**
 * Filter flights available for standby crew based on standby period
 * @param {Array} flights - Array of flight objects
 * @param {string} standbyStart - Standby start time (HH:MM)
 * @param {string} standbyEnd - Standby end time (HH:MM)
 * @param {string} timezone - Timezone for calculations
 * @param {Object} options - Additional options
 * @param {string} options.standbyType - 'airport' or 'home' standby type
 * @returns {Array} - Filtered flights available during standby period
 */
function getAvailableFlights(flights, standbyStart, standbyEnd, timezone = 'Europe/Vienna', options = {}) {
  if (!flights || !standbyStart || !standbyEnd) {
    return [];
  }

  try {
    const today = moment().tz(timezone);
    
    // Use the same date logic as flights - if we're past the standby time today, assume tomorrow
    let standbyDate = today.clone();
    const currentTime = today.format('HH:mm');
    if (currentTime > standbyEnd) {
      standbyDate.add(1, 'day');
    }
    
    const standbyStartMoment = moment(`${standbyDate.format('YYYY-MM-DD')} ${standbyStart}`, 'YYYY-MM-DD HH:mm').tz(timezone);
    const standbyEndMoment = moment(`${standbyDate.format('YYYY-MM-DD')} ${standbyEnd}`, 'YYYY-MM-DD HH:mm').tz(timezone);

    // Handle overnight standby periods
    if (standbyEndMoment.isBefore(standbyStartMoment)) {
      standbyEndMoment.add(1, 'day');
    }

    return flights.filter(flight => {
      if (!flight.canBeAssigned) {
        return false;
      }

      const flightMoment = moment(flight.scheduledDateTime).tz(timezone);
      
      // Flight should be within standby period or shortly after
      // Allow realistic buffer for crew callout and reporting based on standby type
      const { standbyType = 'home' } = options;
      let calloutBuffer;
      
      if (standbyType === 'airport') {
        // Airport standby: 20 min notification + minimal prep time
        calloutBuffer = 30; // 30 minutes
      } else {
        // Home standby: 20 min notification + travel + prep time
        calloutBuffer = 90; // 1.5 hours (EASA: 20 min notification + 70 min travel/prep)
      }
      
      const earliestCallTime = flightMoment.clone().subtract(calloutBuffer, 'minutes');
      
      return earliestCallTime.isBetween(standbyStartMoment, standbyEndMoment, null, '[]');
    });

  } catch (error) {
    console.error('❌ Error filtering available flights:', error);
    return [];
  }
}

/**
 * Calculate standby duty statistics
 * @param {Array} availableFlights - Flights available during standby
 * @param {string} standbyStart - Standby start time
 * @param {string} standbyEnd - Standby end time
 * @returns {Object} - Standby statistics
 */
function calculateStandbyStats(availableFlights, standbyStart, standbyEnd) {
  const stats = {
    totalFlights: availableFlights.length,
    arrivals: availableFlights.filter(f => f.type === 'ARR').length,
    departures: availableFlights.filter(f => f.type === 'DEP').length,
    delayedFlights: availableFlights.filter(f => f.isDelayed).length,
    averageDelay: 0,
    standbyDuration: calculateStandbyDuration(standbyStart, standbyEnd),
    flightsByHour: {}
  };

  // Calculate average delay
  const delayedFlights = availableFlights.filter(f => f.isDelayed);
  if (delayedFlights.length > 0) {
    const totalDelay = delayedFlights.reduce((sum, f) => sum + Math.abs(f.delayMinutes), 0);
    stats.averageDelay = Math.round(totalDelay / delayedFlights.length);
  }

  // Group flights by hour
  availableFlights.forEach(flight => {
    const hour = flight.scheduledTime.split(':')[0];
    if (!stats.flightsByHour[hour]) {
      stats.flightsByHour[hour] = 0;
    }
    stats.flightsByHour[hour]++;
  });

  return stats;
}

/**
 * Calculate standby duty duration in hours
 * @param {string} startTime - Start time (HH:MM)
 * @param {string} endTime - End time (HH:MM)
 * @returns {number} - Duration in hours
 */
function calculateStandbyDuration(startTime, endTime) {
  try {
    const start = moment(startTime, 'HH:mm');
    const end = moment(endTime, 'HH:mm');
    
    if (end.isBefore(start)) {
      end.add(1, 'day');
    }
    
    return end.diff(start, 'hours', true);
  } catch (error) {
    return 0;
  }
}

/**
 * Example flight data format for documentation
 */
const FLIGHT_DATA_FORMAT_EXAMPLE = `
Expected Flight Data Format:

OCCGROUND
PROD
Flights

Day of origin
Airport
VIE

06:19  -6   08:08  -17  BT271   RIX - VIE  YL-AAU  ARR  144  LDM  CLOSED
06:49  -1   08:54  +19  SN2901  BRU - VIE  YL-ABL  ARR       LDM
07:15  +5   09:22  +2   OS311   VIE - ARN  YL-CSE  ARR       LDM
...

Format explanation:
- Scheduled time, delay, actual time, delay, flight number, route, aircraft, type, gate, status
- Times in HH:MM format
- Delays as +/- minutes
- Routes as XXX - XXX format
- Aircraft as YL-XXX format
- Status: LDM (Landed), SKD (Scheduled), CLOSED
`;

module.exports = {
  parseFlightData,
  getAvailableFlights,
  calculateStandbyStats,
  calculateStandbyDuration,
  FLIGHT_DATA_FORMAT_EXAMPLE
}; 