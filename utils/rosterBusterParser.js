const moment = require('moment-timezone');
const { getAirportTimezone } = require('./airportTimezones');

/**
 * Parse Roster Buster calendar text into structured duty periods
 * @param {string} rosterText - Raw roster text from Roster Buster calendar
 * @param {Object} options - Parsing options
 * @param {boolean} options.isUTC - Whether times in roster are in UTC (default: true for Roster Buster)
 * @param {string} options.defaultTimezone - Default timezone if airport not found (default: 'Europe/Vienna')
 * @returns {Object} - Parsed data with duty periods array and any errors
 */
function parseRosterBusterCalendar(rosterText, options = {}) {
  const { isUTC = true, defaultTimezone = 'Europe/Vienna' } = options;
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
    console.log('🔍 Parsing roster text...', {
      textLength: rosterText.length,
      isUTC,
      defaultTimezone,
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1
    });

    // Extract month/year from header (e.g., "June 2025")
    const monthYearMatch = rosterText.match(/([A-Za-z]+)\s+(\d{4})/);
    let year = new Date().getFullYear();
    let month = new Date().getMonth() + 1;
    
    if (monthYearMatch) {
      const monthName = monthYearMatch[1];
      year = parseInt(monthYearMatch[2]);
      month = getMonthNumber(monthName);
      console.log('📅 Detected period:', `${monthName} ${year}`);
    }

    // Parse duty blocks - each duty block starts with a day number
    const dutyBlocks = extractDutyBlocks(rosterText);
    
    for (const block of dutyBlocks) {
      const duty = parseDutyBlock(block, year, month, isUTC, defaultTimezone);
      if (duty) {
        dutyPeriods.push(duty);
        console.log(`📅 Processing date: ${duty.date} (${getDayName(duty.date)})`);
        
        if (duty.type === 'DAYOFF') {
          console.log('  ✅ Day off detected');
        } else if (duty.type === 'STANDBY') {
          console.log(`  ⏰ Standby: ${duty.reportTime} - ${duty.offDutyTime}`);
        } else if (duty.type === 'FLIGHT') {
          console.log(`  ✈️  Flight duty: ${duty.reportTime} - ${duty.offDutyTime || 'TBD'}`);
          if (duty.flights && duty.flights.length > 0) {
            console.log(`     Flights: ${duty.flights.length}`);
          }
          if (duty.layover) {
            console.log(`    🏨 Layover: ${duty.layover}`);
          }
        }
      }
    }
    
    // Validate parsed data
    const validationErrors = validateParsedData(dutyPeriods.filter(d => d.type !== 'DAYOFF'));
    
    console.log(`✅ Parsed ${dutyPeriods.length} duty periods`);
    console.log(`✅ Validated ${dutyPeriods.filter(d => d.type !== 'DAYOFF').length} out of ${dutyPeriods.length} duty periods`);
    
    return {
      success: validationErrors.length === 0,
      errors: validationErrors,
      dutyPeriods: dutyPeriods,
      summary: {
        totalDays: dutyPeriods.length,
        totalFlights: dutyPeriods.reduce((sum, duty) => sum + (duty.flights?.length || 0), 0),
        flightDays: dutyPeriods.filter(d => d.type === 'FLIGHT').length,
        standbyDays: dutyPeriods.filter(d => d.type === 'STANDBY').length,
        dayOffs: dutyPeriods.filter(d => d.type === 'DAYOFF').length,
        timezoneInfo: isUTC ? 'Times converted from UTC to local' : 'Times assumed to be local'
      }
    };
    
  } catch (error) {
    console.error('❌ Parsing error:', error);
    return {
      success: false,
      errors: [`Parsing error: ${error.message}`],
      dutyPeriods: []
    };
  }
}

/**
 * Extract duty blocks from the copied Roster Buster text
 * @param {string} rosterText - Raw roster text
 * @returns {Array} - Array of duty blocks
 */
function extractDutyBlocks(rosterText) {
  const blocks = [];
  
  // Split text into lines
  const lines = rosterText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  // Strategy: Find all Rep times and associate them with day numbers
  // This is more reliable than trying to parse the complex grid structure
  
  const repPattern = /(\d{2}:\d{2})-\d{2}:\d{2}\s+\(Rep\s+(\d{4})Z?\)/g;
  const dayPattern = /\b(\d{1,2})\b/g;
  
  // Find all Rep times with their line numbers
  const repTimes = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let match;
    
    while ((match = repPattern.exec(line)) !== null) {
      repTimes.push({
        lineIndex: i,
        line: line,
        reportTime: match[1],
        repCode: match[2],
        fullMatch: match[0],
        used: false // Track if this Rep time has been used
      });
    }
    repPattern.lastIndex = 0; // Reset regex
  }
  
  console.log(`📅 Found ${repTimes.length} Rep times:`, repTimes.map(r => `${r.reportTime} (${r.repCode})`));
  
  // Find all day numbers with their line numbers
  const dayNumbers = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip month/year header
    if (line.match(/^[A-Za-z]+\s+\d{4}$/)) continue;
    
    // Look for day numbers (but exclude times)
    const potentialDays = [];
    let match;
    
    while ((match = dayPattern.exec(line)) !== null) {
      const num = parseInt(match[1]);
      const beforeChar = line[match.index - 1] || ' ';
      const afterChar = line[match.index + match[0].length] || ' ';
      
      // Only consider it a day if it's 1-31 and not part of a time (no colons around it)
      if (num >= 1 && num <= 31 && beforeChar !== ':' && afterChar !== ':') {
        potentialDays.push({
          day: num,
          lineIndex: i,
          position: match.index,
          used: false // Track if this day has been assigned a duty
        });
      }
    }
    
    dayNumbers.push(...potentialDays);
    dayPattern.lastIndex = 0; // Reset regex
  }
  
  console.log(`📅 Found ${dayNumbers.length} day numbers`);
  
  // Associate each Rep time with the closest unused day number
  for (const repTime of repTimes) {
    if (repTime.used) continue;
    
    // Find the closest unused day number (looking backwards first, then forwards)
    let closestDay = null;
    let minDistance = Infinity;
    
    for (const dayNum of dayNumbers) {
      if (dayNum.used) continue; // Skip already used days
      
      const distance = Math.abs(repTime.lineIndex - dayNum.lineIndex);
      
      // Prefer day numbers that come before or on the same line as the Rep time
      const penalty = dayNum.lineIndex > repTime.lineIndex ? 5 : 0;
      const adjustedDistance = distance + penalty;
      
      if (adjustedDistance < minDistance) {
        minDistance = adjustedDistance;
        closestDay = dayNum;
      }
    }
    
    if (closestDay && minDistance <= 10) { // Only associate if reasonably close
      // Extract content for this duty
      const dayContent = extractDayContent(lines, repTime, closestDay);
      
      blocks.push({
        day: closestDay.day,
        content: dayContent
      });
      
      // Mark both as used to prevent duplicates
      repTime.used = true;
      closestDay.used = true;
      
      console.log(`📅 Day ${closestDay.day} -> Rep ${repTime.reportTime} (distance: ${minDistance})`);
    }
  }
  
  // Add standby duties (SBYHOME)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('SBYHOME')) {
      // Find the closest unused day number for this standby
      let closestDay = null;
      let minDistance = Infinity;
      
      for (const dayNum of dayNumbers) {
        if (dayNum.used) continue;
        
        const distance = Math.abs(i - dayNum.lineIndex);
        if (distance < minDistance && distance <= 5) {
          minDistance = distance;
          closestDay = dayNum;
        }
      }
      
      if (closestDay) {
        blocks.push({
          day: closestDay.day,
          content: line
        });
        
        closestDay.used = true;
        console.log(`📅 Day ${closestDay.day} -> Standby (SBYHOME)`);
      }
    }
  }
  
  // Add day-offs for remaining unused days
  const daysWithDuties = new Set(blocks.map(b => b.day));
  
  // Find all unique day numbers and add day-offs for missing ones
  const allDays = [...new Set(dayNumbers.map(d => d.day))].sort((a, b) => a - b);
  
  for (const day of allDays) {
    if (!daysWithDuties.has(day)) {
      // Check if this day is explicitly mentioned as a day off
      let isDayOff = false;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes(day.toString()) && (line.includes('DAYOFF') || line.includes('Day off'))) {
          isDayOff = true;
          break;
        }
      }
      
      blocks.push({
        day: day,
        content: isDayOff ? 'Day off - DAYOFF' : 'Day off - DAYOFF'
      });
      
      console.log(`📅 Day ${day}: Day off`);
    }
  }
  
  // Sort blocks by day number and remove duplicates
  const uniqueBlocks = [];
  const seenDays = new Set();
  
  blocks.sort((a, b) => a.day - b.day);
  
  for (const block of blocks) {
    if (!seenDays.has(block.day)) {
      uniqueBlocks.push(block);
      seenDays.add(block.day);
    }
  }
  
  return uniqueBlocks;
}

/**
 * Extract content for a specific day based on Rep time and day number
 * @param {Array} lines - All lines from the roster text
 * @param {Object} repTime - Rep time object
 * @param {Object} dayNum - Day number object
 * @returns {string} - Content for the day
 */
function extractDayContent(lines, repTime, dayNum) {
  let content = '';
  
  // Start from the Rep time line and collect relevant content
  const startLine = Math.min(repTime.lineIndex, dayNum.lineIndex);
  const endLine = Math.min(lines.length, startLine + 20); // Look ahead max 20 lines
  
  for (let i = startLine; i < endLine; i++) {
    const line = lines[i];
    
    // Include lines that contain flight-related information
    if (line.includes('Rep ') || 
        line.includes('Check Out') ||
        line.match(/\d{2}:\d{2}-\d{2}:\d{2}\s+[A-Z]{3}\s*-\s*[A-Z]{3}/) ||
        line.includes('SBYHOME')) {
      content += line + '\n';
    }
    
    // Stop if we hit another Rep time (next duty)
    if (i > repTime.lineIndex && line.includes('Rep ') && !line.includes(repTime.repCode)) {
      break;
    }
  }
  
  return content.trim();
}

/**
 * Parse a single duty block
 * @param {Object} block - Duty block with day and content
 * @param {number} year - Year
 * @param {number} month - Month (1-12)
 * @param {boolean} isUTC - Whether times are in UTC
 * @param {string} defaultTimezone - Default timezone
 * @returns {Object|null} - Parsed duty period or null
 */
function parseDutyBlock(block, year, month, isUTC, defaultTimezone) {
  const { day, content } = block;
  const date = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  
  // Check for day off patterns
  if (content.includes('DAYOFF') || content.includes('Day off')) {
    return {
      id: generateId(),
      date: date,
      type: 'DAYOFF',
      notes: 'Day off'
    };
  }
  
  // Check for standby patterns
  if (content.includes('SBYHOME')) {
    const standbyMatch = content.match(/(\d{2}:\d{2})-(\d{2}:\d{2})\s+Unknown\s*-\s*SBYHOME/);
    if (standbyMatch) {
      const reportTimeObj = convertTime(standbyMatch[1], date, 'VIE', isUTC, defaultTimezone);
      const offDutyTimeObj = convertTime(standbyMatch[2], date, 'VIE', isUTC, defaultTimezone);
      
      return {
        id: generateId(),
        date: date,
        type: 'STANDBY',
        reportTime: reportTimeObj.time,
        offDutyTime: offDutyTimeObj.time,
        notes: 'Standby duty (SBYHOME)'
      };
    }
  }
  
  // Look for report time pattern (Rep HHMMZ)
  const reportMatch = content.match(/\(Rep\s+(\d{4})Z?\)/);
  if (!reportMatch) return null;
  
  const reportTime = `${reportMatch[1].substring(0, 2)}:${reportMatch[1].substring(2, 4)}`;
  
  // Extract flights - exclude layover lines and other non-flight text
  const flights = [];
  
  // First, remove layover lines to avoid false matches
  const contentWithoutLayovers = content.replace(/\d{2}:\d{2}\s+Layover\s*\([^)]+\)/g, '');
  
  const flightPattern = /(\d{2}:\d{2})-(\d{2}:\d{2})\s+([A-Z]{3})\s*-\s*([A-Z]{3})/g;
  let flightMatch;
  
  while ((flightMatch = flightPattern.exec(contentWithoutLayovers)) !== null) {
    const depTime = flightMatch[1];
    const arrTime = flightMatch[2];
    const depAirport = flightMatch[3];
    const arrAirport = flightMatch[4];
    
    // Skip invalid flights (same departure and arrival with very short duration)
    if (depAirport === arrAirport) {
      const depHour = parseInt(depTime.split(':')[0]);
      const depMin = parseInt(depTime.split(':')[1]);
      const arrHour = parseInt(arrTime.split(':')[0]);
      const arrMin = parseInt(arrTime.split(':')[1]);
      
      const depMinutes = depHour * 60 + depMin;
      const arrMinutes = arrHour * 60 + arrMin;
      const durationMinutes = arrMinutes - depMinutes;
      
      // Skip flights with same airport and less than 30 minutes duration
      if (durationMinutes < 30 && durationMinutes >= 0) {
        console.warn(`⚠️  Skipping invalid flight: ${depAirport}-${arrAirport} (${durationMinutes} minutes)`);
        continue;
      }
    }
    
    // Convert times and handle potential date changes
    const depTimeObj = convertTime(depTime, date, depAirport, isUTC, defaultTimezone);
    let arrTimeObj = convertTime(arrTime, date, arrAirport, isUTC, defaultTimezone);
    
    // Handle overnight flights - check if arrival is before departure after UTC conversion
    if (depTimeObj.moment && arrTimeObj.moment) {
      let flightDuration = moment.duration(arrTimeObj.moment.diff(depTimeObj.moment));
      let durationHours = flightDuration.asHours();
      
      // If duration is negative, arrival is likely next day
      if (durationHours < 0) {
        const nextDay = moment(date).add(1, 'day').format('YYYY-MM-DD');
        arrTimeObj = convertTime(arrTime, nextDay, arrAirport, isUTC, defaultTimezone);
        
        // Recalculate duration
        if (arrTimeObj.moment) {
          flightDuration = moment.duration(arrTimeObj.moment.diff(depTimeObj.moment));
          durationHours = flightDuration.asHours();
        }
      }
      
      // Skip flights with unrealistic durations
      if (durationHours < 0.5 || durationHours > 16) {
        console.warn(`⚠️  Skipping flight with unusual duration: ${durationHours.toFixed(1)}h for ${depAirport}-${arrAirport} on ${date}`);
        continue;
      }
    }
    
    flights.push({
      flightNumber: `FL${flights.length + 1}`,
      departure: depAirport,
      arrival: arrAirport,
      departureTime: depTimeObj.time,
      arrivalTime: arrTimeObj.time,
      aircraftType: 'Unknown'
    });
  }
  
  // Extract check-out time
  let offDutyTime = '';
  const checkOutMatch = content.match(/(\d{2}:\d{2})\s+Check\s+Out\s*[-:]\s*([A-Z]{3})/);
  if (checkOutMatch) {
    const checkOutTimeStr = checkOutMatch[1];
    const checkOutAirport = checkOutMatch[2];
    const checkOutTimeObj = convertTime(checkOutTimeStr, date, checkOutAirport, isUTC, defaultTimezone);
    offDutyTime = checkOutTimeObj.time;
  }
  
  // Create duty period (ignoring layover information completely)
  const reportTimeObj = convertTime(reportTime, date, flights[0]?.departure || 'VIE', isUTC, defaultTimezone);
  
  const duty = {
    id: generateId(),
    date: date,
    type: 'FLIGHT',
    reportTime: reportTimeObj.time,
    offDutyTime: offDutyTime,
    flights: flights,
    notes: `Parsed from Roster Buster${isUTC ? ' (UTC→Local)' : ''}`
  };
  
  return duty;
}

/**
 * Convert month name to number
 * @param {string} monthName - Month name (e.g., "June", "January")
 * @returns {number} - Month number (1-12)
 */
function getMonthNumber(monthName) {
  const months = {
    'January': 1, 'February': 2, 'March': 3, 'April': 4,
    'May': 5, 'June': 6, 'July': 7, 'August': 8,
    'September': 9, 'October': 10, 'November': 11, 'December': 12
  };
  return months[monthName] || new Date().getMonth() + 1;
}

/**
 * Get day name from date
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {string} - Day name
 */
function getDayName(date) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[new Date(date).getDay()];
}

/**
 * Convert time from UTC to local timezone or format local time
 * @param {string} timeStr - Time in format "13:14" or "1314"
 * @param {string} date - Date in format "YYYY-MM-DD"
 * @param {string} airportCode - IATA airport code
 * @param {boolean} isUTC - Whether the input time is in UTC
 * @param {string} defaultTimezone - Default timezone if airport not found
 * @returns {Object} - Object with time and date information
 */
function convertTime(timeStr, date, airportCode, isUTC, defaultTimezone) {
  if (!timeStr) return { time: '', date: date, moment: null };
  
  // Ensure time is in HH:MM format
  let formattedTime = timeStr;
  if (timeStr.length === 4 && !timeStr.includes(':')) {
    formattedTime = `${timeStr.substring(0, 2)}:${timeStr.substring(2, 4)}`;
  }
  
  if (!isUTC) {
    const localMoment = moment(`${date} ${formattedTime}`, 'YYYY-MM-DD HH:mm');
    return { 
      time: formattedTime, 
      date: date, 
      moment: localMoment 
    };
  }
  
  try {
    // Get timezone for the airport
    const timezone = getAirportTimezone(airportCode) || defaultTimezone;
    
    // Create UTC moment
    const utcMoment = moment.utc(`${date} ${formattedTime}`, 'YYYY-MM-DD HH:mm');
    
    // Convert to local timezone
    const localMoment = utcMoment.tz(timezone);
    
    return { 
      time: localMoment.format('HH:mm'), 
      date: localMoment.format('YYYY-MM-DD'), 
      moment: localMoment 
    };
  } catch (error) {
    console.warn(`Time conversion error for ${timeStr} at ${airportCode}:`, error.message);
    const localMoment = moment(`${date} ${formattedTime}`, 'YYYY-MM-DD HH:mm');
    return { 
      time: formattedTime, 
      date: date, 
      moment: localMoment 
    };
  }
}

/**
 * Generate unique ID for duty periods
 * @returns {string} - Unique ID
 */
function generateId() {
  return `duty_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
    
    if (duty.type === 'FLIGHT') {
      if (!duty.reportTime) {
        errors.push(`Duty ${index + 1}: Missing report time`);
      }
      
      // Allow missing off-duty time for now as it might not always be present
      if (duty.flights && duty.flights.length > 0) {
        duty.flights.forEach((flight, flightIndex) => {
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
    }
  });
  
  return errors;
}

/**
 * Example of expected Roster Buster calendar format for documentation
 */
const ROSTER_BUSTER_FORMAT_EXAMPLE = `June 2025
Monday Tuesday 2 3 Unknown - DAYOFF Unknown - DAYOFF 9 10 09:15 Layover (12:39 hours)
09:15-10:25 (Rep 0915Z)
10:25-12:10 AMS - VIE
15:20-17:15 VIE - AMS
18:05-19:55 AMS - VIE
20:15 Check Out - DEB
Day off - DAYOFF 16 17 Day off - DAYOFF Day off - DAYOFF 23 24 03:30-05:10 (Rep 0330Z)
05:10-07:20 VIE - ARN
08:05-10:15 ARN - VIE
13:00-14:10 (DH) Vienna (VIE) -
Berlin (BER)
14:30 Check Out - DEB
14:31 Layover (13:19 hours)`;

module.exports = {
  parseRosterBusterCalendar,
  ROSTER_BUSTER_FORMAT_EXAMPLE
}; 