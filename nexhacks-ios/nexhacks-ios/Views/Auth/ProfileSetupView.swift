//
//  ProfileSetupView.swift
//  nexhacks-ios
//
//  Required profile setup after authentication
//

import SwiftUI

struct ProfileSetupView: View {
    @ObservedObject var viewModel: AuthViewModel
    
    @State private var fullName = ""
    @State private var dateOfBirth = Date()
    @State private var selectedGender = "prefer_not_to_say"
    @State private var heightCm = ""
    @State private var weightKg = ""
    @State private var medicalConditions = ""
    @State private var allergies = ""
    @State private var emergencyContactName = ""
    @State private var emergencyContactPhone = ""
    @State private var emergencyContactRelationship = ""
    
    @FocusState private var focusedField: Field?
    
    enum Field {
        case fullName, heightCm, weightKg, medicalConditions, allergies
        case emergencyContactName, emergencyContactPhone, emergencyContactRelationship
    }
    
    let genderOptions = [
        ("male", "MALE"),
        ("female", "FEMALE"),
        ("other", "OTHER"),
        ("prefer_not_to_say", "PREFER NOT TO SAY")
    ]
    
    var isFormValid: Bool {
        !fullName.isEmpty
    }
    
    var body: some View {
        ZStack {
            Color.appBackground.ignoresSafeArea()
            
            ScrollView {
                VStack(spacing: AppTheme.Spacing.xl) {
                    VStack(spacing: AppTheme.Spacing.md) {
                        Text("COMPLETE YOUR PROFILE")
                            .font(.system(size: 28, weight: .light))
                            .foregroundColor(.textPrimary)
                            .tracking(2)
                        
                        Text("REQUIRED TO ACCESS THE APP")
                            .font(.system(size: 10, weight: .regular))
                            .foregroundColor(.textSecondary)
                            .tracking(1.5)
                    }
                    .padding(.top, AppTheme.Spacing.xl)
                    
                    VStack(alignment: .leading, spacing: AppTheme.Spacing.lg) {
                        Text("BASIC INFORMATION")
                            .font(.system(size: 12, weight: .regular))
                            .foregroundColor(.textPrimary)
                            .tracking(1.5)
                        
                        VStack(alignment: .leading, spacing: AppTheme.Spacing.xs) {
                            HStack {
                                Text("FULL NAME")
                                    .font(.system(size: 10, weight: .regular))
                                    .foregroundColor(.textSecondary)
                                    .tracking(1.5)
                                
                                Text("*")
                                    .font(.system(size: 10, weight: .regular))
                                    .foregroundColor(.error)
                            }
                            
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
                        
                        VStack(alignment: .leading, spacing: AppTheme.Spacing.xs) {
                            HStack {
                                Text("DATE OF BIRTH")
                                    .font(.system(size: 10, weight: .regular))
                                    .foregroundColor(.textSecondary)
                                    .tracking(1.5)
                                
                                Text("*")
                                    .font(.system(size: 10, weight: .regular))
                                    .foregroundColor(.error)
                            }
                            
                            DatePicker("", selection: $dateOfBirth, in: ...Date(), displayedComponents: .date)
                                .datePickerStyle(.compact)
                                .labelsHidden()
                                .padding()
                                .background(Color.white)
                                .overlay(
                                    Rectangle()
                                        .stroke(Color.textPrimary, lineWidth: 2)
                                )
                        }
                        
                        VStack(alignment: .leading, spacing: AppTheme.Spacing.xs) {
                            Text("GENDER")
                                .font(.system(size: 10, weight: .regular))
                                .foregroundColor(.textSecondary)
                                .tracking(1.5)
                            
                            VStack(spacing: 0) {
                                ForEach(genderOptions, id: \.0) { value, label in
                                    Button(action: {
                                        selectedGender = value
                                    }) {
                                        HStack {
                                            Text(label)
                                                .font(.system(size: 13, weight: .regular))
                                                .foregroundColor(.textPrimary)
                                                .tracking(1)
                                            
                                            Spacer()
                                            
                                            if selectedGender == value {
                                                Image(systemName: "checkmark")
                                                    .font(.system(size: 14, weight: .regular))
                                                    .foregroundColor(.appPrimary)
                                            }
                                        }
                                        .padding()
                                        .background(selectedGender == value ? Color.appPrimary.opacity(0.1) : Color.white)
                                    }
                                    
                                    if value != genderOptions.last?.0 {
                                        Rectangle()
                                            .fill(Color.textPrimary)
                                            .frame(height: 2)
                                    }
                                }
                            }
                            .overlay(
                                Rectangle()
                                    .stroke(Color.textPrimary, lineWidth: 2)
                            )
                        }
                        
                        HStack(spacing: AppTheme.Spacing.md) {
                            VStack(alignment: .leading, spacing: AppTheme.Spacing.xs) {
                                Text("HEIGHT (CM)")
                                    .font(.system(size: 10, weight: .regular))
                                    .foregroundColor(.textSecondary)
                                    .tracking(1.5)
                                
                                TextField("", text: $heightCm)
                                    .keyboardType(.decimalPad)
                                    .focused($focusedField, equals: .heightCm)
                                    .padding()
                                    .background(Color.white)
                                    .overlay(
                                        Rectangle()
                                            .stroke(Color.textPrimary, lineWidth: 2)
                                    )
                            }
                            
                            VStack(alignment: .leading, spacing: AppTheme.Spacing.xs) {
                                Text("WEIGHT (KG)")
                                    .font(.system(size: 10, weight: .regular))
                                    .foregroundColor(.textSecondary)
                                    .tracking(1.5)
                                
                                TextField("", text: $weightKg)
                                    .keyboardType(.decimalPad)
                                    .focused($focusedField, equals: .weightKg)
                                    .padding()
                                    .background(Color.white)
                                    .overlay(
                                        Rectangle()
                                            .stroke(Color.textPrimary, lineWidth: 2)
                                    )
                            }
                        }
                    }
                    .padding(.horizontal, AppTheme.Spacing.xl)
                    
                    VStack(alignment: .leading, spacing: AppTheme.Spacing.lg) {
                        Text("MEDICAL HISTORY")
                            .font(.system(size: 12, weight: .regular))
                            .foregroundColor(.textPrimary)
                            .tracking(1.5)
                        
                        VStack(alignment: .leading, spacing: AppTheme.Spacing.xs) {
                            Text("MEDICAL CONDITIONS")
                                .font(.system(size: 10, weight: .regular))
                                .foregroundColor(.textSecondary)
                                .tracking(1.5)
                            
                            TextField("Separate with commas", text: $medicalConditions)
                                .focused($focusedField, equals: .medicalConditions)
                                .padding()
                                .background(Color.white)
                                .overlay(
                                    Rectangle()
                                        .stroke(Color.textPrimary, lineWidth: 2)
                                )
                        }
                        
                        VStack(alignment: .leading, spacing: AppTheme.Spacing.xs) {
                            Text("ALLERGIES")
                                .font(.system(size: 10, weight: .regular))
                                .foregroundColor(.textSecondary)
                                .tracking(1.5)
                            
                            TextField("Separate with commas", text: $allergies)
                                .focused($focusedField, equals: .allergies)
                                .padding()
                                .background(Color.white)
                                .overlay(
                                    Rectangle()
                                        .stroke(Color.textPrimary, lineWidth: 2)
                                )
                        }
                    }
                    .padding(.horizontal, AppTheme.Spacing.xl)
                    
                    VStack(alignment: .leading, spacing: AppTheme.Spacing.lg) {
                        Text("EMERGENCY CONTACT")
                            .font(.system(size: 12, weight: .regular))
                            .foregroundColor(.textPrimary)
                            .tracking(1.5)
                        
                        VStack(alignment: .leading, spacing: AppTheme.Spacing.xs) {
                            Text("NAME")
                                .font(.system(size: 10, weight: .regular))
                                .foregroundColor(.textSecondary)
                                .tracking(1.5)
                            
                            TextField("", text: $emergencyContactName)
                                .textContentType(.name)
                                .autocapitalization(.words)
                                .focused($focusedField, equals: .emergencyContactName)
                                .padding()
                                .background(Color.white)
                                .overlay(
                                    Rectangle()
                                        .stroke(Color.textPrimary, lineWidth: 2)
                                )
                        }
                        
                        VStack(alignment: .leading, spacing: AppTheme.Spacing.xs) {
                            Text("PHONE NUMBER")
                                .font(.system(size: 10, weight: .regular))
                                .foregroundColor(.textSecondary)
                                .tracking(1.5)
                            
                            TextField("", text: $emergencyContactPhone)
                                .textContentType(.telephoneNumber)
                                .keyboardType(.phonePad)
                                .focused($focusedField, equals: .emergencyContactPhone)
                                .padding()
                                .background(Color.white)
                                .overlay(
                                    Rectangle()
                                        .stroke(Color.textPrimary, lineWidth: 2)
                                )
                        }
                        
                        VStack(alignment: .leading, spacing: AppTheme.Spacing.xs) {
                            Text("RELATIONSHIP")
                                .font(.system(size: 10, weight: .regular))
                                .foregroundColor(.textSecondary)
                                .tracking(1.5)
                            
                            TextField("", text: $emergencyContactRelationship)
                                .focused($focusedField, equals: .emergencyContactRelationship)
                                .padding()
                                .background(Color.white)
                                .overlay(
                                    Rectangle()
                                        .stroke(Color.textPrimary, lineWidth: 2)
                                )
                        }
                    }
                    .padding(.horizontal, AppTheme.Spacing.xl)
                    
                    Button(action: {
                        Task {
                            let success = await viewModel.createPatientProfile(
                                fullName: fullName,
                                dateOfBirth: dateOfBirth,
                                gender: selectedGender != "prefer_not_to_say" ? selectedGender : nil,
                                heightCm: Double(heightCm),
                                weightKg: Double(weightKg),
                                medicalConditions: medicalConditions.split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces) },
                                allergies: allergies.split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces) },
                                emergencyContactName: emergencyContactName.isEmpty ? nil : emergencyContactName,
                                emergencyContactPhone: emergencyContactPhone.isEmpty ? nil : emergencyContactPhone,
                                emergencyContactRelationship: emergencyContactRelationship.isEmpty ? nil : emergencyContactRelationship
                            )
                        }
                    }) {
                        Text("COMPLETE SETUP")
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
                    .padding(.horizontal, AppTheme.Spacing.xl)
                    
                    if let errorMessage = viewModel.errorMessage {
                        Text(errorMessage)
                            .font(.system(size: 11, weight: .regular))
                            .foregroundColor(.error)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, AppTheme.Spacing.xl)
                    }
                    
                    Text("* REQUIRED FIELDS")
                        .font(.system(size: 9, weight: .regular))
                        .foregroundColor(.textSecondary)
                        .tracking(1)
                    
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
    }
}

#Preview {
    ProfileSetupView(viewModel: AuthViewModel(
        authService: AuthService(),
        supabaseService: SupabaseService()
    ))
}
