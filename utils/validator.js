const moment = require('moment');

/**
 * Validate flight data structure and content
 * @param {Array} flightData - Array of flight duty periods
 * @returns {Object} - Validation result with isValid flag and errors array
 */
function validateFlightData(flightData) {
  const errors = [];
  
  if (!Array.isArray(flightData)) {
    return {
      isValid: false,
      errors: ['Flight data must be an array']
    };
  }

  if (flightData.length === 0) {
    return {
      isValid: false,
      errors: ['At least one flight duty period is required']
    };
  }

  flightData.forEach((duty, index) => {
    const dutyErrors = validateDutyPeriod(duty, index);
    errors.push(...dutyErrors);
  });

  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

/**
 * Validate individual duty period
 * @param {Object} duty - Single duty period object
 * @param {number} index - Index in the array for error reporting
 * @returns {Array} - Array of error messages
 */
function validateDutyPeriod(duty, index) {
  const errors = [];
  const dutyPrefix = `Duty ${index + 1}:`;

  // Required fields
  if (!duty.date) {
    errors.push(`${dutyPrefix} Date is required`);
  } else if (!isValidDate(duty.date)) {
    errors.push(`${dutyPrefix} Invalid date format. Use YYYY-MM-DD`);
  }

  if (!duty.type) {
    errors.push(`${dutyPrefix} Duty type is required`);
  } else if (!['FLIGHT', 'STANDBY', 'DAYOFF', 'TRAINING', 'ADMIN'].includes(duty.type)) {
    errors.push(`${dutyPrefix} Invalid duty type. Must be FLIGHT, STANDBY, DAYOFF, TRAINING, or ADMIN`);
  }

  // For flight duties, additional validation
  if (duty.type === 'FLIGHT') {
    if (!duty.reportTime) {
      errors.push(`${dutyPrefix} Report time is required for flight duties`);
    } else if (!isValidTime(duty.reportTime)) {
      errors.push(`${dutyPrefix} Invalid report time format. Use HH:MM`);
    }

    if (!duty.offDutyTime) {
      errors.push(`${dutyPrefix} Off-duty time is required for flight duties`);
    } else if (!isValidTime(duty.offDutyTime)) {
      errors.push(`${dutyPrefix} Invalid off-duty time format. Use HH:MM`);
    }

    if (!duty.flights || !Array.isArray(duty.flights)) {
      errors.push(`${dutyPrefix} Flights array is required for flight duties`);
    } else if (duty.flights.length === 0) {
      errors.push(`${dutyPrefix} At least one flight is required for flight duties`);
    } else {
      duty.flights.forEach((flight, flightIndex) => {
        const flightErrors = validateFlight(flight, index, flightIndex);
        errors.push(...flightErrors);
      });
    }
  }

  // Validate times are in correct order
  if (duty.reportTime && duty.offDutyTime) {
    const reportMoment = moment(duty.reportTime, 'HH:mm');
    const offDutyMoment = moment(duty.offDutyTime, 'HH:mm');
    
    // Handle overnight duties
    if (offDutyMoment.isBefore(reportMoment)) {
      offDutyMoment.add(1, 'day');
    }
    
    const fdpHours = offDutyMoment.diff(reportMoment, 'hours', true);
    if (fdpHours > 14) {
      errors.push(`${dutyPrefix} FDP exceeds 14 hours (${fdpHours.toFixed(1)}h). Please verify times.`);
    }
  }

  return errors;
}

/**
 * Validate individual flight
 * @param {Object} flight - Single flight object
 * @param {number} dutyIndex - Duty index for error reporting
 * @param {number} flightIndex - Flight index for error reporting
 * @returns {Array} - Array of error messages
 */
function validateFlight(flight, dutyIndex, flightIndex) {
  const errors = [];
  const flightPrefix = `Duty ${dutyIndex + 1}, Flight ${flightIndex + 1}:`;

  if (!flight.flightNumber) {
    errors.push(`${flightPrefix} Flight number is required`);
  }

  if (!flight.departure) {
    errors.push(`${flightPrefix} Departure airport is required`);
  } else if (flight.departure.length !== 3) {
    errors.push(`${flightPrefix} Departure airport must be 3-letter IATA code`);
  }

  if (!flight.arrival) {
    errors.push(`${flightPrefix} Arrival airport is required`);
  } else if (flight.arrival.length !== 3) {
    errors.push(`${flightPrefix} Arrival airport must be 3-letter IATA code`);
  }

  if (!flight.departureTime) {
    errors.push(`${flightPrefix} Departure time is required`);
  } else if (!isValidTime(flight.departureTime)) {
    errors.push(`${flightPrefix} Invalid departure time format. Use HH:MM`);
  }

  if (!flight.arrivalTime) {
    errors.push(`${flightPrefix} Arrival time is required`);
  } else if (!isValidTime(flight.arrivalTime)) {
    errors.push(`${flightPrefix} Invalid arrival time format. Use HH:MM`);
  }

  // Validate flight time is reasonable
  if (flight.departureTime && flight.arrivalTime) {
    const depMoment = moment(flight.departureTime, 'HH:mm');
    const arrMoment = moment(flight.arrivalTime, 'HH:mm');
    
    // Handle overnight flights
    if (arrMoment.isBefore(depMoment)) {
      arrMoment.add(1, 'day');
    }
    
    const flightHours = arrMoment.diff(depMoment, 'hours', true);
    if (flightHours > 16) {
      errors.push(`${flightPrefix} Flight time exceeds 16 hours (${flightHours.toFixed(1)}h). Please verify times.`);
    } else if (flightHours < 0.5) {
      errors.push(`${flightPrefix} Flight time is less than 30 minutes (${flightHours.toFixed(1)}h). Please verify times.`);
    }
  }

  return errors;
}

/**
 * Check if date string is valid
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @returns {boolean} - True if valid
 */
function isValidDate(dateString) {
  const date = moment(dateString, 'YYYY-MM-DD', true);
  return date.isValid();
}

/**
 * Check if time string is valid
 * @param {string} timeString - Time in HH:MM format
 * @returns {boolean} - True if valid
 */
function isValidTime(timeString) {
  const time = moment(timeString, 'HH:mm', true);
  return time.isValid();
}

/**
 * Sanitize and format flight data
 * @param {Array} flightData - Raw flight data
 * @returns {Array} - Cleaned flight data
 */
function sanitizeFlightData(flightData) {
  return flightData.map(duty => ({
    ...duty,
    date: moment(duty.date).format('YYYY-MM-DD'),
    type: duty.type?.toUpperCase(),
    reportTime: duty.reportTime ? moment(duty.reportTime, 'HH:mm').format('HH:mm') : null,
    offDutyTime: duty.offDutyTime ? moment(duty.offDutyTime, 'HH:mm').format('HH:mm') : null,
    flights: duty.flights?.map(flight => ({
      ...flight,
      flightNumber: flight.flightNumber?.toUpperCase(),
      departure: flight.departure?.toUpperCase(),
      arrival: flight.arrival?.toUpperCase(),
      departureTime: moment(flight.departureTime, 'HH:mm').format('HH:mm'),
      arrivalTime: moment(flight.arrivalTime, 'HH:mm').format('HH:mm')
    })) || []
  }));
}

module.exports = {
  validateFlightData,
  validateDutyPeriod,
  validateFlight,
  sanitizeFlightData,
  isValidDate,
  isValidTime
}; 