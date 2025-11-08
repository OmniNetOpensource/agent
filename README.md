This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

### Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
GEMINI_API_KEY=your_gemini_api_key_here
KIMI_API_KEY=your_kimi_api_key_here
```

- **GEMINI_API_KEY**: Get your API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
- **KIMI_API_KEY**: Get your API key from [Moonshot AI](https://platform.moonshot.cn/)

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

## MCP Server

Start the standalone MCP server with `pnpm mcp`. It launches `mcp/server.mjs`, exposing the `echo` and `read_file` tools over a Stdio transport while keeping file access scoped to the repository root.

### Connecting clients

- **Claude Desktop:** add the following entry to `%APPDATA%/Claude/claude_desktop_config.json` on Windows (adjust the working directory if your copy lives elsewhere):

```json
{
  "mcpServers": {
    "agent-local": {
      "command": "pnpm",
      "args": ["mcp"],
      "workingDirectory": "D:/develop/projects/agent"
    }
  }
}
```

- **Cursor:** go to Settings → MCP (or Experimental MCP) and register a server that runs `pnpm` with the argument `mcp` while pointing the working directory to `D:/develop/projects/agent`.

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

**Available Models**:
- **Gemini**: `gemini-2.5-flash` (当前使用)
- **Kimi K2**: `moonshot-v1-8k` (已配置，可在代码中切换)

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
