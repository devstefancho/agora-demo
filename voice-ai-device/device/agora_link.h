/* 채널 경계 계약. speaker.c 는 이 헤더만 알고 Agora SDK 헤더를 include 하지 않는다. */
#ifndef AGORA_LINK_H
#define AGORA_LINK_H

#include <stddef.h>
#include <stdint.h>

#define LINK_SAMPLE_RATE 16000
#define LINK_FRAME_SAMPLES 320 /* 20ms */

/* 상대(에이전트) 음성. 16kHz 모노 PCM */
typedef void (*link_audio_cb)(const int16_t *pcm, size_t samples);
/* "joined" | "remote-joined" | "remote-left" | "lost" | "error" */
typedef void (*link_event_cb)(const char *event, uint32_t uid);

typedef struct {
  const char *app_id;
  const char *token;
  const char *channel;
  uint32_t uid;
  link_audio_cb on_audio;
  link_event_cb on_event;
} link_options_t;

/* 0 성공, 음수 실패. 채널 입장은 비동기로 on_event("joined") */
int link_start(const link_options_t *opt);
/* 마이크 20ms 한 프레임 */
int link_send(const int16_t *pcm, size_t samples);
void link_stop(void);

#endif
