//
//  EmailAuthView.swift
//  nexhacks-ios
//
//  Email/password authentication form with validation
//

import SwiftUI

struct EmailAuthView: View {
    @ObservedObject var viewModel: AuthViewModel
    @Environment(\.dismiss) private var dismiss
    
    @State private var isSignUp = false
    @State private var fullName = ""
    @State private var email = ""
    @State private var password = ""
    @State private var confirmPassword = ""
    @State private var showForgotPassword = false
    
    @FocusState private var focusedField: Field?
    
    enum Field {
        case fullName, email, password, confirmPassword
    }
    
    var isFormValid: Bool {
        if isSignUp {
            return !fullName.isEmpty &&
                   isValidEmail(email) &&
                   password.count >= 6 &&
                   password == confirmPassword
        } else {
            return isValidEmail(email) && !password.isEmpty
        }
    }
    
    var body: some View {
        NavigationView {
            ZStack {
                Color.appBackground.ignoresSafeArea()
                
                ScrollView {
                    VStack(spacing: AppTheme.Spacing.xl) {
                        VStack(spacing: AppTheme.Spacing.md) {
                            Text(isSignUp ? "CREATE ACCOUNT" : "SIGN IN")
                                .font(.system(size: 28, weight: .light))
                                .foregroundColor(.textPrimary)
                                .tracking(2)
                            
                            Text(isSignUp ? "FILL IN YOUR DETAILS" : "ENTER YOUR CREDENTIALS")
                                .font(.system(size: 10, weight: .regular))
                                .foregroundColor(.textSecondary)
                                .tracking(1.5)
                        }
                        .padding(.top, AppTheme.Spacing.xl)
                        
                        VStack(spacing: AppTheme.Spacing.md) {
                            if isSignUp {
                                VStack(alignment: .leading, spacing: AppTheme.Spacing.xs) {
                                    Text("FULL NAME")
                                        .font(.system(size: 10, weight: .regular))
                                        .foregroundColor(.textSecondary)
                                        .tracking(1.5)
                                    
                                    TextField("", text: $fullName)
                                        .textContentType(.name)
                                        .autocapitalization(.words)
                                        .focused($focusedField, equals: .fullName)
                                        .padding()
                                        .background(Color.white)
                                        .overlay(
                                            Rectangle()
                                                .stroke(Color.textPrimary, lineWidth: 2)
                                        )
                                }
                            }
                            
                            VStack(alignment: .leading, spacing: AppTheme.Spacing.xs) {
                                Text("EMAIL")
                                    .font(.system(size: 10, weight: .regular))
                                    .foregroundColor(.textSecondary)
                                    .tracking(1.5)
                                
                                TextField("", text: $email)
                                    .textContentType(.emailAddress)
                                    .keyboardType(.emailAddress)
                                    .autocapitalization(.none)
                                    .focused($focusedField, equals: .email)
                                    .padding()
                                    .background(Color.white)
                                    .overlay(
                                        Rectangle()
                                            .stroke(isValidEmail(email) || email.isEmpty ? Color.textPrimary : Color.error, lineWidth: 2)
                                    )
                            }
                            
                            VStack(alignment: .leading, spacing: AppTheme.Spacing.xs) {
                                Text("PASSWORD")
                                    .font(.system(size: 10, weight: .regular))
                                    .foregroundColor(.textSecondary)
                                    .tracking(1.5)
                                
                                SecureField("", text: $password)
                                    .textContentType(isSignUp ? .newPassword : .password)
                                    .focused($focusedField, equals: .password)
                                    .padding()
                                    .background(Color.white)
                                    .overlay(
                                        Rectangle()
                                            .stroke(Color.textPrimary, lineWidth: 2)
                                    )
                                
                                if isSignUp && !password.isEmpty {
                                    Text(password.count >= 6 ? "STRONG PASSWORD" : "MINIMUM 6 CHARACTERS")
                                        .font(.system(size: 9, weight: .regular))
                                        .foregroundColor(password.count >= 6 ? .success : .textSecondary)
                                        .tracking(1)
                                }
                            }
                            
                            if isSignUp {
                                VStack(alignment: .leading, spacing: AppTheme.Spacing.xs) {
                                    Text("CONFIRM PASSWORD")
                                        .font(.system(size: 10, weight: .regular))
                                        .foregroundColor(.textSecondary)
                                        .tracking(1.5)
                                    
                                    SecureField("", text: $confirmPassword)
                                        .textContentType(.newPassword)
                                        .focused($focusedField, equals: .confirmPassword)
                                        .padding()
                                        .background(Color.white)
                                        .overlay(
                                            Rectangle()
                                                .stroke(confirmPassword.isEmpty || password == confirmPassword ? Color.textPrimary : Color.error, lineWidth: 2)
                                        )
                                    
                                    if !confirmPassword.isEmpty && password != confirmPassword {
                                        Text("PASSWORDS DO NOT MATCH")
                                            .font(.system(size: 9, weight: .regular))
                                            .foregroundColor(.error)
                                            .tracking(1)
                                    }
                                }
                            }
                        }
                        .padding(.horizontal, AppTheme.Spacing.lg)
                        
                        if !isSignUp {
                            Button(action: {
                                showForgotPassword = true
                            }) {
                                Text("FORGOT PASSWORD?")
                                    .font(.system(size: 11, weight: .regular))
                                    .foregroundColor(.appPrimary)
                                    .tracking(1.5)
                            }
                        }
                        
                        Button(action: {
                            Task {
                                if isSignUp {
                                    await viewModel.signUpWithEmail(
                                        email: email,
                                        password: password,
                                        fullName: fullName
                                    )
                                } else {
                                    await viewModel.signInWithEmail(
                                        email: email,
                                        password: password
                                    )
                                }
                                
                                if viewModel.errorMessage == nil {
                                    dismiss()
                                }
                            }
                        }) {
                            Text(isSignUp ? "CREATE ACCOUNT" : "SIGN IN")
                                .font(.system(size: 14, weight: .regular))
                                .tracking(2)
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 18)
                                .background(isFormValid ? Color.textPrimary : Color.textSecondary)
                                .overlay(
                                    Rectangle()
                                        .stroke(isFormValid ? Color.textPrimary : Color.textSecondary, lineWidth: 2)
                                )
                        }
                        .disabled(!isFormValid || viewModel.isLoading)
                        .padding(.horizontal, AppTheme.Spacing.lg)
                        
                        if let errorMessage = viewModel.errorMessage {
                            Text(errorMessage)
                                .font(.system(size: 11, weight: .regular))
                                .foregroundColor(.error)
                                .multilineTextAlignment(.center)
                                .padding(.horizontal, AppTheme.Spacing.lg)
                        }
                        
                        Button(action: {
                            isSignUp.toggle()
                            viewModel.clearError()
                        }) {
                            HStack(spacing: 4) {
                                Text(isSignUp ? "ALREADY HAVE AN ACCOUNT?" : "DON'T HAVE AN ACCOUNT?")
                                    .font(.system(size: 11, weight: .regular))
                                    .foregroundColor(.textSecondary)
                                    .tracking(1)
                                
                                Text(isSignUp ? "SIGN IN" : "SIGN UP")
                                    .font(.system(size: 11, weight: .regular))
                                    .foregroundColor(.appPrimary)
                                    .tracking(1.5)
                            }
                        }
                        
                        Spacer(minLength: AppTheme.Spacing.xxl)
                    }
                }
                
                if viewModel.isLoading {
                    Color.black.opacity(0.3)
                        .ignoresSafeArea()
                    
                    ProgressView()
                        .scaleEffect(1.5)
                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button(action: { dismiss() }) {
                        Image(systemName: "xmark")
                            .font(.system(size: 16, weight: .regular))
                            .foregroundColor(.textPrimary)
                    }
                }
            }
        }
        .alert("RESET PASSWORD", isPresented: $showForgotPassword) {
            TextField("Email", text: $email)
                .textContentType(.emailAddress)
                .keyboardType(.emailAddress)
                .autocapitalization(.none)
            
            Button("SEND RESET LINK") {
                Task {
                    await viewModel.resetPassword(email: email)
                }
            }
            
            Button("CANCEL", role: .cancel) {}
        } message: {
            Text("Enter your email to receive a password reset link")
        }
    }
    
    private func isValidEmail(_ email: String) -> Bool {
        let emailRegex = "[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,64}"
        let predicate = NSPredicate(format: "SELF MATCHES %@", emailRegex)
        return predicate.evaluate(with: email)
    }
}

#Preview {
    EmailAuthView(viewModel: AuthViewModel(
        authService: AuthService(),
        supabaseService: SupabaseService()
    ))
}
