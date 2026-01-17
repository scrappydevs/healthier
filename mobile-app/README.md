Healthier - Patient iOS App
===========================

Voice-guided medication reminder app for elderly patients.

SETUP (when ready to develop)
-----------------------------
This will be a React Native / Expo app.

To initialize:
  npx create-expo-app@latest . --template blank-typescript

KEY FEATURES
------------
- Minimal, calm UI centered on pill canister visual
- Voice agent for medication guidance
- Push notifications for reminders
- Food photo capture with voice description
- Exercise logging via voice

DESIGN REQUIREMENTS
-------------------
- Large fonts (18-20px minimum body text)
- High contrast colors
- Large touch targets (44x44px minimum)
- Voice-first interaction
- Calm color palette

FOLDER STRUCTURE
----------------
mobile-app/
├── src/
│   ├── components/    # Reusable UI components
│   ├── screens/       # App screens
│   ├── hooks/         # Custom React hooks
│   ├── lib/           # Utilities, API client
│   └── types/         # TypeScript types
├── assets/            # Images, fonts
└── app.json           # Expo config (after init)
