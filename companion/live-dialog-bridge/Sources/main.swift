import AppKit
import Foundation
import LiveDialogBridgeCore

let app = NSApplication.shared
app.setActivationPolicy(.accessory)

do {
    let server = try HTTPServer()
    server.start()
    RunLoop.main.run()
} catch {
    fputs("Failed to start live-dialog-bridge: \(error)\n", stderr)
    exit(1)
}
