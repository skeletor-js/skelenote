import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

/**
 * ShareViewController - iOS Share Extension
 * Handles content shared from other apps (Safari, Notes, etc.)
 * Saves shared content to App Groups storage for the main app to process
 */
class ShareViewController: SLComposeServiceViewController {

    private var sharedText: String?
    private var sharedUrl: URL?

    override func viewDidLoad() {
        super.viewDidLoad()
        extractSharedContent()
    }

    override func isContentValid() -> Bool {
        // Enable post button if we have any content
        return sharedText != nil || sharedUrl != nil || !contentText.isEmpty
    }

    override func didSelectPost() {
        saveAndOpenApp()
        extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
    }

    override func configurationItems() -> [Any]! {
        // No configuration items needed
        return []
    }

    // MARK: - Content Extraction

    private func extractSharedContent() {
        guard let extensionItem = extensionContext?.inputItems.first as? NSExtensionItem,
              let attachments = extensionItem.attachments else { return }

        let group = DispatchGroup()

        for attachment in attachments {
            // Handle URL type
            if attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                group.enter()
                attachment.loadItem(forTypeIdentifier: UTType.url.identifier) { [weak self] item, error in
                    defer { group.leave() }
                    if let url = item as? URL {
                        self?.sharedUrl = url
                    }
                }
            }

            // Handle plain text type
            if attachment.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                group.enter()
                attachment.loadItem(forTypeIdentifier: UTType.plainText.identifier) { [weak self] item, error in
                    defer { group.leave() }
                    if let text = item as? String {
                        self?.sharedText = text
                    }
                }
            }
        }

        group.notify(queue: .main) { [weak self] in
            self?.validateContent()
        }
    }

    // MARK: - Saving and App Launch

    private func saveAndOpenApp() {
        // Access App Groups shared storage
        guard let defaults = UserDefaults(suiteName: "group.com.skelenote.app") else {
            print("[ShareExtension] Failed to access App Groups")
            return
        }

        // Build share data object
        var shareData: [String: Any] = [
            "timestamp": Date().timeIntervalSince1970
        ]

        if let url = sharedUrl {
            shareData["type"] = "url"
            shareData["url"] = url.absoluteString
            // Include any note the user added in the share sheet
            if !contentText.isEmpty {
                shareData["text"] = contentText
            }
        } else if let text = sharedText ?? (contentText.isEmpty ? nil : contentText) {
            // Check if text looks like a URL
            if let url = URL(string: text), url.scheme == "http" || url.scheme == "https" {
                shareData["type"] = "url"
                shareData["url"] = text
            } else {
                shareData["type"] = "text"
                shareData["text"] = text
            }
        }

        // Queue the share (use array to handle multiple pending shares)
        var pendingShares = defaults.array(forKey: "pendingShares") as? [[String: Any]] ?? []
        pendingShares.append(shareData)
        defaults.set(pendingShares, forKey: "pendingShares")
        defaults.synchronize()

        print("[ShareExtension] Saved share data: \(shareData)")

        // Note: iOS Share Extensions cannot directly open the containing app
        // The main app will check for pending shares when it becomes active
    }
}
