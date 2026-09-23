CC ?= gcc
CFLAGS ?= -O2 -Wall -Wextra
LDLIBS = -lasound -lcurl -lpthread

# sdk.sh 로 받은 Agora IoT SDK 가 있으면 링크한다. 껍데기는 SDK 없이도 빌드된다.
ifneq ($(wildcard sdk/lib/libagora-rtc-sdk.so),)
CFLAGS += -Isdk/include
LDLIBS += -Lsdk/lib -lagora-rtc-sdk -Wl,-rpath,'$$ORIGIN/sdk/lib'
endif

speaker: speaker.c agora_link.c agora_link.h
	$(CC) $(CFLAGS) -o $@ speaker.c agora_link.c $(LDLIBS)

clean:
	rm -f speaker

.PHONY: clean
