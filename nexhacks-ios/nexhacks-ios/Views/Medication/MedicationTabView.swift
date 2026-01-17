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
    @State private var showingAnalytics = false

    var body: some View {
        NavigationView {
            ZStack {
                VStack(spacing: 0) {
                    MedicationScheduleView(viewModel: viewModel)
                }
                .background(Color.appBackground)
                .navigationBarHidden(true)
                
                // Floating action button for analytics
                VStack {
                    Spacer()
                    HStack {
                        Spacer()
                        
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
                        .padding(.trailing, AppTheme.Spacing.lg)
                        .padding(.bottom, AppTheme.Spacing.xl)
                    }
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
        }
    }
}

