const moment = require('moment');

// EASA FTL Limits based on ORO.FTL.205
const EASA_LIMITS = {
  // Maximum FDP based on start time and number of sectors (ORO.FTL.205)
  maxFDP: {
    1: { // 1 sector
      '06:00-17:59': 13.0,
      '18:00-21:59': 12.0,
      '22:00-04:59': 11.0,
      '05:00-05:59': 12.0
    },
    2: { // 2 sectors
      '06:00-17:59': 12.5,
      '18:00-21:59': 11.5,
      '22:00-04:59': 10.5,
      '05:00-05:59': 11.5
    },
    3: { // 3 sectors
      '06:00-17:59': 12.0,
      '18:00-21:59': 11.0,
      '22:00-04:59': 10.0,
      '05:00-05:59': 11.0
    },
    4: { // 4 sectors
      '06:00-17:59': 11.5,
      '18:00-21:59': 10.5,
      '22:00-04:59': 9.5,
      '05:00-05:59': 10.5
    },
    5: { // 5 sectors
      '06:00-17:59': 11.0,
      '18:00-21:59': 10.0,
      '22:00-04:59': 9.0,
      '05:00-05:59': 10.0
    },
    6: { // 6+ sectors
      '06:00-17:59': 10.5,
      '18:00-21:59': 9.5,
      '22:00-04:59': 8.5,
      '05:00-05:59': 9.5
    }
  },
  
  // Minimum rest periods (ORO.FTL.235)
  minRest: {
    standard: 10, // hours
    extended: 12, // hours after extended FDP
    beforeEarlyStart: 10 // hours before early start (05:00-05:59)
  },
  
  // Maximum flight time limits (ORO.FTL.210)
  maxFlightTime: {
    daily: 8,     // hours per day
    weekly: 60,   // hours per 7 consecutive days
    monthly: 190, // hours per calendar month
    yearly: 1000  // hours per calendar year
  },
  
  // Maximum duty time limits (ORO.FTL.190)
  maxDutyTime: {
    weekly: 60,   // hours per 7 consecutive days
    fortnightly: 110, // hours per 14 consecutive days
  },
  
  // Fatigue risk factors
  fatigueRisk: {
    highSectorCount: 6,     // 6+ sectors considered high fatigue risk
    nightDutyStart: 22,     // Night duty starts at 22:00
    nightDutyEnd: 6,        // Night duty ends at 06:00
    earlyStart: 6,          // Early start before 06:00
    lateFinish: 2,          // Late finish after 02:00
    maxConsecutiveDuties: 4, // Maximum consecutive duty days
  },
  
  // FDP extensions (ORO.FTL.205(d))
  extensions: {
    maxPerWeek: 2,        // Maximum 2 extensions per 7 consecutive days
    maxExtension: 1,      // Maximum 1 hour extension
    requiresNotification: true
  }
};

// Translations
const TRANSLATIONS = {
  en: {
    LEGAL: 'LEGAL',
    WARNING: 'WARNING',
    ILLEGAL: 'ILLEGAL',
    fdpExceeded: 'FDP exceeds maximum allowed',
    restInsufficient: 'Rest period insufficient',
    flightTimeExceeded: 'Flight time exceeds daily limit',
    closeToLimit: 'Close to FDP limit',
    regulation: 'Regulation',
    issue: 'Issue',
    fatigueRisk: 'Fatigue Risk',
    recommendation: 'Recommendation',
    extensionAllowed: 'Extension Allowed',
    extensionNotAllowed: 'Extension Not Allowed',
    extensionAvailable: 'Up to 1h extension available',
    extensionUsed: 'Extension would be required',
    extensionExceeded: 'Extension limit exceeded',
    maxExtensionsReached: 'Max extensions per week reached',
    // Advanced compliance messages
    weeklyFlightTimeExceeded: 'Weekly flight time limit exceeded',
    monthlyFlightTimeExceeded: 'Monthly flight time limit exceeded',
    yearlyFlightTimeExceeded: 'Yearly flight time limit exceeded',
    weeklyDutyTimeExceeded: 'Weekly duty time limit exceeded',
    fortnightlyDutyTimeExceeded: 'Fortnightly duty time limit exceeded',
    highFatigueRisk: 'High fatigue risk detected',
    consecutiveDutiesExceeded: 'Too many consecutive duty days',
    nightDutyFatigueRisk: 'Night duty fatigue risk',
    highSectorFatigueRisk: 'High sector count fatigue risk'
  },
  ru: {
    LEGAL: 'ЗАКОННО',
    WARNING: 'ПРЕДУПРЕЖДЕНИЕ',
    ILLEGAL: 'НЕЗАКОННО',
    fdpExceeded: 'FDP превышает максимально допустимое',
    restInsufficient: 'Период отдыха недостаточен',
    flightTimeExceeded: 'Время полета превышает дневной лимит',
    closeToLimit: 'Близко к лимиту FDP',
    regulation: 'Регламент',
    issue: 'Проблема',
    fatigueRisk: 'Риск усталости',
    recommendation: 'Рекомендация',
    extensionAllowed: 'Продление разрешено',
    extensionNotAllowed: 'Продление не разрешено',
    extensionAvailable: 'Доступно продление до 1ч',
    extensionUsed: 'Потребуется продление',
    extensionExceeded: 'Превышен лимит продления',
    maxExtensionsReached: 'Достигнут макс продлений в неделю',
    // Advanced compliance messages
    weeklyFlightTimeExceeded: 'Превышен недельный лимит налета',
    monthlyFlightTimeExceeded: 'Превышен месячный лимит налета',
    yearlyFlightTimeExceeded: 'Превышен годовой лимит налета',
    weeklyDutyTimeExceeded: 'Превышен недельный лимит смен',
    fortnightlyDutyTimeExceeded: 'Превышен двухнедельный лимит смен',
    highFatigueRisk: 'Обнаружен высокий риск усталости',
    consecutiveDutiesExceeded: 'Слишком много последовательных смен',
    nightDutyFatigueRisk: 'Риск усталости при ночной смене',
    highSectorFatigueRisk: 'Риск усталости при большом количестве секторов'
  },
  lv: {
    LEGAL: 'LIKUMĪGI',
    WARNING: 'BRĪDINĀJUMS',
    ILLEGAL: 'NELIKUMĪGI',
    fdpExceeded: 'FDP pārsniedz maksimāli atļauto',
    restInsufficient: 'Atpūtas periods nepietiekams',
    flightTimeExceeded: 'Lidojuma laiks pārsniedz dienas limitu',
    closeToLimit: 'Tuvu FDP limitam',
    regulation: 'Regulējums',
    issue: 'Problēma',
    fatigueRisk: 'Noguruma risks',
    recommendation: 'Ieteikums',
    extensionAllowed: 'Pagarinājums atļauts',
    extensionNotAllowed: 'Pagarinājums nav atļauts',
    extensionAvailable: 'Pieejams līdz 1h pagarinājums',
    extensionUsed: 'Būtu nepieciešams pagarinājums',
    extensionExceeded: 'Pagarinājuma limits pārsniegts',
    maxExtensionsReached: 'Sasniegts maks pagarinājumu nedēļā',
    // Advanced compliance messages
    weeklyFlightTimeExceeded: 'Pārsniegts nedēļas lidojuma laika limits',
    monthlyFlightTimeExceeded: 'Pārsniegts mēneša lidojuma laika limits',
    yearlyFlightTimeExceeded: 'Pārsniegts gada lidojuma laika limits',
    weeklyDutyTimeExceeded: 'Pārsniegts nedēļas dienesta laika limits',
    fortnightlyDutyTimeExceeded: 'Pārsniegts divu nedēļu dienesta laika limits',
    highFatigueRisk: 'Konstatēts augsts noguruma risks',
    consecutiveDutiesExceeded: 'Pārāk daudz secīgu dienesta dienu',
    nightDutyFatigueRisk: 'Nakts dienesta noguruma risks',
    highSectorFatigueRisk: 'Augsta sektoru skaita noguruma risks'
  }
};

/**
 * Check EASA FTL compliance for flight data
 * @param {Array} flightData - Array of duty periods
 * @param {string} dateScope - Date scope filter
 * @param {string} language - Language for messages (en/ru/lv)
 * @returns {Array} - Compliance results for each day
 */
function checkEASACompliance(flightData, dateScope = 'all', language = 'en') {
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;
  const results = [];
  
  // Sort flight data by date
  const sortedData = flightData.sort((a, b) => moment(a.date).diff(moment(b.date)));
  
  // Filter by date scope if needed
  const filteredData = filterByDateScope(sortedData, dateScope);
  
  for (let i = 0; i < filteredData.length; i++) {
    const duty = filteredData[i];
    const previousDuty = i > 0 ? filteredData[i - 1] : null;
    
    const dayResult = checkDayCompliance(duty, previousDuty, t);
    
    // Add advanced compliance checks
    addAdvancedComplianceChecks(dayResult, duty, sortedData, i, t);
    
    results.push(dayResult);
  }
  
  return results;
}

/**
 * Check compliance for a single day
 * @param {Object} duty - Current duty period
 * @param {Object} previousDuty - Previous duty period
 * @param {Object} t - Translations object
 * @returns {Object} - Compliance result for the day
 */
function checkDayCompliance(duty, previousDuty, t) {
  const result = {
    date: duty.date,
    type: duty.type,
    status: t.LEGAL,
    issues: [],
    calculations: {},
    regulations: []
  };

  if (duty.type === 'DAYOFF') {
    result.calculations = {
      fdp: '00:00',
      maxFDP: 'N/A',
      rest: previousDuty ? calculateRest(previousDuty, duty) : 'N/A',
      minRest: 'N/A',
      flightTime: '00:00',
      extensionAllowed: 'N/A'
    };
    return result;
  }

  if (duty.type === 'STANDBY') {
    // Calculate standby period
    const standbyPeriod = calculateStandbyPeriod(duty);
    const rest = previousDuty ? calculateRest(previousDuty, duty) : null;
    const minRest = getMinRest(previousDuty, duty);
    
    result.calculations = {
      fdp: duty.callTime ? formatDuration(calculateFDP(duty)) : '00:00',
      maxFDP: duty.callTime ? formatDuration(getMaxFDP(duty.callTime, duty.flights ? duty.flights.length : 0)) : 'N/A',
      rest: rest ? formatDuration(rest) : 'N/A',
      minRest: minRest ? formatDuration(minRest) : 'N/A',
      flightTime: duty.flights ? formatDuration(calculateFlightTime(duty.flights)) : '00:00',
      sectors: duty.flights ? duty.flights.length : 0,
      maxDutyEndTime: duty.callTime ? calculateMaxDutyEndTime(duty.callTime, getMaxFDP(duty.callTime, duty.flights ? duty.flights.length : 0)) : 'N/A',
      extensionAllowed: duty.callTime ? checkExtensionAllowance(calculateFDP(duty), getMaxFDP(duty.callTime, duty.flights ? duty.flights.length : 0), t).status : 'N/A',
      standbyPeriod: formatDuration(standbyPeriod)
    };

    // If called for duty, check flight compliance
    if (duty.callTime && duty.flights && duty.flights.length > 0) {
      const fdp = calculateFDP(duty);
      const sectors = duty.flights.length;
      const maxFDP = getMaxFDP(duty.callTime, sectors);
      const flightTime = calculateFlightTime(duty.flights);
      const extensionInfo = checkExtensionAllowance(fdp, maxFDP, t);
      
      // Update calculations with flight duty info
      result.calculations.extensionDetails = extensionInfo.details;
      
      // Check FDP compliance (same as flight duty)
      if (fdp > maxFDP + EASA_LIMITS.extensions.maxExtension) {
        result.status = t.ILLEGAL;
        result.issues.push({
          type: 'FDP_EXCEEDED',
          message: `${t.extensionExceeded}: ${formatDuration(fdp)} > ${formatDuration(maxFDP + EASA_LIMITS.extensions.maxExtension)}`,
          regulation: 'ORO.FTL.205(d)',
          severity: 'HIGH',
          fatigueRisk: 'High risk of pilot fatigue due to excessive duty period beyond extension limits',
          recommendation: 'Reduce FDP or provide adequate in-flight rest'
        });
      } else if (fdp > maxFDP) {
        result.status = t.WARNING;
        result.issues.push({
          type: 'FDP_EXTENSION_REQUIRED',
          message: `${t.extensionUsed}: ${formatDuration(fdp)} > ${formatDuration(maxFDP)} (${t.extensionAllowed.toLowerCase()})`,
          regulation: 'ORO.FTL.205(d)',
          severity: 'MEDIUM',
          fatigueRisk: 'Extension required - increased fatigue risk',
          recommendation: 'Ensure proper notification and crew agreement for extension'
        });
      }
      
      // Check flight time compliance
      if (flightTime > EASA_LIMITS.maxFlightTime.daily) {
        result.status = t.ILLEGAL;
        result.issues.push({
          type: 'FLIGHT_TIME_EXCEEDED',
          message: `${t.flightTimeExceeded}: ${formatDuration(flightTime)} > ${EASA_LIMITS.maxFlightTime.daily}h`,
          regulation: 'ORO.FTL.210',
          severity: 'HIGH',
          fatigueRisk: 'Excessive flight time increases workload and fatigue',
          recommendation: 'Reduce flight time or split into multiple duty periods'
        });
      }
    }

    // Check rest compliance
    if (rest !== null && minRest !== null && rest < minRest) {
      result.status = t.ILLEGAL;
      result.issues.push({
        type: 'REST_INSUFFICIENT',
        message: `${t.restInsufficient}: ${formatDuration(rest)} < ${formatDuration(minRest)}`,
        regulation: 'ORO.FTL.235',
        severity: 'HIGH',
        fatigueRisk: 'Insufficient rest increases fatigue accumulation',
        recommendation: 'Provide minimum required rest period'
      });
    }

    // Add relevant regulations
    result.regulations = [
      {
        reference: 'ORO.FTL.225',
        title: 'Standby',
        description: 'Standby duty regulations and limitations'
      },
      {
        reference: 'ORO.FTL.235',
        title: 'Rest Period',
        description: 'Minimum rest requirements between duty periods'
      }
    ];

    if (duty.callTime && duty.flights && duty.flights.length > 0) {
      result.regulations.push({
        reference: 'ORO.FTL.205',
        title: 'Flight Duty Period (FDP)',
        description: 'Maximum FDP limits when called from standby'
      });
    }

    return result;
  }

  if (duty.type === 'FLIGHT') {
    // Calculate FDP
    const fdp = calculateFDP(duty);
    const sectors = duty.flights ? duty.flights.length : 0;
    const maxFDP = getMaxFDP(duty.reportTime, sectors);
    
    // Calculate flight time
    const flightTime = calculateFlightTime(duty.flights);
    
    // Calculate rest from previous duty
    const rest = previousDuty ? calculateRest(previousDuty, duty) : null;
    const minRest = getMinRest(previousDuty, duty);
    
    // Calculate maximum duty end time
    const maxDutyEndTime = calculateMaxDutyEndTime(duty.reportTime, maxFDP);
    
    // Check extension allowance
    const extensionInfo = checkExtensionAllowance(fdp, maxFDP, t);
    
    result.calculations = {
      fdp: formatDuration(fdp),
      maxFDP: formatDuration(maxFDP),
      rest: rest ? formatDuration(rest) : 'N/A',
      minRest: minRest ? formatDuration(minRest) : 'N/A',
      flightTime: formatDuration(flightTime),
      sectors: sectors,
      maxDutyEndTime: maxDutyEndTime,
      extensionAllowed: extensionInfo.status,
      extensionDetails: extensionInfo.details
    };
    
    // Check FDP compliance
    if (fdp > maxFDP + EASA_LIMITS.extensions.maxExtension) {
      result.status = t.ILLEGAL;
      result.issues.push({
        type: 'FDP_EXCEEDED',
        message: `${t.extensionExceeded}: ${formatDuration(fdp)} > ${formatDuration(maxFDP + EASA_LIMITS.extensions.maxExtension)}`,
        regulation: 'ORO.FTL.205(d)',
        severity: 'HIGH',
        fatigueRisk: 'High risk of pilot fatigue due to excessive duty period beyond extension limits',
        recommendation: 'Reduce FDP or provide adequate in-flight rest'
      });
    } else if (fdp > maxFDP) {
      result.status = t.WARNING;
      result.issues.push({
        type: 'FDP_EXTENSION_REQUIRED',
        message: `${t.extensionUsed}: ${formatDuration(fdp)} > ${formatDuration(maxFDP)} (${t.extensionAllowed.toLowerCase()})`,
        regulation: 'ORO.FTL.205(d)',
        severity: 'MEDIUM',
        fatigueRisk: 'Extension required - increased fatigue risk',
        recommendation: 'Ensure proper notification and crew agreement for extension'
      });
    } else if (fdp > maxFDP - 0.5) {
      result.status = t.WARNING;
      result.issues.push({
        type: 'FDP_CLOSE_TO_LIMIT',
        message: `${t.closeToLimit}: ${formatDuration(fdp)} (max: ${formatDuration(maxFDP)})`,
        regulation: 'ORO.FTL.205',
        severity: 'MEDIUM',
        fatigueRisk: 'Increased fatigue risk when approaching FDP limits',
        recommendation: 'Monitor crew alertness and consider fatigue mitigation'
      });
    }
    
    // Check rest compliance
    if (rest !== null && minRest !== null && rest < minRest) {
      result.status = t.ILLEGAL;
      result.issues.push({
        type: 'REST_INSUFFICIENT',
        message: `${t.restInsufficient}: ${formatDuration(rest)} < ${formatDuration(minRest)}`,
        regulation: 'ORO.FTL.235',
        severity: 'HIGH',
        fatigueRisk: 'Insufficient rest increases fatigue accumulation',
        recommendation: 'Provide minimum required rest period'
      });
    }
    
    // Check flight time compliance
    if (flightTime > EASA_LIMITS.maxFlightTime.daily) {
      result.status = t.ILLEGAL;
      result.issues.push({
        type: 'FLIGHT_TIME_EXCEEDED',
        message: `${t.flightTimeExceeded}: ${formatDuration(flightTime)} > ${EASA_LIMITS.maxFlightTime.daily}h`,
        regulation: 'ORO.FTL.210',
        severity: 'HIGH',
        fatigueRisk: 'Excessive flight time increases workload and fatigue',
        recommendation: 'Reduce flight time or split into multiple duty periods'
      });
    }
    
    // Add relevant regulations
    result.regulations = [
      {
        reference: 'ORO.FTL.205',
        title: 'Flight Duty Period (FDP)',
        description: 'Maximum FDP limits based on start time and number of sectors'
      },
      {
        reference: 'ORO.FTL.235',
        title: 'Rest Period',
        description: 'Minimum rest requirements between duty periods'
      },
      {
        reference: 'ORO.FTL.210',
        title: 'Flight Time Limitations',
        description: 'Maximum flight time per day, week, month, and year'
      }
    ];
  }
  
  return result;
}

/**
 * Calculate Flight Duty Period (FDP) in hours
 * @param {Object} duty - Duty period object
 * @returns {number} - FDP in hours
 */
function calculateFDP(duty) {
  if (duty.type === 'STANDBY' && duty.callTime) {
    // For standby called to duty, FDP starts from call time
    if (!duty.callTime || !duty.offDutyTime) return 0;
    
    const callMoment = moment(duty.callTime, 'HH:mm');
    const offDutyMoment = moment(duty.offDutyTime, 'HH:mm');
    
    // Handle overnight duties
    if (offDutyMoment.isBefore(callMoment)) {
      offDutyMoment.add(1, 'day');
    }
    
    return offDutyMoment.diff(callMoment, 'hours', true);
  }
  
  if (!duty.reportTime || !duty.offDutyTime) return 0;
  
  const reportMoment = moment(duty.reportTime, 'HH:mm');
  const offDutyMoment = moment(duty.offDutyTime, 'HH:mm');
  
  // Handle overnight duties
  if (offDutyMoment.isBefore(reportMoment)) {
    offDutyMoment.add(1, 'day');
  }
  
  return offDutyMoment.diff(reportMoment, 'hours', true);
}

/**
 * Calculate standby period in hours
 * @param {Object} duty - Standby duty period object
 * @returns {number} - Standby period in hours
 */
function calculateStandbyPeriod(duty) {
  if (!duty.standbyStartTime) return 0;
  
  const startMoment = moment(duty.standbyStartTime, 'HH:mm');
  let endMoment;
  
  if (duty.callTime) {
    // Standby ends when called
    endMoment = moment(duty.callTime, 'HH:mm');
  } else if (duty.offDutyTime) {
    // Standby ends at off duty time (not called)
    endMoment = moment(duty.offDutyTime, 'HH:mm');
  } else {
    // No end time specified
    return 0;
  }
  
  // Handle overnight standby
  if (endMoment.isBefore(startMoment)) {
    endMoment.add(1, 'day');
  }
  
  return endMoment.diff(startMoment, 'hours', true);
}

/**
 * Calculate total flight time in hours
 * @param {Array} flights - Array of flights
 * @returns {number} - Total flight time in hours
 */
function calculateFlightTime(flights) {
  if (!flights || flights.length === 0) return 0;
  
  let totalMinutes = 0;
  
  flights.forEach(flight => {
    const depMoment = moment(flight.departureTime, 'HH:mm');
    const arrMoment = moment(flight.arrivalTime, 'HH:mm');
    
    // Handle overnight flights
    if (arrMoment.isBefore(depMoment)) {
      arrMoment.add(1, 'day');
    }
    
    totalMinutes += arrMoment.diff(depMoment, 'minutes');
  });
  
  return totalMinutes / 60;
}

/**
 * Calculate rest period between duties in hours
 * @param {Object} previousDuty - Previous duty period
 * @param {Object} currentDuty - Current duty period
 * @returns {number} - Rest period in hours
 */
function calculateRest(previousDuty, currentDuty) {
  if (!previousDuty.offDutyTime) return null;
  
  let currentStartTime;
  if (currentDuty.type === 'STANDBY' && currentDuty.standbyStartTime) {
    currentStartTime = currentDuty.standbyStartTime;
  } else if (currentDuty.reportTime) {
    currentStartTime = currentDuty.reportTime;
  } else {
    return null;
  }
  
  const prevOffDuty = moment(`${previousDuty.date} ${previousDuty.offDutyTime}`);
  const currentStart = moment(`${currentDuty.date} ${currentStartTime}`);
  
  // Handle case where current duty is next day
  if (currentStart.isBefore(prevOffDuty)) {
    currentStart.add(1, 'day');
  }
  
  return currentStart.diff(prevOffDuty, 'hours', true);
}

/**
 * Calculate maximum duty end time based on report time and max FDP
 * @param {string} reportTime - Report time in HH:mm format
 * @param {number} maxFDP - Maximum FDP in hours
 * @returns {string} - Maximum duty end time in HH:mm format
 */
function calculateMaxDutyEndTime(reportTime, maxFDP) {
  if (!reportTime || !maxFDP) return 'N/A';
  
  const reportMoment = moment(reportTime, 'HH:mm');
  const maxEndMoment = reportMoment.clone().add(maxFDP, 'hours');
  
  return maxEndMoment.format('HH:mm');
}

/**
 * Get maximum allowed FDP based on start time and sectors
 * @param {string} startTime - Start time in HH:mm format
 * @param {number} sectors - Number of flight sectors
 * @returns {number} - Maximum FDP in hours
 */
function getMaxFDP(startTime, sectors) {
  const hour = parseInt(startTime.split(':')[0]);
  const sectorKey = Math.min(sectors, 6); // Cap at 6 for lookup
  
  let timeRange;
  if (hour >= 6 && hour <= 17) {
    timeRange = '06:00-17:59';
  } else if (hour >= 18 && hour <= 21) {
    timeRange = '18:00-21:59';
  } else if (hour >= 22 || hour <= 4) {
    timeRange = '22:00-04:59';
  } else {
    timeRange = '05:00-05:59';
  }
  
  return EASA_LIMITS.maxFDP[sectorKey][timeRange];
}

/**
 * Get minimum required rest period
 * @param {Object} previousDuty - Previous duty period
 * @param {Object} currentDuty - Current duty period
 * @returns {number} - Minimum rest in hours
 */
function getMinRest(previousDuty, currentDuty) {
  if (!previousDuty) return null;
  
  // Standard minimum rest is 10 hours (ORO.FTL.235)
  let minRest = EASA_LIMITS.minRest.standard;
  
  // Extended rest required after extended FDP
  if (previousDuty.type === 'FLIGHT') {
    const prevFDP = calculateFDP(previousDuty);
    const prevSectors = previousDuty.flights ? previousDuty.flights.length : 0;
    const maxPrevFDP = getMaxFDP(previousDuty.reportTime, prevSectors);
    
    if (prevFDP > maxPrevFDP - 1) { // If previous FDP was extended
      minRest = EASA_LIMITS.minRest.extended;
    }
  }
  
  return minRest;
}

/**
 * Filter flight data by date scope
 * @param {Array} flightData - Flight data array
 * @param {string} dateScope - Date scope (today, 3days, week, all)
 * @returns {Array} - Filtered flight data
 */
function filterByDateScope(flightData, dateScope) {
  if (dateScope === 'all') return flightData;
  
  const today = moment().startOf('day');
  let startDate, endDate;
  
  switch (dateScope) {
    case 'today':
      startDate = today.clone();
      endDate = today.clone();
      break;
    case '3days':
      startDate = today.clone().subtract(1, 'day');
      endDate = today.clone().add(1, 'day');
      break;
    case 'week':
      startDate = today.clone().subtract(3, 'days');
      endDate = today.clone().add(3, 'days');
      break;
    default:
      return flightData;
  }
  
  return flightData.filter(duty => {
    const dutyDate = moment(duty.date);
    return dutyDate.isBetween(startDate, endDate, 'day', '[]');
  });
}

/**
 * Format duration in hours to HH:MM format
 * @param {number} hours - Duration in hours
 * @returns {string} - Formatted duration
 */
function formatDuration(hours) {
  if (hours === null || hours === undefined) return 'N/A';
  
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/**
 * Check if FDP extension is allowed based on EASA regulations
 * @param {number} actualFDP - Actual FDP in hours
 * @param {number} maxFDP - Maximum allowed FDP in hours
 * @param {Object} t - Translations object
 * @returns {Object} - Extension allowance information
 */
function checkExtensionAllowance(actualFDP, maxFDP, t) {
  const maxExtension = EASA_LIMITS.extensions.maxExtension;
  const maxFDPWithExtension = maxFDP + maxExtension;
  
  if (actualFDP <= maxFDP) {
    // Within normal limits - extension available but not needed
    return {
      status: t.extensionAvailable,
      details: {
        allowed: true,
        needed: false,
        availableExtension: formatDuration(maxExtension),
        maxWithExtension: formatDuration(maxFDPWithExtension),
        regulation: 'ORO.FTL.205(d)',
        conditions: [
          'Commander agreement required',
          'Crew notification required',
          'Maximum 2 extensions per 7 consecutive days',
          'Extended rest period required after extension'
        ]
      }
    };
  } else if (actualFDP <= maxFDPWithExtension) {
    // Extension required and allowed
    const extensionUsed = actualFDP - maxFDP;
    return {
      status: t.extensionAllowed,
      details: {
        allowed: true,
        needed: true,
        extensionUsed: formatDuration(extensionUsed),
        availableExtension: formatDuration(maxExtension),
        maxWithExtension: formatDuration(maxFDPWithExtension),
        regulation: 'ORO.FTL.205(d)',
        conditions: [
          'Commander agreement required',
          'Crew notification required',
          'Maximum 2 extensions per 7 consecutive days',
          'Extended rest period (12h) required after extension'
        ]
      }
    };
  } else {
    // Extension limit exceeded
    const excessTime = actualFDP - maxFDPWithExtension;
    return {
      status: t.extensionNotAllowed,
      details: {
        allowed: false,
        needed: true,
        extensionExceeded: formatDuration(excessTime),
        maxWithExtension: formatDuration(maxFDPWithExtension),
        regulation: 'ORO.FTL.205(d)',
        violation: 'FDP exceeds maximum allowed even with extension'
      }
    };
  }
}

/**
 * Add advanced compliance checks to a duty result
 * @param {Object} result - Day compliance result
 * @param {Object} duty - Current duty period
 * @param {Array} allData - All duty periods (sorted)
 * @param {number} currentIndex - Index of current duty
 * @param {Object} t - Translations object
 */
function addAdvancedComplianceChecks(result, duty, allData, currentIndex, t) {
  // Add cumulative flight time checks
  addCumulativeFlightTimeChecks(result, duty, allData, currentIndex, t);
  
  // Add cumulative duty time checks
  addCumulativeDutyTimeChecks(result, duty, allData, currentIndex, t);
  
  // Add fatigue risk assessment
  addFatigueRiskAssessment(result, duty, allData, currentIndex, t);
  
  // Add consecutive duty checks
  addConsecutiveDutyChecks(result, duty, allData, currentIndex, t);
}

/**
 * Check cumulative flight time limits (weekly, monthly, yearly)
 * @param {Object} result - Day compliance result
 * @param {Object} duty - Current duty period
 * @param {Array} allData - All duty periods
 * @param {number} currentIndex - Index of current duty
 * @param {Object} t - Translations object
 */
function addCumulativeFlightTimeChecks(result, duty, allData, currentIndex, t) {
  if (duty.type !== 'FLIGHT' && !(duty.type === 'STANDBY' && duty.callTime && duty.flights)) {
    return;
  }
  
  const currentDate = moment(duty.date);
  const currentFlightTime = duty.flights ? calculateFlightTime(duty.flights) : 0;
  
  // Weekly flight time (7 consecutive days)
  const weeklyFlightTime = calculateCumulativeFlightTime(allData, currentDate, 7, 'days');
  if (weeklyFlightTime > EASA_LIMITS.maxFlightTime.weekly) {
    result.status = t.ILLEGAL;
    result.issues.push({
      type: 'WEEKLY_FLIGHT_TIME_EXCEEDED',
      message: `${t.weeklyFlightTimeExceeded}: ${formatDuration(weeklyFlightTime)} > ${EASA_LIMITS.maxFlightTime.weekly}h`,
      regulation: 'ORO.FTL.210(a)',
      severity: 'HIGH',
      fatigueRisk: 'Excessive weekly flight time increases cumulative fatigue',
      recommendation: 'Reduce flight time or provide additional rest periods'
    });
  }
  
  // Monthly flight time
  const monthlyFlightTime = calculateCumulativeFlightTime(allData, currentDate, 1, 'month');
  if (monthlyFlightTime > EASA_LIMITS.maxFlightTime.monthly) {
    result.status = t.ILLEGAL;
    result.issues.push({
      type: 'MONTHLY_FLIGHT_TIME_EXCEEDED',
      message: `${t.monthlyFlightTimeExceeded}: ${formatDuration(monthlyFlightTime)} > ${EASA_LIMITS.maxFlightTime.monthly}h`,
      regulation: 'ORO.FTL.210(a)',
      severity: 'HIGH',
      fatigueRisk: 'Excessive monthly flight time violates regulatory limits',
      recommendation: 'Redistribute flight time across the month'
    });
  }
  
  // Yearly flight time
  const yearlyFlightTime = calculateCumulativeFlightTime(allData, currentDate, 1, 'year');
  if (yearlyFlightTime > EASA_LIMITS.maxFlightTime.yearly) {
    result.status = t.ILLEGAL;
    result.issues.push({
      type: 'YEARLY_FLIGHT_TIME_EXCEEDED',
      message: `${t.yearlyFlightTimeExceeded}: ${formatDuration(yearlyFlightTime)} > ${EASA_LIMITS.maxFlightTime.yearly}h`,
      regulation: 'ORO.FTL.210(a)',
      severity: 'HIGH',
      fatigueRisk: 'Annual flight time limit exceeded',
      recommendation: 'Immediate action required to comply with yearly limits'
    });
  }
  
  // Add cumulative data to calculations
  result.calculations.weeklyFlightTime = formatDuration(weeklyFlightTime);
  result.calculations.monthlyFlightTime = formatDuration(monthlyFlightTime);
  result.calculations.yearlyFlightTime = formatDuration(yearlyFlightTime);
}

/**
 * Check cumulative duty time limits
 * @param {Object} result - Day compliance result
 * @param {Object} duty - Current duty period
 * @param {Array} allData - All duty periods
 * @param {number} currentIndex - Index of current duty
 * @param {Object} t - Translations object
 */
function addCumulativeDutyTimeChecks(result, duty, allData, currentIndex, t) {
  if (duty.type === 'DAYOFF') return;
  
  const currentDate = moment(duty.date);
  
  // Weekly duty time (7 consecutive days)
  const weeklyDutyTime = calculateCumulativeDutyTime(allData, currentDate, 7, 'days');
  if (weeklyDutyTime > EASA_LIMITS.maxDutyTime.weekly) {
    result.status = t.ILLEGAL;
    result.issues.push({
      type: 'WEEKLY_DUTY_TIME_EXCEEDED',
      message: `${t.weeklyDutyTimeExceeded}: ${formatDuration(weeklyDutyTime)} > ${EASA_LIMITS.maxDutyTime.weekly}h`,
      regulation: 'ORO.FTL.190',
      severity: 'HIGH',
      fatigueRisk: 'Excessive weekly duty time increases fatigue accumulation',
      recommendation: 'Reduce duty periods or provide additional days off'
    });
  }
  
  // Fortnightly duty time (14 consecutive days)
  const fortnightlyDutyTime = calculateCumulativeDutyTime(allData, currentDate, 14, 'days');
  if (fortnightlyDutyTime > EASA_LIMITS.maxDutyTime.fortnightly) {
    result.status = t.ILLEGAL;
    result.issues.push({
      type: 'FORTNIGHTLY_DUTY_TIME_EXCEEDED',
      message: `${t.fortnightlyDutyTimeExceeded}: ${formatDuration(fortnightlyDutyTime)} > ${EASA_LIMITS.maxDutyTime.fortnightly}h`,
      regulation: 'ORO.FTL.190',
      severity: 'HIGH',
      fatigueRisk: 'Excessive fortnightly duty time violates regulatory limits',
      recommendation: 'Immediate schedule adjustment required'
    });
  }
  
  // Add cumulative data to calculations
  result.calculations.weeklyDutyTime = formatDuration(weeklyDutyTime);
  result.calculations.fortnightlyDutyTime = formatDuration(fortnightlyDutyTime);
}

/**
 * Assess fatigue risk based on duty characteristics
 * @param {Object} result - Day compliance result
 * @param {Object} duty - Current duty period
 * @param {Array} allData - All duty periods
 * @param {number} currentIndex - Index of current duty
 * @param {Object} t - Translations object
 */
function addFatigueRiskAssessment(result, duty, allData, currentIndex, t) {
  if (duty.type === 'DAYOFF') return;
  
  let fatigueScore = 0;
  const fatigueFactors = [];
  
  // High sector count fatigue risk
  if (duty.type === 'FLIGHT' && duty.flights && duty.flights.length >= EASA_LIMITS.fatigueRisk.highSectorCount) {
    fatigueScore += 2;
    fatigueFactors.push('High sector count');
    
    if (result.status === t.LEGAL) {
      result.status = t.WARNING;
    }
    
    result.issues.push({
      type: 'HIGH_SECTOR_FATIGUE_RISK',
      message: `${t.highSectorFatigueRisk}: ${duty.flights.length} sectors`,
      regulation: 'ORO.FTL.205',
      severity: 'MEDIUM',
      fatigueRisk: 'High sector count increases workload and fatigue',
      recommendation: 'Monitor crew alertness and consider additional rest'
    });
  }
  
  // Night duty fatigue risk
  if (duty.reportTime) {
    const reportHour = parseInt(duty.reportTime.split(':')[0]);
    if (reportHour >= EASA_LIMITS.fatigueRisk.nightDutyStart || reportHour <= EASA_LIMITS.fatigueRisk.nightDutyEnd) {
      fatigueScore += 1;
      fatigueFactors.push('Night duty');
      
      if (result.status === t.LEGAL) {
        result.status = t.WARNING;
      }
      
      result.issues.push({
        type: 'NIGHT_DUTY_FATIGUE_RISK',
        message: `${t.nightDutyFatigueRisk}: Start time ${duty.reportTime}`,
        regulation: 'ORO.FTL.205',
        severity: 'MEDIUM',
        fatigueRisk: 'Night duties disrupt circadian rhythms and increase fatigue',
        recommendation: 'Ensure adequate rest before and after night duties'
      });
    }
  }
  
  // Early start fatigue risk
  if (duty.reportTime) {
    const reportHour = parseInt(duty.reportTime.split(':')[0]);
    if (reportHour < EASA_LIMITS.fatigueRisk.earlyStart) {
      fatigueScore += 1;
      fatigueFactors.push('Early start');
    }
  }
  
  // Late finish fatigue risk
  if (duty.offDutyTime) {
    const offDutyHour = parseInt(duty.offDutyTime.split(':')[0]);
    if (offDutyHour >= 0 && offDutyHour <= EASA_LIMITS.fatigueRisk.lateFinish) {
      fatigueScore += 1;
      fatigueFactors.push('Late finish');
    }
  }
  
  // Add fatigue assessment to calculations
  result.calculations.fatigueScore = fatigueScore;
  result.calculations.fatigueFactors = fatigueFactors;
  
  if (fatigueScore >= 3) {
    result.status = t.WARNING;
    result.issues.push({
      type: 'HIGH_FATIGUE_RISK',
      message: `${t.highFatigueRisk}: Score ${fatigueScore}/5`,
      regulation: 'ORO.FTL.120',
      severity: 'MEDIUM',
      fatigueRisk: 'Multiple fatigue risk factors detected',
      recommendation: 'Consider fatigue risk management measures'
    });
  }
}

/**
 * Check for excessive consecutive duty days
 * @param {Object} result - Day compliance result
 * @param {Object} duty - Current duty period
 * @param {Array} allData - All duty periods
 * @param {number} currentIndex - Index of current duty
 * @param {Object} t - Translations object
 */
function addConsecutiveDutyChecks(result, duty, allData, currentIndex, t) {
  if (duty.type === 'DAYOFF') return;
  
  let consecutiveDuties = 1;
  
  // Count consecutive duties before current day
  for (let i = currentIndex - 1; i >= 0; i--) {
    const prevDuty = allData[i];
    const prevDate = moment(prevDuty.date);
    const currentDate = moment(duty.date);
    
    if (currentDate.diff(prevDate, 'days') === consecutiveDuties && prevDuty.type !== 'DAYOFF') {
      consecutiveDuties++;
    } else {
      break;
    }
  }
  
  // Count consecutive duties after current day
  for (let i = currentIndex + 1; i < allData.length; i++) {
    const nextDuty = allData[i];
    const nextDate = moment(nextDuty.date);
    const currentDate = moment(duty.date);
    
    if (nextDate.diff(currentDate, 'days') === (i - currentIndex) && nextDuty.type !== 'DAYOFF') {
      consecutiveDuties++;
    } else {
      break;
    }
  }
  
  result.calculations.consecutiveDuties = consecutiveDuties;
  
  if (consecutiveDuties > EASA_LIMITS.fatigueRisk.maxConsecutiveDuties) {
    if (result.status === t.LEGAL) {
      result.status = t.WARNING;
    }
    
    result.issues.push({
      type: 'CONSECUTIVE_DUTIES_EXCEEDED',
      message: `${t.consecutiveDutiesExceeded}: ${consecutiveDuties} consecutive days`,
      regulation: 'ORO.FTL.190',
      severity: 'MEDIUM',
      fatigueRisk: 'Extended consecutive duty periods increase cumulative fatigue',
      recommendation: 'Provide adequate days off to prevent fatigue accumulation'
    });
  }
}

/**
 * Calculate cumulative flight time over a period
 * @param {Array} allData - All duty periods
 * @param {moment} currentDate - Current date
 * @param {number} amount - Time period amount
 * @param {string} unit - Time period unit (days, month, year)
 * @returns {number} - Cumulative flight time in hours
 */
function calculateCumulativeFlightTime(allData, currentDate, amount, unit) {
  const startDate = currentDate.clone().subtract(amount - 1, unit).startOf(unit === 'days' ? 'day' : unit);
  const endDate = currentDate.clone().endOf('day');
  
  let totalFlightTime = 0;
  
  allData.forEach(duty => {
    const dutyDate = moment(duty.date);
    if (dutyDate.isBetween(startDate, endDate, 'day', '[]')) {
      if (duty.type === 'FLIGHT' && duty.flights) {
        totalFlightTime += calculateFlightTime(duty.flights);
      } else if (duty.type === 'STANDBY' && duty.callTime && duty.flights) {
        totalFlightTime += calculateFlightTime(duty.flights);
      }
    }
  });
  
  return totalFlightTime;
}

/**
 * Calculate cumulative duty time over a period
 * @param {Array} allData - All duty periods
 * @param {moment} currentDate - Current date
 * @param {number} amount - Time period amount
 * @param {string} unit - Time period unit (days, month, year)
 * @returns {number} - Cumulative duty time in hours
 */
function calculateCumulativeDutyTime(allData, currentDate, amount, unit) {
  const startDate = currentDate.clone().subtract(amount - 1, unit).startOf('day');
  const endDate = currentDate.clone().endOf('day');
  
  let totalDutyTime = 0;
  
  allData.forEach(duty => {
    const dutyDate = moment(duty.date);
    if (dutyDate.isBetween(startDate, endDate, 'day', '[]')) {
      if (duty.type === 'FLIGHT') {
        totalDutyTime += calculateFDP(duty);
      } else if (duty.type === 'STANDBY') {
        if (duty.callTime && duty.flights) {
          // For called standby, count standby period + FDP
          totalDutyTime += calculateStandbyPeriod(duty) + calculateFDP(duty);
        } else {
          // For uncalled standby, count standby period
          totalDutyTime += calculateStandbyPeriod(duty);
        }
      } else if (duty.type === 'TRAINING' || duty.type === 'ADMIN') {
        // For training/admin duties, calculate based on report/off duty times
        if (duty.reportTime && duty.offDutyTime) {
          const reportMoment = moment(duty.reportTime, 'HH:mm');
          let offDutyMoment = moment(duty.offDutyTime, 'HH:mm');
          
          if (offDutyMoment.isBefore(reportMoment)) {
            offDutyMoment.add(1, 'day');
          }
          
          totalDutyTime += offDutyMoment.diff(reportMoment, 'hours', true);
        }
      }
    }
  });
  
  return totalDutyTime;
}

module.exports = {
  checkEASACompliance,
  checkDayCompliance,
  calculateFDP,
  calculateFlightTime,
  calculateRest,
  calculateStandbyPeriod,
  getMaxFDP,
  getMinRest,
  checkExtensionAllowance,
  addAdvancedComplianceChecks,
  calculateCumulativeFlightTime,
  calculateCumulativeDutyTime,
  EASA_LIMITS,
  TRANSLATIONS
}; 