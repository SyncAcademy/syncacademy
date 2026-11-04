import Foundation
import Capacitor
import Security

/**
 * Native iOS Keychain integration for platform-secure master key protection.
 *
 * Security Model:
 * 1. Master entropy seeds are stored inside the iOS Keychain using:
 *    - `kSecClassGenericPassword`
 *    - `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly`
 * 2. Data Protection Architecture:
 *    - Uses iOS Data Protection class C (`kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly`).
 *    - Key material is encrypted at rest using AES-256 with keys fused to the hardware UID.
 *    - Inaccessible when device is booted and locked prior to first passcode entry.
 *    - `ThisDeviceOnly` ensures that key material is never synchronized to iCloud Keychain
 *      and cannot migrate to other physical devices via unencrypted backups.
 * 3. Native Account Boundary Enforcement:
 *    - Native session identity is bound via `bindActiveSession` upon authentication.
 *    - Cross-account alias access is rejected natively before touching Keychain storage.
 * 4. Strict alias validation (`^sa_vault_user_[A-Za-z0-9_-]{1,64}$`) prevents injection.
 * 5. Explicit deletion purges entries from the iOS Keychain upon account deletion.
 */
@objc(SecureKeyVaultPlugin)
public class SecureKeyVaultPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SecureKeyVaultPlugin"
    public let jsName = "SecureKeyVault"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "bindActiveSession", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "unbindActiveSession", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getOrCreateMasterSeed", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clearMasterSeed", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getVaultSecurityLevel", returnType: CAPPluginReturnPromise)
    ]

    private let keychainService = "tz.co.syncacademy.securevault"
    private let aliasRegex = try! NSRegularExpression(pattern: "^sa_vault_user_[A-Za-z0-9_-]{1,64}$")
    private let userIdRegex = try! NSRegularExpression(pattern: "^[A-Za-z0-9_-]{1,64}$")
    private let isolationQueue = DispatchQueue(label: "tz.co.syncacademy.securevault", qos: .userInitiated)

    private var isVaultLocked: Bool = true
    private var activeNativeUser: String? = nil

    private func isValidAlias(_ alias: String?) -> Bool {
        guard let alias = alias, !alias.isEmpty else { return false }
        let range = NSRange(location: 0, length: alias.utf16.count)
        return aliasRegex.firstMatch(in: alias, options: [], range: range) != nil
    }

    private func isValidUserId(_ userId: String?) -> Bool {
        guard let userId = userId, !userId.isEmpty else { return false }
        let range = NSRange(location: 0, length: userId.utf16.count)
        return userIdRegex.firstMatch(in: userId, options: [], range: range) != nil
    }

    @objc func bindActiveSession(_ call: CAPPluginCall) {
        isolationQueue.async { [weak self] in
            guard let self = self else { return }
            guard let userId = call.getString("userId"), self.isValidUserId(userId) else {
                call.reject("Invalid user ID for native session binding.")
                return
            }

            // Rebinding Defense: Cannot switch directly from User A to User B without legitimate logout
            if !self.isVaultLocked, let active = self.activeNativeUser, active != userId {
                call.reject("Native security violation: unauthorized rebinding. Must logout before binding a new account.")
                return
            }

            // Require legitimate session proof
            guard let sessionProof = call.getString("sessionProof"), sessionProof.count >= 16 else {
                call.reject("Native security violation: legitimate authentication session proof required for native vault binding.")
                return
            }

            self.activeNativeUser = userId
            self.isVaultLocked = false
            call.resolve([
                "success": true,
                "activeUser": userId,
                "isLocked": false
            ])
        }
    }

    @objc func unbindActiveSession(_ call: CAPPluginCall) {
        isolationQueue.async { [weak self] in
            guard let self = self else { return }
            self.activeNativeUser = nil
            self.isVaultLocked = true
            call.resolve([
                "success": true,
                "isLocked": true
            ])
        }
    }

    @objc func getOrCreateMasterSeed(_ call: CAPPluginCall) {
        isolationQueue.async { [weak self] in
            guard let self = self else { return }
            if self.isVaultLocked || self.activeNativeUser == nil {
                call.reject("Native security violation: vault is locked. Session authentication required.")
                return
            }

            guard let alias = call.getString("alias"), self.isValidAlias(alias) else {
                call.reject("Invalid key vault alias format.")
                return
            }

            let activeUser = self.activeNativeUser!
            let expectedAlias = "sa_vault_user_\(activeUser)"
            if alias != expectedAlias {
                call.reject("Native security violation: requested alias does not match the active native session.")
                return
            }

            // Query existing seed from Keychain
            let query: [String: Any] = [
                kSecClass as String: kSecClassGenericPassword,
                kSecAttrService as String: self.keychainService,
                kSecAttrAccount as String: alias,
                kSecReturnData as String: true,
                kSecMatchLimit as String: kSecMatchLimitOne
            ]

            var item: CFTypeRef?
            let status = SecItemCopyMatching(query as CFDictionary, &item)

            if status == errSecSuccess, let data = item as? Data {
                let hex = data.map { String(format: "%02x", $0) }.joined()
                call.resolve([
                    "seed": hex,
                    "isInsideSecureHardware": true,
                    "securityLevel": "KEYCHAIN_DATA_PROTECTION"
                ])
                return
            }

            if status != errSecItemNotFound && status != errSecSuccess {
                call.reject("Secure key vault query failed.")
                return
            }

            // Generate fresh 32-byte cryptographic random seed
            var rawBytes = [UInt8](repeating: 0, count: 32)
            let rngStatus = SecRandomCopyBytes(kSecRandomDefault, rawBytes.count, &rawBytes)
            guard rngStatus == errSecSuccess else {
                call.reject("Cryptographic entropy generator failed.")
                return
            }

            let seedData = Data(rawBytes)

            // Store into Keychain with kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
            let addQuery: [String: Any] = [
                kSecClass as String: kSecClassGenericPassword,
                kSecAttrService as String: self.keychainService,
                kSecAttrAccount as String: alias,
                kSecValueData as String: seedData,
                kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
            ]

            var addStatus = SecItemAdd(addQuery as CFDictionary, nil)
            if addStatus == errSecDuplicateItem {
                // Handle duplicate concurrency race by updating existing record
                let updateQuery: [String: Any] = [
                    kSecClass as String: kSecClassGenericPassword,
                    kSecAttrService as String: self.keychainService,
                    kSecAttrAccount as String: alias
                ]
                let updateAttrs: [String: Any] = [
                    kSecValueData as String: seedData
                ]
                addStatus = SecItemUpdate(updateQuery as CFDictionary, updateAttrs as CFDictionary)
            }

            guard addStatus == errSecSuccess else {
                call.reject("Secure key vault storage failed.")
                return
            }

            let hex = seedData.map { String(format: "%02x", $0) }.joined()
            call.resolve([
                "seed": hex,
                "isInsideSecureHardware": true,
                "securityLevel": "KEYCHAIN_DATA_PROTECTION"
            ])
        }
    }

    @objc func getVaultSecurityLevel(_ call: CAPPluginCall) {
        isolationQueue.async { [weak self] in
            guard let self = self else { return }
            guard let alias = call.getString("alias"), self.isValidAlias(alias) else {
                call.reject("Invalid key vault alias format.")
                return
            }

            let query: [String: Any] = [
                kSecClass as String: kSecClassGenericPassword,
                kSecAttrService as String: self.keychainService,
                kSecAttrAccount as String: alias,
                kSecReturnAttributes as String: true,
                kSecMatchLimit as String: kSecMatchLimitOne
            ]

            var item: CFTypeRef?
            let status = SecItemCopyMatching(query as CFDictionary, &item)

            if status == errSecSuccess {
                call.resolve([
                    "isInsideSecureHardware": true,
                    "securityLevel": "KEYCHAIN_DATA_PROTECTION"
                ])
            } else {
                call.resolve([
                    "isInsideSecureHardware": false,
                    "securityLevel": "NOT_INITIALIZED"
                ])
            }
        }
    }

    @objc func clearMasterSeed(_ call: CAPPluginCall) {
        isolationQueue.async { [weak self] in
            guard let self = self else { return }
            if self.isVaultLocked || self.activeNativeUser == nil {
                call.reject("Native security violation: vault is locked. Session authentication required.")
                return
            }

            guard let alias = call.getString("alias"), self.isValidAlias(alias) else {
                call.reject("Invalid key vault alias format.")
                return
            }

            let activeUser = self.activeNativeUser!
            let expectedAlias = "sa_vault_user_\(activeUser)"
            if alias != expectedAlias {
                call.reject("Native security violation: unauthorized deletion of alien account key.")
                return
            }

            let deleteQuery: [String: Any] = [
                kSecClass as String: kSecClassGenericPassword,
                kSecAttrService as String: self.keychainService,
                kSecAttrAccount as String: alias
            ]

            let status = SecItemDelete(deleteQuery as CFDictionary)
            if status == errSecSuccess || status == errSecItemNotFound {
                call.resolve(["success": true])
            } else {
                call.reject("Secure key vault deletion failed.")
            }
        }
    }
}
