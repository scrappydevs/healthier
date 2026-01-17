# Add LiveKit SDK to Xcode Project

## Steps to Add the Dependency:

1. Open Xcode project: `nexhacks-ios.xcodeproj`

2. Go to **File → Add Package Dependencies...**

3. Enter this URL in the search field:
   ```
   https://github.com/livekit/client-sdk-swift
   ```

4. Select the latest version (or specific version):
   - Dependency Rule: **Up to Next Major Version**
   - Version: **2.0.0** or latest

5. Click **Add Package**

6. In the dialog, select these products to add:
   - ✅ **LiveKit** (main SDK)

7. Make sure it's added to the **nexhacks-ios** target

8. Click **Add Package**

## Alternative: Command Line (if SPM is configured)

If you have Package.swift, add this to dependencies:

```swift
.package(url: "https://github.com/livekit/client-sdk-swift", from: "2.0.0")
```

## Verify Installation

After adding, you should see:
- **Package Dependencies** section in Xcode project navigator
- `LiveKit` listed there
- No import errors in `LiveKitService.swift`

## Then Rebuild

```bash
# Clean build folder
Cmd + Shift + K

# Rebuild
Cmd + B
```

The errors should be resolved after adding the LiveKit SDK!
