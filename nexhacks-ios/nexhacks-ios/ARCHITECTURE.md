# NexHacks iOS Architecture

## Overview
This iOS app follows a clean MVVM architecture with proper separation of concerns, dependency injection, and centralized state management.

## Architecture Layers

### 1. App State (`AppState.swift`)
Central state management using `@StateObject` and `@EnvironmentObject` for sharing state across views.

**Features:**
- Manages all repositories, services, and view models
- Single source of truth for app-wide state
- Handles initialization and permission requests
- Provides convenient access to all app components

**Usage:**
```swift
@StateObject private var appState = AppState()
// Inject into view hierarchy via .environmentObject(appState)
```

### 2. Models (`Models/`)
Complete data models with Codable support for persistence and syncing.

**Files:**
- `User.swift` - User profile and emergency contact
- `Medication.swift` - Medication tracking with logs
- `Meal.swift` - Meal and nutrition tracking
- `Exercise.swift` - Exercise and activity tracking
- `Room.swift` - RoomPlan AR scanning data

**Features:**
- All models conform to `Identifiable`, `Codable`, and `Equatable`
- Enums for type-safe categorical data
- Timestamp tracking (createdAt, updatedAt)
- Rich domain modeling with associated types

### 3. Services (`Services/`)
Stub implementations ready to be built out.

#### `SyncService.swift`
Backend dashboard synchronization service.

**Features:**
- Sync all data types (medications, meals, exercises, user profile)
- Track sync status and last sync date
- Error handling and retry logic
- Ready for API integration

#### `LocationTrackingService.swift`
Indoor positioning and location tracking.

**Features:**
- Core Location integration
- Authorization status management
- Indoor position tracking (stub for WiFi/BLE/UWB)
- Room-based positioning

#### `RoomPlanService.swift`
AR room scanning using Apple's RoomPlan framework.

**Features:**
- RoomCaptureSession integration
- Scan progress tracking
- Room data processing
- Export capabilities (USDZ, JSON)

#### `NotificationService.swift`
Medication reminders and notifications.

**Features:**
- Medication reminder scheduling
- Authorization management
- Recurring notifications
- Notification cancellation and management

### 4. Repositories (`Repositories/`)
Data access layer with in-memory storage (ready for Core Data/SwiftData).

**Files:**
- `UserRepository.swift`
- `MedicationRepository.swift`
- `MealRepository.swift`
- `ExerciseRepository.swift`
- `RoomRepository.swift`

**Features:**
- CRUD operations for all models
- Published properties for reactive updates
- Query methods (by date, by type, etc.)
- Sample data for testing
- Structured for easy database integration

### 5. ViewModels (`ViewModels/`)
MVVM pattern separating business logic from views.

#### `HomeViewModel.swift`
Manages home screen state and real-time tracking features.

**Features:**
- Aggregates data from all repositories
- Real-time status updates from services
- Quick statistics calculation
- Upcoming reminders management
- Reactive bindings with Combine

#### `MedicationViewModel.swift`
Manages medication list and medication-specific operations.

**Features:**
- Medication filtering and search
- Adherence rate calculation
- Notification scheduling integration
- Medication log tracking
- CRUD operations

### 6. Views (`Views/`)
SwiftUI views following the app's design system.

#### `Home/HomeView.swift`
Home screen showing real-time status from all tracking features.

**Features:**
- Welcome section with user name
- Dashboard sync status card
- Tracking features (location, room scanning)
- Today's summary statistics
- Upcoming medication reminders

#### `Medication/MedicationListView.swift`
Medication list with proper data binding.

**Features:**
- Search functionality
- Filter options (all, active, inactive)
- Medication cards with actions
- Log medication taken
- Toggle active/inactive state
- Empty state handling

### 7. Theme (`Theme/`)

#### `AppTheme.swift`
Color scheme and design system based on the provided design.

**Colors:**
- `appBackground` - Beige/tan background (#F5F1EC)
- `appPrimary` - Green accent (#9BBFAE)
- `appAccent` - Coral/salmon (#E89B8F)
- `appSecondary` - Gray text (#767474)

**Typography:**
- Consistent font sizes and weights
- Clear hierarchy (largeTitle, title, headline, body, caption)

**Spacing:**
- xs (4pt), sm (8pt), md (16pt), lg (24pt), xl (32pt), xxl (48pt)

**Corner Radius:**
- sm (8pt), md (12pt), lg (16pt), xl (24pt)

## Data Flow

1. **User Input** → View
2. **View** → ViewModel (via action methods)
3. **ViewModel** → Repository/Service (business logic)
4. **Repository** → Storage (in-memory, Core Data, API)
5. **Repository** publishes changes
6. **ViewModel** observes and updates state
7. **View** automatically re-renders

## Dependency Injection

All dependencies are injected through `AppState`:

```swift
@main
struct nexhacks_iosApp: App {
    @StateObject private var appState = AppState()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(appState)
        }
    }
}
```

Views access dependencies via environment:

```swift
@EnvironmentObject var appState: AppState
```

## Next Steps

### Services
- [ ] Implement actual API calls in SyncService
- [ ] Integrate WiFi/BLE/UWB for indoor positioning
- [ ] Connect RoomCaptureSession delegate methods
- [ ] Add notification action handlers

### Repositories
- [ ] Replace in-memory storage with Core Data/SwiftData
- [ ] Add data migration logic
- [ ] Implement offline support
- [ ] Add data validation

### Views
- [ ] Create add/edit medication forms
- [ ] Build meal tracking views
- [ ] Create exercise logging views
- [ ] Implement RoomPlan scanning UI
- [ ] Add profile/settings screen

### Testing
- [ ] Unit tests for ViewModels
- [ ] Repository tests
- [ ] Service integration tests
- [ ] UI tests for critical flows

## File Structure

```
nexhacks-ios/
├── nexhacks_iosApp.swift          # App entry point
├── AppState.swift                  # Central state management
├── ContentView.swift               # Main tab navigation
├── Theme/
│   └── AppTheme.swift             # Design system
├── Models/
│   ├── User.swift
│   ├── Medication.swift
│   ├── Meal.swift
│   ├── Exercise.swift
│   └── Room.swift
├── Services/
│   ├── SyncService.swift
│   ├── LocationTrackingService.swift
│   ├── RoomPlanService.swift
│   └── NotificationService.swift
├── Repositories/
│   ├── UserRepository.swift
│   ├── MedicationRepository.swift
│   ├── MealRepository.swift
│   ├── ExerciseRepository.swift
│   └── RoomRepository.swift
├── ViewModels/
│   ├── HomeViewModel.swift
│   └── MedicationViewModel.swift
└── Views/
    ├── Home/
    │   └── HomeView.swift
    └── Medication/
        └── MedicationListView.swift
```

## Key Features Demonstrated

✅ **Data Flow** - Repositories → ViewModels → Views with reactive updates
✅ **Sync Integration** - Dashboard sync status and trigger
✅ **RoomPlan Integration** - Scanned rooms display and scanning state
✅ **Location Tracking** - Real-time tracking status
✅ **Medication Reminders** - Notification scheduling and management
✅ **MVVM Pattern** - Clear separation of concerns
✅ **Dependency Injection** - Centralized via AppState
✅ **Design System** - Consistent colors, typography, and spacing
✅ **Reactive Programming** - Combine for state management
