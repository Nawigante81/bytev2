# ByteClinic

A Vite + React + Tailwind project.

## Scripts

- dev: start local dev server
- build: production build
- preview: preview the production build

## Requirements

- Node.js (use version from `.nvmrc` if you use nvm)
- pnpm/npm/yarn

## Development

1. Install dependencies
2. Create a `.env` file based on `.env.example` and set:
    
    - `VITE_SUPABASE_URL`
    - `VITE_SUPABASE_ANON_KEY`

3. Run the dev server

## Environment variables

The app requires Supabase credentials at runtime. Do not hardcode keys in source files. Use a local `.env` file (not committed) and set the variables above. If you previously committed any Supabase keys, rotate them in the Supabase dashboard.

## License

Proprietary (adjust as needed)
