//
//  WelcomeView.swift
//  nexhacks-ios
//
//  Welcome screen with minimal branding
//

import SwiftUI

struct WelcomeView: View {
    let onGetStarted: () -> Void
    
    var body: some View {
        ZStack {
            Color.appBackground.ignoresSafeArea()
            
            VStack(spacing: AppTheme.Spacing.xxl) {
                Spacer()
                
                VStack(spacing: AppTheme.Spacing.lg) {
                    Image(systemName: "heart.text.square.fill")
                        .font(.system(size: 80, weight: .light))
                        .foregroundColor(.appPrimary)
                    
                    Text("PILLPAL")
                        .font(.system(size: 40, weight: .light))
                        .foregroundColor(.textPrimary)
                        .tracking(2)
                    
                    Text("MEDICATION ADHERENCE\nNUTRITION TRACKING\nEXERCISE SUPPORT")
                        .font(.system(size: 12, weight: .regular))
                        .foregroundColor(.textSecondary)
                        .tracking(1.5)
                        .multilineTextAlignment(.center)
                        .lineSpacing(8)
                }
                
                Spacer()
                
                Button(action: onGetStarted) {
                    Text("GET STARTED")
                        .font(.system(size: 16, weight: .regular))
                        .tracking(2)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 20)
                        .background(Color.textPrimary)
                        .overlay(
                            Rectangle()
                                .stroke(Color.textPrimary, lineWidth: 2)
                        )
                }
                .padding(.horizontal, AppTheme.Spacing.lg)
                
                Text("YOUR HEALTH COMPANION")
                    .font(.system(size: 10, weight: .regular))
                    .foregroundColor(.textSecondary)
                    .tracking(1.5)
                    .padding(.bottom, AppTheme.Spacing.xl)
            }
        }
    }
}

#Preview {
    WelcomeView(onGetStarted: {})
}
