# ARTEVA Maison Frontend

Modern e-commerce frontend for luxury home décor and artisan glassware.

## Features

- Responsive design with mobile-first approach
- Multi-language support (English/Arabic)
- Multi-currency support (KWD, SAR, AED, QAR, BHD, OMR)
- Real-time cart management
- Order tracking with live driver location
- Secure checkout with multiple payment methods

## Setup

### Local Development

1. Open `index.html` in your browser
2. The application will automatically connect to localhost backend (port 5000)

### Configuration

API URL is auto-detected based on hostname:
- **Localhost**: `http://localhost:5000/api`
- **Production**: `https://arteva-maison-backend-gy1x.onrender.com/api`

Configuration can be modified in `assets/js/config.js`:
```javascript
const Config = {
    API_BASE_URL: '...',
    FEATURES: {
        STRIPE_ENABLED: false,
        KNET_ENABLED: false,
        COD_ENABLED: true
    }
};
```

## Deployment

### Vercel (Recommended)

```bash
vercel --prod
```

The application is configured for static hosting with no build step required.

### Manual Deployment

Upload all files to any static hosting service (Netlify, GitHub Pages, etc.)

## Project Structure

```
arteva-maison-frontend/
├── assets/
│   ├── css/          # Stylesheets
│   ├── js/           # JavaScript modules
│   └── images/       # Product images and assets
├── *.html            # HTML pages
└── README.md
```

## Environment Variables

No environment variables needed for frontend. API URL is auto-detected.

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

© 2026 ARTÉVA Maison. All rights reserved.
