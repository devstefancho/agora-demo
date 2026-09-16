import SwiftUI

/// 디자인 토큰 (docs/design.md 와 같은 값). 모눈종이 위의 픽셀.
enum Theme {
    static let paper = Color(red: 0xF5 / 255, green: 0xF2 / 255, blue: 0xEA / 255)
    static let paperDeep = Color(red: 0xEB / 255, green: 0xE6 / 255, blue: 0xDA / 255)
    static let card = Color(red: 0xFF / 255, green: 0xFD / 255, blue: 0xF8 / 255)
    static let ink = Color(red: 0x1F / 255, green: 0x1C / 255, blue: 0x17 / 255)
    static let inkSoft = Color(red: 0x4A / 255, green: 0x46 / 255, blue: 0x3F / 255)
    static let muted = Color(red: 0x7D / 255, green: 0x78 / 255, blue: 0x6D / 255)
    /// 모눈 선. 웹의 --grid.
    static let grid = Color(red: 0xE9 / 255, green: 0xE4 / 255, blue: 0xD8 / 255)
    static let line = Color(red: 0xE0 / 255, green: 0xDB / 255, blue: 0xCF / 255)
    static let accent = Color(red: 0xD8 / 255, green: 0x54 / 255, blue: 0x2A / 255)
    static let warn = Color(red: 0xB3 / 255, green: 0x40 / 255, blue: 0x1E / 255)
    /// 통화 무대. 웹의 `.stage` 와 같은 색.
    static let stage = Color(red: 0x22 / 255, green: 0x1F / 255, blue: 0x1A / 255)
    static let stageSoft = Color(red: 0x3A / 255, green: 0x35 / 255, blue: 0x2D / 255)
    static let stageText = Color(red: 0xD8 / 255, green: 0xD2 / 255, blue: 0xC4 / 255)

    /// 픽셀 폰트(갈무리). 12px 격자 글꼴이라 크기는 6의 배수로 쓴다.
    static func display(_ size: CGFloat) -> Font {
        .custom("Galmuri11-Bold", fixedSize: size)
    }

    static func pixel(_ size: CGFloat, bold: Bool = false) -> Font {
        .custom(bold ? "Galmuri11-Bold" : "Galmuri11-Regular", fixedSize: size)
    }

    /// 흐림 없는 픽셀 그림자 크기
    static let shadowOffset: CGFloat = 4
}
