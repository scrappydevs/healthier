//
//  MedicationTabView.swift
//  nexhacks-ios
//
//  Container view for the Pills tab with sub-navigation between Schedule, Medications, and Analytics
//

import SwiftUI

struct MedicationTabView: View {
    @ObservedObject var viewModel: MedicationViewModel
    @State private var showingAddMedication = false
    @State private var showingScanMedication = false
    @State private var selectedMedication: Medication?
    @State private var showingHistory = false
    @State private var showingAnalytics = false
    @State private var showingVoiceAssistant = false

    var body: some View {
        NavigationView {
            ZStack {
                VStack(spacing: 0) {
                    MedicationScheduleView(viewModel: viewModel)
                }
                .background(Color.appBackground)
                .navigationBarHidden(true)
                
                // Floating action buttons
                VStack {
                    Spacer()
                    HStack {
                        // History button
                        Button {
                            showingHistory = true
                        } label: {
                            Image(systemName: "list.bullet.clipboard.fill")
                                .font(.title2)
                                .foregroundColor(.white)
                                .frame(width: 56, height: 56)
                                .background(Color.appPrimary)
                                .clipShape(Circle())
                                .shadow(color: .black.opacity(0.15), radius: 12, x: 0, y: 6)
                        }
                        
                        Spacer()
                        
                        // Voice Assistant button (center, larger)
                        Button {
                            showingVoiceAssistant = true
                        } label: {
                            ZStack {
                                Circle()
                                    .fill(
                                        LinearGradient(
                                            gradient: Gradient(colors: [Color.appPrimary, Color.appAccent]),
                                            startPoint: .topLeading,
                                            endPoint: .bottomTrailing
                                        )
                                    )
                                    .frame(width: 72, height: 72)
                                    .shadow(color: .appPrimary.opacity(0.4), radius: 16, x: 0, y: 8)
                                
                                Image(systemName: "mic.fill")
                                    .font(.title)
                                    .foregroundColor(.white)
                            }
                        }
                        
                        Spacer()
                        
                        // Analytics button
                        Button {
                            showingAnalytics = true
                        } label: {
                            Image(systemName: "chart.bar.fill")
                                .font(.title2)
                                .foregroundColor(.white)
                                .frame(width: 56, height: 56)
                                .background(Color.appPrimary)
                                .clipShape(Circle())
                                .shadow(color: .black.opacity(0.15), radius: 12, x: 0, y: 6)
                        }
                    }
                    .padding(.horizontal, AppTheme.Spacing.lg)
                    .padding(.bottom, AppTheme.Spacing.xl)
                }
            }
            .navigationTitle("")
            .navigationBarTitleDisplayMode(.inline)
            .navigationBarHidden(true)
            .sheet(isPresented: $showingAddMedication) {
                AddMedicationView(viewModel: viewModel)
            }
            .sheet(isPresented: $showingScanMedication) {
                MedicationScanView(viewModel: viewModel)
            }
            .sheet(item: $selectedMedication) { medication in
                MedicationDetailView(viewModel: viewModel, medication: medication)
            }
            .sheet(isPresented: $showingHistory) {
                MedicationHistoryView(viewModel: viewModel)
            }
            .sheet(isPresented: $showingAnalytics) {
                NavigationView {
                    MedicationAnalyticsView(viewModel: viewModel)
                        .navigationTitle("Analytics")
                        .navigationBarTitleDisplayMode(.large)
                        .toolbar {
                            ToolbarItem(placement: .navigationBarTrailing) {
                                Button("Done") {
                                    showingAnalytics = false
                                }
                            }
                        }
                }
            }
            .fullScreenCover(isPresented: $showingVoiceAssistant) {
                VoiceMedicationAssistantView(viewModel: viewModel)
            }
        }
    }
}
