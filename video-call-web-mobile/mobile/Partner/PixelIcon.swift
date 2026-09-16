import SwiftUI

/// 16×16 픽셀 아이콘. 웹 components/CallStage.tsx 의 GRIDS 와 같은 격자다.
/// PixelLab 초안을 1비트로 정리한 것. 꺼짐은 같은 그림에 빗금(빗금 아래 한 칸은 비운다).
struct PixelIcon: View {
    enum Kind { case mic, camera, hangup, person }

    let kind: Kind
    var off = false
    var size: CGFloat = 24

    var body: some View {
        Canvas { context, canvasSize in
            let cell = canvasSize.width / 16
            var path = Path()
            for (y, row) in grid.enumerated() {
                for (x, ch) in row.enumerated() where ch == "#" {
                    path.addRect(CGRect(x: CGFloat(x) * cell, y: CGFloat(y) * cell, width: cell, height: cell))
                }
            }
            context.fill(path, with: .foreground)
        }
        .frame(width: size, height: size)
        .accessibilityHidden(true)
    }

    private var grid: [[Character]] {
        var rows = PixelIcon.grids[kind]!.map { Array($0) }
        if off {
            for i in 1..<15 {
                rows[i][i] = "#"
                rows[i + 1][i] = "."
            }
        }
        return rows
    }

    private static let grids: [Kind: [String]] = [
        .mic: [
            "................",
            "......####......",
            ".....#....#.....",
            ".....#....#.....",
            ".....#....#.....",
            ".....#....#.....",
            ".....#....#.....",
            "...#.#....#.#...",
            "...#.#....#.#...",
            "...#..#..#..#...",
            "....#..##..#....",
            ".....#....#.....",
            "......####......",
            ".......##.......",
            ".....######.....",
            "................",
        ],
        .camera: [
            "................",
            "................",
            "................",
            "................",
            ".##########...#.",
            ".#........#..##.",
            ".#........#.#.#.",
            ".#........##..#.",
            ".#........##..#.",
            ".#........#.#.#.",
            ".#........#..##.",
            ".##########...#.",
            "................",
            "................",
            "................",
            "................",
        ],
        .hangup: [
            "................",
            "................",
            "................",
            "................",
            "................",
            ".....######.....",
            "...##......##...",
            "..#....##....#..",
            ".#....#..#....#.",
            ".#...#....#...#.",
            ".#...#....#...#.",
            "..###......###..",
            "................",
            "................",
            "................",
            "................",
        ],
        .person: [
            "................",
            ".......##.......",
            "......#..#......",
            ".....#....#.....",
            "....#......#....",
            "....#......#....",
            "....#......#....",
            ".....#....#.....",
            ".....##..##.....",
            "....#......#....",
            "...#........#...",
            "..#..........#..",
            "..#..........#..",
            "..#..........#..",
            "..############..",
            "................",
        ],
    ]
}

/// 픽셀 카드: 각진 모서리, 2px 테두리, 흐림 없는 그림자.
struct PixelFrame: ViewModifier {
    var fill: Color = Theme.card
    var border: Color = Theme.ink
    var shadow = true

    func body(content: Content) -> some View {
        content
            .background(fill)
            .overlay(Rectangle().strokeBorder(border, lineWidth: 2))
            .background(
                Rectangle()
                    .fill(shadow ? Theme.ink : .clear)
                    .offset(x: Theme.shadowOffset, y: Theme.shadowOffset)
            )
    }
}

/// 24px 모눈종이 바탕
struct GridPaper: View {
    var body: some View {
        Canvas { context, size in
            var path = Path()
            stride(from: 0, through: size.width, by: 24).forEach { x in
                path.addRect(CGRect(x: x, y: 0, width: 1, height: size.height))
            }
            stride(from: 0, through: size.height, by: 24).forEach { y in
                path.addRect(CGRect(x: 0, y: y, width: size.width, height: 1))
            }
            context.fill(path, with: .color(Theme.grid))
        }
        .background(Theme.paper)
    }
}
