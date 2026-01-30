# Travel Planner

A travel itinerary planning application built with **SvelteKit 5** and **Svelte 5 runes**. Plan multi-city trips, manage lodging, schedule activities and meals, book flights/trains/buses, and view day-by-day itineraries with weather forecasts and travel time calculations.

## Features

- 🗺️ Multi-city trip planning with drag-and-drop itinerary
- 🏨 Lodging management (hotels, Airbnb, VRBO, hostels)
- ✈️ Flight, train, and bus booking with route lookup
- 🌤️ Weather forecasts (current + 16-day forecast + historical predictions)
- 🚗 Travel time calculations between activities
- 📱 Responsive design with dark mode support
- 📄 Export to PDF, DOCX, or JSON
- 💾 Offline-first with localStorage persistence

## Tech Stack

- **Frontend**: SvelteKit 5, Svelte 5 (runes), TypeScript
- **Styling**: Modern CSS (container queries, oklch colors, nesting)
- **Server**: Node.js with adapter-node
- **Caching**: SQLite (server) + in-memory (client)
- **APIs**: Open-Meteo (weather), OSRM (routing), adsbdb (flights)

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Type checking
npm run check
```

## Building

```bash
# Build for production
npm run build

# Preview production build locally
npm run preview
```

## Docker Deployment

### Quick Start

```bash
# Build and run with docker-compose
npm run docker:up

# View logs
npm run docker:logs

# Stop
npm run docker:down
```

### Manual Docker Build

```bash
# Build image
npm run docker:build

# Run container
npm run docker:run
```

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Server
PORT=3000
HOST=0.0.0.0
ORIGIN=https://travel.yourdomain.com  # Your production URL

# API Keys (optional - defaults to free APIs)
FLIGHT_API_KEY=your_key_here  # For premium flight data

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_WEATHER=100
RATE_LIMIT_MAX_FLIGHTS=50
RATE_LIMIT_MAX_ROUTING=200

# Database
DATABASE_PATH=/app/data/cache.db
```

### Reverse Proxy (nginx example)

```nginx
server {
    listen 443 ssl http2;
    server_name travel.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Architecture

```
Browser                           Server (SvelteKit)
┌─────────────────┐              ┌─────────────────────┐
│ Client APIs     │──fetch──────►│ /api/weather        │
│ (with cache)    │              │ /api/flights/*      │
│                 │              │ /api/routing        │
├─────────────────┤              ├─────────────────────┤
│ localStorage    │              │ SQLite Cache        │
│ (trip data)     │              │ (API responses)     │
└─────────────────┘              └──────────┬──────────┘
                                            │
                                 ┌──────────▼──────────┐
                                 │ External APIs       │
                                 │ - Open-Meteo        │
                                 │ - OSRM              │
                                 │ - adsbdb            │
                                 └─────────────────────┘
```

### Two-Tier Caching

1. **Client (in-memory)**: Fast, per-session, 5-30 min TTL
2. **Server (SQLite)**: Persistent, shared, 1hr-7 day TTL

This dramatically reduces external API calls while keeping data fresh.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/weather` | GET | Weather forecast/historical data |
| `/api/flights/search` | GET | Search for flight routes |
| `/api/flights/airlines` | GET | Search airlines by code |
| `/api/routing` | GET | Calculate travel time/distance |

All endpoints include rate limiting headers (`X-RateLimit-*`).

## License

Private project.
