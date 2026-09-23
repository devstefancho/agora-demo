/* 채널 경계 구현. Agora IoT SDK(RTSA Lite)는 이 파일에서만 부른다.
 * 순서는 SDK 패키지의 example/hello_rtsa.c 를 줄인 것이다:
 * init(핸들러 먼저) → create_connection → join_channel → send_audio_data … → leave → destroy → fini */
#include <stdbool.h>
#include <stdio.h>
#include <string.h>

#include "agora_link.h"
#include "agora_rtc_api.h"

static connection_id_t g_conn;
static volatile bool g_started;
static volatile bool g_joined;
static link_options_t g_opt;

static void on_join_channel_success(connection_id_t conn_id, uint32_t uid, int elapsed_ms)
{
  (void)conn_id;
  (void)elapsed_ms;
  g_joined = true;
  if (g_opt.on_event) g_opt.on_event("joined", uid);
}

static void on_rejoin_channel_success(connection_id_t conn_id, uint32_t uid, int elapsed_ms)
{
  on_join_channel_success(conn_id, uid, elapsed_ms);
}

static void on_connection_lost(connection_id_t conn_id)
{
  (void)conn_id;
  g_joined = false;
  if (g_opt.on_event) g_opt.on_event("lost", 0);
}

static void on_user_joined(connection_id_t conn_id, uint32_t uid, int elapsed_ms)
{
  (void)conn_id;
  (void)elapsed_ms;
  if (g_opt.on_event) g_opt.on_event("remote-joined", uid);
}

static void on_user_offline(connection_id_t conn_id, uint32_t uid, int reason)
{
  (void)conn_id;
  (void)reason;
  if (g_opt.on_event) g_opt.on_event("remote-left", uid);
}

static void on_error(connection_id_t conn_id, int code, const char *msg)
{
  (void)conn_id;
  fprintf(stderr, "Agora 오류 %d: %s\n", code, msg ? msg : "");
  if (g_opt.on_event) g_opt.on_event("error", 0);
}

static void on_license_failure(connection_id_t conn_id, int error)
{
  (void)conn_id;
  fprintf(stderr, "IoT SDK 라이선스 확인 실패: %d\n", error);
  if (g_opt.on_event) g_opt.on_event("error", 0);
}

static void on_token_will_expire(connection_id_t conn_id, const char *token)
{
  (void)conn_id;
  (void)token;
  fprintf(stderr, "토큰이 곧 만료돼요. 스피커를 다시 켜 주세요\n");
}

/* enable_audio_decode 를 켰으므로 상대(에이전트) 음성이 PCM 으로 온다 */
static void on_audio_data(connection_id_t conn_id, const uint32_t uid, uint16_t sent_ts, const void *data_ptr,
                          size_t data_len, const audio_frame_info_t *info_ptr)
{
  (void)conn_id;
  (void)uid;
  (void)sent_ts;
  if (info_ptr->data_type != AUDIO_DATA_TYPE_PCM || !g_opt.on_audio) return;
  g_opt.on_audio((const int16_t *)data_ptr, data_len / sizeof(int16_t));
}

int link_start(const link_options_t *opt)
{
  if (g_started) return 0;
  g_opt = *opt;

  agora_rtc_event_handler_t handler;
  memset(&handler, 0, sizeof handler);
  handler.on_join_channel_success = on_join_channel_success;
  handler.on_rejoin_channel_success = on_rejoin_channel_success;
  handler.on_connection_lost = on_connection_lost;
  handler.on_user_joined = on_user_joined;
  handler.on_user_offline = on_user_offline;
  handler.on_error = on_error;
  handler.on_license_validation_failure = on_license_failure;
  handler.on_token_privilege_will_expire = on_token_will_expire;
  handler.on_audio_data = on_audio_data;

  rtc_service_option_t service;
  memset(&service, 0, sizeof service);
  service.area_code = AREA_CODE_GLOB;
  service.log_cfg.log_level = RTC_LOG_WARNING;
  service.log_cfg.log_path = "io.agora.rtc_sdk";
  /* license_value 를 비우면 SDK 패키지의 개발용 테스트 라이선스를 쓴다 */

  int rc = agora_rtc_init(opt->app_id, &handler, &service);
  if (rc < 0) {
    fprintf(stderr, "Agora SDK 초기화 실패: %s\n", agora_rtc_err_2_str(rc));
    return rc;
  }
  rc = agora_rtc_create_connection(&g_conn);
  if (rc < 0) {
    fprintf(stderr, "연결을 만들지 못했어요: %s\n", agora_rtc_err_2_str(rc));
    agora_rtc_fini();
    return rc;
  }

  rtc_channel_options_t ch;
  memset(&ch, 0, sizeof ch);
  ch.auto_subscribe_audio = true;
  ch.auto_subscribe_video = false;
  ch.enable_audio_decode = true; /* 받은 G.722 를 PCM 으로 */
  ch.audio_codec_opt.audio_codec_type = AUDIO_CODEC_TYPE_G722; /* 보내는 PCM 을 SDK 가 G.722 로 */
  ch.audio_codec_opt.pcm_sample_rate = LINK_SAMPLE_RATE;
  ch.audio_codec_opt.pcm_channel_num = 1;
  ch.audio_codec_opt.pcm_duration = 20;

  rc = agora_rtc_join_channel(g_conn, opt->channel, opt->uid, opt->token, &ch);
  if (rc < 0) {
    fprintf(stderr, "채널 %s 에 들어가지 못했어요: %s\n", opt->channel, agora_rtc_err_2_str(rc));
    agora_rtc_destroy_connection(g_conn);
    agora_rtc_fini();
    return rc;
  }
  g_started = true;
  return 0;
}

int link_send(const int16_t *pcm, size_t samples)
{
  if (!g_started || !g_joined) return 0; /* 입장 전에는 조용히 버린다 */
  audio_frame_info_t info;
  memset(&info, 0, sizeof info);
  info.data_type = AUDIO_DATA_TYPE_PCM;
  return agora_rtc_send_audio_data(g_conn, pcm, samples * sizeof(int16_t), &info);
}

void link_stop(void)
{
  if (!g_started) return;
  g_started = false;
  g_joined = false;
  agora_rtc_leave_channel(g_conn);
  agora_rtc_destroy_connection(g_conn);
  agora_rtc_fini();
}
