/* 껍데기: 통합 단계가 이 파일을 채운다. */
/* 채널 경계 구현. Agora IoT SDK 는 이 파일에서만 부른다. */
#include <stdio.h>

#include "agora_link.h"

int link_start(const link_options_t *opt)
{
  (void)opt;
  fprintf(stderr, "아직 채널에 연결되지 않아요\n");
  return -1;
}

int link_send(const int16_t *pcm, size_t samples)
{
  (void)pcm;
  (void)samples;
  return 0;
}

void link_stop(void)
{
}
