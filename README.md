# Sherry's Eats 🍽️

A beautiful, modern website for Sherry's Eats - serving fresh chips, salsa, breakfast burritos, and catering in Michigan since 2001.

## Features

- **Americana Design**: Beautiful distressed textures and patriotic color scheme
- **Interactive Order Form**: Easy-to-use ordering system with delivery scheduling
- **Calendar Integration**: Google Calendar API for delivery scheduling
- **Interactive Map**: Leaflet.js map showing delivery locations
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile
- **Contact Integration**: Phone, email, and social media links

## Design Inspiration

The website features a stunning Americana-inspired design with:
- Distressed red lines at top and bottom
- Shield logo with American flag motif
- Dark blue banner with "SHERRY'S EATS" and "EST. 2001"
- Elegant typography with Playfair Display and Roboto fonts
- Three prominent call-to-action buttons
- "Made in Michigan" branding with chili pepper icon

## Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Node.js, Express.js
- **Maps**: Leaflet.js
- **Calendar**: Google Calendar API
- **Fonts**: Google Fonts (Playfair Display, Roboto)

## Getting Started

### Prerequisites

- Node.js (version 16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd sherrys-eats
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:3000`

### Production

To run in production mode:
```bash
npm start
```

## Project Structure

```
sherrys-eats/
├── index.html          # Main landing page
├── order-form.html     # Order form with calendar integration
├── style.css          # Main stylesheet
├── server.js          # Express.js backend server
├── package.json       # Node.js dependencies and scripts
├── README.md          # This file
├── sherrys-logo.png   # Sherry's Eats logo
├── venmo-logo.png     # Venmo payment logo
├── square-logo.png    # Square payment logo
└── cash-app-logo.jpg  # Cash App payment logo
```

## API Endpoints

- `GET /api/deliveries` - Fetch delivery schedule from Google Calendar
- `GET /health` - Health check endpoint

## Configuration

The server uses the following environment variables:
- `PORT` - Server port (default: 3000)
- Google Calendar API key and calendar ID are configured in `server.js`

## Features in Detail

### Order Form
- Dynamic salsa selection with multiple flavors and sizes
- Interactive calendar for delivery scheduling
- City-based delivery location filtering
- Interactive map with clickable city markers
- Form validation and error handling

### Design Elements
- Distressed textures and vintage aesthetics
- Responsive design for all screen sizes
- Smooth animations and hover effects
- Accessible design with proper ARIA labels
- Print-friendly styles

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Contact

- **Phone**: (810) 627-8204
- **Email**: sherryschipsandsalsa@gmail.com
- **Instagram**: [@sherryseatsmi](https://www.instagram.com/sherryseatsmi/)
- **Venmo**: [@sherrys-eats](https://venmo.com/sherrys-eats)

---

*Made with ❤️ in Michigan since 2001* 