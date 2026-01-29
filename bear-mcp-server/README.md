# Bear MCP Server

A Model Context Protocol (MCP) server that enables LLMs to interact with the [Bear Notes](https://bear.app) app on macOS via the x-callback-url scheme.

## Features

This MCP server provides 16 tools for comprehensive Bear Notes integration:

| Tool | Description |
|------|-------------|
| `bear_open_note` | Open a note by ID or title |
| `bear_create_note` | Create a new note with title, content, and tags |
| `bear_add_text` | Append, prepend, or replace text in a note |
| `bear_add_file` | Add file attachments to a note |
| `bear_tags` | List all tags in your Bear library |
| `bear_open_tag` | Show all notes with a specific tag |
| `bear_rename_tag` | Rename a tag across all notes |
| `bear_delete_tag` | Delete a tag from all notes |
| `bear_trash` | Move a note to trash |
| `bear_archive` | Archive a note |
| `bear_untagged` | Show notes without tags |
| `bear_todo` | Show notes with todo items |
| `bear_today` | Show notes modified today |
| `bear_locked` | Show locked/encrypted notes |
| `bear_search` | Search notes by term or tag |
| `bear_grab_url` | Create a note from a web page URL |

## Requirements

- **macOS** with Bear app installed
- **Node.js** >= 18
- **Bear API Token** (for some features)

### Getting Your Bear API Token

1. Open Bear on your Mac
2. Go to **Help → Advanced → API Token**
3. Click **Copy Token**

> **Note**: Tokens generated on iOS are not valid for macOS and vice-versa.

## Installation

### Option 1: Clone and Build

```bash
# Clone the repository
git clone https://github.com/yourusername/bear-mcp-server.git
cd bear-mcp-server

# Install dependencies
npm install

# Build the project
npm run build
```

### Option 2: Install from npm (if published)

```bash
npm install -g bear-mcp-server
```

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `BEAR_API_TOKEN` | For some tools | Your Bear API token |

### Claude Desktop Configuration

Add the following to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "bear": {
      "command": "node",
      "args": ["/path/to/bear-mcp-server/dist/index.js"],
      "env": {
        "BEAR_API_TOKEN": "YOUR-BEAR-API-TOKEN-HERE"
      }
    }
  }
}
```

Or if installed globally:

```json
{
  "mcpServers": {
    "bear": {
      "command": "bear-mcp-server",
      "env": {
        "BEAR_API_TOKEN": "YOUR-BEAR-API-TOKEN-HERE"
      }
    }
  }
}
```

## Usage Examples

### Create a Note

```
Create a new note in Bear titled "Meeting Notes" with the content "# Agenda\n- Item 1\n- Item 2" and tag it with "work" and "meetings"
```

### Search Notes

```
Search my Bear notes for anything related to "project alpha"
```

### Add Text to Existing Note

```
Append "- New task item" to my note titled "Daily Tasks"
```

### Capture Web Page

```
Save this article to Bear: https://example.com/interesting-article
```

### Organize Tags

```
Rename my "old-project" tag to "archived/old-project"
```

## Tool Reference

### bear_open_note

Open a note identified by its title or ID.

**Parameters:**
- `id` (string, optional): Note unique identifier
- `title` (string, optional): Note title
- `header` (string, optional): Header to scroll to
- `exclude_trashed` (yes/no, optional): Exclude trashed notes
- `new_window` (yes/no, optional): Open in new window
- `float` (yes/no, optional): Float the window
- `show_window` (yes/no, optional): Show Bear window
- `open_note` (yes/no, optional): Open the note
- `selected` (yes/no, optional): Return selected note (requires token)
- `pin` (yes/no, optional): Pin the note
- `edit` (yes/no, optional): Enable editing
- `search` (string, optional): Highlight search term

### bear_create_note

Create a new note with specified content.

**Parameters:**
- `title` (string, optional): Note title
- `text` (string, optional): Note body (Markdown supported)
- `clipboard` (yes/no, optional): Use clipboard content
- `tags` (string, optional): Comma-separated tags
- `file` (string, optional): Base64 encoded file
- `filename` (string, optional): Filename for attachment
- `open_note` (yes/no, optional): Open after creation
- `new_window` (yes/no, optional): Open in new window
- `float` (yes/no, optional): Float the window
- `show_window` (yes/no, optional): Show Bear window
- `pin` (yes/no, optional): Pin the note
- `edit` (yes/no, optional): Enable editing
- `timestamp` (yes/no, optional): Add timestamp
- `type` (string, optional): "html" for HTML content
- `url` (string, optional): URL for content

### bear_add_text

Add text to an existing note.

**Parameters:**
- `id` (string, optional): Note ID
- `title` (string, optional): Note title
- `selected` (yes/no, optional): Use selected note
- `text` (string, optional): Text to add
- `clipboard` (yes/no, optional): Use clipboard
- `header` (string, optional): Header to add below
- `mode` (string, optional): prepend/append/replace_all/replace
- `new_line` (yes/no, optional): Add newline
- `tags` (string, optional): Tags to add
- `exclude_trashed` (yes/no, optional): Exclude trashed
- `open_note` (yes/no, optional): Open note
- `new_window` (yes/no, optional): New window
- `show_window` (yes/no, optional): Show window
- `edit` (yes/no, optional): Enable editing
- `timestamp` (yes/no, optional): Add timestamp

### bear_add_file

Add a file attachment to a note.

**Parameters:**
- `id` (string, optional): Note ID
- `title` (string, optional): Note title
- `selected` (yes/no, optional): Use selected note
- `file` (string, required): Base64 encoded file
- `filename` (string, required): Filename
- `header` (string, optional): Header to add below
- `mode` (string, optional): prepend/append/replace_all/replace
- `open_note` (yes/no, optional): Open note
- `new_window` (yes/no, optional): New window
- `show_window` (yes/no, optional): Show window
- `edit` (yes/no, optional): Enable editing

### bear_tags

List all tags in Bear's sidebar.

**Parameters:** None (requires API token)

### bear_open_tag

Show all notes with a specific tag.

**Parameters:**
- `name` (string, required): Tag name
- `token` (string, optional): API token

### bear_rename_tag

Rename an existing tag.

**Parameters:**
- `name` (string, required): Current tag name
- `new_name` (string, required): New tag name
- `show_window` (yes/no, optional): Show window

### bear_delete_tag

Delete a tag from all notes.

**Parameters:**
- `name` (string, required): Tag to delete
- `show_window` (yes/no, optional): Show window

### bear_trash

Move a note to trash.

**Parameters:**
- `id` (string, optional): Note ID
- `search` (string, optional): Search term
- `show_window` (yes/no, optional): Show window

### bear_archive

Archive a note.

**Parameters:**
- `id` (string, optional): Note ID
- `search` (string, optional): Search term
- `show_window` (yes/no, optional): Show window

### bear_untagged

Show notes without tags.

**Parameters:**
- `show_window` (yes/no, optional): Show window
- `search` (string, optional): Filter term

### bear_todo

Show notes with todo items.

**Parameters:**
- `show_window` (yes/no, optional): Show window
- `search` (string, optional): Filter term

### bear_today

Show notes modified today.

**Parameters:**
- `show_window` (yes/no, optional): Show window
- `search` (string, optional): Filter term

### bear_locked

Show locked/encrypted notes.

**Parameters:**
- `show_window` (yes/no, optional): Show window
- `search` (string, optional): Filter term

### bear_search

Search for notes.

**Parameters:**
- `term` (string, optional): Search term
- `tag` (string, optional): Limit to tag
- `show_window` (yes/no, optional): Show window

### bear_grab_url

Create a note from a web page.

**Parameters:**
- `url` (string, required): Web page URL
- `tags` (string, optional): Tags for note
- `pin` (yes/no, optional): Pin the note
- `wait` (yes/no, optional): Wait for page load

## Development

```bash
# Install dependencies
npm install

# Run in development mode (with hot reload)
npm run dev

# Build for production
npm run build

# Run production build
npm start
```

## Troubleshooting

### "BEAR_API_TOKEN not set" warning

Some features require an API token. Set the `BEAR_API_TOKEN` environment variable with your token from Bear.

### Bear doesn't open

Ensure Bear is installed and the x-callback-url scheme is enabled. Try opening a Bear URL manually:
```bash
open "bear://x-callback-url/open-note"
```

### Permission denied

On macOS, you may need to grant terminal/app permissions to control Bear. Check System Preferences → Security & Privacy → Privacy → Automation.

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Acknowledgments

- [Bear App](https://bear.app) for their excellent x-callback-url API
- [Model Context Protocol](https://modelcontextprotocol.io) for the MCP specification
