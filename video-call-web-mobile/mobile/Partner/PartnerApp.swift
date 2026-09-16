import SwiftUI

@main
struct PartnerApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
                // 종이 디자인은 라이트 고정이다. 다크 모드에서 입력 글자가 흰색으로 사라지던 문제도 이것으로 막는다.
                .preferredColorScheme(.light)
        }
    }
}
