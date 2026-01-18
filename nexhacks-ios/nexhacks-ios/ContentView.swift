//
//  ContentView.swift
//  nexhacks-ios
//
//  Main content view with tab navigation
//

import SwiftUI

struct ContentView: View {
    @EnvironmentObject var appState: AppState

    var body: some View {
        TabView {
            // Home Tab
            HomeView(viewModel: appState.homeViewModel)
                .tabItem {
                    Label("Home", systemImage: "house.fill")
                }
                .environmentObject(appState)

            // Medications Tab (Meds)
            MedicationTabView(viewModel: appState.medicationViewModel)
                .tabItem {
                    Label("Meds", systemImage: "pills.fill")
                }

            // Meals Tab
            MealsView(viewModel: appState.mealViewModel)
                .tabItem {
                    Label("Meals", systemImage: "fork.knife")
                }

            // Exercise Tab
            ExerciseView(viewModel: appState.exerciseViewModel)
                .tabItem {
                    Label("Exercise", systemImage: "figure.run")
                }

            // Journal Tab
            JournalListView(viewModel: appState.journalViewModel)
                .tabItem {
                    Label("Journal", systemImage: "book.fill")
                }
        }
        .accentColor(.appPrimary)
    }
}

// MARK: - Placeholder Views

struct MealsPlaceholderView: View {
    var body: some View {
        NavigationView {
            ZStack {
                Color.appBackground.ignoresSafeArea()

                VStack(spacing: AppTheme.Spacing.lg) {
                    Image(systemName: "fork.knife.circle")
                        .font(.system(size: 60))
                        .foregroundColor(.appPrimary)

                    Text("Meals Tracking")
                        .font(AppTheme.Typography.title)
                        .foregroundColor(.textPrimary)

                    Text("Track your daily meals and nutrition")
                        .font(AppTheme.Typography.body)
                        .foregroundColor(.textSecondary)
                        .multilineTextAlignment(.center)
                }
            }
            .navigationTitle("Meals")
        }
    }
}

struct ExercisePlaceholderView: View {
    var body: some View {
        NavigationView {
            ZStack {
                Color.appBackground.ignoresSafeArea()

                VStack(spacing: AppTheme.Spacing.lg) {
                    Image(systemName: "figure.run.circle")
                        .font(.system(size: 60))
                        .foregroundColor(.appPrimary)

                    Text("Exercise Tracking")
                        .font(AppTheme.Typography.title)
                        .foregroundColor(.textPrimary)

                    Text("Log your workouts and activities")
                        .font(AppTheme.Typography.body)
                        .foregroundColor(.textSecondary)
                        .multilineTextAlignment(.center)
                }
            }
            .navigationTitle("Exercise")
        }
    }
}

struct RoomsPlaceholderView: View {
    var body: some View {
        NavigationView {
            ZStack {
                Color.appBackground.ignoresSafeArea()

                VStack(spacing: AppTheme.Spacing.lg) {
                    Image(systemName: "camera.circle")
                        .font(.system(size: 60))
                        .foregroundColor(.appPrimary)

                    Text("Room Scanning")
                        .font(AppTheme.Typography.title)
                        .foregroundColor(.textPrimary)

                    Text("Scan and manage your rooms with AR")
                        .font(AppTheme.Typography.body)
                        .foregroundColor(.textSecondary)
                        .multilineTextAlignment(.center)
                }
            }
            .navigationTitle("Rooms")
        }
    }
}

#Preview {
    ContentView()
        .environmentObject(AppState())
}
