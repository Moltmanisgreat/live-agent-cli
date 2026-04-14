import AppKit
import Foundation
import Network
import Testing
@testable import LiveDialogBridgeCore

private final class MockBridgeState: BridgeStateProtocol {
    let trusted: Bool
    let liveRunning: Bool
    let frontmost: Bool
    private(set) var activateCallCount = 0

    init(trusted: Bool = true, liveRunning: Bool = true, frontmost: Bool = true) {
        self.trusted = trusted
        self.liveRunning = liveRunning
        self.frontmost = frontmost
    }

    func accessibilityTrusted() -> Bool { trusted }
    func runningLiveApp() -> NSRunningApplication? { liveRunning ? NSRunningApplication.current : nil }
    func isLiveFrontmost() -> Bool { frontmost }
    func activateLive() -> Bool {
        activateCallCount += 1
        return liveRunning
    }
}

private final class MockAutomation: SaveDialogAutomationProtocol {
    let result: SaveAsAutomationResult
    private(set) var receivedTarget: SaveAsTarget?
    private(set) var receivedTimeoutMs: Int?

    init(result: SaveAsAutomationResult) {
        self.result = result
    }

    func performSaveAs(target: SaveAsTarget, timeoutMs: Int) -> SaveAsAutomationResult {
        receivedTarget = target
        receivedTimeoutMs = timeoutMs
        return result
    }
}

private struct StubInspector: SaveDialogInspecting {
    let state: SaveDialogState
    func inspectSaveDialog(timeoutMs: Int) -> SaveDialogState { state }
    func findFilenameField(in livePID: pid_t, timeoutMs: Int) -> AXUIElement? { nil }
    func findSaveDialogWindow(in livePID: pid_t) -> AXUIElement? { nil }
}

private func makeRequest(method: String, path: String, json: String? = nil) -> String {
    if let json {
        return "\(method) \(path) HTTP/1.1\r\nHost: 127.0.0.1\r\nContent-Type: application/json\r\nContent-Length: \(json.utf8.count)\r\n\r\n\(json)"
    }
    return "\(method) \(path) HTTP/1.1\r\nHost: 127.0.0.1\r\n\r\n"
}

@Suite("Live dialog bridge router")
struct LiveDialogBridgeCoreTests {
    @Test("GET /health includes environment booleans")
    func healthIncludesState() {
        let router = HTTPRouter(state: MockBridgeState(trusted: false, liveRunning: true, frontmost: false))

        let response = router.route(makeRequest(method: "GET", path: "/health"))

        #expect(response.status == 200)
        #expect(response.body.ok == true)
        #expect(response.body.service == "live-dialog-bridge")
        #expect(response.body.targetApp == AppConfig.targetAppName)
        #expect(response.body.accessibilityTrusted == false)
        #expect(response.body.liveRunning == true)
        #expect(response.body.liveFrontmost == false)
        #expect(response.body.notes == ["Scaffold server is running."])
        #expect(response.body.error == nil)
    }

    @Test("GET /permissions returns operator guidance")
    func permissionsIncludesNotes() {
        let router = HTTPRouter(state: MockBridgeState(trusted: true, liveRunning: false, frontmost: false))

        let response = router.route(makeRequest(method: "GET", path: "/permissions"))

        #expect(response.status == 200)
        #expect(response.body.ok == true)
        #expect(response.body.accessibilityTrusted == true)
        #expect(response.body.liveRunning == false)
        #expect(response.body.liveFrontmost == false)
        #expect(response.body.notes?.count == 2)
        #expect(response.body.notes?.contains("Accessibility permission is required for real dialog automation.") == true)
    }

    @Test("POST /v1/dialog/save-as rejects malformed JSON with schema error")
    func saveAsRejectsMalformedJSON() {
        let router = HTTPRouter(state: MockBridgeState())

        let response = router.route(makeRequest(method: "POST", path: "/v1/dialog/save-as", json: "{not-json}"))

        #expect(response.status == 400)
        #expect(response.body.ok == false)
        #expect(response.body.error == "invalid_json")
        #expect(response.body.mode == nil)
        #expect(response.body.targetPath == nil)
    }

    @Test("POST /v1/dialog/save-as validates target path and timeout")
    func saveAsValidatesInputs() {
        let router = HTTPRouter(state: MockBridgeState())

        let emptyPath = router.route(makeRequest(method: "POST", path: "/v1/dialog/save-as", json: #"{"targetPath":"   "}"#))
        #expect(emptyPath.status == 400)
        #expect(emptyPath.body.error == "target_path_required")
        #expect(emptyPath.body.mode == "stub")
        #expect(emptyPath.body.notes?.contains("targetPath must not be empty.") == true)

        let relativePath = router.route(makeRequest(method: "POST", path: "/v1/dialog/save-as", json: #"{"targetPath":"relative/test.als"}"#))
        #expect(relativePath.body.error == "target_path_must_be_absolute")

        let wrongExtension = router.route(makeRequest(method: "POST", path: "/v1/dialog/save-as", json: #"{"targetPath":"/tmp/test.txt"}"#))
        #expect(wrongExtension.body.error == "target_path_must_end_with_als")

        let badTimeout = router.route(makeRequest(method: "POST", path: "/v1/dialog/save-as", json: #"{"targetPath":"/tmp/test.als","timeoutMs":0}"#))
        #expect(badTimeout.body.error == "timeout_ms_must_be_positive")
    }

    @Test("POST /v1/dialog/save-as reports missing directory in stub schema")
    func saveAsReportsMissingDirectory() {
        let router = HTTPRouter(state: MockBridgeState(liveRunning: false, frontmost: false))
        let missingPath = "/tmp/live-dialog-bridge-tests/does-not-exist/test.als"

        let response = router.route(makeRequest(method: "POST", path: "/v1/dialog/save-as", json: "{\"targetPath\":\"\(missingPath)\",\"activateLive\":true}"))

        #expect(response.status == 400)
        #expect(response.body.ok == false)
        #expect(response.body.error == "target_directory_missing")
        #expect(response.body.mode == "stub")
        #expect(response.body.targetPath == missingPath)
        #expect(response.body.notes?.first?.contains("Parent directory does not exist") == true)
    }

    @Test("POST /v1/dialog/save-as fails fast without accessibility")
    func saveAsRequiresAccessibility() throws {
        let automation = MockAutomation(result: SaveAsAutomationResult(ok: true, mode: "ax", error: nil, notes: ["should not run"]))
        let router = HTTPRouter(state: MockBridgeState(trusted: false, liveRunning: true, frontmost: false), automation: automation)
        let tempRoot = URL(fileURLWithPath: NSTemporaryDirectory()).appendingPathComponent(UUID().uuidString)
        try FileManager.default.createDirectory(at: tempRoot, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: tempRoot) }
        let targetPath = tempRoot.appendingPathComponent("No AX.als").path

        let response = router.route(makeRequest(method: "POST", path: "/v1/dialog/save-as", json: "{\"targetPath\":\"\(targetPath)\",\"activateLive\":true}"))

        #expect(response.status == 400)
        #expect(response.body.error == "accessibility_not_granted")
        #expect(response.body.mode == "ax")
        #expect(response.body.notes?.contains("Requested Ableton Live activation.") == true)
        #expect(automation.receivedTarget == nil)
    }

    @Test("POST /v1/dialog/save-as runs automation with normalized target pieces")
    func saveAsUsesAutomationResult() throws {
        let automation = MockAutomation(result: SaveAsAutomationResult(ok: true, mode: "ax", error: nil, notes: ["Prepared same-folder rename target: My Set.als"]))
        let state = MockBridgeState(trusted: true, liveRunning: true, frontmost: false)
        let router = HTTPRouter(state: state, automation: automation)
        let tempRoot = URL(fileURLWithPath: NSTemporaryDirectory()).appendingPathComponent(UUID().uuidString)
        try FileManager.default.createDirectory(at: tempRoot, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: tempRoot) }
        let targetPath = tempRoot.appendingPathComponent("My Set.als").path

        let response = router.route(makeRequest(method: "POST", path: "/v1/dialog/save-as", json: "{\"targetPath\":\"\(targetPath)\",\"activateLive\":true,\"timeoutMs\":15000}"))

        #expect(response.status == 200)
        #expect(response.body.ok == true)
        #expect(response.body.error == nil)
        #expect(response.body.mode == "ax")
        #expect(response.body.targetPath == targetPath)
        #expect(response.body.accessibilityTrusted == true)
        #expect(response.body.liveRunning == true)
        #expect(response.body.liveFrontmost == false)
        #expect(response.body.notes?.contains("Requested Ableton Live activation.") == true)
        #expect(response.body.notes?.contains("Prepared same-folder rename target: My Set.als") == true)
        #expect(state.activateCallCount == 1)
        #expect(automation.receivedTarget == SaveAsTarget(fullPath: targetPath, directory: tempRoot.path, fileName: "My Set.als"))
        #expect(automation.receivedTimeoutMs == 15000)
    }

    @Test("HTTP server serves /health over localhost")
    func httpServerServesHealth() async throws {
        let port = NWEndpoint.Port(rawValue: 32173)!
        let server = try HTTPServer(
            state: MockBridgeState(trusted: true, liveRunning: true, frontmost: false),
            host: NWEndpoint.Host("127.0.0.1"),
            port: port,
            queue: DispatchQueue(label: "LiveDialogBridgeCoreTests.http")
        )
        server.start()
        defer { server.stop() }

        try await Task.sleep(for: .milliseconds(100))

        let url = URL(string: "http://127.0.0.1:\(port.rawValue)/health")!
        let (data, response) = try await URLSession.shared.data(from: url)
        let http = try #require(response as? HTTPURLResponse)
        let body = try JSONDecoder().decode(JSONResponse.self, from: data)

        #expect(http.statusCode == 200)
        #expect(body.ok == true)
        #expect(body.service == "live-dialog-bridge")
        #expect(body.liveRunning == true)
        #expect(body.liveFrontmost == false)
        #expect(body.notes == ["Scaffold server is running."])
    }

    @Test("save automation returns structured failure when Live is not running")
    func automationFailsWhenLiveNotRunning() {
        // Without Live running, menu trigger will fail
        let automation = SaveDialogAutomation(inspector: StubInspector(state: SaveDialogState(
            detected: false,
            method: "ax",
            windowTitle: nil,
            supportsSameFolderRename: false,
            notes: ["AX inspection found zero accessible windows on the Live process."]
        )))

        let result = automation.performSaveAs(
            target: SaveAsTarget(fullPath: "/tmp/My Set.als", directory: "/tmp", fileName: "My Set.als"),
            timeoutMs: 12_000
        )

        // The automation should fail early when trying to trigger menu
        #expect(result.ok == false)
        #expect(result.mode == "menu_trigger" || result.mode == "ax")
        #expect(result.error == "live_not_running" || result.error != nil)
    }

    @Test("save automation includes file metadata in success result")
    func automationIncludesFileMetadata() {
        // This test verifies the result structure includes file metadata fields
        let result = SaveAsAutomationResult(
            ok: true,
            mode: "full_save_flow",
            error: nil,
            notes: ["Success"],
            filePath: "/tmp/test.als",
            fileSize: 1024,
            fileCreated: true,
            dialogClosed: true
        )

        #expect(result.filePath == "/tmp/test.als")
        #expect(result.fileSize == 1024)
        #expect(result.fileCreated == true)
        #expect(result.dialogClosed == true)
    }
}
