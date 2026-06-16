# AVP HostBooks - Kanban Lead Processing & Tracking System

This is a premium, glassmorphic client-side single page CRM application built to help 6 sales agents track their leads, log customer interactions, set deal status, and allow their boss (Vijay) to analyze performance metrics and reassign accounts.

## Features

1. **Role-Based Views**:
   - **Agents (Srijan, Harshit, Shivam, Vishal, Satya Sai, Sandesh)**: Can manage their own assigned leads, drag-and-drop their cards across progress stages, update temperatures (Hot, Warm, Cold), and add client interaction notes.
   - **Boss (Vijay)**: Has access to the **Sales Agent Performance Tracker** table with deal win-rates and pipeline metrics. Can filter the entire board by agent, assign/reassign accounts, create new leads for any agent, and delete stale accounts.
2. **Interactive Kanban Board**: Fully custom boards with color indicators, card counts, and stage totals. Native drag-and-drop support with dynamic hover states.
3. **Timeline Log**: Auto-records audit logs on lead edits (e.g. stage moves, temperature adjustments, ownership re-assignments) alongside manually captured interaction logs.
4. **Rich Styling**: Sleek dark theme featuring glassmorphic blur filters, custom scrollbars, animated popovers, and HSL variable colors.
5. **Persistence**: Saves state instantly to browser `localStorage` preloaded with 8 mock accounts.

## User Credentials

Use these usernames and passwords to log in:

| User | Profile Selection | Password | Role |
| :--- | :--- | :--- | :--- |
| **Vijay** | Vijay (Boss) | `vijay123` | Boss (Admin) |
| **Srijan** | Srijan (Agent) | `srijan123` | Sales Rep |
| **Harshit** | Harshit (Agent) | `harshit123` | Sales Rep |
| **Shivam** | Shivam (Agent) | `shivam123` | Sales Rep |
| **Vishal** | Vishal (Agent) | `vishal123` | Sales Rep |
| **Satya Sai** | Satya Sai (Agent) | `satya123` | Sales Rep |
| **Sandesh** | Sandesh (Agent) | `sandesh123` | Sales Rep |

## How to Run

Since the application uses pure client-side logic, you can run it directly:

1. Open `index.html` in your browser.
2. Alternatively, serve it using any local dev server, for instance:
   ```bash
   npx -y serve
   ```
