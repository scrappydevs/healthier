Healthier - Clinician Mobile Dashboard
======================================

Mobile companion for clinicians to monitor patients on the go.

SETUP (when ready to develop)
-----------------------------
This will be a React Native / Expo app.

To initialize:
  npx create-expo-app@latest . --template blank-typescript

KEY FEATURES
------------
- Patient list with adherence scores
- Critical alerts with push notifications
- Quick patient detail views
- Offline-capable for hospital dead zones

FOLDER STRUCTURE
----------------
mobile-dash/
├── src/
│   ├── components/    # Reusable UI components
│   ├── screens/       # App screens
│   ├── hooks/         # Custom React hooks
│   ├── lib/           # Utilities, API client
│   └── types/         # TypeScript types
├── assets/            # Images, fonts
└── app.json           # Expo config (after init)
