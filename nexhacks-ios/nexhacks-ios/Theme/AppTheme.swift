//
//  AppTheme.swift
//  nexhacks-ios
//
//  Color scheme and theme configuration
//

import SwiftUI

extension Color {
    // Primary Colors from the design
    static let appBackground = Color(red: 245/255, green: 241/255, blue: 236/255) // Beige/tan background
    static let appPrimary = Color(red: 155/255, green: 191/255, blue: 174/255) // Green accent
    static let appAccent = Color(red: 232/255, green: 155/255, blue: 143/255) // Coral/salmon for hot badge
    static let appSecondary = Color(red: 118/255, green: 116/255, blue: 116/255) // Gray text

    // Semantic Colors
    static let cardBackground = Color.white
    static let textPrimary = Color(red: 33/255, green: 33/255, blue: 33/255)
    static let textSecondary = Color(red: 118/255, green: 116/255, blue: 116/255)
    static let divider = Color(red: 220/255, green: 220/255, blue: 220/255)

    // Status Colors
    static let success = Color(red: 155/255, green: 191/255, blue: 174/255)
    static let warning = Color(red: 232/255, green: 155/255, blue: 143/255)
    static let error = Color(red: 217/255, green: 92/255, blue: 92/255)

    // Tailwind-like Colors
    static let emerald = Color(red: 16/255, green: 185/255, blue: 129/255)
    static let amber = Color(red: 245/255, green: 158/255, blue: 11/255)
    static let neutral200 = Color(red: 229/255, green: 229/255, blue: 229/255)
}

struct AppTheme {
    // Typography
    struct Typography {
        static let largeTitle = Font.system(size: 34, weight: .bold)
        static let title = Font.system(size: 28, weight: .bold)
        static let title2 = Font.system(size: 22, weight: .semibold)
        static let title3 = Font.system(size: 20, weight: .semibold)
        static let headline = Font.system(size: 17, weight: .semibold)
        static let body = Font.system(size: 17, weight: .regular)
        static let callout = Font.system(size: 16, weight: .regular)
        static let subheadline = Font.system(size: 15, weight: .regular)
        static let footnote = Font.system(size: 13, weight: .regular)
        static let caption = Font.system(size: 12, weight: .regular)
    }

    // Spacing
    struct Spacing {
        static let xs: CGFloat = 4
        static let sm: CGFloat = 8
        static let md: CGFloat = 16
        static let lg: CGFloat = 24
        static let xl: CGFloat = 32
        static let xxl: CGFloat = 48
    }

    // Corner Radius
    struct CornerRadius {
        static let sm: CGFloat = 8
        static let md: CGFloat = 12
        static let lg: CGFloat = 16
        static let xl: CGFloat = 24
    }
}
