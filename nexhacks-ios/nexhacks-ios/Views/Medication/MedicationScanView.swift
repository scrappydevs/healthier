//
//  MedicationScanView.swift
//  nexhacks-ios
//
//  View for scanning/uploading medication plans and extracting medications
//  Supports photo capture, photo library, and PDF document upload
//

import SwiftUI
import PhotosUI
import UniformTypeIdentifiers
import PDFKit

struct MedicationScanView: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject var viewModel: MedicationViewModel

    @State private var selectedImage: UIImage?
    @State private var selectedPhotoItem: PhotosPickerItem?
    @State private var showCamera = false
    @State private var showPhotoPicker = false
    @State private var showDocumentPicker = false
    @State private var isAnalyzing = false
    @State private var parsedMedications: [ParsedMedication] = []
    @State private var selectedMedications: Set<UUID> = []
    @State private var errorMessage: String?
    @State private var showError = false
    @State private var showSuccess = false
    @State private var pdfPages: [UIImage] = []
    @State private var currentPdfPageIndex = 0
    @State private var uploadType: UploadType = .image

    private let claudeService = ClaudeAPIService()

    enum UploadType {
        case image
        case pdf
    }
    
    var body: some View {
        NavigationView {
            ZStack {
                Color.appBackground.ignoresSafeArea()

                ScrollView {
                    VStack(spacing: AppTheme.Spacing.lg) {
                        if selectedImage == nil && pdfPages.isEmpty {
                            captureOptionsSection
                        } else if !pdfPages.isEmpty {
                            pdfPreviewSection
                        } else {
                            imagePreviewSection
                        }

                        if isAnalyzing {
                            analyzingSection
                        }

                        if !parsedMedications.isEmpty {
                            parsedMedicationsSection
                        }
                    }
                    .padding(AppTheme.Spacing.md)
                }
            }
            .navigationTitle("Scan Medication Plan")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                    .foregroundColor(.appPrimary)
                }
                
                if !parsedMedications.isEmpty && !selectedMedications.isEmpty {
                    ToolbarItem(placement: .navigationBarTrailing) {
                        Button("Add Selected") {
                            addSelectedMedications()
                        }
                        .foregroundColor(.appPrimary)
                        .fontWeight(.semibold)
                    }
                }
            }
            .sheet(isPresented: $showCamera) {
                CameraView(image: $selectedImage)
            }
            .sheet(isPresented: $showDocumentPicker) {
                DocumentPicker(pdfPages: $pdfPages, onPdfLoaded: {
                    uploadType = .pdf
                    Task {
                        await analyzePdf()
                    }
                })
            }
            .photosPicker(isPresented: $showPhotoPicker, selection: $selectedPhotoItem, matching: .images)
            .onChange(of: selectedPhotoItem) { _, newValue in
                Task {
                    if let data = try? await newValue?.loadTransferable(type: Data.self),
                       let uiImage = UIImage(data: data) {
                        uploadType = .image
                        selectedImage = uiImage
                        await analyzeImage()
                    }
                }
            }
            .alert("Error", isPresented: $showError) {
                Button("OK") { }
            } message: {
                Text(errorMessage ?? "An error occurred")
            }
            .alert("Success", isPresented: $showSuccess) {
                Button("OK") {
                    dismiss()
                }
            } message: {
                Text("Medications added successfully!")
            }
        }
    }
    
    // MARK: - Capture Options Section

    private var captureOptionsSection: some View {
        VStack(spacing: AppTheme.Spacing.lg) {
            Image(systemName: "doc.text.viewfinder")
                .font(.system(size: 80))
                .foregroundColor(.appPrimary)

            Text("Scan Your Medication Plan")
                .font(AppTheme.Typography.title2)
                .foregroundColor(.textPrimary)

            Text("Take a photo, upload an image, or select a PDF of your medication plan")
                .font(AppTheme.Typography.body)
                .foregroundColor(.textSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, AppTheme.Spacing.md)

            VStack(spacing: AppTheme.Spacing.md) {
                // Camera button
                Button {
                    showCamera = true
                } label: {
                    HStack {
                        Image(systemName: "camera.fill")
                        Text("Take Photo")
                    }
                    .font(AppTheme.Typography.headline)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, AppTheme.Spacing.md)
                    .background(Color.appPrimary)
                    .cornerRadius(AppTheme.CornerRadius.md)
                }

                // Photo library button
                Button {
                    showPhotoPicker = true
                } label: {
                    HStack {
                        Image(systemName: "photo.on.rectangle")
                        Text("Choose from Library")
                    }
                    .font(AppTheme.Typography.headline)
                    .foregroundColor(.appPrimary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, AppTheme.Spacing.md)
                    .background(Color.cardBackground)
                    .overlay(
                        RoundedRectangle(cornerRadius: AppTheme.CornerRadius.md)
                            .stroke(Color.appPrimary, lineWidth: 2)
                    )
                    .cornerRadius(AppTheme.CornerRadius.md)
                }

                // PDF document button
                Button {
                    showDocumentPicker = true
                } label: {
                    HStack {
                        Image(systemName: "doc.fill")
                        Text("Upload PDF Document")
                    }
                    .font(AppTheme.Typography.headline)
                    .foregroundColor(.appPrimary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, AppTheme.Spacing.md)
                    .background(Color.cardBackground)
                    .overlay(
                        RoundedRectangle(cornerRadius: AppTheme.CornerRadius.md)
                            .stroke(Color.appPrimary, lineWidth: 2)
                    )
                    .cornerRadius(AppTheme.CornerRadius.md)
                }
            }
            .padding(.top, AppTheme.Spacing.lg)
        }
        .padding(AppTheme.Spacing.xl)
    }
    
    // MARK: - Image Preview Section
    
    private var imagePreviewSection: some View {
        VStack(spacing: AppTheme.Spacing.md) {
            if let image = selectedImage {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFit()
                    .frame(maxHeight: 200)
                    .cornerRadius(AppTheme.CornerRadius.md)
                    .overlay(
                        RoundedRectangle(cornerRadius: AppTheme.CornerRadius.md)
                            .stroke(Color.divider, lineWidth: 1)
                    )
            }
            
            HStack(spacing: AppTheme.Spacing.md) {
                Button {
                    selectedImage = nil
                    parsedMedications = []
                    selectedMedications = []
                } label: {
                    HStack {
                        Image(systemName: "arrow.counterclockwise")
                        Text("Retake")
                    }
                    .font(AppTheme.Typography.callout)
                    .foregroundColor(.textSecondary)
                }
                
                if !isAnalyzing && parsedMedications.isEmpty {
                    Button {
                        Task {
                            await analyzeImage()
                        }
                    } label: {
                        HStack {
                            Image(systemName: "wand.and.stars")
                            Text("Analyze")
                        }
                        .font(AppTheme.Typography.headline)
                        .foregroundColor(.white)
                        .padding(.horizontal, AppTheme.Spacing.lg)
                        .padding(.vertical, AppTheme.Spacing.sm)
                        .background(Color.appPrimary)
                        .cornerRadius(AppTheme.CornerRadius.sm)
                    }
                }
            }
        }
        .padding(AppTheme.Spacing.md)
        .background(Color.cardBackground)
        .cornerRadius(AppTheme.CornerRadius.md)
    }
    
    // MARK: - PDF Preview Section

    private var pdfPreviewSection: some View {
        VStack(spacing: AppTheme.Spacing.md) {
            // Page indicator
            Text("Page \(currentPdfPageIndex + 1) of \(pdfPages.count)")
                .font(AppTheme.Typography.caption)
                .foregroundColor(.textSecondary)

            // PDF page preview
            if currentPdfPageIndex < pdfPages.count {
                Image(uiImage: pdfPages[currentPdfPageIndex])
                    .resizable()
                    .scaledToFit()
                    .frame(maxHeight: 250)
                    .cornerRadius(AppTheme.CornerRadius.md)
                    .overlay(
                        RoundedRectangle(cornerRadius: AppTheme.CornerRadius.md)
                            .stroke(Color.divider, lineWidth: 1)
                    )
            }

            // Page navigation
            if pdfPages.count > 1 {
                HStack(spacing: AppTheme.Spacing.lg) {
                    Button {
                        if currentPdfPageIndex > 0 {
                            currentPdfPageIndex -= 1
                        }
                    } label: {
                        Image(systemName: "chevron.left.circle.fill")
                            .font(.title)
                            .foregroundColor(currentPdfPageIndex > 0 ? .appPrimary : .textSecondary)
                    }
                    .disabled(currentPdfPageIndex == 0)

                    // Page dots
                    HStack(spacing: AppTheme.Spacing.xs) {
                        ForEach(0..<min(pdfPages.count, 5), id: \.self) { index in
                            Circle()
                                .fill(index == currentPdfPageIndex ? Color.appPrimary : Color.textSecondary.opacity(0.3))
                                .frame(width: 8, height: 8)
                        }
                        if pdfPages.count > 5 {
                            Text("...")
                                .font(AppTheme.Typography.caption)
                                .foregroundColor(.textSecondary)
                        }
                    }

                    Button {
                        if currentPdfPageIndex < pdfPages.count - 1 {
                            currentPdfPageIndex += 1
                        }
                    } label: {
                        Image(systemName: "chevron.right.circle.fill")
                            .font(.title)
                            .foregroundColor(currentPdfPageIndex < pdfPages.count - 1 ? .appPrimary : .textSecondary)
                    }
                    .disabled(currentPdfPageIndex >= pdfPages.count - 1)
                }
            }

            // Actions
            HStack(spacing: AppTheme.Spacing.md) {
                Button {
                    pdfPages = []
                    currentPdfPageIndex = 0
                    parsedMedications = []
                    selectedMedications = []
                } label: {
                    HStack {
                        Image(systemName: "arrow.counterclockwise")
                        Text("Remove")
                    }
                    .font(AppTheme.Typography.callout)
                    .foregroundColor(.textSecondary)
                }

                if !isAnalyzing && parsedMedications.isEmpty {
                    Button {
                        Task {
                            await analyzePdf()
                        }
                    } label: {
                        HStack {
                            Image(systemName: "wand.and.stars")
                            Text("Analyze All Pages")
                        }
                        .font(AppTheme.Typography.headline)
                        .foregroundColor(.white)
                        .padding(.horizontal, AppTheme.Spacing.lg)
                        .padding(.vertical, AppTheme.Spacing.sm)
                        .background(Color.appPrimary)
                        .cornerRadius(AppTheme.CornerRadius.sm)
                    }
                }
            }
        }
        .padding(AppTheme.Spacing.md)
        .background(Color.cardBackground)
        .cornerRadius(AppTheme.CornerRadius.md)
    }

    // MARK: - Analyzing Section

    private var analyzingSection: some View {
        VStack(spacing: AppTheme.Spacing.md) {
            ProgressView()
                .scaleEffect(1.5)

            Text(uploadType == .pdf ? "Analyzing your PDF document..." : "Analyzing your medication plan...")
                .font(AppTheme.Typography.headline)
                .foregroundColor(.textPrimary)

            Text(uploadType == .pdf ? "Processing \(pdfPages.count) page(s)" : "This may take a few seconds")
                .font(AppTheme.Typography.subheadline)
                .foregroundColor(.textSecondary)
        }
        .padding(AppTheme.Spacing.xl)
        .frame(maxWidth: .infinity)
        .background(Color.cardBackground)
        .cornerRadius(AppTheme.CornerRadius.md)
    }
    
    // MARK: - Parsed Medications Section
    
    private var parsedMedicationsSection: some View {
        VStack(alignment: .leading, spacing: AppTheme.Spacing.md) {
            HStack {
                Text("Found Medications")
                    .font(AppTheme.Typography.headline)
                    .foregroundColor(.textPrimary)
                
                Spacer()
                
                Button {
                    if selectedMedications.count == parsedMedications.count {
                        selectedMedications = []
                    } else {
                        selectedMedications = Set(parsedMedications.map { $0.id })
                    }
                } label: {
                    Text(selectedMedications.count == parsedMedications.count ? "Deselect All" : "Select All")
                        .font(AppTheme.Typography.callout)
                        .foregroundColor(.appPrimary)
                }
            }
            
            ForEach(parsedMedications) { medication in
                ParsedMedicationCard(
                    medication: medication,
                    isSelected: selectedMedications.contains(medication.id),
                    isDuplicate: isDuplicate(medication),
                    onToggle: {
                        if selectedMedications.contains(medication.id) {
                            selectedMedications.remove(medication.id)
                        } else {
                            selectedMedications.insert(medication.id)
                        }
                    }
                )
            }
            
            if !selectedMedications.isEmpty {
                Text("\(selectedMedications.count) medication(s) selected")
                    .font(AppTheme.Typography.caption)
                    .foregroundColor(.textSecondary)
            }
        }
    }
    
    // MARK: - Methods
    
    private func analyzeImage() async {
        guard let image = selectedImage,
              let imageData = image.jpegData(compressionQuality: 0.8) else {
            return
        }

        isAnalyzing = true
        parsedMedications = []
        selectedMedications = []

        do {
            let medications = try await claudeService.analyzeMedicationPlan(imageData: imageData)
            parsedMedications = medications

            // Auto-select non-duplicate medications
            for medication in medications {
                if !isDuplicate(medication) {
                    selectedMedications.insert(medication.id)
                }
            }
        } catch {
            errorMessage = error.localizedDescription
            showError = true
        }

        isAnalyzing = false
    }

    private func analyzePdf() async {
        guard !pdfPages.isEmpty else { return }

        isAnalyzing = true
        parsedMedications = []
        selectedMedications = []

        do {
            // Convert all PDF pages to image data
            var allMedications: [ParsedMedication] = []
            var seenMedications: Set<String> = []

            for page in pdfPages {
                guard let imageData = page.jpegData(compressionQuality: 0.8) else { continue }

                let medications = try await claudeService.analyzeMedicationPlan(imageData: imageData)

                // Deduplicate across pages
                for medication in medications {
                    let timeKey = normalizedTimeKey(from: medication.times)
                    let key = "\(medication.name.lowercased())-\(medication.dosage.lowercased())-\(timeKey)"
                    if !seenMedications.contains(key) {
                        seenMedications.insert(key)
                        allMedications.append(medication)
                    }
                }
            }

            parsedMedications = allMedications

            // Auto-select non-duplicate medications
            for medication in allMedications {
                if !isDuplicate(medication) {
                    selectedMedications.insert(medication.id)
                }
            }
        } catch {
            errorMessage = error.localizedDescription
            showError = true
        }

        isAnalyzing = false
    }
    
    private func isDuplicate(_ parsed: ParsedMedication) -> Bool {
        let parsedTimeKey = normalizedTimeKey(from: parsed.times)
        return viewModel.medications.contains { existing in
            existing.name.lowercased() == parsed.name.lowercased() &&
            existing.dosage.lowercased() == parsed.dosage.lowercased() &&
            normalizedTimeKey(from: existing.reminderTimes) == parsedTimeKey
        }
    }
    
    private func addSelectedMedications() {
        for parsed in parsedMedications where selectedMedications.contains(parsed.id) {
            let medication = Medication(
                name: parsed.name,
                dosage: parsed.dosage,
                frequency: parseFrequency(parsed.frequency),
                form: parseForm(parsed.form),
                instructions: parsed.instructions,
                reminderTimes: parseTimes(parsed.times),
                pillDescription: parsed.pillDescription
            )
            viewModel.addMedication(medication)
        }
        showSuccess = true
    }
    
    private func parseFrequency(_ string: String) -> MedicationFrequency {
        let lower = string.lowercased()
        if lower.contains("twice") || lower.contains("2") {
            return .twiceDaily
        } else if lower.contains("three") || lower.contains("3") {
            return .threeTimesDaily
        } else if lower.contains("weekly") {
            return .weekly
        } else if lower.contains("needed") {
            return .asNeeded
        } else if lower.contains("daily") || lower.contains("once") {
            return .daily
        }
        return .custom
    }
    
    private func parseForm(_ string: String) -> MedicationForm {
        let lower = string.lowercased()
        if lower.contains("capsule") { return .capsule }
        if lower.contains("liquid") { return .liquid }
        if lower.contains("injection") { return .injection }
        if lower.contains("topical") { return .topical }
        if lower.contains("inhaler") { return .inhaler }
        if lower.contains("drops") { return .drops }
        if lower.contains("patch") { return .patch }
        return .tablet
    }
    
    private func parseTimes(_ times: [String]) -> [Date] {
        let formatter = DateFormatter()
        formatter.dateFormat = "h:mm a"
        
        return times.compactMap { timeString in
            if let date = formatter.date(from: timeString) {
                // Set to today's date with the parsed time
                let calendar = Calendar.current
                let components = calendar.dateComponents([.hour, .minute], from: date)
                return calendar.date(bySettingHour: components.hour ?? 8,
                                    minute: components.minute ?? 0,
                                    second: 0,
                                    of: Date())
            }
            return nil
        }
    }

    private func normalizedTimeKey(from times: [String]) -> String {
        let parsed = parseTimeStrings(times)
        return parsed.sorted().joined(separator: "|")
    }

    private func normalizedTimeKey(from reminderTimes: [Date]) -> String {
        guard !reminderTimes.isEmpty else { return "" }
        let formatter = DateFormatter()
        formatter.dateFormat = "HH:mm"
        formatter.locale = Locale(identifier: "en_US_POSIX")
        let normalized = reminderTimes.map { formatter.string(from: $0) }
        return normalized.sorted().joined(separator: "|")
    }

    private func parseTimeStrings(_ times: [String]) -> [String] {
        guard !times.isEmpty else { return [] }
        let primaryFormatter = DateFormatter()
        primaryFormatter.dateFormat = "h:mm a"
        primaryFormatter.locale = Locale(identifier: "en_US_POSIX")

        let fallbackFormatter = DateFormatter()
        fallbackFormatter.dateFormat = "H:mm"
        fallbackFormatter.locale = Locale(identifier: "en_US_POSIX")

        let outputFormatter = DateFormatter()
        outputFormatter.dateFormat = "HH:mm"
        outputFormatter.locale = Locale(identifier: "en_US_POSIX")

        var normalized: [String] = []
        for time in times {
            if let date = primaryFormatter.date(from: time) ?? fallbackFormatter.date(from: time) {
                normalized.append(outputFormatter.string(from: date))
            }
        }
        return normalized
    }
}

// MARK: - Parsed Medication Card

struct ParsedMedicationCard: View {
    let medication: ParsedMedication
    let isSelected: Bool
    let isDuplicate: Bool
    let onToggle: () -> Void
    
    var body: some View {
        HStack(alignment: .top, spacing: AppTheme.Spacing.md) {
            Button(action: onToggle) {
                Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                    .font(.title2)
                    .foregroundColor(isSelected ? .appPrimary : .textSecondary)
            }
            .disabled(isDuplicate)
            
            VStack(alignment: .leading, spacing: AppTheme.Spacing.xs) {
                HStack {
                    Text(medication.name)
                        .font(AppTheme.Typography.headline)
                        .foregroundColor(.textPrimary)
                    
                    if isDuplicate {
                        Text("Duplicate")
                            .font(AppTheme.Typography.caption)
                            .foregroundColor(.white)
                            .padding(.horizontal, AppTheme.Spacing.sm)
                            .padding(.vertical, 2)
                            .background(Color.warning)
                            .cornerRadius(AppTheme.CornerRadius.sm)
                    }
                }
                
                Text(medication.dosage)
                    .font(AppTheme.Typography.subheadline)
                    .foregroundColor(.textSecondary)
                
                HStack(spacing: AppTheme.Spacing.md) {
                    Label(medication.frequency, systemImage: "clock")
                    Label(medication.form, systemImage: "pills")
                }
                .font(AppTheme.Typography.caption)
                .foregroundColor(.textSecondary)
                
                if let instructions = medication.instructions {
                    Text(instructions)
                        .font(AppTheme.Typography.caption)
                        .foregroundColor(.textSecondary)
                        .italic()
                }
                
                if !medication.times.isEmpty {
                    HStack {
                        Image(systemName: "bell.fill")
                            .foregroundColor(.appAccent)
                        Text(medication.times.joined(separator: ", "))
                    }
                    .font(AppTheme.Typography.caption)
                    .foregroundColor(.appAccent)
                }
            }
            
            Spacer()
        }
        .padding(AppTheme.Spacing.md)
        .background(isDuplicate ? Color.warning.opacity(0.1) : Color.cardBackground)
        .cornerRadius(AppTheme.CornerRadius.md)
        .overlay(
            RoundedRectangle(cornerRadius: AppTheme.CornerRadius.md)
                .stroke(isSelected ? Color.appPrimary : Color.divider, lineWidth: isSelected ? 2 : 1)
        )
    }
}

// MARK: - Camera View

struct CameraView: UIViewControllerRepresentable {
    @Binding var image: UIImage?
    @Environment(\.dismiss) private var dismiss

    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.sourceType = .camera
        picker.delegate = context.coordinator
        return picker
    }

    func updateUIViewController(_ uiViewController: UIImagePickerController, context: Context) {}

    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        let parent: CameraView

        init(_ parent: CameraView) {
            self.parent = parent
        }

        func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]) {
            if let image = info[.originalImage] as? UIImage {
                parent.image = image
            }
            parent.dismiss()
        }

        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
            parent.dismiss()
        }
    }
}

// MARK: - Document Picker (PDF)

struct DocumentPicker: UIViewControllerRepresentable {
    @Binding var pdfPages: [UIImage]
    var onPdfLoaded: () -> Void
    @Environment(\.dismiss) private var dismiss

    func makeUIViewController(context: Context) -> UIDocumentPickerViewController {
        let picker = UIDocumentPickerViewController(forOpeningContentTypes: [UTType.pdf])
        picker.delegate = context.coordinator
        picker.allowsMultipleSelection = false
        return picker
    }

    func updateUIViewController(_ uiViewController: UIDocumentPickerViewController, context: Context) {}

    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    class Coordinator: NSObject, UIDocumentPickerDelegate {
        let parent: DocumentPicker

        init(_ parent: DocumentPicker) {
            self.parent = parent
        }

        func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
            guard let url = urls.first else {
                parent.dismiss()
                return
            }

            // Start accessing security-scoped resource
            guard url.startAccessingSecurityScopedResource() else {
                parent.dismiss()
                return
            }

            defer {
                url.stopAccessingSecurityScopedResource()
            }

            // Load PDF and convert pages to images
            guard let pdfDocument = PDFDocument(url: url) else {
                parent.dismiss()
                return
            }

            var images: [UIImage] = []
            let pageCount = pdfDocument.pageCount

            // Convert each page to an image
            for pageIndex in 0..<pageCount {
                guard let page = pdfDocument.page(at: pageIndex) else { continue }

                let pageRect = page.bounds(for: .mediaBox)
                let scale: CGFloat = 2.0 // Higher quality rendering

                let renderer = UIGraphicsImageRenderer(size: CGSize(
                    width: pageRect.width * scale,
                    height: pageRect.height * scale
                ))

                let image = renderer.image { ctx in
                    UIColor.white.setFill()
                    ctx.fill(CGRect(origin: .zero, size: CGSize(
                        width: pageRect.width * scale,
                        height: pageRect.height * scale
                    )))

                    ctx.cgContext.translateBy(x: 0, y: pageRect.height * scale)
                    ctx.cgContext.scaleBy(x: scale, y: -scale)

                    page.draw(with: .mediaBox, to: ctx.cgContext)
                }

                images.append(image)
            }

            parent.pdfPages = images
            parent.dismiss()
            parent.onPdfLoaded()
        }

        func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) {
            parent.dismiss()
        }
    }
}
