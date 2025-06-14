/**
 * Airport timezone mapping for common IATA codes
 * Maps airport codes to their respective timezones
 */
const AIRPORT_TIMEZONES = {
  // Europe
  'VIE': 'Europe/Vienna',      // Vienna
  'AMS': 'Europe/Amsterdam',   // Amsterdam
  'FRA': 'Europe/Berlin',      // Frankfurt
  'MUC': 'Europe/Berlin',      // Munich
  'ZUR': 'Europe/Zurich',      // Zurich
  'ZRH': 'Europe/Zurich',      // Zurich (correct IATA code)
  'CDG': 'Europe/Paris',       // Paris Charles de Gaulle
  'ORY': 'Europe/Paris',       // Paris Orly
  'LHR': 'Europe/London',      // London Heathrow
  'LGW': 'Europe/London',      // London Gatwick
  'STN': 'Europe/London',      // London Stansted
  'MAD': 'Europe/Madrid',      // Madrid
  'BCN': 'Europe/Madrid',      // Barcelona
  'FCO': 'Europe/Rome',        // Rome Fiumicino
  'MXP': 'Europe/Rome',        // Milan Malpensa
  'ARN': 'Europe/Stockholm',   // Stockholm
  'CPH': 'Europe/Copenhagen',  // Copenhagen
  'OSL': 'Europe/Oslo',        // Oslo
  'HEL': 'Europe/Helsinki',    // Helsinki
  'WAW': 'Europe/Warsaw',      // Warsaw
  'PRG': 'Europe/Prague',      // Prague
  'BUD': 'Europe/Budapest',    // Budapest
  'OTP': 'Europe/Bucharest',   // Bucharest Otopeni
  'ATH': 'Europe/Athens',      // Athens
  'IST': 'Europe/Istanbul',    // Istanbul
  'SVO': 'Europe/Moscow',      // Moscow Sheremetyevo
  'DME': 'Europe/Moscow',      // Moscow Domodedovo
  
  // North America
  'JFK': 'America/New_York',   // New York JFK
  'LGA': 'America/New_York',   // New York LaGuardia
  'EWR': 'America/New_York',   // Newark
  'LAX': 'America/Los_Angeles', // Los Angeles
  'SFO': 'America/Los_Angeles', // San Francisco
  'ORD': 'America/Chicago',    // Chicago O'Hare
  'MDW': 'America/Chicago',    // Chicago Midway
  'DFW': 'America/Chicago',    // Dallas/Fort Worth
  'IAH': 'America/Chicago',    // Houston
  'PHX': 'America/Phoenix',    // Phoenix
  'DEN': 'America/Denver',     // Denver
  'SEA': 'America/Los_Angeles', // Seattle
  'LAS': 'America/Los_Angeles', // Las Vegas
  'MIA': 'America/New_York',   // Miami
  'YYZ': 'America/Toronto',    // Toronto
  'YVR': 'America/Vancouver',  // Vancouver
  
  // Asia Pacific
  'NRT': 'Asia/Tokyo',         // Tokyo Narita
  'HND': 'Asia/Tokyo',         // Tokyo Haneda
  'ICN': 'Asia/Seoul',         // Seoul Incheon
  'PEK': 'Asia/Shanghai',      // Beijing
  'PVG': 'Asia/Shanghai',      // Shanghai Pudong
  'HKG': 'Asia/Hong_Kong',     // Hong Kong
  'SIN': 'Asia/Singapore',     // Singapore
  'BKK': 'Asia/Bangkok',       // Bangkok
  'KUL': 'Asia/Kuala_Lumpur',  // Kuala Lumpur
  'CGK': 'Asia/Jakarta',       // Jakarta
  'MNL': 'Asia/Manila',        // Manila
  'SYD': 'Australia/Sydney',   // Sydney
  'MEL': 'Australia/Melbourne', // Melbourne
  'BNE': 'Australia/Brisbane', // Brisbane
  'PER': 'Australia/Perth',    // Perth
  'AKL': 'Pacific/Auckland',   // Auckland
  
  // Middle East & Africa
  'DXB': 'Asia/Dubai',         // Dubai
  'DOH': 'Asia/Qatar',         // Doha
  'AUH': 'Asia/Dubai',         // Abu Dhabi
  'KWI': 'Asia/Kuwait',        // Kuwait
  'RUH': 'Asia/Riyadh',        // Riyadh
  'JED': 'Asia/Riyadh',        // Jeddah
  'CAI': 'Africa/Cairo',       // Cairo
  'JNB': 'Africa/Johannesburg', // Johannesburg
  'CPT': 'Africa/Johannesburg', // Cape Town
  'ADD': 'Africa/Addis_Ababa', // Addis Ababa
  'NBO': 'Africa/Nairobi',     // Nairobi
  
  // South America
  'GRU': 'America/Sao_Paulo',  // São Paulo
  'GIG': 'America/Sao_Paulo',  // Rio de Janeiro
  'EZE': 'America/Argentina/Buenos_Aires', // Buenos Aires
  'SCL': 'America/Santiago',   // Santiago
  'LIM': 'America/Lima',       // Lima
  'BOG': 'America/Bogota',     // Bogotá
  
  // Additional European destinations
  'BER': 'Europe/Berlin',      // Berlin Brandenburg
  'RMO': 'Europe/Rome',        // Rome (assuming this is a Rome airport code)
  'BRU': 'Europe/Brussels',    // Brussels
  'DUS': 'Europe/Berlin',      // Düsseldorf
  'HAM': 'Europe/Berlin',      // Hamburg
  'STR': 'Europe/Berlin',      // Stuttgart
  'CGN': 'Europe/Berlin',      // Cologne
  'NUE': 'Europe/Berlin',      // Nuremberg
  'LYS': 'Europe/Paris',       // Lyon
  'NCE': 'Europe/Paris',       // Nice
  'TLS': 'Europe/Paris',       // Toulouse
  'MRS': 'Europe/Paris',       // Marseille
  'GVA': 'Europe/Zurich',      // Geneva
  'BSL': 'Europe/Zurich',      // Basel
  'VCE': 'Europe/Rome',        // Venice
  'NAP': 'Europe/Rome',        // Naples
  'PMI': 'Europe/Madrid',      // Palma de Mallorca
  'AGP': 'Europe/Madrid',      // Málaga
  'SVQ': 'Europe/Madrid',      // Seville
  'BIO': 'Europe/Madrid',      // Bilbao
};

/**
 * Get timezone for an airport code
 * @param {string} airportCode - IATA airport code
 * @returns {string} - Timezone identifier or default to UTC
 */
function getAirportTimezone(airportCode) {
  if (!airportCode || typeof airportCode !== 'string') {
    return 'UTC';
  }
  
  const code = airportCode.toUpperCase();
  return AIRPORT_TIMEZONES[code] || 'UTC';
}

/**
 * Get all supported airport codes
 * @returns {Array} - Array of supported airport codes
 */
function getSupportedAirports() {
  return Object.keys(AIRPORT_TIMEZONES);
}

/**
 * Check if an airport code is supported
 * @param {string} airportCode - IATA airport code
 * @returns {boolean} - True if supported
 */
function isAirportSupported(airportCode) {
  if (!airportCode || typeof airportCode !== 'string') {
    return false;
  }
  
  const code = airportCode.toUpperCase();
  return AIRPORT_TIMEZONES.hasOwnProperty(code);
}

module.exports = {
  AIRPORT_TIMEZONES,
  getAirportTimezone,
  getSupportedAirports,
  isAirportSupported
}; 