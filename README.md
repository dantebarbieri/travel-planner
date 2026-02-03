# Travel Planner

A travel itinerary planning application built with **SvelteKit 5** and **Svelte 5 runes**. Plan multi-city trips, manage lodging, schedule activities and meals, book flights/trains/buses, and view day-by-day itineraries with weather forecasts and travel time calculations.

## Features

- 🗺️ Multi-city trip planning with drag-and-drop itinerary
- 🏨 Lodging management (hotels, Airbnb, VRBO, hostels) with search
- ✈️ Flight, train, and bus booking with route lookup
- 🍽️ Restaurant and attraction search with business hours
- 🌤️ Weather forecasts (current + 16-day forecast + historical predictions)
- 🚗 Travel time calculations between activities
- ⚙️ User & trip settings (units, theme, color schemes)
- 📱 Responsive design with dark mode support
- 📄 Export to PDF, DOCX, or JSON
- 💾 Offline-first with localStorage persistence

## Tech Stack

- **Frontend**: SvelteKit 5, Svelte 5 (runes), TypeScript
- **Styling**: Modern CSS (container queries, oklch colors, nesting)
- **Server**: Node.js with adapter-node
- **Caching**: SQLite (server) + in-memory (client)
- **APIs**: Geoapify, Foursquare, Open-Meteo, OSRM, AeroDataBox

## Development

```bash
# Install dependencies
npm install

# Copy environment file and add API keys
cp .env.example .env

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

## Self-Hosting with Docker

### Quick Start

```bash
# Copy and configure environment
cp .env.example .env
# Edit .env with your API keys

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

Copy `.env.example` to `.env` and configure the following:

#### API Keys (Required for full functionality)

| Variable | Purpose | Free Tier | Get Key At |
|----------|---------|-----------|------------|
| `GEOAPIFY_API_KEY` | City search, geocoding, timezone | 3,000 req/day | [myprojects.geoapify.com](https://myprojects.geoapify.com/) |
| `FOURSQUARE_API_KEY` | Food, attractions, lodging search | $200/mo (~20k calls) | [foursquare.com/developers](https://foursquare.com/developers/) |
| `AERODATABOX_API_KEY` | Flight lookup | 600 units/mo | [rapidapi.com/aerodatabox](https://rapidapi.com/aedbx-aedbx/api/aerodatabox) |

#### API Keys (Optional)

| Variable | Purpose | Free Tier | Get Key At |
|----------|---------|-----------|------------|
| `GOOGLE_PLACES_API_KEY` | Place details (hours, pricing) | $200/mo (~5k calls) | [console.cloud.google.com](https://console.cloud.google.com/) |
| `TIMEZONEDB_API_KEY` | Timezone fallback | 1 req/sec unlimited | [timezonedb.com](https://timezonedb.com/) |

#### Server Configuration

```bash
PORT=3000                              # Server port
HOST=0.0.0.0                           # Bind address
ORIGIN=https://travel.yourdomain.com   # Your production URL (important for CORS)
DATABASE_PATH=/app/data/cache.db       # SQLite cache location
```

#### Rate Limiting

```bash
RATE_LIMIT_WINDOW_MS=60000       # Window size (1 minute)
RATE_LIMIT_MAX_WEATHER=100       # Weather requests per window
RATE_LIMIT_MAX_FLIGHTS=50        # Flight requests per window
RATE_LIMIT_MAX_ROUTING=200       # Routing requests per window
RATE_LIMIT_MAX_GEOCODING=100     # Geocoding requests per window
RATE_LIMIT_MAX_CITIES=100        # City search requests per window
RATE_LIMIT_MAX_PLACES=100        # Places search requests per window
```

#### Reverse Proxy Settings

```bash
TRUST_PROXY=true    # Set to 'true' when behind nginx/cloudflare/traefik
                    # Required for correct IP-based rate limiting
```

### docker-compose.yml Configuration

The default `docker-compose.yml` passes through environment variables from your `.env` file. Key settings:

```yaml
services:
  travel-planner:
    environment:
      - ORIGIN=${ORIGIN:-http://localhost:3000}
      - TRUST_PROXY=${TRUST_PROXY:-false}
      # API keys from .env
      - GEOAPIFY_API_KEY=${GEOAPIFY_API_KEY:-}
      - FOURSQUARE_API_KEY=${FOURSQUARE_API_KEY:-}
      - AERODATABOX_API_KEY=${AERODATABOX_API_KEY:-}
    volumes:
      # Persist SQLite cache across restarts
      - travel-planner-data:/app/data
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

**Important**: When using a reverse proxy, set `TRUST_PROXY=true` in your `.env` to enable correct IP detection for rate limiting.

### Troubleshooting

#### Container won't start

1. **Check logs**: `docker logs travel-planner`
2. **Verify environment**: Ensure `.env` file exists and is readable
3. **Check port conflicts**: Ensure port 3000 isn't already in use

#### API keys not working

1. **Geoapify**: Key should be a 32-character alphanumeric string
2. **Foursquare**: Key should start with `fsq3`
3. **AeroDataBox**: Key is from RapidAPI, not directly from AeroDataBox
4. **Test keys**: Try the API directly in browser/curl to verify

#### SQLite/Database errors

1. **Permission issues**: Ensure the data volume is writable
   ```bash
   docker exec travel-planner ls -la /app/data
   ```
2. **Corrupt database**: Delete the volume and restart
   ```bash
   docker-compose down -v
   docker-compose up -d
   ```

#### Rate limiting issues behind proxy

1. Set `TRUST_PROXY=true` in your `.env`
2. Ensure proxy passes `X-Forwarded-For` and `X-Real-IP` headers
3. Check that the app sees the correct client IP in logs

#### Health check failures

1. **Check if app is running**: `curl http://localhost:3000/`
2. **Memory issues**: Increase container memory limits
3. **Slow startup**: Increase `start-period` in health check

## Architecture

```
Browser                           Server (SvelteKit)
┌─────────────────┐              ┌─────────────────────────┐
│ Client APIs     │──fetch──────►│ /api/weather            │
│ (in-memory      │              │ /api/flights/*          │
│  cache)         │              │ /api/routing            │
│                 │              │ /api/geocoding          │
│                 │              │ /api/cities             │
│                 │              │ /api/places/*           │
├─────────────────┤              ├─────────────────────────┤
│ localStorage    │              │ SQLite Cache            │
│ (trips, settings│              │ (API responses)         │
└─────────────────┘              └──────────┬──────────────┘
                                            │
                                 ┌──────────▼──────────────┐
                                 │ External APIs           │
                                 │ - Geoapify (geocoding)  │
                                 │ - Foursquare (places)   │
                                 │ - Google Places (hours) │
                                 │ - Open-Meteo (weather)  │
                                 │ - OSRM (routing)        │
                                 │ - AeroDataBox (flights) │
                                 └─────────────────────────┘
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
| `/api/geocoding` | GET | Forward/reverse geocoding |
| `/api/cities` | GET | City search with autocomplete |
| `/api/places/food` | GET | Restaurant/cafe search |
| `/api/places/attractions` | GET | Attraction/landmark search |
| `/api/places/lodging` | GET | Hotel/hostel search |
| `/api/places/details` | GET | Place details (hours, pricing) |

All endpoints include rate limiting headers (`X-RateLimit-*`).

## License

Private project.
