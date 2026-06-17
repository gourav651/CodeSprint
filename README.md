
## Environment Variables

Create a `.env` file in the project root and add the following variables:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Code Execution Backend
# Using OnlineCompiler.io (free, 1M requests/month, no credit card)
# Get your API key at: https://onlinecompiler.io
EXECUTION_BACKEND=onlinecompiler
ONLINECOMPILER_API_KEY=

### Service Setup

- **Clerk** → Used for authentication and user management.
- **Supabase** → Used as the PostgreSQL database and backend service.
- **OnlineCompiler.io** → Used for secure multi-language code execution through a cloud-based compiler API.
