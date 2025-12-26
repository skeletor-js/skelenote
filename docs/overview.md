# Product Overview

> A personal productivity tool where everything is an object, every object is connected, and your knowledge graph emerges naturally from the way you work.

---

## The Problem

Most productivity tools force you into artificial separations:

- **Note apps** are great for writing, but tasks live somewhere else
- **Task managers** handle to-dos, but lack context and depth
- **Project tools** organize work, but feel like overkill for personal use
- **Calendar apps** show meetings, but your notes about them live elsewhere

You end up with fragmented information scattered across multiple apps. The connection between a meeting, the notes you took, the tasks that emerged, and the project they belong to? That lives only in your head.

---

## Our Solution

**Everything is an object. Every object can connect to any other.**

A Task isn't just a checkbox—it's an object with properties, relations, and its own space for notes. A Meeting isn't just a calendar event—it's an object where you capture context, link to projects, and see related tasks. A Note isn't isolated—it knows what tasks emerged from it, what project it belongs to, and what other notes reference it.

The magic happens in the connections. When you create a task while writing a meeting note, it automatically links to that note and inherits the project. When you mention a project in your daily note, the backlink appears on that project. Your knowledge graph isn't something you build—it emerges from the natural way you capture and organize information.

---

## What Makes Us Different

### 1. Object-Based Architecture

Unlike traditional note apps where everything is a document, or task apps where everything is a to-do, we treat every piece of information as a first-class object with:

- **Type**: Task, Note, Project, Meeting, Link, Tag, or your own custom types
- **Properties**: Structured data appropriate to that type
- **Relations**: Explicit connections to other objects
- **Content**: Rich text when the type calls for it

This means a Task can have a due date, a priority, a project relation, tags, related notes, AND a description body. A Meeting has a time, attendees, location, AND a space for your meeting notes. Everything has structure AND depth.

### 2. Universal Object View

Every object—regardless of type—uses the same interaction pattern:

```
Title & Properties
     ↓
Content (if applicable)
     ↓
Backlinks (collapsed)
```

A Project isn't a special "dashboard." It's an object. You see its properties, its description, and everything that references it—tasks with this project, notes that mention it, other objects linked via relations. Same pattern for Notes, Meetings, Links, custom types—everything.

This consistency means you learn one interaction model and it works everywhere.

### 3. Automatic Backlinks

Relations are bidirectional without extra work. When a Task belongs to a Project, that Project shows the Task in its backlinks. When a Note mentions a Meeting with an @-mention, that Meeting shows the Note in its backlinks.

You don't maintain these connections manually. The graph builds itself.

### 4. Intentional Inbox Workflow

Everything you capture lands in a universal Inbox. Not just tasks—everything. Notes, links, meetings you want to annotate, custom objects. The Inbox is your triage zone.

Processing is explicit. You open an item, add context (tags, project, dates, relations), and mark it processed. Nothing slips through. Nothing auto-clears. You decide when something is ready to leave the Inbox.

### 5. Daily Notes as Connection Hub

Each day has a note. Every object you create that day automatically links to it. Your daily note becomes a natural timeline—not because you manually logged everything, but because the connections formed as you worked.

Open any daily note and see: what you captured, what meetings you had, what tasks you created. The day's work, connected.

### 6. Minimal, Monochromatic Design

No visual clutter. No rainbow of colors fighting for attention. The interface is grayscale with subtle depth—raised surfaces for cards, sunken surfaces for inputs, shadows for elevation.

Tags are the only color. They pop. Everything else stays out of the way.

Typography is Fragment Mono throughout. Dense enough to show information, spacious enough to breathe.

### 7. Keyboard-First, Raycast-Style Interaction

- `Cmd+Shift+Space`: Quick capture from anywhere, even when the app is hidden
- `Cmd+K`: Command palette for everything else

Quick capture prompts for type, shows required fields, and you're done. The object lands in your Inbox, linked to today's daily note. Capture friction approaches zero.

### 8. Local-First, Sync When Connected

Your data lives on your device. The app works fully offline. When you're connected, changes sync across your devices via CRDT—no conflicts, no merge issues, just eventual consistency.

You own your data. It's not trapped in someone else's cloud.

### 9. Custom Types

The built-in types (Task, Note, Project, Meeting, Link, Tag) cover common workflows. But you can create your own.

Want a "Book" type with Author, Genre, and Rating properties? Create it. Want a "Recipe" type with Ingredients and Prep Time? Create it. Your custom types get the same treatment as built-ins: they appear in Quick Capture, they show in Search, they use the universal object view.

---

## Core Features

### Objects & Types

| Type | Purpose | Key Properties |
|------|---------|----------------|
| **Task** | Things to do | Status, due date, priority, project, tags |
| **Note** | Thoughts and writing | Title, project, tags, rich content |
| **Project** | Containers for related work | Status, tags, description |
| **Meeting** | Calendar events with context | Time, location, attendees, notes |
| **Link** | Bookmarks with metadata | URL, title, description, tags |
| **Tag** | Lightweight categorization | Name, color, description |
| **Custom** | Whatever you need | You define the properties |

### Views

| View | What It Shows |
|------|---------------|
| **Inbox** | All unprocessed objects, any type |
| **Today** | Today's tasks + today's daily note |
| **This Week** | Tasks due this week |
| **Overdue** | Tasks past their due date |
| **Blocked** | Tasks marked blocked |
| **Eventually** | Tasks due beyond this week |
| **Completed** | Done tasks |
| **Daily Notes** | Calendar view of all daily notes |

Task views support List and Kanban modes.

### Editor

Block-based rich text editing powered by BlockNote:

- Headings, paragraphs, lists
- Checklists, code blocks, blockquotes
- Tables, images
- `@` mentions to link any object inline

### Google Calendar Integration

Read-only sync with your calendar:

- Meetings auto-create as objects
- Add notes, tags, and project links to any meeting
- Meetings appear in that day's daily note view
- Your annotations stay even if the calendar event changes

### Search

Full-text search across everything:

- Object titles and names
- Property values
- Rich text content

Results appear inline as you type, Spotlight-style.

### Sync

Local-first with cloud relay:

- Works offline, always
- Syncs across devices when connected
- CRDT-based—no conflicts, no data loss
- Visible indicator when offline

---

## The Experience

**Morning**: You open the app. Today's daily note is ready. Your calendar meetings are already there as Meeting objects. You scan the Inbox—a few things from yesterday's quick captures. You process them: add a project here, a tag there, set a due date. Inbox clear.

**During work**: In a meeting, you open the Meeting object and take notes directly. You mention a project with `@`. A task emerges—you hit `Cmd+Shift+Space`, capture it in 5 seconds, keep going. It's automatically linked to the meeting and the project.

**Writing**: You create a Note for a new idea. As you write, you mention related Notes and Projects. The connections form. Later, when you open that Project, you'll see this Note in the backlinks. You didn't file it anywhere. It found its place.

**End of day**: You check Completed. You glance at Tomorrow's tasks. You look at today's daily note and see everything you touched. Not because you logged it—because the connections captured it.

**The graph grows**. Not because you're building a knowledge base. Because you're working, and the structure emerges from the work.

---

## Who This Is For

- People who think in connections, not folders
- People who want tasks and notes in one place, not two apps
- People who value keyboard speed and minimal UI
- People who want their data local, not locked in a cloud
- People who find Notion too heavy, Obsidian too manual, Things too limited
- People who admire Anytype and Capacities but want something personal and focused

---

## What This Is Not

- Not a team collaboration tool (personal use only, v1)
- Not a replacement for Google Calendar (read-only integration)
- Not a web app (desktop and mobile native only)
- Not a publishing platform (no sharing, v1)
- Not infinitely customizable (opinionated by design)

---

## Summary

**One app. One object model. One interaction pattern.**

Capture anything. Connect everything. Let the graph emerge.

Minimal UI. Maximum keyboard. Local-first. Sync when connected.

Your productivity system, built on objects and relations instead of files and folders.
