// swift-tools-version: 5.10
import PackageDescription

let package = Package(
    name: "LiveDialogBridge",
    platforms: [
        .macOS(.v14)
    ],
    products: [
        .library(name: "LiveDialogBridgeCore", targets: ["LiveDialogBridgeCore"]),
        .executable(name: "live-dialog-bridge", targets: ["LiveDialogBridge"])
    ],
    targets: [
        .target(
            name: "LiveDialogBridgeCore",
            path: "Sources/LiveDialogBridgeCore"
        ),
        .executableTarget(
            name: "LiveDialogBridge",
            dependencies: ["LiveDialogBridgeCore"],
            path: "Sources",
            exclude: ["LiveDialogBridgeCore"],
            sources: ["main.swift"]
        ),
        .testTarget(
            name: "LiveDialogBridgeCoreTests",
            dependencies: ["LiveDialogBridgeCore"],
            path: "Tests/LiveDialogBridgeCoreTests"
        )
    ]
)
