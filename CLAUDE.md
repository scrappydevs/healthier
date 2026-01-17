# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PillPal is an elderly care app for medication adherence, nutrition tracking, and exercise support. Multi-platform: Next.js dashboard (clinicians), FastAPI backend, and SwiftUI iOS app.

## Commands

### Development (from root)
```bash
npm run dev              # Run frontend + backend concurrently
npm run dev:frontend     # Frontend only (localhost:3000)
npm run dev:backend      # Backend only (localhost:8000)
npm run install:all      # Install all dependencies (npm + pip)
```

### Frontend
```bash
cd frontend && npm run lint    # ESLint
cd frontend && npm run build   # Production build
```

### Backend
```bash
cd backend && source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
pytest                         # Run tests
```

### iOS
Open `nexhacks-ios/nexhacks-ios.xcodeproj` in Xcode. Build target: iOS 16+.

## Architecture

### Monorepo Structure
- `frontend/` - Next.js 16 with App Router, React 19, Tailwind CSS 4
- `backend/` - FastAPI with Pydantic, Supabase SDK
- `nexhacks-ios/` - SwiftUI with MVVM architecture

### Frontend (Next.js)
- **Route groups**: `(public)/` for login/landing, `(app)/dashboard/` for protected routes
- **Server Components** by default; use `"use client"` only when needed
- **Server Actions** in `actions.ts` files for backend calls
- **Path alias**: `@/*` maps to project root

### Backend (FastAPI)
- `app/core/` - Config (Pydantic Settings), database (Supabase client)
- `app/models/` - Pydantic request/response schemas
- `app/api/` - Route handlers organized by domain
- `app/services/` - Business logic layer
- API docs at `http://localhost:8000/docs`

### iOS (SwiftUI MVVM)
- `AppState.swift` - Central state management via @EnvironmentObject
- `Models/` - Codable structs (Medication, Meal, Exercise, User, Room)
- `ViewModels/` - @Published properties, business logic
- `Views/` - SwiftUI views organized by feature
- `Services/` - Platform integrations (Supabase, Claude API, Location, Notifications)
- `Repositories/` - CRUD operations with Combine updates
- `Theme/AppTheme.swift` - Design system colors and spacing

## Code Standards (from .cursorrules)

### Tailwind CSS
- Use Tailwind classes directly, NOT CSS variables like `var(--ink)`
- Colors defined in `globals.css` @theme block
- Brutalist style: `border-2 border-neutral-950`, no rounded corners, no shadows
- Typography: `font-light` for body, `font-normal` for labels, uppercase labels with `tracking-wider`

### FastAPI
- Pydantic models for all request/response validation
- Raise `HTTPException` for errors, no silent failures
- Prefer async/await for I/O operations

### SwiftUI
- Single AppState injected via environment
- ViewModels expose @Published properties
- Repositories handle persistence, Services handle platform APIs

## Environment Variables

Copy `env.example` to `.env`:
- `NEXT_PUBLIC_API_URL` - Backend URL
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase frontend
- `SUPABASE_URL`, `SUPABASE_KEY` - Supabase backend
- Infisical variables for production secrets
