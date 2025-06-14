const moment = require('moment-timezone');
const { getAirportTimezone } = require('./airportTimezones');

/**
 * Parse roster text into structured duty periods
 * @param {string} rosterText - Raw roster text
 * @param {Object} options - Parsing options
 * @param {boolean} options.isUTC - Whether times in roster are in UTC (default: false)
 * @param {string} options.defaultTimezone - Default timezone if airport not found (default: 'Europe/Vienna')
 * @returns {Object} - Parsed data with duty periods array and any errors
 */
function parseRosterText(rosterText, options = {}) {
  const { isUTC = false, defaultTimezone = 'Europe/Vienna' } = options;
  const errors = [];
  const dutyPeriods = [];
  
  if (!rosterText || typeof rosterText !== 'string') {
    return {
      success: false,
      errors: ['Invalid roster text provided'],
      dutyPeriods: []
    };
  }

  try {
    const lines = rosterText.trim().split('\n').map(line => line.trim()).filter(line => line.length > 0);
    let currentDuty = null;
    let currentDate = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check if line is a date header (e.g., "Sat07", "Sun08", "Sat07 C/I VIE 1200")
      const dateMatch = line.match(/^([A-Za-z]{3})(\d{2})(?:\s|$)/);
      if (dateMatch) {
        // Save previous duty if exists
        if (currentDuty) {
          dutyPeriods.push(currentDuty);
        }
        
        // Parse new date
        const dayName = dateMatch[1];
        const dayNumber = parseInt(dateMatch[2]);
        currentDate = parseDate(dayName, dayNumber);
        
        // Parse C/I (Check-In) time - look for it in the same line or expect it in next lines
        const checkInMatch = line.match(/C\/I\s+([A-Z]{3})\s+(\d{4})/);
        if (checkInMatch) {
          const airport = checkInMatch[1];
          const utcTime = checkInMatch[2];
          const localTime = convertTime(utcTime, currentDate, airport, isUTC, defaultTimezone);
          
          currentDuty = {
            id: generateId(),
            date: currentDate,
            type: 'FLIGHT',
            reportTime: localTime,
            offDutyTime: '', // Will be set when C/O is found
            flights: [],
            notes: `Base: ${airport}${isUTC ? ' (UTC→Local)' : ''}`
          };
        } else {
          // If no C/I in the same line, create a placeholder duty that will be filled when C/I is found
          currentDuty = {
            id: generateId(),
            date: currentDate,
            type: 'FLIGHT',
            reportTime: '',
            offDutyTime: '',
            flights: [],
            notes: ''
          };
        }
        continue;
      }
      
      // Check for standalone C/I line (when not on the same line as date)
      const standaloneCheckInMatch = line.match(/^C\/I\s+([A-Z]{3})\s+(\d{4})$/);
      if (standaloneCheckInMatch && currentDuty && !currentDuty.reportTime) {
        const airport = standaloneCheckInMatch[1];
        const utcTime = standaloneCheckInMatch[2];
        const localTime = convertTime(utcTime, currentDate, airport, isUTC, defaultTimezone);
        currentDuty.reportTime = localTime;
        currentDuty.notes = `Base: ${airport}${isUTC ? ' (UTC→Local)' : ''}`;
        continue;
      }
      // Check if line is a flight (e.g., "OS 655 VIE 1314 1454 RMO A220")
      const flightMatch = line.match(/^([A-Z]{2})\s+(\d{3,4})\s+([A-Z]{3})\s+(\d{4})\s+(\d{4})\s+([A-Z]{3})\s+([A-Z0-9]+)$/);
      if (flightMatch && currentDuty) {
        const airline = flightMatch[1];
        const flightNum = flightMatch[2];
        const departure = flightMatch[3];
        const utcDepTime = flightMatch[4];
        const utcArrTime = flightMatch[5];
        const arrival = flightMatch[6];
        const aircraft = flightMatch[7];
        
        // Convert times to local times based on departure/arrival airports
        const localDepTime = convertTime(utcDepTime, currentDate, departure, isUTC, defaultTimezone);
        const localArrTime = convertTime(utcArrTime, currentDate, arrival, isUTC, defaultTimezone);
        
        const flight = {
          flightNumber: `${airline}${flightNum}`,
          departure: departure,
          arrival: arrival,
          departureTime: localDepTime,
          arrivalTime: localArrTime,
          aircraftType: aircraft
        };
        
        currentDuty.flights.push(flight);
        continue;
      }
      
      // Check if line is C/O (Check-Out) with times
      const checkOutMatch = line.match(/^C\/O\s+(\d{4})\s+([A-Z]{3})\s+\[FT\s+(\d{2}:\d{2})\]/);
      if (checkOutMatch && currentDuty) {
        const utcTime = checkOutMatch[1];
        const airport = checkOutMatch[2];
        const flightTime = checkOutMatch[3];
        const localTime = convertTime(utcTime, currentDate, airport, isUTC, defaultTimezone);
        
        currentDuty.offDutyTime = localTime;
        currentDuty.notes += ` | End: ${airport} | FT: ${flightTime}`;
        continue;
      }
      
      // Check for duty period summary lines [DP xx:xx] and [FDP xx:xx]
      const dpMatch = line.match(/\[DP\s+(\d{2}:\d{2})\]/);
      const fdpMatch = line.match(/\[FDP\s+(\d{2}:\d{2})\]/);
      
      if (dpMatch && currentDuty) {
        currentDuty.notes += ` | DP: ${dpMatch[1]}`;
      }
      
      if (fdpMatch && currentDuty) {
        currentDuty.notes += ` | FDP: ${fdpMatch[1]}`;
      }
    }
    
    // Add the last duty period
    if (currentDuty) {
      dutyPeriods.push(currentDuty);
    }
    
    // Validate parsed data
    const validationErrors = validateParsedData(dutyPeriods);
    errors.push(...validationErrors);
    
    return {
      success: errors.length === 0,
      errors: errors,
      dutyPeriods: dutyPeriods,
      summary: {
        totalDays: dutyPeriods.length,
        totalFlights: dutyPeriods.reduce((sum, duty) => sum + (duty.flights?.length || 0), 0),
        timezoneInfo: isUTC ? 'Times converted from UTC to local' : 'Times assumed to be local'
      }
    };
    
  } catch (error) {
    return {
      success: false,
      errors: [`Parsing error: ${error.message}`],
      dutyPeriods: []
    };
  }
}

/**
 * Parse date from day name and number
 * @param {string} dayName - Day name (e.g., "Sat", "Sun")
 * @param {number} dayNumber - Day number (e.g., 7, 8)
 * @returns {string} - Formatted date string YYYY-MM-DD
 */
function parseDate(dayName, dayNumber) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const today = moment();
  
  // Try current month first
  let currentMonthDate = moment(`${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${dayNumber.toString().padStart(2, '0')}`);
  
  // Try next month
  const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
  const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
  let nextMonthDate = moment(`${nextYear}-${(nextMonth + 1).toString().padStart(2, '0')}-${dayNumber.toString().padStart(2, '0')}`);
  
  // If current month date is valid and in the future (or today), use it
  if (currentMonthDate.isValid() && currentMonthDate.isSameOrAfter(today, 'day')) {
    return currentMonthDate.format('YYYY-MM-DD');
  }
  
  // If current month date is in the past, prefer next month if valid
  if (nextMonthDate.isValid()) {
    return nextMonthDate.format('YYYY-MM-DD');
  }
  
  // Fallback to current month date even if it's in the past
  if (currentMonthDate.isValid()) {
    return currentMonthDate.format('YYYY-MM-DD');
  }
  
  // Last resort: use next month date even if invalid (shouldn't happen)
  return nextMonthDate.format('YYYY-MM-DD');
}

/**
 * Format time from 4-digit format to HH:MM
 * @param {string} timeStr - Time in format "1314" or "0915"
 * @returns {string} - Time in format "13:14" or "09:15"
 */
function formatTime(timeStr) {
  if (timeStr.length !== 4) return timeStr;
  return `${timeStr.substring(0, 2)}:${timeStr.substring(2, 4)}`;
}

/**
 * Generate unique ID for duty periods
 * @returns {string} - Unique identifier
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Validate parsed duty periods
 * @param {Array} dutyPeriods - Array of parsed duty periods
 * @returns {Array} - Array of validation errors
 */
function validateParsedData(dutyPeriods) {
  const errors = [];
  
  dutyPeriods.forEach((duty, index) => {
    if (!duty.date) {
      errors.push(`Duty ${index + 1}: Missing date`);
    }
    
    if (!duty.reportTime) {
      errors.push(`Duty ${index + 1}: Missing report time`);
    }
    
    if (!duty.offDutyTime) {
      errors.push(`Duty ${index + 1}: Missing off-duty time`);
    }
    
    if (!duty.flights || duty.flights.length === 0) {
      errors.push(`Duty ${index + 1}: No flights found`);
    } else {
      duty.flights.forEach((flight, flightIndex) => {
        if (!flight.flightNumber) {
          errors.push(`Duty ${index + 1}, Flight ${flightIndex + 1}: Missing flight number`);
        }
        if (!flight.departure || flight.departure.length !== 3) {
          errors.push(`Duty ${index + 1}, Flight ${flightIndex + 1}: Invalid departure airport`);
        }
        if (!flight.arrival || flight.arrival.length !== 3) {
          errors.push(`Duty ${index + 1}, Flight ${flightIndex + 1}: Invalid arrival airport`);
        }
        if (!flight.departureTime) {
          errors.push(`Duty ${index + 1}, Flight ${flightIndex + 1}: Missing departure time`);
        }
        if (!flight.arrivalTime) {
          errors.push(`Duty ${index + 1}, Flight ${flightIndex + 1}: Missing arrival time`);
        }
      });
    }
  });
  
  return errors;
}

/**
 * Convert time from UTC to local timezone or format local time
 * @param {string} timeStr - Time in format "1314" or "0915"
 * @param {string} date - Date in format "YYYY-MM-DD"
 * @param {string} airportCode - IATA airport code
 * @param {boolean} isUTC - Whether the input time is in UTC
 * @param {string} defaultTimezone - Default timezone if airport not found
 * @returns {string} - Time in format "13:14" or "09:15" in local time
 */
function convertTime(timeStr, date, airportCode, isUTC, defaultTimezone) {
  const formattedTime = formatTime(timeStr);
  
  if (!isUTC) {
    // If not UTC, just return formatted time
    return formattedTime;
  }
  
  try {
    // Get timezone for the airport
    const timezone = getAirportTimezone(airportCode) || defaultTimezone;
    
    // Create UTC moment
    const utcMoment = moment.utc(`${date} ${formattedTime}`, 'YYYY-MM-DD HH:mm');
    
    // Convert to local timezone
    const localMoment = utcMoment.tz(timezone);
    
    return localMoment.format('HH:mm');
  } catch (error) {
    console.warn(`Time conversion error for ${timeStr} at ${airportCode}:`, error.message);
    return formattedTime; // Fallback to original formatted time
  }
}

/**
 * Example of expected roster format for documentation
 */
const ROSTER_FORMAT_EXAMPLE = `Sat07 C/I VIE 1200
OS 655 VIE 1314 1454 RMO A220
OS 656 RMO 1539 1715 VIE A220
OS 377 VIE 1822 2019 AMS A220
C/O 2039 AMS [FT 05:13]
[DP 08:39]
[FDP 08:19]
Sun08 C/I AMS 0915
OS 380 AMS 1100 1240 VIE A220
OS 213 VIE 1332 1502 FRA A220
OS 214 FRA 1601 1720 VIE A220
OS 377 VIE 1816 2012 AMS A220
C/O 2032 AMS [FT 06:25]
[DP 11:17]
[FDP 10:57]`;

module.exports = {
  parseRosterText,
  ROSTER_FORMAT_EXAMPLE
}; 