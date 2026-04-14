import AppKit
import ApplicationServices
import Foundation
import Network

public struct AppConfig {
    public static let host = NWEndpoint.Host("127.0.0.1")
    public static let port = NWEndpoint.Port(rawValue: 31973)!
    public static let targetAppName = "Ableton Live 12 Suite"
    public static let targetBundleIdentifier = "com.ableton.live"
}

public struct SaveAsRequest: Codable, Equatable {
    public let targetPath: String
    public let activateLive: Bool?
    public let timeoutMs: Int?

    public init(targetPath: String, activateLive: Bool? = nil, timeoutMs: Int? = nil) {
        self.targetPath = targetPath
        self.activateLive = activateLive
        self.timeoutMs = timeoutMs
    }
}

public struct SimpleSaveRequest: Codable, Equatable {
    public let activateLive: Bool?

    public init(activateLive: Bool? = nil) {
        self.activateLive = activateLive
    }
}

public struct JSONResponse: Codable, Equatable {
    public let ok: Bool
    public let service: String
    public let targetApp: String
    public let accessibilityTrusted: Bool?
    public let liveRunning: Bool?
    public let liveFrontmost: Bool?
    public let targetPath: String?
    public let mode: String?
    public let notes: [String]?
    public let error: String?
    public let filePath: String?
    public let fileSize: Int64?
    public let fileCreated: Bool?
    public let dialogClosed: Bool?

    public init(
        ok: Bool,
        service: String,
        targetApp: String,
        accessibilityTrusted: Bool?,
        liveRunning: Bool?,
        liveFrontmost: Bool?,
        targetPath: String?,
        mode: String?,
        notes: [String]?,
        error: String?,
        filePath: String? = nil,
        fileSize: Int64? = nil,
        fileCreated: Bool? = nil,
        dialogClosed: Bool? = nil
    ) {
        self.ok = ok
        self.service = service
        self.targetApp = targetApp
        self.accessibilityTrusted = accessibilityTrusted
        self.liveRunning = liveRunning
        self.liveFrontmost = liveFrontmost
        self.targetPath = targetPath
        self.mode = mode
        self.notes = notes
        self.error = error
        self.filePath = filePath
        self.fileSize = fileSize
        self.fileCreated = fileCreated
        self.dialogClosed = dialogClosed
    }
}

public struct HTTPResponse {
    public let status: Int
    public let body: JSONResponse

    public init(status: Int, body: JSONResponse) {
        self.status = status
        self.body = body
    }
}

public protocol BridgeStateProtocol {
    func accessibilityTrusted() -> Bool
    func runningLiveApp() -> NSRunningApplication?
    func isLiveFrontmost() -> Bool
    @discardableResult func activateLive() -> Bool
}

public final class BridgeState: BridgeStateProtocol {
    public init() {}

    public func accessibilityTrusted() -> Bool {
        AXIsProcessTrusted()
    }

    public func runningLiveApp() -> NSRunningApplication? {
        // Try NSWorkspace first
        if let app = NSWorkspace.shared.runningApplications.first(where: { 
            app in
            app.localizedName == AppConfig.targetAppName || app.bundleIdentifier == AppConfig.targetBundleIdentifier
        }) {
            return app
        }
        
        // Fallback: try to find by bundle ID with partial match
        if let app = NSWorkspace.shared.runningApplications.first(where: {
            $0.bundleIdentifier?.contains("ableton") == true
        }) {
            return app
        }
        
        // Fallback: try to find by localizedName containing "Live"
        if let app = NSWorkspace.shared.runningApplications.first(where: {
            $0.localizedName?.contains("Live") == true
        }) {
            return app
        }
        
        // Last resort: use NSRunningApplication with bundle identifier
        return NSRunningApplication.runningApplications(withBundleIdentifier: AppConfig.targetBundleIdentifier).first
    }

    public func isLiveFrontmost() -> Bool {
        NSWorkspace.shared.frontmostApplication?.processIdentifier == runningLiveApp()?.processIdentifier
    }

    @discardableResult
    public func activateLive() -> Bool {
        guard let app = runningLiveApp() else { return false }
        return app.activate()
    }
}

public struct SaveAsTarget: Equatable {
    public let fullPath: String
    public let directory: String
    public let fileName: String

    public init(fullPath: String, directory: String, fileName: String) {
        self.fullPath = fullPath
        self.directory = directory
        self.fileName = fileName
    }
}

public struct SaveDialogState: Equatable {
    public let detected: Bool
    public let method: String
    public let windowTitle: String?
    public let supportsSameFolderRename: Bool
    public let notes: [String]

    public init(detected: Bool, method: String, windowTitle: String?, supportsSameFolderRename: Bool, notes: [String]) {
        self.detected = detected
        self.method = method
        self.windowTitle = windowTitle
        self.supportsSameFolderRename = supportsSameFolderRename
        self.notes = notes
    }
}

public struct SaveAsAutomationResult: Equatable {
    public let ok: Bool
    public let mode: String
    public let error: String?
    public let notes: [String]
    public let filePath: String?
    public let fileSize: Int64?
    public let fileCreated: Bool?
    public let dialogClosed: Bool?

    public init(
        ok: Bool,
        mode: String,
        error: String?,
        notes: [String],
        filePath: String? = nil,
        fileSize: Int64? = nil,
        fileCreated: Bool? = nil,
        dialogClosed: Bool? = nil
    ) {
        self.ok = ok
        self.mode = mode
        self.error = error
        self.notes = notes
        self.filePath = filePath
        self.fileSize = fileSize
        self.fileCreated = fileCreated
        self.dialogClosed = dialogClosed
    }
}

public protocol SaveDialogAutomationProtocol {
    func performSaveAs(target: SaveAsTarget, timeoutMs: Int) -> SaveAsAutomationResult
    func performSimpleSave(activateLive: Bool) -> SaveAsAutomationResult
}

public final class SaveDialogAutomation: SaveDialogAutomationProtocol {
    private let inspector: SaveDialogInspecting
    private let fileManager: FileManager

    public init(inspector: SaveDialogInspecting = AXSaveDialogInspector(), fileManager: FileManager = .default) {
        self.inspector = inspector
        self.fileManager = fileManager
    }

    public func performSimpleSave(activateLive: Bool) -> SaveAsAutomationResult {
        var notes: [String] = []

        // Activate Live if requested
        if activateLive {
            guard let live = NSWorkspace.shared.runningApplications.first(where: {
                $0.localizedName == AppConfig.targetAppName || $0.bundleIdentifier == AppConfig.targetBundleIdentifier
            }) else {
                notes.append("Ableton Live is not running.")
                return SaveAsAutomationResult(ok: false, mode: "simple_save", error: "live_not_running", notes: notes)
            }
            live.activate()
            Thread.sleep(forTimeInterval: 0.1)
            notes.append("Activated Ableton Live.")
        }

        // Send Cmd+S keystroke to trigger simple save
        let script = """
        tell application "System Events"
            keystroke "s" using command down
        end tell
        """

        var errorInfo: NSDictionary?
        if let appleScript = NSAppleScript(source: script) {
            appleScript.executeAndReturnError(&errorInfo)
            if errorInfo == nil {
                notes.append("Sent Cmd+S keystroke for simple save.")
                return SaveAsAutomationResult(ok: true, mode: "simple_save", error: nil, notes: notes)
            }
            let errorMessage = errorInfo?["NSAppleScriptErrorMessage"] as? String ?? "Unknown error"
            notes.append("AppleScript error: \(errorMessage)")
        }

        // Fallback to CGEvent if AppleScript fails
        let source = CGEventSource(stateID: .combinedSessionState)
        let keyDown = CGEvent(keyboardEventSource: source, virtualKey: 0x01, keyDown: true) // 's' key
        let keyUp = CGEvent(keyboardEventSource: source, virtualKey: 0x01, keyDown: false)

        keyDown?.flags = .maskCommand
        keyUp?.flags = .maskCommand

        keyDown?.post(tap: .cghidEventTap)
        keyUp?.post(tap: .cghidEventTap)

        notes.append("Sent Cmd+S keystroke via CGEvent for simple save.")
        return SaveAsAutomationResult(ok: true, mode: "simple_save", error: nil, notes: notes)
    }

    public func performSaveAs(target: SaveAsTarget, timeoutMs: Int) -> SaveAsAutomationResult {
        // Step 1: Trigger the menu to open the save dialog
        let menuResult = triggerSaveAsMenu()
        var notes: [String] = menuResult.notes

        if !menuResult.success {
            return SaveAsAutomationResult(ok: false, mode: "menu_trigger", error: menuResult.error, notes: notes)
        }

        // Step 2: Wait for the dialog to appear before inspecting (2 seconds to allow save dialog to fully appear)
        Thread.sleep(forTimeInterval: 2.0)

        let state = inspector.inspectSaveDialog(timeoutMs: timeoutMs)
        notes.append(contentsOf: state.notes)

        guard state.detected else {
            notes.append("Save dialog was not detected in Ableton Live's accessibility tree.")
            return SaveAsAutomationResult(ok: false, mode: state.method, error: "save_dialog_not_detected", notes: notes)
        }

        if let windowTitle = state.windowTitle {
            notes.append("Detected save dialog window: \(windowTitle)")
        }

        // Step 3: Find the filename field and fill it
        guard let live = NSWorkspace.shared.runningApplications.first(where: {
            $0.localizedName == AppConfig.targetAppName || $0.bundleIdentifier == AppConfig.targetBundleIdentifier
        }) else {
            notes.append("Ableton Live is not running.")
            return SaveAsAutomationResult(ok: false, mode: "ax", error: "live_not_running", notes: notes)
        }

        // Step 3: Try to fill the filename field using AppleScript (more reliable for macOS save dialogs)
        let fillResult = AXFilenameHelper.setSaveDialogFilename(
            appName: AppConfig.targetAppName,
            directory: target.directory,
            filename: target.fileName
        )
        notes.append(contentsOf: fillResult.notes)

        guard fillResult.success else {
            notes.append("AppleScript filling failed, falling back to AX")
            // Fallback to AX-based filling
            return performAXFallbackFill(
                live: live,
                target: target,
                timeoutMs: timeoutMs,
                notes: notes
            )
        }

        notes.append("Filled filename field with: \(target.fileName)")
        notes.append("Target directory: \(target.directory)")

        // Step 3: CONFIRM SAVE - Press Enter and wait for dialog to close
        // Note: Even if confirmation methods fail to detect dialog closure, the save may still have succeeded.
        // We proceed to Step 4 to verify actual file creation as the authoritative result.
        let confirmResult = confirmSave(appName: AppConfig.targetAppName)
        notes.append(contentsOf: confirmResult.notes)

        // Step 3b: HANDLE REPLACE CONFIRMATION DIALOG
        // Wait briefly for potential replace confirmation dialog to appear
        Thread.sleep(forTimeInterval: 0.5)
        let replaceResult = handleReplaceConfirmationIfPresent(appName: AppConfig.targetAppName)
        notes.append(contentsOf: replaceResult.notes)
        if !replaceResult.success && replaceResult.error != nil {
            // Only fail if there was an actual error, not if no dialog was found
            if replaceResult.error != "no_replace_dialog" {
                return SaveAsAutomationResult(
                    ok: false,
                    mode: "replace_confirmation",
                    error: replaceResult.error ?? "replace_confirmation_failed",
                    notes: notes
                )
            }
        }

        // Step 4: Wait for dialog to close and verify file creation
        let verificationResult = verifyFileCreation(
            targetPath: target.fullPath,
            timeoutMs: timeoutMs
        )
        notes.append(contentsOf: verificationResult.notes)

        return SaveAsAutomationResult(
            ok: verificationResult.success,
            mode: verificationResult.fileCreated == true ? "full_save_flow" : "partial_save_flow",
            error: verificationResult.error,
            notes: notes,
            filePath: verificationResult.filePath,
            fileSize: verificationResult.fileSize,
            fileCreated: verificationResult.fileCreated,
            dialogClosed: verificationResult.dialogClosed
        )
    }

    private struct ConfirmResult {
        let success: Bool
        let error: String?
        let notes: [String]
    }

    private func confirmSave(appName: String) -> ConfirmResult {
        var notes: [String] = []
        
        // Get Live PID for AX operations
        guard let live = NSWorkspace.shared.runningApplications.first(where: {
            $0.localizedName == AppConfig.targetAppName || $0.bundleIdentifier == AppConfig.targetBundleIdentifier
        }) else {
            notes.append("Ableton Live is not running for save confirmation")
            return ConfirmResult(success: false, error: "live_not_running", notes: notes)
        }
        
        // Activate Live first
        live.activate()
        Thread.sleep(forTimeInterval: 0.2)
        
        // METHOD 1: Try Cmd+S via AppleScript (this is the simplest and most reliable)
        // It works when the filename is unique (no replace dialog)
        notes.append("Attempting save confirmation via Cmd+S AppleScript...")
        
        let cmdSScript = """
        tell application "System Events"
            tell process "Live"
                set frontmost to true
                delay 0.2
                keystroke "s" using command down
                return "success: cmd_s"
            end tell
        end tell
        """
        
        var errorInfo: NSDictionary?
        if let appleScript = NSAppleScript(source: cmdSScript) {
            appleScript.executeAndReturnError(&errorInfo)
            if errorInfo == nil {
                notes.append("Sent Cmd+S via AppleScript")
                Thread.sleep(forTimeInterval: 2.0)  // Wait longer for save to complete
                if inspector.findSaveDialogWindow(in: live.processIdentifier) == nil {
                    notes.append("SUCCESS: Save dialog closed after Cmd+S")
                    return ConfirmResult(success: true, error: nil, notes: notes)
                }
                notes.append("Dialog still open after Cmd+S, trying other methods...")
            }
        }
        
        // METHOD 2: Try CGEvent-based Escape then Return (defocus text field, then trigger default button)
        notes.append("Attempting CGEvent Escape+Return to defocus and confirm...")
        
        let source = CGEventSource(stateID: .combinedSessionState)
        
        // First, send Escape to defocus any text field
        if let escDown = CGEvent(keyboardEventSource: source, virtualKey: 0x35, keyDown: true),  // Escape key
           let escUp = CGEvent(keyboardEventSource: source, virtualKey: 0x35, keyDown: false) {
            escDown.post(tap: .cghidEventTap)
            Thread.sleep(forTimeInterval: 0.05)
            escUp.post(tap: .cghidEventTap)
            Thread.sleep(forTimeInterval: 0.1)
            notes.append("Sent Escape key via CGEvent to defocus text field")
        }
        
        // Then send Return to trigger the default Save button
        if let retDown = CGEvent(keyboardEventSource: source, virtualKey: 0x24, keyDown: true),  // Return key
           let retUp = CGEvent(keyboardEventSource: source, virtualKey: 0x24, keyDown: false) {
            retDown.post(tap: .cghidEventTap)
            Thread.sleep(forTimeInterval: 0.05)
            retUp.post(tap: .cghidEventTap)
            Thread.sleep(forTimeInterval: 0.5)
            notes.append("Sent Return key via CGEvent")
            
            // Wait and check if dialog closed
            Thread.sleep(forTimeInterval: 0.5)
            if inspector.findSaveDialogWindow(in: live.processIdentifier) == nil {
                notes.append("SUCCESS: Save dialog closed after Escape+Return")
                return ConfirmResult(success: true, error: nil, notes: notes)
            }
            notes.append("Dialog still open after Escape+Return, trying next method...")
        }
        
        // METHOD 2: Try clicking in empty area of dialog to defocus, then Return
        notes.append("Attempting click on dialog background then Return...")
        if let saveDialog = inspector.findSaveDialogWindow(in: live.processIdentifier) {
            // Get dialog position and click in an empty area (avoiding text fields and buttons)
            var positionValue: CFTypeRef?
            var sizeValue: CFTypeRef?
            
            if AXUIElementCopyAttributeValue(saveDialog, kAXPositionAttribute as CFString, &positionValue) == .success,
               AXUIElementCopyAttributeValue(saveDialog, kAXSizeAttribute as CFString, &sizeValue) == .success {
                
                if let position = positionValue as? CGPoint,
                   let size = sizeValue as? CGSize {
                    // Click in lower right area of dialog (typically where Save button area is, but not on it)
                    // or click in title bar area
                    let clickX = position.x + size.width - 100  // Near right edge
                    let clickY = position.y + 50  // Near top (title bar area)
                    
                    if let moveEvent = CGEvent(mouseEventSource: source, mouseType: .mouseMoved,
                                                mouseCursorPosition: CGPoint(x: clickX, y: clickY),
                                                mouseButton: .left),
                       let downEvent = CGEvent(mouseEventSource: source, mouseType: .leftMouseDown,
                                               mouseCursorPosition: CGPoint(x: clickX, y: clickY),
                                               mouseButton: .left),
                       let upEvent = CGEvent(mouseEventSource: source, mouseType: .leftMouseUp,
                                             mouseCursorPosition: CGPoint(x: clickX, y: clickY),
                                             mouseButton: .left) {
                        
                        moveEvent.post(tap: .cghidEventTap)
                        Thread.sleep(forTimeInterval: 0.05)
                        downEvent.post(tap: .cghidEventTap)
                        Thread.sleep(forTimeInterval: 0.05)
                        upEvent.post(tap: .cghidEventTap)
                        Thread.sleep(forTimeInterval: 0.2)
                        notes.append("Clicked dialog background at (\(clickX), \(clickY))")
                        
                        // Now send Return via CGEvent
                        if let retDown = CGEvent(keyboardEventSource: source, virtualKey: 0x24, keyDown: true),
                           let retUp = CGEvent(keyboardEventSource: source, virtualKey: 0x24, keyDown: false) {
                            retDown.post(tap: .cghidEventTap)
                            Thread.sleep(forTimeInterval: 0.05)
                            retUp.post(tap: .cghidEventTap)
                            Thread.sleep(forTimeInterval: 0.5)
                            notes.append("Sent Return key via CGEvent after background click")
                            
                            if inspector.findSaveDialogWindow(in: live.processIdentifier) == nil {
                                notes.append("SUCCESS: Save dialog closed after background click + Return")
                                return ConfirmResult(success: true, error: nil, notes: notes)
                            }
                        }
                    }
                }
            }
            notes.append("Background click + Return didn't close dialog, trying next method...")
        }
        
        // METHOD 3: Try to find and click the Save button directly via AX API
        notes.append("Attempting to find and click Save button via AX API...")
        if let saveDialog = inspector.findSaveDialogWindow(in: live.processIdentifier) {
            // Look for default button attribute
            var defaultButton: CFTypeRef?
            if AXUIElementCopyAttributeValue(saveDialog, kAXDefaultButtonAttribute as CFString, &defaultButton) == .success {
                if let button = defaultButton as! AXUIElement? {
                    let pressResult = AXUIElementPerformAction(button, kAXPressAction as CFString)
                    if pressResult == .success {
                        notes.append("Successfully clicked default button via kAXDefaultButtonAttribute")
                        Thread.sleep(forTimeInterval: 0.5)
                        if inspector.findSaveDialogWindow(in: live.processIdentifier) == nil {
                            notes.append("SUCCESS: Save dialog closed after default button click")
                            return ConfirmResult(success: true, error: nil, notes: notes)
                        }
                    } else {
                        notes.append("Default button press failed with code: \(pressResult.rawValue)")
                    }
                }
            }
            
            // Try finding Save button by recursive search
            if let saveButton = findSaveButton(in: saveDialog) {
                // Try to get button position and click via mouse
                var buttonPos: CFTypeRef?
                if AXUIElementCopyAttributeValue(saveButton, kAXPositionAttribute as CFString, &buttonPos) == .success,
                   let position = buttonPos as? CGPoint {
                    var buttonSize: CFTypeRef?
                    if AXUIElementCopyAttributeValue(saveButton, kAXSizeAttribute as CFString, &buttonSize) == .success,
                       let size = buttonSize as? CGSize {
                        
                        let clickX = position.x + size.width / 2
                        let clickY = position.y + size.height / 2
                        
                        if let moveEvent = CGEvent(mouseEventSource: source, mouseType: .mouseMoved,
                                                    mouseCursorPosition: CGPoint(x: clickX, y: clickY),
                                                    mouseButton: .left),
                           let downEvent = CGEvent(mouseEventSource: source, mouseType: .leftMouseDown,
                                                   mouseCursorPosition: CGPoint(x: clickX, y: clickY),
                                                   mouseButton: .left),
                           let upEvent = CGEvent(mouseEventSource: source, mouseType: .leftMouseUp,
                                                 mouseCursorPosition: CGPoint(x: clickX, y: clickY),
                                                 mouseButton: .left) {
                            
                            moveEvent.post(tap: .cghidEventTap)
                            Thread.sleep(forTimeInterval: 0.05)
                            downEvent.post(tap: .cghidEventTap)
                            Thread.sleep(forTimeInterval: 0.05)
                            upEvent.post(tap: .cghidEventTap)
                            Thread.sleep(forTimeInterval: 0.5)
                            notes.append("Clicked Save button at (\(clickX), \(clickY)) via CGEvent mouse")
                            
                            if inspector.findSaveDialogWindow(in: live.processIdentifier) == nil {
                                notes.append("SUCCESS: Save dialog closed after direct Save button click")
                                return ConfirmResult(success: true, error: nil, notes: notes)
                            }
                        }
                    }
                }
                
                // Fallback to AX press action
                let clickResult = AXUIElementPerformAction(saveButton, kAXPressAction as CFString)
                if clickResult == .success {
                    notes.append("Successfully clicked Save button via AX press action")
                    Thread.sleep(forTimeInterval: 0.5)
                    if inspector.findSaveDialogWindow(in: live.processIdentifier) == nil {
                        notes.append("SUCCESS: Save dialog closed after AX Save button click")
                        return ConfirmResult(success: true, error: nil, notes: notes)
                    }
                } else {
                    notes.append("AX Save button click failed with code: \(clickResult.rawValue)")
                }
            } else {
                notes.append("Save button not found via AX API")
            }
        }
        
        // METHOD 4: Try Shift+Return (sometimes triggers default button even with focus)
        notes.append("Attempting Shift+Return via CGEvent...")
        if let retDown = CGEvent(keyboardEventSource: source, virtualKey: 0x24, keyDown: true),
           let retUp = CGEvent(keyboardEventSource: source, virtualKey: 0x24, keyDown: false) {
            retDown.flags = .maskShift
            retUp.flags = .maskShift
            retDown.post(tap: .cghidEventTap)
            Thread.sleep(forTimeInterval: 0.05)
            retUp.post(tap: .cghidEventTap)
            Thread.sleep(forTimeInterval: 0.5)
            notes.append("Sent Shift+Return via CGEvent")
            
            if inspector.findSaveDialogWindow(in: live.processIdentifier) == nil {
                notes.append("SUCCESS: Save dialog closed after Shift+Return")
                return ConfirmResult(success: true, error: nil, notes: notes)
            }
        }
        
        // METHOD 5: AppleScript fallback approaches
        notes.append("Trying AppleScript fallback approaches...")
        
        // Try explicit Save button via AppleScript
        let clickSaveScript = """
        tell application "System Events"
            set targetProcess to ""
            if exists process "Live" then
                set targetProcess to "Live"
            else if exists process "Ableton Live 12 Suite" then
                set targetProcess to "Ableton Live 12 Suite"
            else
                error "Could not find Ableton Live process"
            end if
            
            tell process targetProcess
                set frontmost to true
                delay 0.2
                try
                    click button "Save" of window 1
                    return "success: clicked_save_window"
                on error
                    try
                        click button "Save" of sheet 1 of window 1
                        return "success: clicked_save_sheet"
                    on error
                        try
                            click button "Save" of sheet 1
                            return "success: clicked_save_sheet_only"
                        on error errMsg
                            return "failed: " & errMsg
                        end try
                    end try
                end try
            end tell
        end tell
        """
        
        errorInfo = nil
        if let appleScript = NSAppleScript(source: clickSaveScript) {
            let result = appleScript.executeAndReturnError(&errorInfo)
            if errorInfo == nil {
                let resultStr = result.stringValue ?? "no result"
                notes.append("AppleScript Save button click: \(resultStr)")
                Thread.sleep(forTimeInterval: 0.5)
                if inspector.findSaveDialogWindow(in: live.processIdentifier) == nil {
                    notes.append("SUCCESS: Save dialog closed after AppleScript Save button click")
                    return ConfirmResult(success: true, error: nil, notes: notes)
                }
            } else {
                let errorMessage = errorInfo?["NSAppleScriptErrorMessage"] as? String ?? "Unknown error"
                notes.append("AppleScript Save button click failed: \(errorMessage)")
            }
        }

        // METHOD X: Click at hardcoded Save button coordinates (bottom right of save dialog)
        // This is a fallback when AX methods fail - dialog is at ~520,212 with size ~430x219
        // Save button is approximately at x=890, y=401 (bottom right area)
        notes.append("Attempting hardcoded coordinate click on Save button...")
        let clickCoordScript = """
        tell application "System Events"
            set targetProcess to ""
            if exists process "Live" then
                set targetProcess to "Live"
            else if exists process "Ableton Live 12 Suite" then
                set targetProcess to "Ableton Live 12 Suite"
            else
                error "Could not find Ableton Live process"
            end if
            
            tell process targetProcess
                set frontmost to true
                delay 0.3
                try
                    -- Click at Save button position (bottom right of standard save dialog)
                    click at {890, 401}
                    delay 0.5
                    return "success: clicked_coords"
                on error errMsg
                    return "failed: " & errMsg
                end try
            end tell
        end tell
        """
        
        errorInfo = nil
        if let coordScript = NSAppleScript(source: clickCoordScript) {
            let coordResult = coordScript.executeAndReturnError(&errorInfo)
            if errorInfo == nil {
                let resultStr = coordResult.stringValue ?? "no result"
                notes.append("Coordinate click result: \(resultStr)")
                Thread.sleep(forTimeInterval: 1.0)
                if inspector.findSaveDialogWindow(in: live.processIdentifier) == nil {
                    notes.append("SUCCESS: Save dialog closed after coordinate click")
                    return ConfirmResult(success: true, error: nil, notes: notes)
                }
            } else {
                let errorMessage = errorInfo?["NSAppleScriptErrorMessage"] as? String ?? "Unknown error"
                notes.append("Coordinate click failed: \(errorMessage)")
            }
        }

        notes.append("All save confirmation methods failed")
        return ConfirmResult(success: false, error: "all_confirmation_methods_failed", notes: notes)
    }

    private struct ReplaceConfirmResult {
        let success: Bool
        let error: String?
        let notes: [String]
    }

    /// Check for and handle the "file already exists" replace confirmation dialog
    private func handleReplaceConfirmationIfPresent(appName: String) -> ReplaceConfirmResult {
        var notes: [String] = []
        
        // Get Live PID for AX operations
        guard let live = NSWorkspace.shared.runningApplications.first(where: {
            $0.localizedName == AppConfig.targetAppName || $0.bundleIdentifier == AppConfig.targetBundleIdentifier
        }) else {
            notes.append("Ableton Live is not running for replace confirmation check")
            return ReplaceConfirmResult(success: true, error: nil, notes: notes)
        }
        
        // Check for any dialog window that might be a replace confirmation
        let appElement = AXUIElementCreateApplication(live.processIdentifier)
        let windowElements = copyAXElements(attribute: kAXWindowsAttribute as CFString, from: appElement)
        
        for window in windowElements {
            let title = copyAXString(attribute: kAXTitleAttribute as CFString, from: window) ?? ""
            let lowercasedTitle = title.lowercased()
            
            // Check if this is a replace confirmation dialog
            if lowercasedTitle.contains("replace") || lowercasedTitle.contains("already exists") || 
               lowercasedTitle.contains("exists") || lowercasedTitle.contains("confirm") {
                notes.append("Found replace confirmation dialog: '\(title)'")
                
                // Look for Replace button and click it
                if let replaceButton = findReplaceButton(in: window) {
                    let clickResult = AXUIElementPerformAction(replaceButton, kAXPressAction as CFString)
                    if clickResult == .success {
                        notes.append("Successfully clicked Replace button")
                        return ReplaceConfirmResult(success: true, error: nil, notes: notes)
                    } else {
                        notes.append("AX click failed with code: \(clickResult.rawValue), trying AppleScript fallback...")
                    }
                }
                
                // Fallback to AppleScript to click Replace
                let script = """
                tell application "System Events"
                    set targetProcess to ""
                    if exists process "Live" then
                        set targetProcess to "Live"
                    else if exists process "Ableton Live 12 Suite" then
                        set targetProcess to "Ableton Live 12 Suite"
                    else
                        error "Could not find Ableton Live process"
                    end if
                    
                    tell process targetProcess
                        set frontmost to true
                        delay 0.2
                        -- Try to find and click Replace button
                        try
                            click button "Replace" of window 1
                            return "success: clicked_replace"
                        on error
                            try
                                click button "Replace" of sheet 1 of window 1
                                return "success: clicked_replace_sheet"
                            on error
                                return "failed: replace_button_not_found"
                            end try
                        end try
                    end tell
                end tell
                """
                
                var errorInfo: NSDictionary?
                if let appleScript = NSAppleScript(source: script) {
                    let result = appleScript.executeAndReturnError(&errorInfo)
                    if errorInfo == nil {
                        let resultStr = result.stringValue ?? ""
                        notes.append("Replace confirmed via AppleScript: \(resultStr)")
                        return ReplaceConfirmResult(success: true, error: nil, notes: notes)
                    }
                    let errorMessage = errorInfo?["NSAppleScriptErrorMessage"] as? String ?? "Unknown error"
                    notes.append("AppleScript replace failed: \(errorMessage)")
                }
                
                // Last resort: try pressing Return (Replace is usually default)
                let returnScript = """
                tell application "System Events"
                    set targetProcess to ""
                    if exists process "Live" then
                        set targetProcess to "Live"
                    else if exists process "Ableton Live 12 Suite" then
                        set targetProcess to "Ableton Live 12 Suite"
                    else
                        error "Could not find Ableton Live process"
                    end if
                    
                    tell process targetProcess
                        keystroke return
                        return "success: return_keystroke"
                    end tell
                end tell
                """
                
                errorInfo = nil
                if let appleScript = NSAppleScript(source: returnScript) {
                    appleScript.executeAndReturnError(&errorInfo)
                    if errorInfo == nil {
                        notes.append("Replace confirmed via Return keystroke")
                        return ReplaceConfirmResult(success: true, error: nil, notes: notes)
                    }
                }
                
                return ReplaceConfirmResult(success: false, error: "failed_to_confirm_replace", notes: notes)
            }
        }
        
        notes.append("No replace confirmation dialog detected")
        return ReplaceConfirmResult(success: true, error: "no_replace_dialog", notes: notes)
    }
    
    /// Find the Replace button in a dialog window
    private func findReplaceButton(in dialogWindow: AXUIElement) -> AXUIElement? {
        // Check if this element is a button with "Replace" in its title
        if let role = copyAXString(attribute: kAXRoleAttribute as CFString, from: dialogWindow),
           role == kAXButtonRole as String {
            let title = copyAXString(attribute: kAXTitleAttribute as CFString, from: dialogWindow) ?? ""
            if title.lowercased() == "replace" {
                return dialogWindow
            }
        }
        
        // Search children recursively
        let children = copyAXElements(attribute: kAXChildrenAttribute as CFString, from: dialogWindow)
        for child in children {
            if let found = findReplaceButton(in: child) {
                return found
            }
        }
        return nil
    }
    
    /// Find the Save button in the dialog window using AX API
    private func findSaveButton(in dialogWindow: AXUIElement) -> AXUIElement? {
        // Check if this element is a button with "Save" in its title
        if let role = copyAXString(attribute: kAXRoleAttribute as CFString, from: dialogWindow),
           role == kAXButtonRole as String {
            let title = copyAXString(attribute: kAXTitleAttribute as CFString, from: dialogWindow) ?? ""
            if title.lowercased() == "save" {
                return dialogWindow
            }
        }
        
        // Search children recursively
        let children = copyAXElements(attribute: kAXChildrenAttribute as CFString, from: dialogWindow)
        for child in children {
            if let found = findSaveButton(in: child) {
                return found
            }
        }
        return nil
    }
    
    /// Copy AX string attribute helper
    private func copyAXString(attribute: CFString, from element: AXUIElement) -> String? {
        var value: CFTypeRef?
        let result = AXUIElementCopyAttributeValue(element, attribute, &value)
        guard result == .success else { return nil }
        return value as? String
    }
    
    /// Copy AX elements array helper
    private func copyAXElements(attribute: CFString, from element: AXUIElement) -> [AXUIElement] {
        var value: CFTypeRef?
        let result = AXUIElementCopyAttributeValue(element, attribute, &value)
        guard result == .success else { return [] }
        return value as? [AXUIElement] ?? []
    }

    private struct VerificationResult {
        let success: Bool
        let error: String?
        let notes: [String]
        let filePath: String?
        let fileSize: Int64?
        let fileCreated: Bool?
        let dialogClosed: Bool?
    }

    private func verifyFileCreation(targetPath: String, timeoutMs: Int) -> VerificationResult {
        var notes: [String] = []
        let timeoutSeconds = Double(timeoutMs) / 1000.0
        let pollInterval = 0.1 // 100ms
        let startTime = Date()

        notes.append("Starting file verification for: \(targetPath)")

        var dialogStillOpen = true
        var fileExists = false
        var finalFileSize: Int64?

        // Also check for Ableton project folder (Live creates "{name} Project/{name}.als")
        let projectFolderPath = targetPath.replacingOccurrences(of: ".als", with: " Project")
        let projectFilePath = "\(projectFolderPath)/\(URL(fileURLWithPath: targetPath).lastPathComponent)"
        
        while Date().timeIntervalSince(startTime) < timeoutSeconds {
            // Check if dialog is still open (poll save dialog)
            let livePID = NSWorkspace.shared.runningApplications.first { app in
                app.localizedName == AppConfig.targetAppName || app.bundleIdentifier == AppConfig.targetBundleIdentifier
            }?.processIdentifier

            if let pid = livePID {
                let dialogWindow = inspector.findSaveDialogWindow(in: pid)
                dialogStillOpen = (dialogWindow != nil)
            }

            // Check if Ableton project file exists OR project folder exists
            if fileManager.fileExists(atPath: targetPath) {
                fileExists = true
                notes.append("File exists at target path: \(targetPath)")
            } else if fileManager.fileExists(atPath: projectFilePath) {
                fileExists = true
                notes.append("Ableton project folder detected: \(projectFilePath)")
                notes.append("Project folder created from: \(targetPath)")
            } else if fileManager.fileExists(atPath: projectFolderPath) {
                // Project folder exists but .als inside it might not be ready yet
                let contents = try? fileManager.contentsOfDirectory(atPath: projectFolderPath)
                if let alsFiles = contents?.filter({ $0.hasSuffix(".als") }), !alsFiles.isEmpty {
                    let actualFilePath = "\(projectFolderPath)/\(alsFiles[0])"
                    fileExists = true
                    notes.append("Ableton project folder found: \(projectFolderPath)")
                    notes.append("ALS file inside: \(alsFiles[0])")
                }
            }

            if fileExists {

                // Determine actual file path for size check
                var checkPath = targetPath
                if !fileManager.fileExists(atPath: targetPath) {
                    checkPath = projectFilePath
                    if !fileManager.fileExists(atPath: checkPath) {
                        let folderContents = try? fileManager.contentsOfDirectory(atPath: projectFolderPath)
                        if let alsFiles = folderContents?.filter({ $0.hasSuffix(".als") }), let first = alsFiles.first {
                            checkPath = "\(projectFolderPath)/\(first)"
                        }
                    }
                }

                // Get file size
                if let attrs = try? fileManager.attributesOfItem(atPath: checkPath) {
                    finalFileSize = attrs[.size] as? Int64
                }

                // File exists - wait a bit more to ensure write is complete
                Thread.sleep(forTimeInterval: 0.3)

                // Re-check file size to ensure it's stable
                if let stableSize = try? fileManager.attributesOfItem(atPath: checkPath)[.size] as? Int64 {
                    if stableSize == finalFileSize {
                        notes.append("File verified: \(checkPath) (size: \(stableSize) bytes)")
                        return VerificationResult(
                            success: true,
                            error: nil,
                            notes: notes,
                            filePath: checkPath,
                            fileSize: stableSize,
                            fileCreated: true,
                            dialogClosed: !dialogStillOpen
                        )
                    }
                    finalFileSize = stableSize
                }
            }

            Thread.sleep(forTimeInterval: pollInterval)
        }

        // Timeout reached
        if !fileExists {
            notes.append("Timeout: File was not created within \(timeoutMs)ms")
            return VerificationResult(
                success: false,
                error: "file_creation_timeout",
                notes: notes,
                filePath: nil,
                fileSize: nil,
                fileCreated: false,
                dialogClosed: !dialogStillOpen
            )
        }

        // File exists but dialog might still be open or write not complete
        notes.append("File exists but verification incomplete (size: \(finalFileSize ?? -1) bytes)")
        return VerificationResult(
            success: fileExists,
            error: fileExists ? nil : "verification_incomplete",
            notes: notes,
            filePath: targetPath,
            fileSize: finalFileSize,
            fileCreated: fileExists,
            dialogClosed: !dialogStillOpen
        )
    }

    private func performAXFallbackFill(
        live: NSRunningApplication,
        target: SaveAsTarget,
        timeoutMs: Int,
        notes: [String]
    ) -> SaveAsAutomationResult {
        var notes = notes

        guard let filenameField = inspector.findFilenameField(in: live.processIdentifier, timeoutMs: timeoutMs) else {
            notes.append("Dialog detected but filename field was not found via AX inspection.")
            return SaveAsAutomationResult(ok: false, mode: "ax", error: "filename_field_not_found", notes: notes)
        }

        // Set the filename value via AX
        let setResult = setFilenameValue(field: filenameField, value: target.fileName, targetDirectory: target.directory, fileName: target.fileName)
        if setResult.success {
            notes.append("Filled filename field with: \(target.fileName) (via AX)")
            notes.append("Target directory: \(target.directory)")

            // Continue with Step 3: confirm save
            let confirmResult = confirmSave(appName: AppConfig.targetAppName)
            notes.append(contentsOf: confirmResult.notes)

            guard confirmResult.success else {
                return SaveAsAutomationResult(
                    ok: false,
                    mode: "confirm",
                    error: confirmResult.error ?? "save_confirmation_failed",
                    notes: notes
                )
            }

            // Step 4: Verify file creation
            let verificationResult = verifyFileCreation(
                targetPath: target.fullPath,
                timeoutMs: timeoutMs
            )
            notes.append(contentsOf: verificationResult.notes)

            return SaveAsAutomationResult(
                ok: verificationResult.success,
                mode: verificationResult.fileCreated == true ? "full_save_flow_ax" : "partial_save_flow_ax",
                error: verificationResult.error,
                notes: notes,
                filePath: verificationResult.filePath,
                fileSize: verificationResult.fileSize,
                fileCreated: verificationResult.fileCreated,
                dialogClosed: verificationResult.dialogClosed
            )
        } else {
            notes.append("Failed to set filename value: \(setResult.error ?? "unknown error")")
            return SaveAsAutomationResult(ok: false, mode: "ax_fill", error: "failed_to_set_filename", notes: notes)
        }
    }

    private struct SetValueResult {
        let success: Bool
        let error: String?
    }

    private func setFilenameValue(field: AXUIElement, value: String, targetDirectory: String, fileName: String) -> SetValueResult {
        // Try AppleScript first for better compatibility with macOS save dialogs
        let scriptResult = setFilenameViaAppleScript(targetDirectory: targetDirectory, fileName: fileName)
        if scriptResult.success {
            return scriptResult
        }
        
        // Fall back to AX if AppleScript fails
        return setFilenameViaAX(field: field, value: value)
    }
    
    private func setFilenameViaAppleScript(targetDirectory: String, fileName: String) -> SetValueResult {
        // Delegate to AXFilenameHelper which has the proper Cmd+Shift+G implementation
        let result = AXFilenameHelper.setSaveDialogFilename(
            appName: AppConfig.targetAppName,
            directory: targetDirectory,
            filename: fileName
        )
        return SetValueResult(success: result.success, error: result.success ? nil : "AppleScript set filename failed")
    }
    
    private func setFilenameViaAX(field: AXUIElement, value: String) -> SetValueResult {
        // Focus the field first
        AXUIElementSetAttributeValue(field, kAXFocusedAttribute as CFString, true as CFTypeRef)
        
        // Set the value using AXValueAttribute
        let cfValue = value as CFString
        let result = AXUIElementSetAttributeValue(field, kAXValueAttribute as CFString, cfValue)
        
        if result == .success {
            return SetValueResult(success: true, error: nil)
        }
        
        // Try using AXTitleAttribute if AXValueAttribute fails
        let titleResult = AXUIElementSetAttributeValue(field, kAXTitleAttribute as CFString, cfValue)
        if titleResult == .success {
            return SetValueResult(success: true, error: nil)
        }
        
        return SetValueResult(success: false, error: "AX set value failed with code: \(result.rawValue)")
    }

    private func needsDirectoryNavigation(targetDirectory: String) -> Bool {
        // Get current directory from the dialog if possible
        // For now, assume navigation is needed if we can't determine current directory
        // This is a placeholder for Step 3 implementation
        return true // Conservative: assume navigation might be needed
    }

    private struct MenuTriggerResult {
        let success: Bool
        let error: String?
        let notes: [String]
    }

    /// Triggers File → Save Live Set As… menu using AppleScript
    private func triggerSaveAsMenu() -> MenuTriggerResult {
        // Try both process names
        let script = """
        tell application "System Events"
            set targetProcess to ""
            if exists process "Live" then
                set targetProcess to "Live"
            else if exists process "Ableton Live 12 Suite" then
                set targetProcess to "Ableton Live 12 Suite"
            else
                error "Could not find Ableton Live process"
            end if
            
            tell process targetProcess
                set frontmost to true
                click menu item "Save Live Set As…" of menu "File" of menu bar 1
            end tell
        end tell
        """

        var errorInfo: NSDictionary?
        if let appleScript = NSAppleScript(source: script) {
            appleScript.executeAndReturnError(&errorInfo)

            if let error = errorInfo {
                let errorNumber = error["NSAppleScriptErrorNumber"] as? Int ?? -1
                let errorMessage = error["NSAppleScriptErrorMessage"] as? String ?? "Unknown AppleScript error"

                // If menu item not found or can't be clicked, fall back to keyboard shortcut
                if errorNumber != 0 {
                    return triggerSaveAsWithKeyboardShortcut()
                }

                return MenuTriggerResult(
                    success: false,
                    error: "menu_trigger_failed",
                    notes: ["AppleScript error (\(errorNumber)): \(errorMessage)"]
                )
            }

            return MenuTriggerResult(
                success: true,
                error: nil,
                notes: ["Successfully triggered File → Save Live Set As… via AppleScript"]
            )
        }

        // Fall back to keyboard shortcut if AppleScript creation failed
        return triggerSaveAsWithKeyboardShortcut()
    }

    /// Falls back to Cmd+Shift+S keyboard shortcut
    private func triggerSaveAsWithKeyboardShortcut() -> MenuTriggerResult {
        guard let live = NSWorkspace.shared.runningApplications.first(where: {
            $0.localizedName == AppConfig.targetAppName || $0.bundleIdentifier == AppConfig.targetBundleIdentifier
        }) else {
            return MenuTriggerResult(
                success: false,
                error: "live_not_running",
                notes: ["Could not trigger keyboard shortcut: Ableton Live is not running"]
            )
        }

        // Activate Live first
        live.activate()
        Thread.sleep(forTimeInterval: 0.1)

        // Post Cmd+Shift+S event using AppleScript (more reliable than CGEvent)
        let script = """
        tell application "System Events"
            keystroke "s" using {command down, shift down}
        end tell
        """

        var errorInfo: NSDictionary?
        if let appleScript = NSAppleScript(source: script) {
            appleScript.executeAndReturnError(&errorInfo)

            if errorInfo == nil {
                return MenuTriggerResult(
                    success: true,
                    error: nil,
                    notes: ["Triggered Save As dialog via Cmd+Shift+S keyboard shortcut"]
                )
            }
        }

        // Try CGEvent as last resort
        let source = CGEventSource(stateID: .combinedSessionState)
        let keyDown = CGEvent(keyboardEventSource: source, virtualKey: 0x01, keyDown: true) // 's' key
        let keyUp = CGEvent(keyboardEventSource: source, virtualKey: 0x01, keyDown: false)

        keyDown?.flags = [.maskCommand, .maskShift]
        keyUp?.flags = [.maskCommand, .maskShift]

        keyDown?.post(tap: .cghidEventTap)
        keyUp?.post(tap: .cghidEventTap)

        return MenuTriggerResult(
            success: true,
            error: nil,
            notes: ["Triggered Save As dialog via CGEvent keyboard shortcut (Cmd+Shift+S)"]
        )
    }
}

public protocol SaveDialogInspecting {
    func inspectSaveDialog(timeoutMs: Int) -> SaveDialogState
    func findFilenameField(in livePID: pid_t, timeoutMs: Int) -> AXUIElement?
    func findSaveDialogWindow(in livePID: pid_t) -> AXUIElement?
}

public final class AXSaveDialogInspector: SaveDialogInspecting {
    public init() {}

    public func inspectSaveDialog(timeoutMs: Int) -> SaveDialogState {
        guard let live = NSWorkspace.shared.runningApplications.first(where: {
            $0.localizedName == AppConfig.targetAppName || $0.bundleIdentifier == AppConfig.targetBundleIdentifier
        }) else {
            return SaveDialogState(
                detected: false,
                method: "ax",
                windowTitle: nil,
                supportsSameFolderRename: false,
                notes: ["Ableton Live 12 Suite is not running for AX inspection."]
            )
        }

        // Wait longer for the save dialog to appear (macOS save dialogs can take time)
        Thread.sleep(forTimeInterval: 2.0)

        let appElement = AXUIElementCreateApplication(live.processIdentifier)
        let windowElements = copyAXElements(attribute: kAXWindowsAttribute as CFString, from: appElement)
        guard !windowElements.isEmpty else {
            return SaveDialogState(
                detected: false,
                method: "ax",
                windowTitle: nil,
                supportsSameFolderRename: false,
                notes: ["AX inspection found zero accessible windows on the Live process."]
            )
        }

        // Build debug info for all windows
        var windowDebugInfo: [String] = []
        for (index, window) in windowElements.enumerated() {
            let role = copyAXString(attribute: kAXRoleAttribute as CFString, from: window) ?? "unknown"
            let subrole = copyAXString(attribute: kAXSubroleAttribute as CFString, from: window) ?? "unknown"
            let title = copyAXString(attribute: kAXTitleAttribute as CFString, from: window) ?? ""
            let hasTextField = containsFilenameField(in: window)
            let hasSaveButton = containsSaveButton(in: window)
            windowDebugInfo.append("Window \(index+1): role=\(role) subrole=\(subrole) title='\(title)' hasTextField=\(hasTextField) hasSaveButton=\(hasSaveButton)")
        }

        // PRIORITY 1: Window with "Save" in title (most reliable indicator)
        for window in windowElements {
            let title = copyAXString(attribute: kAXTitleAttribute as CFString, from: window) ?? ""
            if title.lowercased().contains("save") {
                let hasTextField = containsFilenameField(in: window)
                var notes = windowDebugInfo
                notes.append("Detected save dialog by title match: '\(title)'")
                return SaveDialogState(
                    detected: true,
                    method: "ax_title_match",
                    windowTitle: title,
                    supportsSameFolderRename: hasTextField,
                    notes: notes
                )
            }
        }

        // PRIORITY 2: Window with both text field AND save button (strong save dialog indicators)
        for window in windowElements {
            let hasTextField = containsFilenameField(in: window)
            let hasSaveButton = containsSaveButton(in: window)
            if hasTextField && hasSaveButton {
                let title = copyAXString(attribute: kAXTitleAttribute as CFString, from: window) ?? ""
                var notes = windowDebugInfo
                notes.append("Detected save dialog by text field + save button: '\(title)'")
                return SaveDialogState(
                    detected: true,
                    method: "ax_content_match",
                    windowTitle: title,
                    supportsSameFolderRename: true,
                    notes: notes
                )
            }
        }

        // PRIORITY 3: Traditional dialog/sheet matching with content verification
        for window in windowElements {
            let role = copyAXString(attribute: kAXRoleAttribute as CFString, from: window) ?? "unknown"
            let subrole = copyAXString(attribute: kAXSubroleAttribute as CFString, from: window) ?? "unknown"
            let title = copyAXString(attribute: kAXTitleAttribute as CFString, from: window) ?? ""

            // Check if this looks like a dialog window
            let isDialogLike = role == kAXWindowRole as String
                          || role == kAXSheetRole as String
                          || subrole.lowercased().contains("dialog")
                          || subrole.lowercased().contains("sheet")
                          || subrole == "AXStandardWindow"  // Include standard windows too

            // Check for save dialog content indicators
            let hasTextField = containsFilenameField(in: window)
            let hasSaveButton = containsSaveButton(in: window)

            if isDialogLike && (hasTextField || hasSaveButton) {
                var notes = windowDebugInfo
                notes.append("Detected save dialog by role+content: role=\(role) subrole=\(subrole) title='\(title)'")
                return SaveDialogState(
                    detected: true,
                    method: "ax_role_content_match",
                    windowTitle: title,
                    supportsSameFolderRename: hasTextField,
                    notes: notes
                )
            }
        }

        // PRIORITY 4: Any window with text field (fallback - likely a save dialog)
        for window in windowElements {
            let hasTextField = containsFilenameField(in: window)
            if hasTextField {
                let title = copyAXString(attribute: kAXTitleAttribute as CFString, from: window) ?? ""
                var notes = windowDebugInfo
                notes.append("Detected dialog by text field presence (fallback): '\(title)'")
                return SaveDialogState(
                    detected: true,
                    method: "ax_textfield_fallback",
                    windowTitle: title,
                    supportsSameFolderRename: true,
                    notes: notes
                )
            }
        }

        // No save dialog detected
        var notes = windowDebugInfo
        notes.append("No save dialog detected after checking all \(windowElements.count) window(s)")
        return SaveDialogState(
            detected: false,
            method: "ax",
            windowTitle: nil,
            supportsSameFolderRename: false,
            notes: notes
        )
    }

    public func findSaveDialogWindow(in livePID: pid_t) -> AXUIElement? {
        let appElement = AXUIElementCreateApplication(livePID)
        let windowElements = copyAXElements(attribute: kAXWindowsAttribute as CFString, from: appElement)

        // PRIORITY 1: Window with "Save" in title (most reliable)
        for window in windowElements {
            let title = copyAXString(attribute: kAXTitleAttribute as CFString, from: window) ?? ""
            if title.lowercased().contains("save") {
                return window
            }
        }

        // PRIORITY 2: Window with both text field AND save button
        for window in windowElements {
            if containsFilenameField(in: window) && containsSaveButton(in: window) {
                return window
            }
        }

        // PRIORITY 3: Traditional dialog/sheet matching
        for window in windowElements {
            let role = copyAXString(attribute: kAXRoleAttribute as CFString, from: window) ?? "unknown"
            let subrole = copyAXString(attribute: kAXSubroleAttribute as CFString, from: window) ?? "unknown"

            let isDialogLike = role == kAXWindowRole as String
                          || role == kAXSheetRole as String
                          || subrole.lowercased().contains("dialog")
                          || subrole.lowercased().contains("sheet")

            if isDialogLike {
                if containsFilenameField(in: window) || containsSaveButton(in: window) {
                    return window
                }
            }
        }

        // PRIORITY 4: Any window with text field (fallback)
        for window in windowElements {
            if containsFilenameField(in: window) {
                return window
            }
        }

        return nil
    }

    public func findFilenameField(in livePID: pid_t, timeoutMs: Int) -> AXUIElement? {
        guard let dialogWindow = findSaveDialogWindow(in: livePID) else {
            return nil
        }
        return findFilenameTextField(in: dialogWindow)
    }

    private func findFilenameTextField(in root: AXUIElement) -> AXUIElement? {
        // First, try to find any text field with filename-related attributes
        if let field = findTextFieldWithFilenameIndicators(in: root) {
            return field
        }
        
        // Fallback: return the first editable text field found
        return findFirstEditableTextField(in: root)
    }
    
    private func findTextFieldWithFilenameIndicators(in root: AXUIElement) -> AXUIElement? {
        if let role = copyAXString(attribute: kAXRoleAttribute as CFString, from: root) {
            if role == kAXTextFieldRole as String {
                // Check if it has a label or description indicating it's for filename
                let title = copyAXString(attribute: kAXTitleAttribute as CFString, from: root) ?? ""
                let description = copyAXString(attribute: kAXDescriptionAttribute as CFString, from: root) ?? ""
                
                // Look for filename-related indicators
                let lowercased = "\(title) \(description)".lowercased()
                if lowercased.contains("save as") || lowercased.contains("filename") || 
                   lowercased.contains("file name") || lowercased.contains("name") {
                    return root
                }
            }
        }
        
        // Search children recursively
        for child in copyAXElements(attribute: kAXChildrenAttribute as CFString, from: root) {
            if let found = findTextFieldWithFilenameIndicators(in: child) {
                return found
            }
        }
        return nil
    }
    
    private func findFirstEditableTextField(in root: AXUIElement) -> AXUIElement? {
        // Check if this element is a text field
        if let role = copyAXString(attribute: kAXRoleAttribute as CFString, from: root) {
            if role == kAXTextFieldRole as String {
                // Check if it's editable (has AXValue attribute)
                var value: CFTypeRef?
                if AXUIElementCopyAttributeValue(root, kAXValueAttribute as CFString, &value) == .success {
                    return root
                }
            }
        }
        
        // Search children recursively
        for child in copyAXElements(attribute: kAXChildrenAttribute as CFString, from: root) {
            if let found = findFirstEditableTextField(in: child) {
                return found
            }
        }
        return nil
    }

    /// Debug helper to log the AX hierarchy for debugging
    public func logAXHierarchy(in livePID: pid_t) -> [String] {
        var logs: [String] = []
        guard let dialogWindow = findSaveDialogWindow(in: livePID) else {
            logs.append("No save dialog found")
            return logs
        }
        logElement(dialogWindow, depth: 0, logs: &logs)
        return logs
    }
    
    private func logElement(_ element: AXUIElement, depth: Int, logs: inout [String], maxDepth: Int = 8) {
        // Limit depth to avoid infinite recursion
        if depth > maxDepth {
            return
        }
        let indent = String(repeating: "  ", count: depth)
        let role = copyAXString(attribute: kAXRoleAttribute as CFString, from: element) ?? "unknown"
        let title = copyAXString(attribute: kAXTitleAttribute as CFString, from: element) ?? ""
        let subrole = copyAXString(attribute: kAXSubroleAttribute as CFString, from: element) ?? ""
        let description = copyAXString(attribute: kAXDescriptionAttribute as CFString, from: element) ?? ""
        
        logs.append("\(indent)[\(role)] title='\(title)' subrole='\(subrole)' desc='\(description)'")
        
        let children = copyAXElements(attribute: kAXChildrenAttribute as CFString, from: element)
        for child in children {
            logElement(child, depth: depth + 1, logs: &logs, maxDepth: maxDepth)
        }
    }

    private func containsFilenameField(in root: AXUIElement, depth: Int = 0, maxDepth: Int = 10) -> Bool {
        // Limit depth to avoid infinite recursion
        if depth > maxDepth {
            return false
        }
        if let role = copyAXString(attribute: kAXRoleAttribute as CFString, from: root), role == kAXTextFieldRole as String {
            return true
        }
        for child in copyAXElements(attribute: kAXChildrenAttribute as CFString, from: root) {
            if containsFilenameField(in: child, depth: depth + 1, maxDepth: maxDepth) {
                return true
            }
        }
        return false
    }

    /// Check if element contains a button with "Save" in its label/title
    private func containsSaveButton(in root: AXUIElement, depth: Int = 0, maxDepth: Int = 10) -> Bool {
        // Limit depth to avoid infinite recursion
        if depth > maxDepth {
            return false
        }
        if let role = copyAXString(attribute: kAXRoleAttribute as CFString, from: root), role == kAXButtonRole as String {
            let title = copyAXString(attribute: kAXTitleAttribute as CFString, from: root) ?? ""
            let description = copyAXString(attribute: kAXDescriptionAttribute as CFString, from: root) ?? ""
            if title.lowercased().contains("save") || description.lowercased().contains("save") {
                return true
            }
        }
        for child in copyAXElements(attribute: kAXChildrenAttribute as CFString, from: root) {
            if containsSaveButton(in: child, depth: depth + 1, maxDepth: maxDepth) {
                return true
            }
        }
        return false
    }

    private func copyAXString(attribute: CFString, from element: AXUIElement) -> String? {
        var value: CFTypeRef?
        let result = AXUIElementCopyAttributeValue(element, attribute, &value)
        guard result == .success else { return nil }
        return value as? String
    }

    private func copyAXElements(attribute: CFString, from element: AXUIElement) -> [AXUIElement] {
        var value: CFTypeRef?
        let result = AXUIElementCopyAttributeValue(element, attribute, &value)
        guard result == .success else { return [] }
        return value as? [AXUIElement] ?? []
    }
}

/// AX utilities for working with filename fields
public final class AXFilenameHelper {
    public static func logFullHierarchy(appName: String) -> [String] {
        var logs: [String] = []
        guard let live = NSWorkspace.shared.runningApplications.first(where: {
            $0.localizedName == appName
        }) else {
            logs.append("App not found: \(appName)")
            return logs
        }
        
        let appElement = AXUIElementCreateApplication(live.processIdentifier)
        logs.append("=== Application: \(appName) (PID: \(live.processIdentifier)) ===")
        
        // Log all attributes of the app
        var attrs: CFArray?
        if AXUIElementCopyAttributeNames(appElement, &attrs) == .success {
            logs.append("App attributes: \(attrs as? [String] ?? [])")
        }
        
        // Log windows
        var windowValue: CFTypeRef?
        if AXUIElementCopyAttributeValue(appElement, kAXWindowsAttribute as CFString, &windowValue) == .success {
            if let windows = windowValue as? [AXUIElement] {
                logs.append("Found \(windows.count) window(s)")
                for (index, window) in windows.enumerated() {
                    logs.append("--- Window \(index + 1) ---")
                    logAXElement(window, depth: 0, logs: &logs)
                }
            }
        } else {
            logs.append("Could not get windows")
        }
        
        return logs
    }
    
    private static func logAXElement(_ element: AXUIElement, depth: Int, logs: inout [String]) {
        let indent = String(repeating: "  ", count: depth)
        
        // Get basic attributes
        var role: CFTypeRef?
        AXUIElementCopyAttributeValue(element, kAXRoleAttribute as CFString, &role)
        let roleStr = (role as? String) ?? "unknown"
        
        var title: CFTypeRef?
        AXUIElementCopyAttributeValue(element, kAXTitleAttribute as CFString, &title)
        let titleStr = (title as? String) ?? ""
        
        var subrole: CFTypeRef?
        AXUIElementCopyAttributeValue(element, kAXSubroleAttribute as CFString, &subrole)
        let subroleStr = (subrole as? String) ?? ""
        
        var description: CFTypeRef?
        AXUIElementCopyAttributeValue(element, kAXDescriptionAttribute as CFString, &description)
        let descStr = (description as? String) ?? ""
        
        logs.append("\(indent)[\(roleStr)] title='\(titleStr)' subrole='\(subroleStr)' desc='\(descStr)'")
        
        // Get children
        var children: CFTypeRef?
        if AXUIElementCopyAttributeValue(element, kAXChildrenAttribute as CFString, &children) == .success {
            if let childElements = children as? [AXUIElement] {
                for child in childElements {
                    logAXElement(child, depth: depth + 1, logs: &logs)
                }
            }
        }
    }
    
    /// Use AppleScript to fill the filename field in a save dialog
    /// Tries multiple approaches to set the filename
    public static func setSaveDialogFilename(appName: String, directory: String, filename: String) -> (success: Bool, notes: [String]) {
        var notes: [String] = []
        
        // Escape quotes in path for AppleScript
        let escapedFilename = filename.replacingOccurrences(of: "\"", with: "\\\"")
        let fullPath = "\(directory)/\(escapedFilename)"
        
        notes.append("Attempting save-as with full path: \(fullPath)")
        
        // Method 1: Use Cmd+Shift+G (Go to Folder) - sets FULL path
        // This is the PRIMARY method that should work for save-as to any location
        // Try "Live" process name first, then "Ableton Live 12 Suite"
        let script1 = """
        tell application "System Events"
            -- Try "Live" process name first, then "Ableton Live 12 Suite"
            set targetProcess to ""
            if exists process "Live" then
                set targetProcess to "Live"
            else if exists process "Ableton Live 12 Suite" then
                set targetProcess to "Ableton Live 12 Suite"
            else
                error "Could not find Ableton Live process"
            end if
            
            tell process targetProcess
                set frontmost to true
                delay 0.3
                -- Use Cmd+Shift+G to open "Go to Folder" dialog
                keystroke "g" using {command down, shift down}
                delay 0.5
                -- Type the full path including filename
                keystroke "\(fullPath)"
                delay 0.3
                -- Press Enter to confirm the "Go to Folder" dialog
                keystroke return
                delay 0.5
                return "success: used_go_to_folder_" & targetProcess
            end tell
        end tell
        """
        
        var errorInfo: NSDictionary?
        if let appleScript = NSAppleScript(source: script1) {
            let result = appleScript.executeAndReturnError(&errorInfo)
            
            if errorInfo == nil {
                let resultStr = result.stringValue ?? ""
                notes.append("SUCCESS: Go-to-folder method worked: \(resultStr)")
                return (success: true, notes: notes)
            }
            
            let errorMessage = errorInfo?["NSAppleScriptErrorMessage"] as? String ?? "Unknown error"
            notes.append("Go-to-folder method failed: \(errorMessage)")
        } else {
            notes.append("Failed to create AppleScript for go-to-folder method")
        }
        
        // Method 2: Fallback - fill just the filename field (saves to current directory)
        // This is only used if the primary method fails
        notes.append("Falling back to filename-only method...")
        
        let script2 = """
        tell application "System Events"
            set targetProcess to ""
            if exists process "Live" then
                set targetProcess to "Live"
            else if exists process "Ableton Live 12 Suite" then
                set targetProcess to "Ableton Live 12 Suite"
            else
                error "Could not find Ableton Live process"
            end if
            
            tell process targetProcess
                set frontmost to true
                delay 0.3
                try
                    set filenameField to text field 1 of window 1
                    set value of filenameField to "\(escapedFilename)"
                    return "success: set_filename_field_window"
                on error
                    try
                        set filenameField to text field 1 of sheet 1 of window 1
                        set value of filenameField to "\(escapedFilename)"
                        return "success: set_filename_field_sheet"
                    on error errMsg
                        error "Could not set filename field: " & errMsg
                    end try
                end try
            end tell
        end tell
        """
        
        errorInfo = nil
        if let appleScript = NSAppleScript(source: script2) {
            let result = appleScript.executeAndReturnError(&errorInfo)
            
            if errorInfo == nil {
                let resultStr = result.stringValue ?? ""
                notes.append("Filename-only fill succeeded: \(resultStr)")
                return (success: true, notes: notes)
            }
            
            let errorMessage = errorInfo?["NSAppleScriptErrorMessage"] as? String ?? "Unknown error"
            notes.append("Filename-only fill failed: \(errorMessage)")
        }
        
        notes.append("All AppleScript methods failed")
        return (success: false, notes: notes)
    }
}

public final class HTTPRouter {
    private let state: BridgeStateProtocol
    private let fileManager: FileManager
    private let automation: SaveDialogAutomationProtocol

    public init(state: BridgeStateProtocol, fileManager: FileManager = .default, automation: SaveDialogAutomationProtocol = SaveDialogAutomation()) {
        self.state = state
        self.fileManager = fileManager
        self.automation = automation
    }

    public func route(_ request: String) -> HTTPResponse {
        let lines = request.components(separatedBy: "\r\n")
        guard let requestLine = lines.first, !requestLine.isEmpty else {
            return errorResponse(status: 400, error: "bad_request")
        }

        let parts = requestLine.split(separator: " ")
        guard parts.count >= 2 else {
            return errorResponse(status: 400, error: "bad_request")
        }

        let method = String(parts[0])
        let path = String(parts[1])
        let body = requestBody(from: request)

        switch (method, path) {
        case ("GET", "/health"):
            return HTTPResponse(status: 200, body: JSONResponse(
                ok: true,
                service: "live-dialog-bridge",
                targetApp: AppConfig.targetAppName,
                accessibilityTrusted: state.accessibilityTrusted(),
                liveRunning: state.runningLiveApp() != nil,
                liveFrontmost: state.isLiveFrontmost(),
                targetPath: nil,
                mode: nil,
                notes: ["Scaffold server is running."],
                error: nil,
                filePath: nil,
                fileSize: nil,
                fileCreated: nil,
                dialogClosed: nil
            ))

        case ("GET", "/permissions"):
            return HTTPResponse(status: 200, body: JSONResponse(
                ok: true,
                service: "live-dialog-bridge",
                targetApp: AppConfig.targetAppName,
                accessibilityTrusted: state.accessibilityTrusted(),
                liveRunning: state.runningLiveApp() != nil,
                liveFrontmost: state.isLiveFrontmost(),
                targetPath: nil,
                mode: nil,
                notes: [
                    "Accessibility permission is required for real dialog automation.",
                    "If AppleScript or Apple Events are added, macOS may also ask for Automation permission."
                ],
                error: nil,
                filePath: nil,
                fileSize: nil,
                fileCreated: nil,
                dialogClosed: nil
            ))

        case ("POST", "/v1/dialog/save-as"):
            return handleSaveAs(body: body)

        case ("POST", "/v1/dialog/save"):
            return handleSimpleSave(body: body)

        default:
            return errorResponse(status: 404, error: "not_found")
        }
    }

    private func handleSaveAs(body: Data) -> HTTPResponse {
        let decoder = JSONDecoder()
        let request: SaveAsRequest
        do {
            request = try decoder.decode(SaveAsRequest.self, from: body)
        } catch {
            return errorResponse(status: 400, error: "invalid_json")
        }

        let trimmedPath = request.targetPath.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedPath.isEmpty else {
            return saveAsError(status: 400, request: request, error: "target_path_required", notes: ["targetPath must not be empty."])
        }

        guard trimmedPath.hasPrefix("/") else {
            return saveAsError(status: 400, request: request, error: "target_path_must_be_absolute", notes: ["targetPath must be an absolute path."])
        }

        guard trimmedPath.lowercased().hasSuffix(".als") else {
            return saveAsError(status: 400, request: request, error: "target_path_must_end_with_als", notes: ["targetPath must point to an Ableton Live Set (.als)."])
        }

        let timeoutMs = request.timeoutMs ?? 15_000
        if timeoutMs <= 0 {
            return saveAsError(status: 400, request: request, error: "timeout_ms_must_be_positive", notes: ["timeoutMs must be greater than zero when provided."])
        }

        let normalizedURL = URL(fileURLWithPath: trimmedPath).standardizedFileURL
        let normalizedPath = normalizedURL.path
        let parentDir = normalizedURL.deletingLastPathComponent().path
        let fileName = normalizedURL.lastPathComponent
        var notes: [String] = []

        guard fileManager.fileExists(atPath: parentDir) else {
            return saveAsError(status: 400, request: SaveAsRequest(targetPath: normalizedPath, activateLive: request.activateLive, timeoutMs: request.timeoutMs), error: "target_directory_missing", notes: ["Parent directory does not exist: \(parentDir)"])
        }

        if request.activateLive == true {
            let activated = state.activateLive()
            notes.append(activated ? "Requested Ableton Live activation." : "Could not activate Ableton Live because it was not found.")
        }

        if !state.accessibilityTrusted() {
            notes.append("Accessibility permission is not currently granted.")
            return HTTPResponse(status: 400, body: JSONResponse(
                ok: false,
                service: "live-dialog-bridge",
                targetApp: AppConfig.targetAppName,
                accessibilityTrusted: state.accessibilityTrusted(),
                liveRunning: state.runningLiveApp() != nil,
                liveFrontmost: state.isLiveFrontmost(),
                targetPath: normalizedPath,
                mode: "ax",
                notes: notes,
                error: "accessibility_not_granted",
                filePath: nil,
                fileSize: nil,
                fileCreated: false,
                dialogClosed: nil
            ))
        }

        guard state.runningLiveApp() != nil else {
            notes.append("Ableton Live 12 Suite does not appear to be running.")
            return HTTPResponse(status: 400, body: JSONResponse(
                ok: false,
                service: "live-dialog-bridge",
                targetApp: AppConfig.targetAppName,
                accessibilityTrusted: state.accessibilityTrusted(),
                liveRunning: false,
                liveFrontmost: state.isLiveFrontmost(),
                targetPath: normalizedPath,
                mode: "ax",
                notes: notes,
                error: "live_not_running",
                filePath: nil,
                fileSize: nil,
                fileCreated: false,
                dialogClosed: nil
            ))
        }

        let automationResult = automation.performSaveAs(
            target: SaveAsTarget(fullPath: normalizedPath, directory: parentDir, fileName: fileName),
            timeoutMs: timeoutMs
        )

        return HTTPResponse(status: automationResult.ok ? 200 : 400, body: JSONResponse(
            ok: automationResult.ok,
            service: "live-dialog-bridge",
            targetApp: AppConfig.targetAppName,
            accessibilityTrusted: state.accessibilityTrusted(),
            liveRunning: state.runningLiveApp() != nil,
            liveFrontmost: state.isLiveFrontmost(),
            targetPath: normalizedPath,
            mode: automationResult.mode,
            notes: notes + automationResult.notes,
            error: automationResult.error,
            filePath: automationResult.filePath,
            fileSize: automationResult.fileSize,
            fileCreated: automationResult.fileCreated,
            dialogClosed: automationResult.dialogClosed
        ))
    }

    private func handleSimpleSave(body: Data) -> HTTPResponse {
        let decoder = JSONDecoder()
        let request: SimpleSaveRequest
        do {
            request = try decoder.decode(SimpleSaveRequest.self, from: body)
        } catch {
            // Allow empty body - simple save doesn't need parameters
            request = SimpleSaveRequest(activateLive: nil)
        }

        var notes: [String] = []

        if request.activateLive == true {
            let activated = state.activateLive()
            notes.append(activated ? "Requested Ableton Live activation." : "Could not activate Ableton Live because it was not found.")
        }

        if !state.accessibilityTrusted() {
            notes.append("Accessibility permission is not currently granted.")
            return HTTPResponse(status: 400, body: JSONResponse(
                ok: false,
                service: "live-dialog-bridge",
                targetApp: AppConfig.targetAppName,
                accessibilityTrusted: state.accessibilityTrusted(),
                liveRunning: state.runningLiveApp() != nil,
                liveFrontmost: state.isLiveFrontmost(),
                targetPath: nil,
                mode: "simple_save",
                notes: notes,
                error: "accessibility_not_granted",
                filePath: nil,
                fileSize: nil,
                fileCreated: false,
                dialogClosed: nil
            ))
        }

        guard state.runningLiveApp() != nil else {
            notes.append("Ableton Live 12 Suite does not appear to be running.")
            return HTTPResponse(status: 400, body: JSONResponse(
                ok: false,
                service: "live-dialog-bridge",
                targetApp: AppConfig.targetAppName,
                accessibilityTrusted: state.accessibilityTrusted(),
                liveRunning: false,
                liveFrontmost: state.isLiveFrontmost(),
                targetPath: nil,
                mode: "simple_save",
                notes: notes,
                error: "live_not_running",
                filePath: nil,
                fileSize: nil,
                fileCreated: false,
                dialogClosed: nil
            ))
        }

        let automationResult = automation.performSimpleSave(activateLive: request.activateLive == true)

        return HTTPResponse(status: automationResult.ok ? 200 : 400, body: JSONResponse(
            ok: automationResult.ok,
            service: "live-dialog-bridge",
            targetApp: AppConfig.targetAppName,
            accessibilityTrusted: state.accessibilityTrusted(),
            liveRunning: state.runningLiveApp() != nil,
            liveFrontmost: state.isLiveFrontmost(),
            targetPath: nil,
            mode: automationResult.mode,
            notes: notes + automationResult.notes,
            error: automationResult.error,
            filePath: nil,
            fileSize: nil,
            fileCreated: nil,
            dialogClosed: nil
        ))
    }

    private func saveAsError(status: Int, request: SaveAsRequest, error: String, notes: [String]) -> HTTPResponse {
        HTTPResponse(status: status, body: JSONResponse(
            ok: false,
            service: "live-dialog-bridge",
            targetApp: AppConfig.targetAppName,
            accessibilityTrusted: state.accessibilityTrusted(),
            liveRunning: state.runningLiveApp() != nil,
            liveFrontmost: state.isLiveFrontmost(),
            targetPath: request.targetPath.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : request.targetPath.trimmingCharacters(in: .whitespacesAndNewlines),
            mode: "stub",
            notes: notes,
            error: error,
            filePath: nil,
            fileSize: nil,
            fileCreated: false,
            dialogClosed: nil
        ))
    }

    private func errorResponse(status: Int, error: String) -> HTTPResponse {
        HTTPResponse(status: status, body: JSONResponse(
            ok: false,
            service: "live-dialog-bridge",
            targetApp: AppConfig.targetAppName,
            accessibilityTrusted: state.accessibilityTrusted(),
            liveRunning: state.runningLiveApp() != nil,
            liveFrontmost: state.isLiveFrontmost(),
            targetPath: nil,
            mode: nil,
            notes: nil,
            error: error,
            filePath: nil,
            fileSize: nil,
            fileCreated: nil,
            dialogClosed: nil
        ))
    }

    private func requestBody(from request: String) -> Data {
        let separator = "\r\n\r\n"
        guard let range = request.range(of: separator) else { return Data() }
        return Data(request[range.upperBound...].utf8)
    }
}

public final class HTTPServer {
    private let listener: NWListener
    private let router: HTTPRouter
    private let host: NWEndpoint.Host
    private let port: NWEndpoint.Port
    private let queue: DispatchQueue

    public init(
        state: BridgeStateProtocol = BridgeState(),
        fileManager: FileManager = .default,
        automation: SaveDialogAutomationProtocol = SaveDialogAutomation(),
        host: NWEndpoint.Host = AppConfig.host,
        port: NWEndpoint.Port = AppConfig.port,
        queue: DispatchQueue = .main
    ) throws {
        listener = try NWListener(using: .tcp, on: port)
        router = HTTPRouter(state: state, fileManager: fileManager, automation: automation)
        self.host = host
        self.port = port
        self.queue = queue
    }

    public func start() {
        listener.newConnectionHandler = { [weak self] connection in
            self?.handle(connection: connection)
        }
        listener.start(queue: queue)
        print("live-dialog-bridge listening on http://\(host):\(port.rawValue)")
    }

    public func stop() {
        listener.cancel()
    }

    private func handle(connection: NWConnection) {
        connection.start(queue: .main)
        connection.receive(minimumIncompleteLength: 1, maximumLength: 64 * 1024) { [weak self] data, _, _, _ in
            guard let self, let data else {
                connection.cancel()
                return
            }
            let requestText = String(decoding: data, as: UTF8.self)
            let routed = self.router.route(requestText)
            let response = self.http(status: routed.status, body: self.encode(routed.body))
            connection.send(content: response, completion: .contentProcessed { _ in
                connection.cancel()
            })
        }
    }

    private func http(status: Int, body: Data) -> Data {
        let statusText: String
        switch status {
        case 200: statusText = "OK"
        case 400: statusText = "Bad Request"
        case 404: statusText = "Not Found"
        default: statusText = "Error"
        }
        var header = "HTTP/1.1 \(status) \(statusText)\r\n"
        header += "Content-Type: application/json\r\n"
        header += "Content-Length: \(body.count)\r\n"
        header += "Connection: close\r\n\r\n"
        var response = Data(header.utf8)
        response.append(body)
        return response
    }

    private func encode(_ response: JSONResponse) -> Data {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        return (try? encoder.encode(response)) ?? Data("{\"ok\":false}".utf8)
    }
}
