import AVFoundation
import Foundation
import UIKit

import AgoraRtcKit
import AgoraRtmKit

// 통화 경계 — 이 앱에서 Agora 가 들어오는 유일한 자리. 웹의 lib/call.ts 와 같은 역할이다.
//
// 화면은 이 클래스의 상태와 두 컨테이너 뷰만 안다.
//
//   join(code:micOn:) micOn 은 대기실에서 고른 마이크. false 면 오디오 전송을 끈 채 들어가고 presence 도 mic "off" 로 시작한다
//                 1) 웹앱 /api/agora/token?channel=<code>&uid=<난수>&rtm=1 로 RTC+RTM 통합 토큰 받기
//                 2) AgoraRtcEngineKit 준비 (communication 프로필, 오디오·비디오 켜기)
//                 3) 로컬 카메라를 localView 에, 채널 참가(숫자 uid), 마이크·카메라 publish → status = .waiting
//                 4) AgoraRtmClientKit 에 같은 토큰·userId String(uid) 로 로그인, 같은 이름의 채널 subscribe(presence),
//                    내 마이크·카메라를 presence state 로 올린다
//                 5) 상대 비디오 첫 프레임이 오면 remoteView 에 바인딩 → .connected
//                 6) 상대의 presence 스냅샷·STATE_CHANGED 로 partnerMicOn·partnerCameraOn 을 바꾼다
//                 7) 상대가 나가면 .partnerLeft
//   setMic/setCamera  로컬 트랙 mute + presence state 갱신
//   leave()       RTM 로그아웃·정리, 채널 떠나기, 엔진 정리 → .ended
//   실패는 .error(사유)
//
//   화면 공유 보기: 데스크톱이 화면을 공유하면 화면 uid(카메라 uid + 1,000,000) 참가자가 하나 더 들어온다.
//                 그 영상은 screenView 에 fit 으로 그리고 partnerSharing 을 켠다. 화면 uid 는 connected·partnerLeft 판단에 쓰지 않는다.
//                 uid 규칙은 웹 lib/call.ts 의 screenUidOf·isScreenUid 와 같다. 폰은 공유하지 않는다.
//
//   영상·음성은 RTC, "지금 마이크가 꺼져 있다" 는 상태는 RTM. 웹(lib/agora/rtc.ts + rtm.ts)과 같은 구조다.
//   presence state 의 값은 문자열이다: { mic: "on" | "off", camera: "on" | "off" }

enum PartnerStatus: Equatable {
    case idle
    case connecting
    case waiting
    case connected
    case partnerLeft
    case ended
    case unavailable
    case error(String)

    var text: String {
        switch self {
        case .idle: return "준비 중"
        case .connecting: return "미팅방에 들어가는 중이에요…"
        case .waiting: return "상대를 기다리는 중이에요"
        case .connected: return "통화 중"
        case .partnerLeft: return "상대가 나갔어요"
        case .ended: return "통화가 끝났어요"
        case .unavailable: return "아직 통화가 연결되지 않아요"
        case .error(let reason): return reason
        }
    }
}

@MainActor
final class PartnerSession: NSObject, ObservableObject {
    @Published private(set) var status: PartnerStatus = .idle
    @Published private(set) var micOn = true
    @Published private(set) var cameraOn = true
    /// 상대의 마이크·카메라. RTM presence state 로 온다.
    @Published private(set) var partnerMicOn = true
    @Published private(set) var partnerCameraOn = true
    /// 상대(데스크톱)가 화면을 공유하는 중인가. 화면 uid 의 첫 프레임이 오면 켜지고, 그 uid 가 나가면 꺼진다.
    @Published private(set) var partnerSharing = false

    /// 상대 영상이 그려지는 뷰. 화면이 붙여 주고, 통합 구현이 바인딩한다.
    let remoteView = UIView()
    /// 내 카메라 미리보기 뷰.
    let localView = UIView()
    /// 상대가 공유한 화면이 그려지는 뷰.
    let screenView = UIView()

    /// 카메라 uid 는 1~1,000,000. 그보다 크면 화면 공유 참가자다 (웹 lib/call.ts 의 SCREEN_UID_OFFSET).
    nonisolated static let screenUidOffset: UInt = 1_000_000
    nonisolated static func isScreenUid(_ uid: UInt) -> Bool { uid > screenUidOffset }

    private var engine: AgoraRtcEngineKit?
    private var rtm: AgoraRtmClientKit?
    /// 토큰을 다시 받을 때 쓴다. 토큰의 채널·uid 는 join 에 쓴 값과 같아야 한다.
    private var channel = ""
    private var uid: UInt = 0
    /// RTM userId. 토큰을 발급받은 identity 와 같아야 한다. 웹과 같은 규칙: String(uid).
    private var userId: String { String(uid) }

    func join(code: String, micOn: Bool = true) async {
        status = .connecting

        let channel = code.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !channel.isEmpty else {
            status = .error("미팅 코드를 넣어 주세요")
            return
        }
        guard !Config.appId.isEmpty else {
            status = .error("App ID 가 없어요. scripts/ios.sh gen 을 실행하세요")
            return
        }
        guard await grantedCameraAndMic() else {
            status = .error("카메라와 마이크 권한이 필요해요")
            return
        }

        // 웹(lib/agora/rtc.ts)과 같은 범위의 숫자 uid. 토큰이 이 uid 로 발급되므로 join 도 같은 값을 쓴다.
        let uid = UInt.random(in: 1...1_000_000)
        let token: String
        do {
            token = try await fetchToken(channel: channel, uid: uid)
        } catch {
            status = .error("토큰을 받지 못했어요: \(error.localizedDescription)")
            return
        }
        self.channel = channel
        self.uid = uid

        // RTC. delegate 는 엔진을 만들 때 등록된다. join 보다 먼저여야 이미 방에 있는 사람의 이벤트를 놓치지 않는다.
        let config = AgoraRtcEngineConfig()
        config.appId = Config.appId
        config.channelProfile = .communication
        let engine = AgoraRtcEngineKit.sharedEngine(with: config, delegate: self)
        self.engine = engine

        engine.enableVideo()
        engine.setVideoEncoderConfiguration(
            AgoraVideoEncoderConfiguration(
                size: CGSize(width: 640, height: 360),
                frameRate: AgoraVideoFrameRate.fps24.rawValue,
                bitrate: AgoraVideoBitrateStandard,
                orientationMode: .adaptative,
                mirrorMode: .auto
            )
        )
        engine.enableAudio()
        engine.setAudioProfile(.default)
        // iOS 는 communication 프로필에서 수화기가 기본이다. 폰을 세워 두고 쓰니 스피커로 돌린다.
        engine.setDefaultAudioRouteToSpeakerphone(true)

        let local = AgoraRtcVideoCanvas()
        local.uid = 0
        local.view = localView
        local.renderMode = .hidden
        engine.setupLocalVideo(local)
        engine.startPreview()

        let option = AgoraRtcChannelMediaOptions()
        option.clientRoleType = .broadcaster
        option.channelProfile = .communication
        option.publishCameraTrack = true
        option.publishMicrophoneTrack = true
        option.autoSubscribeAudio = true
        option.autoSubscribeVideo = true

        // 대기실에서 끄고 들어오면 참가 전에 오디오 전송을 막는다. 켜는 것은 setMic 과 같은 mute 해제다.
        self.micOn = micOn
        engine.muteLocalAudioStream(!micOn)

        let joined = engine.joinChannel(
            byToken: token,
            channelId: channel,
            uid: uid,
            mediaOptions: option,
            joinSuccess: nil
        )
        guard joined == 0 else {
            status = .error("미팅방에 들어가지 못했어요 (\(joined))")
            return
        }

        cameraOn = true
        partnerMicOn = true
        partnerCameraOn = true
        partnerSharing = false

        // RTM. 같은 토큰, userId 는 String(uid). 내 상태를 올리고 상대 상태를 받는다.
        do {
            try await joinStateChannel(appId: Config.appId, channel: channel, token: token)
        } catch {
            status = .error("상태 채널에 붙지 못했어요: \(error.localizedDescription)")
            return
        }

        // 상대가 이미 들어와 있으면 delegate 가 먼저 .connected 를 냈다. 그 위에 .waiting 을 덮지 않는다.
        if status != .connected { status = .waiting }
    }

    func setMic(_ on: Bool) {
        micOn = on
        engine?.muteLocalAudioStream(!on)
        publishState()
    }

    func setCamera(_ on: Bool) {
        cameraOn = on
        // 웹(setEnabled(false))처럼 캡처 자체를 멈춘다. 전송만 끄면 내 미리보기가 그대로 남는다.
        engine?.enableLocalVideo(on)
        publishState()
    }

    func leave() {
        if let rtm {
            rtm.unsubscribe(channel) { _, _ in }
            rtm.logout { _, _ in }
            _ = rtm.destroy()
            self.rtm = nil
        }
        if let engine {
            engine.stopPreview()
            engine.leaveChannel(nil)
            partnerSharing = false
            self.engine = nil
            AgoraRtcEngineKit.destroy()
        }
        status = .ended
    }

    // MARK: - RTM 상태 채널

    private var stateItems: [String: String] {
        ["mic": micOn ? "on" : "off", "camera": cameraOn ? "on" : "off"]
    }

    /// delegate 등록(생성 시) → login → subscribe(presence) → 내 상태 setState. 순서는 스킬 rtm/ios.md 그대로.
    private func joinStateChannel(appId: String, channel: String, token: String) async throws {
        let config = AgoraRtmClientConfig(appId: appId, userId: userId)
        let rtm = try AgoraRtmClientKit(config, delegate: self)
        self.rtm = rtm
        try await rtmCall { rtm.login(token, completion: $0) }

        let options = AgoraRtmSubscribeOptions()
        options.features = .presence
        try await rtmCall { rtm.subscribe(channelName: channel, option: options, completion: $0) }

        guard let presence = rtm.getPresence() else { throw Self.failure("presence 를 쓸 수 없어요") }
        let items = stateItems
        try await rtmCall { presence.setState(channelName: channel, channelType: .message, items: items, completion: $0) }
    }

    private func publishState() {
        guard let rtm, let presence = rtm.getPresence() else { return }
        presence.setState(channelName: channel, channelType: .message, items: stateItems) { _, _ in }
    }

    /// 상대 상태 적용. 키가 없으면 이전 값을 유지한다. "off" 일 때만 꺼진 것이다.
    private func applyPartner(_ states: [String: String]) {
        if let mic = states["mic"] { partnerMicOn = mic != "off" }
        if let camera = states["camera"] { partnerCameraOn = camera != "off" }
    }

    /// 완료 블록 API 를 async 로. errorInfo 가 오면 던진다.
    private func rtmCall(_ operation: (@escaping AgoraRtmOperationBlock) -> Void) async throws {
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            operation { _, errorInfo in
                if let errorInfo {
                    continuation.resume(throwing: Self.failure("RTM \(errorInfo.errorCode.rawValue): \(errorInfo.localizedDescription)"))
                } else {
                    continuation.resume()
                }
            }
        }
    }

    // MARK: - 토큰·권한

    private func fetchToken(channel: String, uid: UInt) async throws -> String {
        var components = URLComponents(
            url: Config.webBaseURL.appendingPathComponent("api/agora/token"),
            resolvingAgainstBaseURL: false
        )
        components?.queryItems = [
            URLQueryItem(name: "channel", value: channel),
            URLQueryItem(name: "uid", value: String(uid)),
            URLQueryItem(name: "rtm", value: "1"),
        ]
        guard let url = components?.url else { throw Self.failure("주소를 만들지 못했어요") }

        let (data, response) = try await URLSession.shared.data(from: url)
        let body = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
        if let token = body?["token"] as? String { return token }
        let code = (response as? HTTPURLResponse)?.statusCode ?? 0
        throw Self.failure(body?["error"] as? String ?? "웹앱 응답 \(code)")
    }

    private func grantedCameraAndMic() async -> Bool {
        let camera = await AVCaptureDevice.requestAccess(for: .video)
        let mic = await AVCaptureDevice.requestAccess(for: .audio)
        return camera && mic
    }

    private nonisolated static func failure(_ message: String) -> Error {
        NSError(domain: "Partner", code: 1, userInfo: [NSLocalizedDescriptionKey: message])
    }
}

// Agora 콜백은 백그라운드 스레드로 온다. 상태와 뷰는 MainActor 로 넘겨서 만진다.
extension PartnerSession: AgoraRtcEngineDelegate {
    nonisolated func rtcEngine(_ engine: AgoraRtcEngineKit, didJoinedOfUid uid: UInt, elapsed: Int) {
        Task { @MainActor in
            let screen = Self.isScreenUid(uid)
            let canvas = AgoraRtcVideoCanvas()
            canvas.uid = uid
            // 공유 화면은 잘리지 않게 fit, 얼굴은 꽉 차게 hidden.
            canvas.view = screen ? self.screenView : self.remoteView
            canvas.renderMode = screen ? .fit : .hidden
            engine.setupRemoteVideo(canvas)
        }
    }

    // 첫 프레임이 실제로 디코딩된 뒤에 "통화 중" 이라고 말한다.
    nonisolated func rtcEngine(
        _ engine: AgoraRtcEngineKit,
        remoteVideoStateChangedOfUid uid: UInt,
        state: AgoraVideoRemoteState,
        reason: AgoraVideoRemoteReason,
        elapsed: Int
    ) {
        if Self.isScreenUid(uid) {
            guard state == .decoding || state == .stopped else { return }
            Task { @MainActor in self.partnerSharing = state == .decoding }
            return
        }
        guard state == .decoding else { return }
        Task { @MainActor in
            if self.status != .connected { self.status = .connected }
        }
    }

    nonisolated func rtcEngine(_ engine: AgoraRtcEngineKit, didOfflineOfUid uid: UInt, reason: AgoraUserOfflineReason) {
        Task { @MainActor in
            let canvas = AgoraRtcVideoCanvas()
            canvas.uid = uid
            canvas.view = nil
            engine.setupRemoteVideo(canvas)
            if Self.isScreenUid(uid) {
                self.partnerSharing = false
                return
            }
            self.partnerMicOn = true
            self.partnerCameraOn = true
            self.status = .partnerLeft
        }
    }

    nonisolated func rtcEngine(_ engine: AgoraRtcEngineKit, tokenPrivilegeWillExpire token: String) {
        Task { @MainActor in
            guard let renewed = try? await self.fetchToken(channel: self.channel, uid: self.uid) else { return }
            engine.renewToken(renewed)
        }
    }

    nonisolated func rtcEngine(_ engine: AgoraRtcEngineKit, didOccurError errorCode: AgoraErrorCode) {
        Task { @MainActor in
            self.status = .error("통화 오류 (\(errorCode.rawValue))")
        }
    }
}

// 상대의 presence 이벤트. 스냅샷은 subscribe 직후 한 번(먼저 들어와 있던 상대의 상태), 그 뒤는 상대가 바꿀 때마다.
extension PartnerSession: AgoraRtmClientDelegate {
    nonisolated func rtmKit(_ rtmKit: AgoraRtmClientKit, didReceivePresenceEvent event: AgoraRtmPresenceEvent) {
        let type = event.type
        let publisher = event.publisher
        let states = event.states
        let snapshot = event.snapshot.map { ($0.userId, $0.states) }
        Task { @MainActor in
            switch type {
            case .snapshot:
                for (userId, states) in snapshot where userId != self.userId {
                    self.applyPartner(states)
                }
            case .remoteStateChanged:
                if let publisher, publisher != self.userId {
                    self.applyPartner(states)
                }
            default:
                break
            }
        }
    }
}
