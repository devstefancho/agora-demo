# 기기 프로그램

마이크와 스피커가 달린 리눅스 기기(x86_64 또는 aarch64)에서 빌드하고 실행한다. 라즈베리파이 같은 보드도, 리눅스 노트북도 된다. 기기는 개발 맥과 같은 네트워크에 있어야 한다.

## 준비

```bash
sudo apt install gcc make libasound2-dev libcurl4-openssl-dev
./sdk.sh      # Agora IoT SDK(RTSA Lite)를 sdk/ 에 받는다. 아키텍처는 자동
make
```

SDK 패키지에는 개발용 테스트 라이선스가 들어 있다. 제품으로 내보내려면 상용 라이선스가 필요하다.

## 실행

개발 맥에서 `web/` 의 `pnpm dev -H 0.0.0.0` 을 띄운 뒤 기기에서:

```bash
./speaker --server http://<맥 IP>:3000 --name desk
```

| 입력 | 동작 |
|---|---|
| Enter | Mia 를 부른다. 한 번 더 누르면 보낸다 |
| q Enter, Ctrl+C | Mia 를 보내고 끈다 |

`--unit <1~10>` 으로 오늘의 유닛을 바꾼다(기본 4, 주말에 뭐 했어?). `--alsa <장치>` 로 마이크·스피커 장치를 고른다(기본 `default`).

## 스피커 소리가 다시 들어갈 때

기기 스피커 소리를 기기 마이크가 다시 주우면 Mia 가 자기 말에 끊긴다. 마이크와 스피커를 떨어뜨리거나, 기기 쪽 에코 제거를 켠다. 리눅스 데스크톱(PipeWire)은 echo-cancel 모듈을 켜고 그 장치를 `--alsa` 로 준다.
