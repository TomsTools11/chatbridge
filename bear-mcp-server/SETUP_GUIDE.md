# Bear MCP Server - Quick Setup Guide

## Installation on Your Mac

### Step 1: Clone from GitHub

```bash
git clone https://github.com/TomsTools11/chatbridge.git
cd chatbridge/bear-mcp-server
```

Or download and extract the zip file.

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Build the Server

```bash
npm run build
```

### Step 4: Configure Claude Desktop

Edit your Claude Desktop configuration file:

**Location:** `~/Library/Application Support/Claude/claude_desktop_config.json`

Add the following configuration:

```json
{
  "mcpServers": {
    "bear": {
      "command": "node",
      "args": ["/path/to/chatbridge/bear-mcp-server/dist/index.js"],
      "env": {
        "BEAR_API_TOKEN": "5F91A9-8DCE35-270076"
      }
    }
  }
}
```

**Important:** Replace `/path/to/chatbridge` with the actual path where you cloned the repository.

### Step 5: Restart Claude Desktop

After saving the configuration, restart Claude Desktop for the changes to take effect.

## Verify Installation

Once Claude Desktop restarts, you should be able to ask Claude to:

- "Create a new note in Bear titled 'Test Note'"
- "Search my Bear notes for 'meeting'"
- "Show all my Bear tags"
- "Open my note called 'Daily Tasks'"

## Available Tools

| Tool | Description |
|------|-------------|
| `bear_open_note` | Open a note by ID or title |
| `bear_create_note` | Create a new note |
| `bear_add_text` | Add text to an existing note |
| `bear_add_file` | Add file attachment to a note |
| `bear_tags` | List all tags |
| `bear_open_tag` | Show notes with a tag |
| `bear_rename_tag` | Rename a tag |
| `bear_delete_tag` | Delete a tag |
| `bear_trash` | Move note to trash |
| `bear_archive` | Archive a note |
| `bear_untagged` | Show untagged notes |
| `bear_todo` | Show notes with todos |
| `bear_today` | Show today's notes |
| `bear_locked` | Show locked notes |
| `bear_search` | Search notes |
| `bear_grab_url` | Create note from URL |

## Troubleshooting

### Bear doesn't respond to commands

1. Make sure Bear is running
2. Test the x-callback-url manually:
   ```bash
   open "bear://x-callback-url/open-note"
   ```
3. Check System Preferences → Security & Privacy → Privacy → Automation

### Token-related errors

Some features require the API token. Verify your token is correct:
1. Open Bear
2. Go to Help → Advanced → API Token
3. Copy and update your config

### Server won't start

1. Check Node.js version: `node --version` (requires >= 18)
2. Rebuild: `npm run clean && npm run build`
3. Check for TypeScript errors in the build output
