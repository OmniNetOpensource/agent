This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

### Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
KIMI_API_KEY=your_kimi_api_key_here
BRAVE_API_KEY=your_brave_api_key_here   # optional, enables web search
# Set to "true" to disable a tool without changing code
MCP_DISABLE_FETCH_URL=false
MCP_DISABLE_BRAVE_SEARCH=false
```

- **KIMI_API_KEY**: Get your API key from [Moonshot AI](https://platform.moonshot.cn/)
- **BRAVE_API_KEY**: Get your API key from [Brave Search](https://api.search.brave.com/app/dashboard) to enable real-time web search.
  Tools can be disabled individually via the `MCP_DISABLE_*` flags (set them to `true`).

### Running the Development Server

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Built-in tools

- `fetch_url`: Fetches a URL and strips HTML/JS/CSS to plain text (runs in-process).
- `brave_search`: Queries Brave Search for up-to-date results when `BRAVE_API_KEY` is configured.
- Tools are wired directly into the OpenAI tools API; disable any tool by setting `MCP_DISABLE_FETCH_URL=true` or `MCP_DISABLE_BRAVE_SEARCH=true`.

## API Usage

### Chat API

**Endpoint**: `POST /api/chat`

**Request Body**:
```json
{
  "message": "Your message here"
}
```

**Example**:
```javascript
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'Hello, how are you?'
  })
});
```

**Response**: Streaming text response

**Available Model**:
- **Kimi K2 Thinking**: `kimi-k2-thinking-turbo` (hard-coded in the chat API)

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
