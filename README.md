# EASA FTL Checker

A modern web application for flight and cabin crew to check EASA Flight Time Limitations (FTL) compliance. This tool allows manual entry of duty periods and provides detailed analysis against EU Regulation 965/2012 (ORO.FTL).

## Features

- ✈️ **Manual Flight Entry** - Easy-to-use forms for entering duty periods and flights
- 📊 **EASA FTL Compliance** - Real-time checking against ORO.FTL.205, ORO.FTL.235, and ORO.FTL.210
- 🌍 **Multi-language Support** - English and Russian interface
- 📱 **Mobile Responsive** - Works seamlessly on desktop and mobile devices
- ⚠️ **Detailed Analysis** - Comprehensive reports with fatigue risk assessment
- 🎯 **Modern UI** - Clean, intuitive Material-UI design

## EASA Regulations Covered

- **ORO.FTL.205** - Flight Duty Period limits based on start time and sectors
- **ORO.FTL.235** - Minimum rest requirements between duty periods
- **ORO.FTL.210** - Flight time limitations (daily, weekly, monthly, yearly)

## Technology Stack

### Backend
- Node.js with Express
- Moment.js for time calculations
- EASA FTL compliance engine

### Frontend
- React 18 with TypeScript
- Material-UI (MUI) for components
- React Router for navigation
- Axios for API communication
- Day.js for date handling

## Installation

### Prerequisites
- Node.js 16+ and npm
- Modern web browser

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd easa-ftl-checker
   ```

2. **Install backend dependencies**
   ```bash
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd client
   npm install
   cd ..
   ```

4. **Start the development servers**
   ```bash
   # Start both backend and frontend
   npm run dev
   
   # Or start them separately:
   # Backend (port 3001)
   npm run server
   
   # Frontend (port 3000)
   npm run client
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## Usage

### Adding Duty Periods

1. **Navigate to Flight Entry** - Click "Flight Entry" in the navigation
2. **Add Duty Period** - Click "Add Duty Period" button
3. **Select Duty Type**:
   - **Flight** - For flight duties (requires report time, off-duty time, and flights)
   - **Standby** - For standby duties
   - **Day Off** - For rest days
   - **Training** - For training duties
   - **Admin** - For administrative duties

### Flight Entry Details

For flight duties, enter:
- **Date** - Duty date
- **Report Time** - When you report for duty (UTC)
- **Off Duty Time** - When you go off duty (UTC)
- **Flights** - Add each flight sector with:
  - Flight number (e.g., OS123)
  - Departure airport (3-letter IATA code, e.g., VIE)
  - Arrival airport (3-letter IATA code, e.g., FRA)
  - Departure time (UTC)
  - Arrival time (UTC)
  - Aircraft type (optional)

### Viewing Results

1. **Check Compliance** - Click "Check Compliance" button
2. **Review Analysis** - See detailed compliance results with:
   - Legal/Warning/Illegal status for each day
   - FDP calculations vs. maximum allowed
   - Rest period analysis
   - Flight time totals
   - Detailed issue explanations with regulation references

## EASA FTL Limits Reference

### Maximum FDP (Flight Duty Period)

| Sectors | 06:00-17:59 | 18:00-21:59 | 22:00-04:59 | 05:00-05:59 |
|---------|-------------|-------------|-------------|-------------|
| 1       | 13:00       | 12:00       | 11:00       | 12:00       |
| 2       | 12:30       | 11:30       | 10:30       | 11:30       |
| 3       | 12:00       | 11:00       | 10:00       | 11:00       |
| 4       | 11:30       | 10:30       | 09:30       | 10:30       |
| 5       | 11:00       | 10:00       | 09:00       | 10:00       |
| 6+      | 10:30       | 09:30       | 08:30       | 09:30       |

### Rest Requirements
- **Standard minimum rest**: 10 hours
- **Extended rest** (after extended FDP): 12 hours
- Rest must include opportunity for 8 hours uninterrupted sleep

### Flight Time Limits
- **Daily**: 8 hours
- **Weekly** (7 consecutive days): 60 hours
- **Monthly**: 190 hours
- **Yearly**: 1000 hours

## Status Meanings

- 🟢 **LEGAL** - All limits are respected, duty is compliant
- 🟡 **WARNING** - Close to limits or potential fatigue risk
- 🔴 **ILLEGAL** - Exceeds EASA limits, not compliant

## API Endpoints

### POST `/api/check-compliance`
Check EASA FTL compliance for flight data.

**Request Body:**
```json
{
  "flightData": [
    {
      "date": "2024-01-15",
      "type": "FLIGHT",
      "reportTime": "06:00",
      "offDutyTime": "14:30",
      "flights": [
        {
          "flightNumber": "OS123",
          "departure": "VIE",
          "arrival": "FRA",
          "departureTime": "08:00",
          "arrivalTime": "09:30"
        }
      ]
    }
  ],
  "dateScope": "3days",
  "language": "en"
}
```

### GET `/api/ftl-limits`
Get EASA FTL limits reference data.

### GET `/api/health`
Health check endpoint.

## 🌐 Deployment

Your EASA FTL Checker is ready for deployment! Choose from these options:

### Quick Deploy (Recommended)
```bash
./deploy.sh
```

### Manual Deploy Options

#### Heroku (Free Tier Available)
```bash
heroku create your-easa-ftl-checker
git add . && git commit -m "Ready for deployment"
git push heroku main
heroku open
```

#### Vercel (Serverless)
```bash
npm i -g vercel
vercel --prod
```

#### Railway (Modern Alternative)
```bash
npm install -g @railway/cli
railway init && railway up
```

📖 **See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions**

### Production Build

1. **Build the frontend**
   ```bash
   npm run build
   ```

2. **Start production server**
   ```bash
   NODE_ENV=production npm start
   ```

### Environment Variables

- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment (development/production)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Disclaimer

This tool is for reference purposes only. Always consult official EASA regulations and your company's operations manual for authoritative guidance. The developers are not responsible for any operational decisions made based on this tool's output.

## Support

For issues or questions:
1. Check the Help page in the application
2. Review EASA documentation
3. Contact your flight operations department

---

**Note**: This application uses UTC times throughout. Ensure all time entries are in UTC for accurate compliance checking. 