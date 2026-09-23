/* 스피커 기기 본체: 버튼(Enter) · 마이크/스피커(ALSA) · 서버 호출(libcurl).
 * 채널은 agora_link.h 계약으로만 다룬다. Agora SDK 헤더를 include 하지 않는다. */
#include <alsa/asoundlib.h>
#include <ctype.h>
#include <curl/curl.h>
#include <errno.h>
#include <getopt.h>
#include <pthread.h>
#include <signal.h>
#include <stdbool.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

#include "agora_link.h"

#define DEVICE_UID 2001
#define AGENT_UID 1001
#define RING_SAMPLES LINK_SAMPLE_RATE /* 재생 버퍼 1초 */

static char g_server[256];
static char g_channel[96];
static int g_unit = 4;
static const char *g_alsa = "default";
static volatile sig_atomic_t g_running = 1;

static char g_agent_id[128];
static pthread_mutex_t g_agent_lock = PTHREAD_MUTEX_INITIALIZER;

/* ---- 재생 링 버퍼: SDK 콜백이 넣고 재생 스레드가 뺀다 ---- */

static int16_t g_ring[RING_SAMPLES];
static size_t g_head, g_count;
static pthread_mutex_t g_ring_lock = PTHREAD_MUTEX_INITIALIZER;

static void ring_push(const int16_t *pcm, size_t n)
{
  pthread_mutex_lock(&g_ring_lock);
  for (size_t i = 0; i < n; i++) {
    if (g_count == RING_SAMPLES) { /* 가득 차면 가장 오래된 것을 버린다 */
      g_head = (g_head + 1) % RING_SAMPLES;
      g_count--;
    }
    g_ring[(g_head + g_count) % RING_SAMPLES] = pcm[i];
    g_count++;
  }
  pthread_mutex_unlock(&g_ring_lock);
}

static void ring_pop(int16_t *out, size_t n)
{
  size_t i = 0;
  pthread_mutex_lock(&g_ring_lock);
  for (; i < n && g_count > 0; i++) {
    out[i] = g_ring[g_head];
    g_head = (g_head + 1) % RING_SAMPLES;
    g_count--;
  }
  pthread_mutex_unlock(&g_ring_lock);
  for (; i < n; i++) out[i] = 0; /* 모자라면 무음 */
}

/* ---- 마이크·스피커 (ALSA) ---- */

static snd_pcm_t *open_pcm(snd_pcm_stream_t dir)
{
  const char *what = dir == SND_PCM_STREAM_CAPTURE ? "마이크" : "스피커";
  snd_pcm_t *pcm = NULL;
  int err = snd_pcm_open(&pcm, g_alsa, dir, 0);
  if (err < 0) {
    fprintf(stderr, "%s를 열 수 없어요 (%s): %s\n", what, g_alsa, snd_strerror(err));
    return NULL;
  }
  err = snd_pcm_set_params(pcm, SND_PCM_FORMAT_S16_LE, SND_PCM_ACCESS_RW_INTERLEAVED, 1,
                           LINK_SAMPLE_RATE, 1, 100000);
  if (err < 0) {
    fprintf(stderr, "%s를 16kHz 모노로 설정할 수 없어요: %s\n", what, snd_strerror(err));
    snd_pcm_close(pcm);
    return NULL;
  }
  return pcm;
}

static void *capture_loop(void *arg)
{
  snd_pcm_t *pcm = arg;
  int16_t frame[LINK_FRAME_SAMPLES];
  while (g_running) {
    snd_pcm_sframes_t n = snd_pcm_readi(pcm, frame, LINK_FRAME_SAMPLES);
    if (n < 0) {
      if (snd_pcm_recover(pcm, (int)n, 1) < 0) {
        fprintf(stderr, "마이크를 읽을 수 없어요: %s\n", snd_strerror((int)n));
        break;
      }
      continue;
    }
    if (n == LINK_FRAME_SAMPLES) link_send(frame, (size_t)n);
  }
  return NULL;
}

static void *playback_loop(void *arg)
{
  snd_pcm_t *pcm = arg;
  int16_t frame[LINK_FRAME_SAMPLES];
  while (g_running) {
    ring_pop(frame, LINK_FRAME_SAMPLES);
    snd_pcm_sframes_t n = snd_pcm_writei(pcm, frame, LINK_FRAME_SAMPLES);
    if (n < 0 && snd_pcm_recover(pcm, (int)n, 1) < 0) {
      fprintf(stderr, "스피커에 쓸 수 없어요: %s\n", snd_strerror((int)n));
      break;
    }
  }
  return NULL;
}

/* ---- 서버 호출 (libcurl) ---- */

typedef struct {
  char *buf;
  size_t len, cap;
} body_t;

static size_t on_body(char *ptr, size_t size, size_t nmemb, void *userdata)
{
  body_t *b = userdata;
  size_t k = size * nmemb;
  size_t room = b->cap - 1 - b->len;
  size_t c = k < room ? k : room;
  memcpy(b->buf + b->len, ptr, c);
  b->len += c;
  b->buf[b->len] = '\0';
  return k;
}

/* HTTP 상태 코드를 돌려준다. 서버에 닿지 않으면 -1 */
static long http(const char *method, const char *url, const char *json, char *out, size_t cap)
{
  CURL *c = curl_easy_init();
  if (!c) return -1;
  body_t b = { out, 0, cap };
  out[0] = '\0';
  struct curl_slist *headers = NULL;
  curl_easy_setopt(c, CURLOPT_URL, url);
  curl_easy_setopt(c, CURLOPT_CUSTOMREQUEST, method);
  curl_easy_setopt(c, CURLOPT_TIMEOUT, 20L);
  curl_easy_setopt(c, CURLOPT_WRITEFUNCTION, on_body);
  curl_easy_setopt(c, CURLOPT_WRITEDATA, &b);
  if (json) {
    headers = curl_slist_append(headers, "Content-Type: application/json");
    curl_easy_setopt(c, CURLOPT_HTTPHEADER, headers);
    curl_easy_setopt(c, CURLOPT_POSTFIELDS, json);
  }
  long status = -1;
  CURLcode rc = curl_easy_perform(c);
  if (rc == CURLE_OK) {
    curl_easy_getinfo(c, CURLINFO_RESPONSE_CODE, &status);
  } else {
    fprintf(stderr, "서버에 닿지 않아요: %s\n", curl_easy_strerror(rc));
  }
  curl_slist_free_all(headers);
  curl_easy_cleanup(c);
  return status;
}

/* {"key":"value"} 에서 문자열 값 하나를 꺼낸다. 이스케이프는 다루지 않는다. */
static bool json_str(const char *json, const char *key, char *out, size_t cap)
{
  char pat[64];
  snprintf(pat, sizeof pat, "\"%s\"", key);
  const char *p = strstr(json, pat);
  if (!p) return false;
  p = strchr(p + strlen(pat), ':');
  if (!p) return false;
  p++;
  while (*p == ' ') p++;
  if (*p != '"') return false;
  p++;
  size_t i = 0;
  while (*p && *p != '"' && i + 1 < cap) out[i++] = *p++;
  out[i] = '\0';
  return *p == '"';
}

static bool fetch_token(char *app_id, size_t app_cap, char *token, size_t token_cap)
{
  char url[512], body[4096];
  snprintf(url, sizeof url, "%s/api/token?channel=%s&uid=%d", g_server, g_channel, DEVICE_UID);
  long st = http("GET", url, NULL, body, sizeof body);
  if (st == 501) {
    puts("아직 채널에 연결되지 않아요 (토큰 서버가 껍데기예요)");
    return false;
  }
  if (st != 200 || !json_str(body, "appId", app_id, app_cap) || !json_str(body, "token", token, token_cap)) {
    printf("토큰을 받지 못했어요 (HTTP %ld)\n", st);
    return false;
  }
  return true;
}

static void agent_stop(void)
{
  char id[sizeof g_agent_id];
  pthread_mutex_lock(&g_agent_lock);
  snprintf(id, sizeof id, "%s", g_agent_id);
  g_agent_id[0] = '\0';
  pthread_mutex_unlock(&g_agent_lock);
  if (!id[0]) return;

  char url[512], body[1024];
  snprintf(url, sizeof url, "%s/api/agent?agentId=%s", g_server, id);
  long st = http("DELETE", url, NULL, body, sizeof body);
  if (st == 200) puts("Mia 가 쉬러 갔어요");
  else if (st == 501) puts("아직 Mia 를 부를 수 없어요");
  else printf("Mia 를 내보내지 못했어요 (HTTP %ld)\n", st);
}

static void agent_start(void)
{
  char url[512], json[256], body[1024], id[sizeof g_agent_id];
  snprintf(url, sizeof url, "%s/api/agent", g_server);
  snprintf(json, sizeof json, "{\"channel\":\"%s\",\"uid\":%d,\"unitId\":%d}", g_channel, DEVICE_UID, g_unit);
  puts("Mia 를 부르는 중이에요…");
  long st = http("POST", url, json, body, sizeof body);
  if (st == 501) {
    puts("아직 Mia 를 부를 수 없어요");
    return;
  }
  if (st != 200 || !json_str(body, "agentId", id, sizeof id)) {
    char reason[256] = "";
    json_str(body, "error", reason, sizeof reason);
    printf("Mia 를 부르지 못했어요 (HTTP %ld) %s\n", st, reason);
    return;
  }
  pthread_mutex_lock(&g_agent_lock);
  snprintf(g_agent_id, sizeof g_agent_id, "%s", id);
  pthread_mutex_unlock(&g_agent_lock);
  puts("Mia 를 불렀어요. 곧 인사할 거예요");
}

static void on_button(void)
{
  pthread_mutex_lock(&g_agent_lock);
  bool on = g_agent_id[0] != '\0';
  pthread_mutex_unlock(&g_agent_lock);
  if (on) agent_stop();
  else agent_start();
}

/* ---- 채널 이벤트 ---- */

static void on_audio(const int16_t *pcm, size_t samples)
{
  ring_push(pcm, samples);
}

static void on_event(const char *event, uint32_t uid)
{
  if (!strcmp(event, "joined")) {
    printf("채널에 들어왔어요 · %s\n", g_channel);
  } else if (!strcmp(event, "remote-joined")) {
    if (uid == AGENT_UID) puts("Mia 가 들어왔어요");
  } else if (!strcmp(event, "remote-left")) {
    if (uid == AGENT_UID) {
      pthread_mutex_lock(&g_agent_lock);
      g_agent_id[0] = '\0'; /* 스스로 나간 경우(유휴 시간 초과 등)도 다음 버튼에 다시 부른다 */
      pthread_mutex_unlock(&g_agent_lock);
      puts("Mia 가 나갔어요");
    }
  } else if (!strcmp(event, "lost")) {
    puts("연결이 끊겼어요. 다시 붙는 중이에요");
  } else if (!strcmp(event, "error")) {
    puts("채널에 문제가 생겼어요");
  }
}

/* ---- 시작 ---- */

static void on_signal(int sig)
{
  (void)sig;
  g_running = 0;
}

static void usage(const char *prog)
{
  fprintf(stderr,
          "사용법: %s --server <URL> [--name <기기 이름>] [--unit <1~10>] [--alsa <장치>]\n"
          "  --server  웹 서버 주소. 예: http://192.168.0.10:3000\n"
          "  --name    채널 이름 speaker-<이름>. 기본은 호스트 이름\n"
          "  --unit    오늘의 유닛. 기본 4 (주말에 뭐 했어?)\n"
          "  --alsa    ALSA 장치. 기본 default\n",
          prog);
}

static void set_channel(const char *name)
{
  char clean[64];
  size_t j = 0;
  for (size_t i = 0; name[i] && j + 1 < sizeof clean; i++) {
    char ch = (char)tolower((unsigned char)name[i]);
    if (isalnum((unsigned char)ch) || ch == '-') clean[j++] = ch;
  }
  clean[j] = '\0';
  snprintf(g_channel, sizeof g_channel, "speaker-%s", j ? clean : "device");
}

int main(int argc, char **argv)
{
  setvbuf(stdout, NULL, _IOLBF, 0);

  const char *name = NULL;
  static const struct option opts[] = {
    { "server", required_argument, NULL, 's' },
    { "name", required_argument, NULL, 'n' },
    { "unit", required_argument, NULL, 'u' },
    { "alsa", required_argument, NULL, 'a' },
    { "help", no_argument, NULL, 'h' },
    { 0, 0, 0, 0 },
  };
  int ch;
  while ((ch = getopt_long(argc, argv, "s:n:u:a:h", opts, NULL)) != -1) {
    switch (ch) {
    case 's': snprintf(g_server, sizeof g_server, "%s", optarg); break;
    case 'n': name = optarg; break;
    case 'u': g_unit = atoi(optarg); break;
    case 'a': g_alsa = optarg; break;
    default: usage(argv[0]); return ch == 'h' ? 0 : 2;
    }
  }
  if (!g_server[0] || g_unit < 1 || g_unit > 10) {
    usage(argv[0]);
    return 2;
  }
  size_t sl = strlen(g_server);
  while (sl > 0 && g_server[sl - 1] == '/') g_server[--sl] = '\0';

  char host[64] = "";
  if (!name) {
    gethostname(host, sizeof host - 1);
    name = host;
  }
  set_channel(name);

  struct sigaction sa = { 0 };
  sa.sa_handler = on_signal; /* SA_RESTART 없이: Enter 대기 중에도 Ctrl+C 로 빠진다 */
  sigaction(SIGINT, &sa, NULL);
  sigaction(SIGTERM, &sa, NULL);

  curl_global_init(CURL_GLOBAL_DEFAULT);

  snd_pcm_t *mic = open_pcm(SND_PCM_STREAM_CAPTURE);
  snd_pcm_t *spk = open_pcm(SND_PCM_STREAM_PLAYBACK);
  if (!mic || !spk) return 1;

  printf("스피커를 켰어요 · %s · 오늘의 유닛 %d\n", g_channel, g_unit);

  char app_id[64], token[1024];
  if (fetch_token(app_id, sizeof app_id, token, sizeof token)) {
    link_options_t lo = {
      .app_id = app_id,
      .token = token,
      .channel = g_channel,
      .uid = DEVICE_UID,
      .on_audio = on_audio,
      .on_event = on_event,
    };
    link_start(&lo);
  }

  pthread_t cap_thread, play_thread;
  pthread_create(&cap_thread, NULL, capture_loop, mic);
  pthread_create(&play_thread, NULL, playback_loop, spk);

  puts("Enter: Mia 부르기·보내기 · q Enter: 끄기");
  char line[64];
  while (g_running) {
    if (!fgets(line, sizeof line, stdin)) {
      if (errno == EINTR) continue;
      /* 표준입력이 없으면(백그라운드 실행) 신호가 올 때까지 기다린다 */
      while (g_running) pause();
      break;
    }
    if (line[0] == 'q') break;
    on_button();
  }

  g_running = 0;
  agent_stop();
  pthread_join(cap_thread, NULL);
  pthread_join(play_thread, NULL);
  link_stop();
  snd_pcm_close(mic);
  snd_pcm_close(spk);
  curl_global_cleanup();
  puts("스피커를 껐어요");
  return 0;
}
