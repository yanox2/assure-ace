# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Assure Ace is an Electron-based browser automation tool for recording and replaying web interactions. It captures user actions on web pages using text-based selectors (instead of fragile CSS selectors) and can export scripts for Puppeteer and Playwright. The application provides a no-code interface for E2E testing and RPA automation.

## Development Commands

### Build & Development
```bash
# Install dependencies
npm install

# Compile TypeScript (both main and web configs)
npm run tsc

# Start the application
npm run start

# Start with trace warnings (useful for debugging)
electron --trace-warnings ./dist/main.mjs
```

### TypeScript Configuration
The project uses dual TypeScript configurations:
- `tsconfig.json`: Main Electron process (Node.js modules)
- `tsconfig.web.json`: Web renderer process (CommonJS for browser execution)

## Architecture Overview

### Core Components

**Main Process (Electron)**
- `src/main.mts`: Application entry point, initializes AssureAce
- `src/AssureAce.mts`: Main application class extending AppBase
- `src/AppWindow.mts`: Main window controller with menu system and IPC handlers

**Script Management**
- `src/ScriptBuilder.mts`: Central orchestrator for recording/playback, WebSocket server (port 9910)
- `src/SimBrowser.mts`: Browser instance manager, abstracts multiple browser windows
- `src/ScriptBuilder.mts:receiver()`: Receives browser events during recording

**Browser Automation Adapters**
- `src/Puppeteer.mts`: Puppeteer implementation of E2ETestTool interface
- `src/Playwright.mts`: Playwright implementation of E2ETestTool interface
- Both handle browser lifecycle, tab management, and script injection

**Core Infrastructure**
- `src/cmn/AppBase.mts`: Base application class with settings management
- `src/cmn/BaseWindow.mts`: Base window class for Electron windows
- `src/types/types.mts`: Core type definitions and interfaces

### Key Patterns

1. **Layered Architecture**: UI (Electron) → Business Logic (ScriptBuilder) → Browser Automation
2. **Strategy Pattern**: Pluggable browser backends (Puppeteer/Playwright)
3. **Observer Pattern**: Browser event handling and lifecycle management
4. **Command Pattern**: Operations represent user actions that can be stored/replayed

### Data Flow

1. **Recording**: Browser events → WebSocket (port 9910) → ScriptBuilder → UI updates
2. **Playback**: Saved operations → ScriptBuilder → SimBrowser → Browser automation
3. **Persistence**: Operations stored as JSON in .ace files

### IPC Communication

Main IPC channels in `AppWindow.mts`:
- `launch`: Launch browser with URL
- `play`: Start script playback
- `record`: Toggle recording state
- `menuTestStep`: Add manual test steps
- `editTestStep`: Modify existing steps

## File Structure

### Source Organization
- `src/`: TypeScript source files (.mts/.cts extensions)
- `src/cmn/`: Common utilities and base classes
- `src/constants/`: Application constants and definitions
- `src/ipc/`: IPC-related files (preload, renderer, extension scripts)
- `src/types/`: TypeScript type definitions
- `dist/`: Compiled JavaScript output
- `tmp/`: Temporary files and test assets

### Key Files
- `src/ipc/ext.js`: Browser injection script for capturing events
- `src/ipc/preload.cts`: Preload script for renderer security
- `src/constants/defines.mts`: Application constants and version info

## Development Notes

### Browser Integration
- Uses WebSocket on port 9910 for browser-to-app communication
- Injects `src/ipc/ext.js` into target browsers for event capture
- Supports Chrome, Edge, and Firefox through different automation backends

### Settings Management
- Settings stored in JSON file via `JSONFile` utility
- Window coordinates automatically persisted
- Default browser engine configurable (Puppeteer/Playwright)

### Test Step Types
- User interactions (clicks, form inputs, navigation)
- Manual steps (sleep, screenshots, validation checks)
- All operations stored as `Operation` objects with selectors and metadata

### UI Technology
- Main window uses HTML/CSS/JavaScript with Bootstrap styling
- Menu system built with Electron's native menu API
- Real-time updates via IPC communication between processes

## Coding Standards

### Variable Naming
- Keep variable names short and concise
- Use abbreviated forms when the meaning is clear from context

### Formatting
- Use tabs for indentation (not spaces)
- Remove trailing spaces from empty lines
- No space between parentheses () and braces {}
- For short single-line if statements, omit braces and write on one line
- Keep code compact and readable