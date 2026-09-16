import SwiftUI

struct ContentView: View {
    @StateObject private var session = PartnerSession()
    @State private var code = ""
    @State private var inCall = false
    /// 대기실에서 고른 마이크. 나갔다 다시 들어와도 남는다.
    @State private var micOn = true

    var body: some View {
        ZStack {
            GridPaper().ignoresSafeArea()
            if inCall {
                CallView(session: session, code: code) {
                    session.leave()
                    inCall = false
                }
            } else {
                JoinView(code: $code, micOn: $micOn) {
                    inCall = true
                    Task { await session.join(code: code, micOn: micOn) }
                }
            }
        }
    }
}

/// 방 코드를 넣고 들어가는 화면. 이 앱의 첫 화면이자 거의 유일한 입력이다.
struct JoinView: View {
    @Binding var code: String
    @Binding var micOn: Bool
    let onJoin: () -> Void
    @FocusState private var focused: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            Spacer(minLength: 24)
            Text("미팅방 입장")
                .font(Theme.display(42))
                .foregroundStyle(Theme.ink)
            Text("데스크톱 화면에 보이는 미팅 코드를 넣어 주세요.")
                .font(Theme.pixel(12))
                .foregroundStyle(Theme.muted)

            VStack(alignment: .leading, spacing: 6) {
                Text("미팅 코드")
                    .font(Theme.pixel(12))
                    .foregroundStyle(Theme.muted)
                TextField("call-xxxx", text: $code)
                    .font(Theme.pixel(18))
                    .foregroundStyle(Theme.ink)
                    .tint(Theme.accent)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .focused($focused)
                    .padding(14)
                    .background(Theme.paper)
                    .overlay(Rectangle().strokeBorder(Theme.inkSoft, lineWidth: 2))
            }
            .padding(20)
            .modifier(PixelFrame())

            Button { micOn.toggle() } label: {
                HStack(spacing: 12) {
                    PixelIcon(kind: .mic, off: !micOn)
                    Text(micOn ? "마이크 켜고 들어가기" : "마이크 끄고 들어가기")
                        .font(Theme.pixel(18))
                    Spacer()
                    Text("눌러서 바꾸기")
                        .font(Theme.pixel(12))
                        .foregroundStyle(Theme.muted)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 14)
                .foregroundStyle(micOn ? Theme.ink : Theme.warn)
                .modifier(PixelFrame())
            }
            .accessibilityValue(micOn ? "켜짐" : "꺼짐")

            Button(action: onJoin) {
                Text("미팅 참여하기")
                    .font(Theme.pixel(18, bold: true))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 18)
                    .foregroundStyle(Theme.paper)
                    .modifier(PixelFrame(fill: code.isEmpty ? Theme.muted : Theme.ink, shadow: false))
            }
            .disabled(code.isEmpty)

            Spacer()
            Text("오늘의 표현과 힌트는 데스크톱 쪽에 있어요. 여기서는 얼굴만 보여주면 돼요.")
                .font(Theme.pixel(12))
                .foregroundStyle(Theme.muted)
                .frame(maxWidth: .infinity)
                .multilineTextAlignment(.center)
        }
        .padding(24)
        .onAppear { focused = code.isEmpty }
    }
}

/// 통화 화면. 상대가 크게, 나는 작게. 웹의 무대와 같은 구도다.
/// 데스크톱이 화면을 공유하면 공유 화면과 데스크톱 카메라 중 누른 쪽이 크게, 다른 쪽이 왼쪽 위에 작게 나온다.
/// 가로로 눕히면 무대가 왼쪽을 다 쓰고, 상태 줄과 버튼은 오른쪽 세로 줄로 간다.
struct CallView: View {
    @ObservedObject var session: PartnerSession
    let code: String
    let onLeave: () -> Void

    private enum Big { case face, screen }
    @State private var big: Big = .face

    private var hasPartner: Bool { session.status == .connected }
    private var faceBig: Bool { !session.partnerSharing || big == .face }

    var body: some View {
        GeometryReader { geo in
            let wide = geo.size.width > geo.size.height
            let outer = wide ? AnyLayout(HStackLayout(spacing: 16)) : AnyLayout(VStackLayout(spacing: 16))
            let buttons = wide ? AnyLayout(VStackLayout(spacing: 10)) : AnyLayout(HStackLayout(spacing: 10))
            outer {
                if !wide { header }
                stage(wide: wide)
                VStack(spacing: 12) {
                    if wide { header }
                    buttons {
                        ghostButton(session.micOn ? "마이크 끄기" : "마이크 켜기", icon: .mic, off: !session.micOn) {
                            session.setMic(!session.micOn)
                        }
                        ghostButton(session.cameraOn ? "카메라 끄기" : "카메라 켜기", icon: .camera, off: !session.cameraOn) {
                            session.setCamera(!session.cameraOn)
                        }
                        Button(action: onLeave) {
                            VStack(spacing: 6) {
                                PixelIcon(kind: .hangup)
                                Text("나가기").font(Theme.pixel(12, bold: true))
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                            .foregroundStyle(.white)
                            .modifier(PixelFrame(fill: Theme.warn))
                        }
                    }
                }
                .frame(width: wide ? 180 : nil)
            }
            .padding(wide ? 12 : 20)
        }
        // 공유가 시작되면 공유 화면을 크게, 끝나면 얼굴로 돌아간다.
        .onChange(of: session.partnerSharing) { _, sharing in
            big = sharing ? .screen : .face
        }
    }

    private var header: some View {
        HStack {
            Text(code)
                .font(Theme.pixel(12))
                .foregroundStyle(Theme.muted)
            Spacer()
            Text(statusLine)
                .font(Theme.pixel(12))
                .foregroundStyle(isProblem ? Theme.warn : Theme.muted)
        }
    }

    /// 영상 뷰(UIView)는 늘 같은 자리에 두고 크기와 zIndex 만 바꾼다. 뷰를 옮기면 Agora 가 그리던 곳이 끊긴다.
    private func stage(wide: Bool) -> some View {
        ZStack(alignment: .topLeading) {
            Theme.stage

            ZStack {
                VideoView(view: session.remoteView)
                if hasPartner && !session.partnerCameraOn {
                    CameraOffView(large: faceBig)
                }
                if !faceBig { TapToEnlarge() }
            }
            .modifier(StageSlot(big: faceBig, small: wide ? CGSize(width: 128, height: 96) : CGSize(width: 96, height: 128)))
            .onTapGesture { if !faceBig { big = .face } }

            ZStack {
                Color.black
                VideoView(view: session.screenView)
                if faceBig { TapToEnlarge() }
            }
            .modifier(StageSlot(big: !faceBig, small: wide ? CGSize(width: 160, height: 90) : CGSize(width: 128, height: 72)))
            .opacity(session.partnerSharing ? 1 : 0)
            .allowsHitTesting(session.partnerSharing)
            .onTapGesture { if faceBig { big = .screen } }

            if !hasPartner {
                VStack(spacing: 10) {
                    PixelIcon(kind: .person, size: 48)
                        .foregroundStyle(Theme.muted)
                        .frame(width: 64, height: 64)
                        .background(Theme.stageSoft)
                    Text(session.status.text)
                        .font(Theme.pixel(12))
                        .foregroundStyle(Theme.stageText)
                    if session.status == .unavailable {
                        Text("PartnerSession.swift 의 join(code:) 한 곳에서 들어옵니다")
                            .font(.system(size: 12, design: .monospaced))
                            .foregroundStyle(Theme.stageText.opacity(0.7))
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }

            ZStack {
                VideoView(view: session.localView)
                if !session.cameraOn {
                    CameraOffView(large: false)
                }
            }
                .frame(width: wide ? 128 : 96, height: wide ? 96 : 128)
                .background(Theme.stageSoft)
                .clipShape(Rectangle())
                .overlay(Rectangle().strokeBorder(.white.opacity(0.2), lineWidth: 2))
                .padding(12)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomTrailing)
                .zIndex(2)
        }
        .clipShape(Rectangle())
        .overlay(Rectangle().strokeBorder(Theme.ink, lineWidth: 2))
    }

    private var isProblem: Bool {
        if case .error = session.status { return true }
        return false
    }

    /// 통화 중에는 상대의 마이크·카메라 상태(RTM)를 같이 보여준다.
    private var statusLine: String {
        guard hasPartner else { return session.status.text }
        var parts: [String] = []
        if !session.partnerMicOn { parts.append("상대 마이크 꺼짐") }
        if !session.partnerCameraOn { parts.append("상대 카메라 꺼짐") }
        if session.partnerSharing { parts.append("화면 공유 중") }
        return parts.isEmpty ? session.status.text : parts.joined(separator: " · ")
    }

    private func ghostButton(_ title: String, icon: PixelIcon.Kind, off: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            VStack(spacing: 6) {
                PixelIcon(kind: icon, off: off)
                Text(title).font(Theme.pixel(12, bold: true))
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .foregroundStyle(off ? Theme.warn : Theme.ink)
            .modifier(PixelFrame())
        }
    }
}

/// 무대 위 영상 자리 하나. 크면 무대 전체, 작으면 왼쪽 위에 테두리 두른 작은 창(누르면 크게).
struct StageSlot: ViewModifier {
    let big: Bool
    let small: CGSize

    func body(content: Content) -> some View {
        content
            .frame(width: big ? nil : small.width, height: big ? nil : small.height)
            .frame(maxWidth: big ? .infinity : nil, maxHeight: big ? .infinity : nil)
            .background(big ? Theme.stage : Theme.stageSoft)
            .clipShape(Rectangle())
            .overlay(Rectangle().strokeBorder(.white.opacity(big ? 0 : 0.2), lineWidth: 2))
            .contentShape(Rectangle())
            .padding(big ? 0 : 12)
            .zIndex(big ? 0 : 1)
    }
}

/// 작은 창 아래에 붙는 안내. 웹 파트너 화면과 같은 문구다.
struct TapToEnlarge: View {
    var body: some View {
        Text("눌러서 크게")
            .font(Theme.pixel(12))
            .foregroundStyle(Theme.stageText)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 2)
            .background(Theme.stage.opacity(0.7))
            .frame(maxHeight: .infinity, alignment: .bottom)
    }
}

/// 카메라가 꺼진 자리. 검은 화면이나 멈춘 마지막 프레임 대신 보여준다. 내 카메라(작게)와 상대 카메라(크게, RTM 상태) 둘 다.
struct CameraOffView: View {
    let large: Bool

    var body: some View {
        VStack(spacing: 8) {
            PixelIcon(kind: .camera, off: true, size: large ? 48 : 24)
                .foregroundStyle(Theme.stageText)
            if large {
                Text("카메라 꺼짐")
                    .font(Theme.pixel(12))
                    .foregroundStyle(Theme.stageText)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(large ? Theme.stage : Theme.stageSoft)
        .accessibilityLabel("카메라 꺼짐")
    }
}

/// UIView 컨테이너를 SwiftUI 에 붙인다. Agora 는 이 뷰에 영상을 그린다.
struct VideoView: UIViewRepresentable {
    let view: UIView
    func makeUIView(context: Context) -> UIView { view }
    func updateUIView(_ uiView: UIView, context: Context) {}
}
