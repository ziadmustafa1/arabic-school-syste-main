# Arabic School System

A comprehensive E-learning system for Arabic schools with rewards, badges, and a points system.

## Features

- User roles: Students, Parents, Teachers, and Administrators
- Points and rewards system
- Badges and achievements
- Penalty cards system
- Academic reporting
- Messaging system
- Attendance tracking
- Configurable system settings

## Database Updates

We've added new features to the system. To apply all database updates, run:

```bash
# Make sure your environment variables are set correctly
node scripts/utils/run-update.js
```

This will:
1. Apply all missing database tables and functions
2. Configure the penalty cards system
3. Add the points payment system
4. Fix any messaging system inconsistencies
5. Add role-specific rewards
6. Enhance the academic reporting system
7. Make system settings configurable
8. Run consistency checks to ensure data integrity

## New Features

### Penalty Cards System

The system now includes a penalty card mechanism that automatically issues cards when students accumulate negative points:

- **White Card**: Issued at 3 negative categories, 15% points deduction, active for 3 days
- **Yellow Card**: Issued at 6 negative categories, 30% points deduction, active for 7 days
- **Orange Card**: Issued at 12 negative categories, 25% points deduction, active for 15 days
- **Red Card**: Issued at 20 negative categories, 30% points deduction, resets points to zero

### Points Payment System

Students can now pay off their negative points in multiple ways:

- **Full Payment**: Pay all negative points at once
- **Partial Payment**: Pay a portion of negative points
- **Category-Specific Payment**: Pay negative points from a specific category

Some categories may be restricted and require admin approval for payment.

### Enhanced Academic Reports

The system now provides comprehensive academic reports:

- Student academic performance by subject
- Class performance reports
- Teacher activity reports
- School-wide performance dashboard

### Configurable System

Most system parameters are now configurable through the database, removing hardcoded values.

## Development

To set up the development environment:

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables (see `.env.example`)
4. Run the database update script: `node scripts/utils/run-update.js`
5. Start the development server: `npm run dev`

## Project Structure

The project is organized into the following key directories:

- `/app` - Next.js application pages and routes
  - `/actions` - Server actions for data manipulation
  - `/admin` - Admin dashboard and tools
  - `/api` - API routes for server-side operations
  - `/components` - App-specific UI components
  - `/context` - React context providers
  - `/student` - Student-facing pages
  - `/teacher` - Teacher-facing pages
  - `/parent` - Parent-facing pages

- `/components` - Reusable UI components
- `/docs` - Documentation and setup guides
  - `/setup` - System setup and configuration guides
- `/hooks` - Custom React hooks
- `/lib` - Utility functions and configuration
- `/public` - Static assets
- `/scripts` - Database scripts and utilities
  - `/database` - Database schema and functions
  - `/fixes` - Fix scripts for database issues
  - `/migrations` - Database migration scripts
  - `/utils` - Utility scripts for maintenance
- `/styles` - Global styles and theme configuration
- `/types` - TypeScript type definitions

## Environment Variables

Make sure the following environment variables are set:

```
POSTGRES_URL=
POSTGRES_PRISMA_URL=
SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_URL=
POSTGRES_URL_NON_POOLING=
SUPABASE_JWT_SECRET=
POSTGRES_USER=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
POSTGRES_PASSWORD=
POSTGRES_DATABASE=
SUPABASE_SERVICE_ROLE_KEY=
POSTGRES_HOST=
SUPABASE_ANON_KEY=
```

## License

This project is proprietary and owned by the Arabic School System. 