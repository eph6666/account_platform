# AWS Account Platform - Frontend

Modern React frontend for managing AWS accounts, credentials, and Bedrock quotas.

## Tech Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **TailwindCSS** - Styling
- **TanStack Query** - Server state management
- **React Router** - Client-side routing
- **AWS Amplify** - Cognito authentication
- **Axios** - HTTP client

## Features

- 🔐 Secure Cognito authentication with JWT
- 📊 Dashboard with account statistics
- 🏢 AWS account management (list, detail, create)
- 🔑 Secure credential export (Admin only)
- 📍 Billing address management
- 🚀 Bedrock TPM quota monitoring
- 🌙 Dark mode support
- 📱 Responsive design

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Account/        # Account-related components
│   ├── Dashboard/      # Dashboard components
│   └── Layout/         # Layout components (Header, Sidebar)
├── config/             # Configuration files
│   ├── amplify.ts     # AWS Amplify config
│   └── api.ts         # API endpoints config
├── hooks/              # Custom React hooks
│   ├── useAuth.ts     # Authentication hook
│   ├── useAccounts.ts # Account management hooks
│   └── useDashboard.ts # Dashboard data hook
├── pages/              # Page components
│   ├── Login.tsx      # Login page
│   ├── Home.tsx       # Dashboard page
│   ├── AccountList.tsx # Account list page
│   └── AccountDetail.tsx # Account detail page
├── services/           # API service layer
│   └── api.ts         # Axios client with interceptors
├── types/              # TypeScript type definitions
│   ├── account.ts     # Account types
│   ├── auth.ts        # Auth types
│   └── dashboard.ts   # Dashboard types
├── App.tsx            # Main app component with routing
├── main.tsx           # Entry point
└── index.css          # Global styles with Tailwind
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Backend API running on `http://localhost:8000`

### Installation

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Start development server
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000)

### Build for Production

```bash
# Build optimized production bundle
npm run build

# Preview production build
npm run preview
```

## Environment Variables

Create a `.env` file:

```bash
VITE_API_BASE_URL=http://localhost:8000
```

For production, set `VITE_API_BASE_URL` to your actual API URL.

## Development

### Running with Backend

Make sure the backend API is running:

```bash
cd ../backend
docker-compose up -d
# or
uv run uvicorn app.main:app --reload
```

Then start the frontend:

```bash
npm run dev
```

### Code Style

```bash
# Lint
npm run lint

# Format (if configured)
npm run format
```

## User Roles

### Admin Users
- Create new AWS accounts
- Export account credentials (AKSK)
- Update billing addresses
- Refresh Bedrock quotas
- View all accounts

### Regular Users
- View accounts they created
- View account details
- View quotas and billing info
- Cannot export credentials

## Key Components

### Authentication Flow

1. App fetches Cognito config from backend (`/api/auth/config`)
2. Amplify is configured with the returned Cognito settings
3. User signs in with username/password
4. JWT token is automatically added to all API requests
5. Protected routes check authentication status

### API Integration

All API calls go through the `api` service in `services/api.ts`:
- Automatic JWT token injection
- Error handling and retries
- Type-safe request/response

### State Management

- **TanStack Query** - Server state (API data)
- **React Context** - Auth state (via Amplify)
- **Local State** - UI state (forms, modals)

## Pages

### Dashboard (`/`)
- Total accounts count
- Active accounts count
- Total TPM quota
- List of accounts with quota

### Account List (`/accounts`)
- Grid view of all accounts
- Create account button (Admin only)
- Click to view details

### Account Detail (`/accounts/:id`)
- Basic account info
- Billing address
- Bedrock TPM quota
- Export credentials button (Admin only)
- Refresh quota button (Admin only)

## API Endpoints Used

- `GET /health` - Health check
- `GET /api/auth/config` - Get Cognito config
- `GET /api/auth/me` - Get current user
- `GET /api/accounts` - List accounts
- `POST /api/accounts` - Create account (Admin)
- `GET /api/accounts/:id` - Get account detail
- `GET /api/accounts/:id/credentials` - Export AKSK (Admin)
- `GET /api/accounts/:id/quota` - Get Bedrock quota
- `POST /api/accounts/:id/quota/refresh` - Refresh quota (Admin)
- `GET /api/dashboard/stats` - Dashboard statistics

## Security

- All sensitive operations require authentication
- JWT tokens are stored securely by AWS Amplify
- Credentials are only displayed once after export
- Credentials are not stored in localStorage
- HTTPS enforced in production
- Role-based access control

## Troubleshooting

### Cannot connect to backend
- Ensure backend is running on port 8000
- Check `VITE_API_BASE_URL` in `.env`
- Verify CORS is configured in backend

### Authentication fails
- Check Cognito configuration in backend
- Verify user exists in Cognito User Pool
- Check browser console for errors

### Build fails
- Clear node_modules: `rm -rf node_modules && npm install`
- Check Node.js version: `node --version` (should be 18+)

## Next Steps

- [ ] Add i18n support (English + Chinese)
- [ ] Add unit tests
- [ ] Add E2E tests with Playwright
- [ ] Deploy to S3 + CloudFront
- [ ] Add more dashboard visualizations
- [ ] Add account search/filter
- [ ] Add account status management

## License

Private project
