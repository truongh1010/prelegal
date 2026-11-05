# Prelegal frontend

The Next.js app, exported as static files and served by the FastAPI backend. See the [main README](../README.md) for what Prelegal is and how to run the whole project.

```bash
npm install
npm run dev        # Development server
npm test           # Unit tests
npm run lint       # Lint
npm run test:e2e   # Browser tests
```

`npm run dev` needs a separately running backend. Set `NEXT_PUBLIC_API_BASE_URL` to its address.
