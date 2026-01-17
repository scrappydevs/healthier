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

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(appState)
        }
    }
}
