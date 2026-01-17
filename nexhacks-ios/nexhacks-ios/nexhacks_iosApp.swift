//
//  nexhacks_iosApp.swift
//  nexhacks-ios
//
//  Created by David Jr on 1/17/26.
//

import SwiftUI

@main
struct nexhacks_iosApp: App {
    @StateObject private var appState = AppState()
    @State private var showAuthView = false

    var body: some Scene {
        WindowGroup {
            Group {
                if !appState.isInitialized {
                    ZStack {
                        Color.appBackground.ignoresSafeArea()
                        ProgressView()
                            .scaleEffect(1.5)
                            .progressViewStyle(CircularProgressViewStyle(tint: .textPrimary))
                    }
                } else {
                    switch appState.authViewModel.authState {
                    case .loading:
                        ZStack {
                            Color.appBackground.ignoresSafeArea()
                            ProgressView()
                                .scaleEffect(1.5)
                                .progressViewStyle(CircularProgressViewStyle(tint: .textPrimary))
                        }
                        
                    case .unauthenticated:
                        if showAuthView {
                            AuthView(viewModel: appState.authViewModel)
                        } else {
                            WelcomeView {
                                showAuthView = true
                            }
                        }
                        
                    case .authenticated(needsProfile: true):
                        ProfileSetupView(viewModel: appState.authViewModel)
                        
                    case .authenticated(needsProfile: false), .ready:
                        ContentView()
                            .environmentObject(appState)
                    }
                }
            }
            .onOpenURL { url in
                Task {
                    await appState.authViewModel.handleOAuthCallback(url: url)
                }
            }
            .onChange(of: appState.authViewModel.authState) { oldValue, newValue in
                if case .unauthenticated = newValue {
                    showAuthView = false
                }
            }
        }
    }
}
