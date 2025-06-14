const fs = require('fs').promises;
const path = require('path');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.mjs');
const { parseRosterBusterCalendar } = require('./rosterBusterParser');

/**
 * Extract text from PDF file using PDF.js
 * @param {string|Buffer} pdfPath - Path to PDF file or Buffer containing PDF data
 * @returns {Promise<string>} - Extracted text from all pages
 */
async function extractTextFromPDF(pdfPath) {
  try {
    let pdfData;
    
    // Handle both file path and buffer input
    if (Buffer.isBuffer(pdfPath)) {
      pdfData = new Uint8Array(pdfPath);
    } else {
      const fileBuffer = await fs.readFile(pdfPath);
      pdfData = new Uint8Array(fileBuffer);
    }

    // Load PDF document with proper font configuration
    const pdfDocument = await pdfjsLib.getDocument({
      data: pdfData,
      standardFontDataUrl: path.join(
        process.cwd(),
        'node_modules/pdfjs-dist/standard_fonts/'
      ),
      // Disable worker to avoid issues in Node.js
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true
    }).promise;

    let extractedText = '';

    // Extract text from all pages
    for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Join text items with proper spacing
      const pageText = textContent.items
        .map(item => item.str)
        .join(' ')
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
      
      if (pageText) {
        extractedText += pageText + '\n';
      }
    }

    return extractedText.trim();
  } catch (error) {
    console.error('❌ PDF text extraction error:', error);
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
}

/**
 * Parse PDF roster file into structured duty periods
 * @param {string|Buffer} pdfPath - Path to PDF file or Buffer containing PDF data
 * @param {Object} options - Parsing options
 * @param {boolean} options.isUTC - Whether times in roster are in UTC (default: true for Roster Buster)
 * @param {string} options.defaultTimezone - Default timezone if airport not found (default: 'Europe/Vienna')
 * @returns {Object} - Parsed data with duty periods array and any errors
 */
async function parsePDFRoster(pdfPath, options = {}) {
  const { isUTC = true, defaultTimezone = 'Europe/Vienna' } = options;
  
  try {
    console.log('📄 Extracting text from PDF...');
    
    // Extract text from PDF
    const extractedText = await extractTextFromPDF(pdfPath);
    
    if (!extractedText || extractedText.trim().length === 0) {
      return {
        success: false,
        errors: ['No text could be extracted from the PDF file'],
        dutyPeriods: []
      };
    }

    console.log('📄 PDF text extracted successfully:', {
      textLength: extractedText.length,
      preview: extractedText.substring(0, 200) + '...'
    });

    // Check if the extracted text looks like a Roster Buster calendar
    if (isRosterBusterFormat(extractedText)) {
      console.log('🔍 Detected Roster Buster calendar format in PDF');
      return parseRosterBusterCalendar(extractedText, { isUTC, defaultTimezone });
    } else {
      // Try to parse as standard roster format
      console.log('🔍 Attempting to parse as standard roster format');
      const { parseRosterText } = require('./rosterParser');
      return parseRosterText(extractedText, { isUTC, defaultTimezone });
    }

  } catch (error) {
    console.error('❌ PDF parsing error:', error);
    return {
      success: false,
      errors: [`PDF parsing error: ${error.message}`],
      dutyPeriods: []
    };
  }
}

/**
 * Detect if the extracted text is in Roster Buster calendar format
 * @param {string} text - The extracted text to analyze
 * @returns {boolean} - True if it appears to be Roster Buster format
 */
function isRosterBusterFormat(text) {
  // Look for characteristic patterns of Roster Buster calendar
  const rosterBusterPatterns = [
    /Monday\s+Tuesday\s+Wednesday\s+Thursday\s+Friday\s+Saturday\s+Sunday/i, // Calendar header
    /\d{1,2}\s+\d{1,2}\s+\d{1,2}\s+\d{1,2}\s+\d{1,2}\s+\d{1,2}\s+\d{1,2}/, // Date row pattern
    /Unknown - DAYOFF/i, // Roster Buster day off format
    /Rep \d{4}Z?/i, // Report time with optional Z suffix
    /Check Out.*DEB/i, // Check out pattern
    /Layover \(\d+:\d+ hours\)/i, // Layover pattern
    /\d{2}:\d{2}-\d{2}:\d{2}\s+[A-Z]{3}\s*-\s*[A-Z]{3}/i, // Flight time pattern
    /SBYHOME/i // Standby home pattern
  ];
  
  // Count how many patterns match
  let matchCount = 0;
  for (const pattern of rosterBusterPatterns) {
    if (pattern.test(text)) {
      matchCount++;
    }
  }
  
  // If 2 or more patterns match, it's likely Roster Buster format
  return matchCount >= 2;
}

/**
 * Validate PDF file before processing
 * @param {Buffer} fileBuffer - PDF file buffer
 * @returns {Object} - Validation result
 */
function validatePDFFile(fileBuffer) {
  // Check if it's a valid PDF by looking for PDF header
  const pdfHeader = fileBuffer.slice(0, 4).toString();
  
  if (pdfHeader !== '%PDF') {
    return {
      valid: false,
      error: 'File is not a valid PDF document'
    };
  }

  // Check file size (limit to 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (fileBuffer.length > maxSize) {
    return {
      valid: false,
      error: 'PDF file is too large (maximum 10MB allowed)'
    };
  }

  return { valid: true };
}

/**
 * Example of expected PDF roster format for documentation
 */
const PDF_ROSTER_FORMAT_EXAMPLE = `
Expected PDF Content:
- Roster Buster calendar format with monthly layout
- Flight duties with Rep times (e.g., "Rep 1120Z")
- Standby duties (e.g., "SBYHOME")
- Day off entries (e.g., "Unknown - DAYOFF")
- Flight details with airport codes and times
- Check out times and layover information

The PDF should contain a calendar grid with dates and corresponding duty information.
`;

module.exports = {
  parsePDFRoster,
  extractTextFromPDF,
  validatePDFFile,
  isRosterBusterFormat,
  PDF_ROSTER_FORMAT_EXAMPLE
}; 