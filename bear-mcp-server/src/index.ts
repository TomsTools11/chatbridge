#!/usr/bin/env node
/**
 * Bear Notes MCP Server
 * 
 * This server provides tools to interact with Bear Notes app on macOS
 * via the x-callback-url scheme. It enables LLMs to create, read, update,
 * and manage notes and tags in Bear.
 * 
 * Requirements:
 * - macOS with Bear app installed
 * - Bear API token (for certain operations)
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// Constants
const BEAR_URL_SCHEME = "bear://x-callback-url";

// Get API token from environment variable
const BEAR_API_TOKEN = process.env.BEAR_API_TOKEN || "";

// Helper function to build Bear URL
function buildBearUrl(action: string, params: Record<string, string | boolean | undefined>): string {
  const url = new URL(`${BEAR_URL_SCHEME}/${action}`);
  
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.append(key, String(value));
    }
  }
  
  return url.toString();
}

// Helper function to execute Bear URL command
async function executeBearUrl(url: string): Promise<string> {
  try {
    // Use macOS 'open' command to trigger the x-callback-url
    const escapedUrl = url.replace(/"/g, '\\"');
    await execAsync(`open "${escapedUrl}"`);
    return `Successfully executed Bear action: ${url}`;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to execute Bear action: ${errorMessage}`);
  }
}

// Create MCP server instance
const server = new McpServer({
  name: "bear-mcp-server",
  version: "1.0.0"
});

// =============================================================================
// TOOL: bear_open_note
// =============================================================================
const OpenNoteInputSchema = z.object({
  id: z.string().optional().describe("Note unique identifier"),
  title: z.string().optional().describe("Note title"),
  header: z.string().optional().describe("Header inside the note to scroll to"),
  exclude_trashed: z.enum(["yes", "no"]).optional().describe("Exclude trashed notes from search"),
  new_window: z.enum(["yes", "no"]).optional().describe("Open note in a new window"),
  float: z.enum(["yes", "no"]).optional().describe("Make the new window float"),
  show_window: z.enum(["yes", "no"]).optional().describe("Show Bear main window"),
  open_note: z.enum(["yes", "no"]).optional().describe("Open the note in Bear"),
  selected: z.enum(["yes", "no"]).optional().describe("Return the note currently selected (requires token)"),
  pin: z.enum(["yes", "no"]).optional().describe("Pin the note"),
  edit: z.enum(["yes", "no"]).optional().describe("Place cursor at the end of the note"),
  search: z.string().optional().describe("Search term to highlight in the note")
}).strict();

type OpenNoteInput = z.infer<typeof OpenNoteInputSchema>;

server.registerTool(
  "bear_open_note",
  {
    title: "Open Bear Note",
    description: `Open a note in Bear Notes app identified by its title or ID.

This tool opens an existing note in Bear and can optionally return its content.
Use either 'id' or 'title' to identify the note.

Args:
  - id (string, optional): Note unique identifier (e.g., "7E4B681B")
  - title (string, optional): Note title to search for
  - header (string, optional): Header inside the note to scroll to
  - exclude_trashed (yes/no, optional): Exclude trashed notes from search
  - new_window (yes/no, optional): Open note in a new window
  - float (yes/no, optional): Make the new window float on top
  - show_window (yes/no, optional): Show Bear main window
  - open_note (yes/no, optional): Open the note in Bear (default: yes)
  - selected (yes/no, optional): Return currently selected note (requires token)
  - pin (yes/no, optional): Pin the note to top
  - edit (yes/no, optional): Place cursor at end of note for editing
  - search (string, optional): Search term to highlight in the note

Examples:
  - Open note by ID: { "id": "7E4B681B" }
  - Open note by title: { "title": "My Meeting Notes" }
  - Open in new floating window: { "title": "Tasks", "new_window": "yes", "float": "yes" }`,
    inputSchema: OpenNoteInputSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    }
  },
  async (params: OpenNoteInput) => {
    try {
      const urlParams: Record<string, string | undefined> = {
        id: params.id,
        title: params.title,
        header: params.header,
        exclude_trashed: params.exclude_trashed,
        new_window: params.new_window,
        float: params.float,
        show_window: params.show_window,
        open_note: params.open_note,
        selected: params.selected,
        pin: params.pin,
        edit: params.edit,
        search: params.search
      };

      // Add token if selected is requested
      if (params.selected === "yes" && BEAR_API_TOKEN) {
        urlParams.token = BEAR_API_TOKEN;
      }

      const url = buildBearUrl("open-note", urlParams);
      const result = await executeBearUrl(url);

      return {
        content: [{
          type: "text",
          text: result
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }
);

// =============================================================================
// TOOL: bear_create_note
// =============================================================================
const CreateNoteInputSchema = z.object({
  title: z.string().optional().describe("Note title"),
  text: z.string().optional().describe("Note body content"),
  clipboard: z.enum(["yes", "no"]).optional().describe("Append clipboard content to note"),
  tags: z.string().optional().describe("Comma-separated list of tags (e.g., 'work,project/alpha')"),
  file: z.string().optional().describe("Base64 encoded file to attach"),
  filename: z.string().optional().describe("Name for the attached file"),
  open_note: z.enum(["yes", "no"]).optional().describe("Open the note after creation"),
  new_window: z.enum(["yes", "no"]).optional().describe("Open note in a new window"),
  float: z.enum(["yes", "no"]).optional().describe("Make the new window float"),
  show_window: z.enum(["yes", "no"]).optional().describe("Show Bear main window"),
  pin: z.enum(["yes", "no"]).optional().describe("Pin the note"),
  edit: z.enum(["yes", "no"]).optional().describe("Place cursor at end for editing"),
  timestamp: z.enum(["yes", "no"]).optional().describe("Prepend timestamp to note"),
  type: z.enum(["html"]).optional().describe("Content type (use 'html' for HTML content)"),
  url: z.string().optional().describe("URL to use for note content")
}).strict();

type CreateNoteInput = z.infer<typeof CreateNoteInputSchema>;

server.registerTool(
  "bear_create_note",
  {
    title: "Create Bear Note",
    description: `Create a new note in Bear Notes app.

This tool creates a new note with the specified title, content, and tags.
Returns the unique identifier of the created note.

Args:
  - title (string, optional): Note title
  - text (string, optional): Note body content (Markdown supported)
  - clipboard (yes/no, optional): Append clipboard content to note
  - tags (string, optional): Comma-separated tags (e.g., "work,project/alpha")
  - file (string, optional): Base64 encoded file to attach
  - filename (string, optional): Name for the attached file
  - open_note (yes/no, optional): Open the note after creation (default: yes)
  - new_window (yes/no, optional): Open note in a new window
  - float (yes/no, optional): Make the new window float
  - show_window (yes/no, optional): Show Bear main window
  - pin (yes/no, optional): Pin the note to top
  - edit (yes/no, optional): Place cursor at end for editing
  - timestamp (yes/no, optional): Prepend timestamp to note
  - type (string, optional): Use "html" for HTML content
  - url (string, optional): URL to use for note content

Examples:
  - Simple note: { "title": "Meeting Notes", "text": "# Agenda\\n- Item 1\\n- Item 2" }
  - Note with tags: { "title": "Task", "text": "Complete report", "tags": "work,urgent" }
  - Pinned note: { "title": "Important", "text": "Don't forget!", "pin": "yes" }`,
    inputSchema: CreateNoteInputSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false
    }
  },
  async (params: CreateNoteInput) => {
    try {
      const urlParams: Record<string, string | undefined> = {
        title: params.title,
        text: params.text,
        clipboard: params.clipboard,
        tags: params.tags,
        file: params.file,
        filename: params.filename,
        open_note: params.open_note,
        new_window: params.new_window,
        float: params.float,
        show_window: params.show_window,
        pin: params.pin,
        edit: params.edit,
        timestamp: params.timestamp,
        type: params.type,
        url: params.url
      };

      const url = buildBearUrl("create", urlParams);
      const result = await executeBearUrl(url);

      return {
        content: [{
          type: "text",
          text: result
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }
);

// =============================================================================
// TOOL: bear_add_text
// =============================================================================
const AddTextInputSchema = z.object({
  id: z.string().optional().describe("Note unique identifier"),
  title: z.string().optional().describe("Note title"),
  selected: z.enum(["yes", "no"]).optional().describe("Use currently selected note"),
  text: z.string().optional().describe("Text to add to the note"),
  clipboard: z.enum(["yes", "no"]).optional().describe("Use clipboard content instead of text"),
  header: z.string().optional().describe("Header to find and add text below"),
  mode: z.enum(["prepend", "append", "replace_all", "replace"]).optional().describe("How to add the text"),
  new_line: z.enum(["yes", "no"]).optional().describe("Add newline before text"),
  tags: z.string().optional().describe("Comma-separated tags to add"),
  exclude_trashed: z.enum(["yes", "no"]).optional().describe("Exclude trashed notes"),
  open_note: z.enum(["yes", "no"]).optional().describe("Open the note after modification"),
  new_window: z.enum(["yes", "no"]).optional().describe("Open in new window"),
  show_window: z.enum(["yes", "no"]).optional().describe("Show Bear main window"),
  edit: z.enum(["yes", "no"]).optional().describe("Place cursor at end"),
  timestamp: z.enum(["yes", "no"]).optional().describe("Prepend timestamp to text")
}).strict();

type AddTextInput = z.infer<typeof AddTextInputSchema>;

server.registerTool(
  "bear_add_text",
  {
    title: "Add Text to Bear Note",
    description: `Append, prepend, or replace text in an existing Bear note.

This tool modifies an existing note by adding or replacing text content.
Use 'id' or 'title' to identify the note.

Args:
  - id (string, optional): Note unique identifier
  - title (string, optional): Note title
  - selected (yes/no, optional): Use currently selected note
  - text (string, optional): Text to add to the note
  - clipboard (yes/no, optional): Use clipboard content instead of text
  - header (string, optional): Header to find and add text below
  - mode (string, optional): How to add text - "prepend", "append", "replace_all", or "replace"
  - new_line (yes/no, optional): Add newline before text (default: yes)
  - tags (string, optional): Comma-separated tags to add
  - exclude_trashed (yes/no, optional): Exclude trashed notes from search
  - open_note (yes/no, optional): Open the note after modification
  - new_window (yes/no, optional): Open in new window
  - show_window (yes/no, optional): Show Bear main window
  - edit (yes/no, optional): Place cursor at end for editing
  - timestamp (yes/no, optional): Prepend timestamp to text

Examples:
  - Append text: { "id": "ABC123", "text": "New content", "mode": "append" }
  - Prepend to note: { "title": "Daily Log", "text": "Morning entry", "mode": "prepend" }
  - Add below header: { "title": "Notes", "text": "New item", "header": "## Tasks" }`,
    inputSchema: AddTextInputSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false
    }
  },
  async (params: AddTextInput) => {
    try {
      const urlParams: Record<string, string | undefined> = {
        id: params.id,
        title: params.title,
        selected: params.selected,
        text: params.text,
        clipboard: params.clipboard,
        header: params.header,
        mode: params.mode,
        new_line: params.new_line,
        tags: params.tags,
        exclude_trashed: params.exclude_trashed,
        open_note: params.open_note,
        new_window: params.new_window,
        show_window: params.show_window,
        edit: params.edit,
        timestamp: params.timestamp
      };

      // Add token if selected is used
      if (params.selected === "yes" && BEAR_API_TOKEN) {
        urlParams.token = BEAR_API_TOKEN;
      }

      const url = buildBearUrl("add-text", urlParams);
      const result = await executeBearUrl(url);

      return {
        content: [{
          type: "text",
          text: result
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }
);

// =============================================================================
// TOOL: bear_add_file
// =============================================================================
const AddFileInputSchema = z.object({
  id: z.string().optional().describe("Note unique identifier"),
  title: z.string().optional().describe("Note title"),
  selected: z.enum(["yes", "no"]).optional().describe("Use currently selected note"),
  file: z.string().describe("Base64 encoded file content"),
  filename: z.string().describe("Name for the file"),
  header: z.string().optional().describe("Header to add file below"),
  mode: z.enum(["prepend", "append", "replace_all", "replace"]).optional().describe("How to add the file"),
  open_note: z.enum(["yes", "no"]).optional().describe("Open the note after adding file"),
  new_window: z.enum(["yes", "no"]).optional().describe("Open in new window"),
  show_window: z.enum(["yes", "no"]).optional().describe("Show Bear main window"),
  edit: z.enum(["yes", "no"]).optional().describe("Place cursor at end")
}).strict();

type AddFileInput = z.infer<typeof AddFileInputSchema>;

server.registerTool(
  "bear_add_file",
  {
    title: "Add File to Bear Note",
    description: `Add a file attachment to an existing Bear note.

This tool attaches a file to an existing note. The file must be base64 encoded.
Use 'id' or 'title' to identify the note.

Args:
  - id (string, optional): Note unique identifier
  - title (string, optional): Note title
  - selected (yes/no, optional): Use currently selected note
  - file (string, required): Base64 encoded file content
  - filename (string, required): Name for the file (e.g., "image.png")
  - header (string, optional): Header to add file below
  - mode (string, optional): How to add file - "prepend", "append", "replace_all", or "replace"
  - open_note (yes/no, optional): Open the note after adding file
  - new_window (yes/no, optional): Open in new window
  - show_window (yes/no, optional): Show Bear main window
  - edit (yes/no, optional): Place cursor at end

Examples:
  - Add image to note: { "id": "ABC123", "file": "<base64>", "filename": "screenshot.png" }
  - Add PDF below header: { "title": "Project", "file": "<base64>", "filename": "report.pdf", "header": "## Attachments" }`,
    inputSchema: AddFileInputSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false
    }
  },
  async (params: AddFileInput) => {
    try {
      const urlParams: Record<string, string | undefined> = {
        id: params.id,
        title: params.title,
        selected: params.selected,
        file: params.file,
        filename: params.filename,
        header: params.header,
        mode: params.mode,
        open_note: params.open_note,
        new_window: params.new_window,
        show_window: params.show_window,
        edit: params.edit
      };

      // Add token if selected is used
      if (params.selected === "yes" && BEAR_API_TOKEN) {
        urlParams.token = BEAR_API_TOKEN;
      }

      const url = buildBearUrl("add-file", urlParams);
      const result = await executeBearUrl(url);

      return {
        content: [{
          type: "text",
          text: result
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }
);

// =============================================================================
// TOOL: bear_tags
// =============================================================================
const TagsInputSchema = z.object({}).strict();

type TagsInput = z.infer<typeof TagsInputSchema>;

server.registerTool(
  "bear_tags",
  {
    title: "List Bear Tags",
    description: `Get all tags displayed in Bear's sidebar.

This tool retrieves a list of all tags in your Bear Notes library.
Requires a valid API token (set via BEAR_API_TOKEN environment variable).

Args:
  None

Returns:
  List of all tags in Bear

Examples:
  - Get all tags: {}`,
    inputSchema: TagsInputSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    }
  },
  async (_params: TagsInput) => {
    try {
      if (!BEAR_API_TOKEN) {
        return {
          content: [{
            type: "text",
            text: "Error: BEAR_API_TOKEN environment variable is required for this action. Set your Bear API token to use this feature."
          }],
          isError: true
        };
      }

      const urlParams: Record<string, string> = {
        token: BEAR_API_TOKEN
      };

      const url = buildBearUrl("tags", urlParams);
      const result = await executeBearUrl(url);

      return {
        content: [{
          type: "text",
          text: result
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }
);

// =============================================================================
// TOOL: bear_open_tag
// =============================================================================
const OpenTagInputSchema = z.object({
  name: z.string().describe("Tag name to open (e.g., 'work' or 'work/projects')"),
  token: z.string().optional().describe("API token (uses env var if not provided)")
}).strict();

type OpenTagInput = z.infer<typeof OpenTagInputSchema>;

server.registerTool(
  "bear_open_tag",
  {
    title: "Open Bear Tag",
    description: `Show all notes with a specific tag in Bear.

This tool opens Bear and displays all notes that have the specified tag.

Args:
  - name (string, required): Tag name to open (e.g., "work" or "work/projects")
  - token (string, optional): API token (uses BEAR_API_TOKEN env var if not provided)

Examples:
  - Open work tag: { "name": "work" }
  - Open nested tag: { "name": "projects/active" }`,
    inputSchema: OpenTagInputSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    }
  },
  async (params: OpenTagInput) => {
    try {
      const urlParams: Record<string, string | undefined> = {
        name: params.name,
        token: params.token || BEAR_API_TOKEN || undefined
      };

      const url = buildBearUrl("open-tag", urlParams);
      const result = await executeBearUrl(url);

      return {
        content: [{
          type: "text",
          text: result
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }
);

// =============================================================================
// TOOL: bear_rename_tag
// =============================================================================
const RenameTagInputSchema = z.object({
  name: z.string().describe("Current tag name"),
  new_name: z.string().describe("New tag name"),
  show_window: z.enum(["yes", "no"]).optional().describe("Show Bear main window")
}).strict();

type RenameTagInput = z.infer<typeof RenameTagInputSchema>;

server.registerTool(
  "bear_rename_tag",
  {
    title: "Rename Bear Tag",
    description: `Rename an existing tag in Bear Notes.

This tool renames a tag across all notes that use it.

Args:
  - name (string, required): Current tag name
  - new_name (string, required): New tag name
  - show_window (yes/no, optional): Show Bear main window

Examples:
  - Rename tag: { "name": "old-tag", "new_name": "new-tag" }
  - Rename nested tag: { "name": "work/old", "new_name": "work/new" }`,
    inputSchema: RenameTagInputSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: false
    }
  },
  async (params: RenameTagInput) => {
    try {
      const urlParams: Record<string, string | undefined> = {
        name: params.name,
        new_name: params.new_name,
        show_window: params.show_window
      };

      const url = buildBearUrl("rename-tag", urlParams);
      const result = await executeBearUrl(url);

      return {
        content: [{
          type: "text",
          text: result
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }
);

// =============================================================================
// TOOL: bear_delete_tag
// =============================================================================
const DeleteTagInputSchema = z.object({
  name: z.string().describe("Tag name to delete"),
  show_window: z.enum(["yes", "no"]).optional().describe("Show Bear main window")
}).strict();

type DeleteTagInput = z.infer<typeof DeleteTagInputSchema>;

server.registerTool(
  "bear_delete_tag",
  {
    title: "Delete Bear Tag",
    description: `Delete a tag from all notes in Bear.

This tool removes a tag from all notes that have it. The notes themselves are not deleted.

Args:
  - name (string, required): Tag name to delete
  - show_window (yes/no, optional): Show Bear main window

Examples:
  - Delete tag: { "name": "obsolete-tag" }
  - Delete nested tag: { "name": "projects/completed" }`,
    inputSchema: DeleteTagInputSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: false
    }
  },
  async (params: DeleteTagInput) => {
    try {
      const urlParams: Record<string, string | undefined> = {
        name: params.name,
        show_window: params.show_window
      };

      const url = buildBearUrl("delete-tag", urlParams);
      const result = await executeBearUrl(url);

      return {
        content: [{
          type: "text",
          text: result
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }
);

// =============================================================================
// TOOL: bear_trash
// =============================================================================
const TrashInputSchema = z.object({
  id: z.string().optional().describe("Note unique identifier"),
  search: z.string().optional().describe("Search term to find note to trash"),
  show_window: z.enum(["yes", "no"]).optional().describe("Show Bear main window")
}).strict();

type TrashInput = z.infer<typeof TrashInputSchema>;

server.registerTool(
  "bear_trash",
  {
    title: "Trash Bear Note",
    description: `Move a note to trash in Bear.

This tool moves a note to the trash. The note can be recovered from trash later.

Args:
  - id (string, optional): Note unique identifier
  - search (string, optional): Search term to find note to trash
  - show_window (yes/no, optional): Show Bear main window

Examples:
  - Trash by ID: { "id": "ABC123" }
  - Trash by search: { "search": "old meeting notes" }`,
    inputSchema: TrashInputSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: false
    }
  },
  async (params: TrashInput) => {
    try {
      const urlParams: Record<string, string | undefined> = {
        id: params.id,
        search: params.search,
        show_window: params.show_window
      };

      const url = buildBearUrl("trash", urlParams);
      const result = await executeBearUrl(url);

      return {
        content: [{
          type: "text",
          text: result
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }
);

// =============================================================================
// TOOL: bear_archive
// =============================================================================
const ArchiveInputSchema = z.object({
  id: z.string().optional().describe("Note unique identifier"),
  search: z.string().optional().describe("Search term to find note to archive"),
  show_window: z.enum(["yes", "no"]).optional().describe("Show Bear main window")
}).strict();

type ArchiveInput = z.infer<typeof ArchiveInputSchema>;

server.registerTool(
  "bear_archive",
  {
    title: "Archive Bear Note",
    description: `Move a note to archive in Bear.

This tool archives a note. Archived notes are hidden from the main list but can be accessed later.

Args:
  - id (string, optional): Note unique identifier
  - search (string, optional): Search term to find note to archive
  - show_window (yes/no, optional): Show Bear main window

Examples:
  - Archive by ID: { "id": "ABC123" }
  - Archive by search: { "search": "completed project" }`,
    inputSchema: ArchiveInputSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    }
  },
  async (params: ArchiveInput) => {
    try {
      const urlParams: Record<string, string | undefined> = {
        id: params.id,
        search: params.search,
        show_window: params.show_window
      };

      const url = buildBearUrl("archive", urlParams);
      const result = await executeBearUrl(url);

      return {
        content: [{
          type: "text",
          text: result
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }
);

// =============================================================================
// TOOL: bear_untagged
// =============================================================================
const UntaggedInputSchema = z.object({
  show_window: z.enum(["yes", "no"]).optional().describe("Show Bear main window"),
  search: z.string().optional().describe("Search term to filter untagged notes")
}).strict();

type UntaggedInput = z.infer<typeof UntaggedInputSchema>;

server.registerTool(
  "bear_untagged",
  {
    title: "Show Untagged Bear Notes",
    description: `Show all notes without any tags in Bear.

This tool opens Bear and displays all notes that have no tags assigned.

Args:
  - show_window (yes/no, optional): Show Bear main window
  - search (string, optional): Search term to filter untagged notes

Examples:
  - Show all untagged: {}
  - Search untagged: { "search": "meeting" }`,
    inputSchema: UntaggedInputSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    }
  },
  async (params: UntaggedInput) => {
    try {
      const urlParams: Record<string, string | undefined> = {
        show_window: params.show_window,
        search: params.search
      };

      const url = buildBearUrl("untagged", urlParams);
      const result = await executeBearUrl(url);

      return {
        content: [{
          type: "text",
          text: result
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }
);

// =============================================================================
// TOOL: bear_todo
// =============================================================================
const TodoInputSchema = z.object({
  show_window: z.enum(["yes", "no"]).optional().describe("Show Bear main window"),
  search: z.string().optional().describe("Search term to filter todo notes")
}).strict();

type TodoInput = z.infer<typeof TodoInputSchema>;

server.registerTool(
  "bear_todo",
  {
    title: "Show Bear Todo Notes",
    description: `Show all notes with todo items in Bear.

This tool opens Bear and displays all notes that contain todo/task items.

Args:
  - show_window (yes/no, optional): Show Bear main window
  - search (string, optional): Search term to filter todo notes

Examples:
  - Show all todos: {}
  - Search todos: { "search": "urgent" }`,
    inputSchema: TodoInputSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    }
  },
  async (params: TodoInput) => {
    try {
      const urlParams: Record<string, string | undefined> = {
        show_window: params.show_window,
        search: params.search
      };

      const url = buildBearUrl("todo", urlParams);
      const result = await executeBearUrl(url);

      return {
        content: [{
          type: "text",
          text: result
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }
);

// =============================================================================
// TOOL: bear_today
// =============================================================================
const TodayInputSchema = z.object({
  show_window: z.enum(["yes", "no"]).optional().describe("Show Bear main window"),
  search: z.string().optional().describe("Search term to filter today's notes")
}).strict();

type TodayInput = z.infer<typeof TodayInputSchema>;

server.registerTool(
  "bear_today",
  {
    title: "Show Today's Bear Notes",
    description: `Show all notes modified today in Bear.

This tool opens Bear and displays all notes that were created or modified today.

Args:
  - show_window (yes/no, optional): Show Bear main window
  - search (string, optional): Search term to filter today's notes

Examples:
  - Show today's notes: {}
  - Search today's notes: { "search": "meeting" }`,
    inputSchema: TodayInputSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    }
  },
  async (params: TodayInput) => {
    try {
      const urlParams: Record<string, string | undefined> = {
        show_window: params.show_window,
        search: params.search
      };

      const url = buildBearUrl("today", urlParams);
      const result = await executeBearUrl(url);

      return {
        content: [{
          type: "text",
          text: result
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }
);

// =============================================================================
// TOOL: bear_locked
// =============================================================================
const LockedInputSchema = z.object({
  show_window: z.enum(["yes", "no"]).optional().describe("Show Bear main window"),
  search: z.string().optional().describe("Search term to filter locked notes")
}).strict();

type LockedInput = z.infer<typeof LockedInputSchema>;

server.registerTool(
  "bear_locked",
  {
    title: "Show Locked Bear Notes",
    description: `Show all locked/encrypted notes in Bear.

This tool opens Bear and displays all notes that are password protected.

Args:
  - show_window (yes/no, optional): Show Bear main window
  - search (string, optional): Search term to filter locked notes

Examples:
  - Show all locked: {}
  - Search locked: { "search": "password" }`,
    inputSchema: LockedInputSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    }
  },
  async (params: LockedInput) => {
    try {
      const urlParams: Record<string, string | undefined> = {
        show_window: params.show_window,
        search: params.search
      };

      const url = buildBearUrl("locked", urlParams);
      const result = await executeBearUrl(url);

      return {
        content: [{
          type: "text",
          text: result
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }
);

// =============================================================================
// TOOL: bear_search
// =============================================================================
const SearchInputSchema = z.object({
  term: z.string().optional().describe("Search term to find notes"),
  tag: z.string().optional().describe("Limit search to notes with this tag"),
  show_window: z.enum(["yes", "no"]).optional().describe("Show Bear main window")
}).strict();

type SearchInput = z.infer<typeof SearchInputSchema>;

server.registerTool(
  "bear_search",
  {
    title: "Search Bear Notes",
    description: `Search for notes in Bear.

This tool searches across all notes or within a specific tag.

Args:
  - term (string, optional): Search term to find notes
  - tag (string, optional): Limit search to notes with this tag
  - show_window (yes/no, optional): Show Bear main window

Examples:
  - Search all notes: { "term": "meeting notes" }
  - Search within tag: { "term": "budget", "tag": "work" }
  - Show tag notes: { "tag": "projects" }`,
    inputSchema: SearchInputSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    }
  },
  async (params: SearchInput) => {
    try {
      const urlParams: Record<string, string | undefined> = {
        term: params.term,
        tag: params.tag,
        show_window: params.show_window,
        token: BEAR_API_TOKEN || undefined
      };

      const url = buildBearUrl("search", urlParams);
      const result = await executeBearUrl(url);

      return {
        content: [{
          type: "text",
          text: result
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }
);

// =============================================================================
// TOOL: bear_grab_url
// =============================================================================
const GrabUrlInputSchema = z.object({
  url: z.string().describe("URL of the web page to capture"),
  tags: z.string().optional().describe("Comma-separated tags for the new note"),
  pin: z.enum(["yes", "no"]).optional().describe("Pin the created note"),
  wait: z.enum(["yes", "no"]).optional().describe("Wait for page to load completely")
}).strict();

type GrabUrlInput = z.infer<typeof GrabUrlInputSchema>;

server.registerTool(
  "bear_grab_url",
  {
    title: "Grab URL to Bear Note",
    description: `Create a new note from a web page URL in Bear.

This tool fetches the content of a web page and creates a new note with it.

Args:
  - url (string, required): URL of the web page to capture
  - tags (string, optional): Comma-separated tags for the new note
  - pin (yes/no, optional): Pin the created note
  - wait (yes/no, optional): Wait for page to load completely before capturing

Examples:
  - Capture article: { "url": "https://example.com/article" }
  - Capture with tags: { "url": "https://news.com/story", "tags": "reading,news" }
  - Capture and pin: { "url": "https://docs.example.com", "pin": "yes" }`,
    inputSchema: GrabUrlInputSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true
    }
  },
  async (params: GrabUrlInput) => {
    try {
      const urlParams: Record<string, string | undefined> = {
        url: params.url,
        tags: params.tags,
        pin: params.pin,
        wait: params.wait
      };

      const url = buildBearUrl("grab-url", urlParams);
      const result = await executeBearUrl(url);

      return {
        content: [{
          type: "text",
          text: result
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }
);

// =============================================================================
// Main function - Start the server
// =============================================================================
async function main() {
  // Log to stderr (not stdout) for stdio transport
  console.error("Starting Bear MCP Server...");
  
  if (!BEAR_API_TOKEN) {
    console.error("Warning: BEAR_API_TOKEN not set. Some features (tags, search) may be limited.");
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error("Bear MCP Server running via stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
