//
//  AuthView.swift
//  nexhacks-ios
//
//  Authentication options screen with Google and email sign-in
//

import SwiftUI

struct AuthView: View {
    @ObservedObject var viewModel: AuthViewModel
    @State private var showEmailAuth = false
    
    var body: some View {
        ZStack {
            Color.appBackground.ignoresSafeArea()
            
            VStack(spacing: 0) {
                Spacer()
                
                VStack(spacing: AppTheme.Spacing.md) {
                    Text("SIGN IN")
                        .font(.system(size: 32, weight: .light))
                        .foregroundColor(.textPrimary)
                        .tracking(2)
                    
                    Text("CHOOSE YOUR PREFERRED METHOD")
                        .font(.system(size: 10, weight: .regular))
                        .foregroundColor(.textSecondary)
                        .tracking(1.5)
                }
                .padding(.bottom, AppTheme.Spacing.xxl)
                
                VStack(spacing: AppTheme.Spacing.md) {
                    Button(action: {
                        Task {
                            await viewModel.signInWithGoogle()
                        }
                    }) {
                        HStack(spacing: AppTheme.Spacing.md) {
                            Image(systemName: "g.circle.fill")
                                .font(.system(size: 20))
                            
                            Text("CONTINUE WITH GOOGLE")
                                .font(.system(size: 14, weight: .regular))
                                .tracking(1.5)
                        }
                        .foregroundColor(.textPrimary)
                        .frame(maxWidth: .infinity)
                        .frame(height: 56)
                        .background(Color.white)
                        .overlay(
                            Rectangle()
                                .stroke(Color.textPrimary, lineWidth: 2)
                        )
                    }
                    
                    Button(action: {
                        showEmailAuth = true
                    }) {
                        HStack(spacing: AppTheme.Spacing.md) {
                            Image(systemName: "envelope.fill")
                                .font(.system(size: 20))
                            
                            Text("CONTINUE WITH EMAIL")
                                .font(.system(size: 14, weight: .regular))
                                .tracking(1.5)
                        }
                        .foregroundColor(.textPrimary)
                        .frame(maxWidth: .infinity)
                        .frame(height: 56)
                        .background(Color.white)
                        .overlay(
                            Rectangle()
                                .stroke(Color.textPrimary, lineWidth: 2)
                        )
                    }
                }
                .padding(.horizontal, AppTheme.Spacing.lg)
                
                if let errorMessage = viewModel.errorMessage {
                    Text(errorMessage)
                        .font(.system(size: 12, weight: .regular))
                        .foregroundColor(.error)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, AppTheme.Spacing.lg)
                        .padding(.top, AppTheme.Spacing.md)
                        .onAppear {
                            DispatchQueue.main.asyncAfter(deadline: .now() + 5) {
                                viewModel.clearError()
                            }
                        }
                }
                
                Spacer()
                
                VStack(spacing: AppTheme.Spacing.xs) {
                    Text("BY CONTINUING YOU AGREE TO OUR")
                        .font(.system(size: 9, weight: .regular))
                        .foregroundColor(.textSecondary)
                        .tracking(1)
                    
                    Text("TERMS OF SERVICE AND PRIVACY POLICY")
                        .font(.system(size: 9, weight: .regular))
                        .foregroundColor(.textSecondary)
                        .tracking(1)
                }
                .padding(.bottom, AppTheme.Spacing.xl)
            }
            
            if viewModel.isLoading {
                Color.black.opacity(0.3)
                    .ignoresSafeArea()
                
                ProgressView()
                    .scaleEffect(1.5)
                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
            }
        }
        .sheet(isPresented: $showEmailAuth) {
            EmailAuthView(viewModel: viewModel)
        }
    }
}

#Preview {
    AuthView(viewModel: AuthViewModel(
        authService: AuthService(),
        supabaseService: SupabaseService()
    ))
}
