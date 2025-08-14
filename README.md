# Code Editor JS

A powerful web-based code editor with integrated file management and real-time execution capabilities.

## Features

### 1. Code Editor

- Monaco Editor integration with syntax highlighting
- Support for JavaScript code execution
- Adjustable font size
- Dark theme optimized for coding

### 2. File Management

- Create, edit, and delete files
- Create and manage folders
- Rename files and folders
- Import folders from local system
- Export project as ZIP file
- Context menu for file operations
- File tree navigation

### 3. Console Output

- Interactive console for code execution results
- Support for console.log, console.error, and console.warn
- Clear console functionality
- Resizable console panel
- Toggle console visibility

### 4. Database Integration

- Persistent storage using IndexedDB
- Auto-save functionality
- Database reset option
- Project state preservation between sessions

### 5. UI Features

- Responsive design
- Resizable panels
- File icons for different file types
- Drag-and-drop interface
- Keyboard shortcuts
- Context menus

## Technical Stack

- HTML5
- CSS3
- JavaScript
- Monaco Editor
- IndexedDB
- JSZip Library
- Remix Icons

## Getting Started

1. Open the editor in a modern web browser
2. Use the "Add File" or "Add Folder" buttons to create new files/folders
3. Write or paste your code in the editor
4. Click "Run" or press Ctrl+Enter to execute JavaScript code
5. View output in the console panel
6. Use the context menu (right-click) for file operations

## Keyboard Shortcuts

- `Ctrl + Enter`: Run code
- `Ctrl + S`: Save changes (automatic)
- `ESC`: Close context menus

## File Operations

- Right-click on files/folders for context menu
- Import existing folders
- Export project as ZIP
- Rename files and folders
- Delete files and folders

## Project Structure

```
compiler/
├── index.html      # Main HTML file
├── style.css       # Styles
├── script.js       # Core functionality
└── README.md       # Documentation
```

## Browser Support

- Chrome (recommended)
- Firefox
- Edge
- Safari

## Features in Detail

### Code Editor

The editor uses Monaco Editor, the same editor that powers VS Code, providing:

- Syntax highlighting
- Auto-completion
- Error detection
- Multiple language support

### File System

- Hierarchical file structure
- Nested folder support
- File type detection
- Import/Export capabilities

### Console

- Real-time output
- Error tracking
- Warning messages
- Clear functionality

### Database

- Automatic saving
- State persistence
- Project recovery
- Reset capability
