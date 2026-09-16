import Foundation

enum Config {
    /// 웹앱 주소. 토큰은 웹앱의 `/api/agora/token` 에서 받는다 (웹 통합이 먼저다).
    /// - 시뮬레이터: 이대로 (localhost).
    /// - 실기기: 같은 Wi-Fi 의 맥 IP 로 바꾼다. 예) "http://192.168.0.10:3000" (맥 IP: `ipconfig getifaddr en0`)
    static let webBaseURL = URL(string: "http://localhost:3000")!

    /// Agora App ID. 웹앱의 `.env.local` 에 있는 NEXT_PUBLIC_AGORA_APP_ID 와 같은 값.
    /// 값은 `scripts/ios.sh gen` 이 웹앱 env 에서 만드는 AppIdConfig.swift 에 있다 (gitignore).
    static var appId: String { AppIdConfig.value }
}
