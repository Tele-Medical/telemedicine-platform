# Low-Bandwidth Telemedicine

## What this pillar actually means

Low-bandwidth telemedicine is not simply "use WebRTC."

It means your consultation system must remain useful when:

- bandwidth drops sharply
- latency spikes
- packet loss increases
- one user changes towers
- video becomes impossible

The correct goal is not "always keep video on." The correct goal is:

`preserve the clinical interaction using the best mode the network can support`

## Core idea: graceful degradation

Graceful degradation means the call steps down in quality instead of collapsing completely.

A good degradation ladder is:

1. normal video + audio
2. lower-resolution video + audio
3. very low bitrate video + audio
4. audio only
5. asynchronous fallback: chat, image upload, callback scheduling

This is much better than a single hard failure.

## Important WebRTC concepts

## WebRTC

`WebRTC` is the browser technology that enables real-time audio, video, and data exchange.

It gives you:

- peer-to-peer media transport
- encryption by default in supported browser flows
- support for audio/video tracks
- statistics for call quality monitoring

## Signaling

Before a WebRTC call begins, the peers need to exchange setup information.

That exchange is called `signaling`.

It is usually implemented through:

- WebSocket
- HTTP polling
- Socket.IO

Signaling sends things like:

- offer
- answer
- ICE candidates
- reconnect messages

## ICE

`ICE` means `Interactive Connectivity Establishment`.

It is the process WebRTC uses to find a workable network path between devices.

## STUN

`STUN` helps a device discover its public-facing network address.

Think of it as:

"What address does the outside world see me as?"

## TURN

`TURN` relays traffic when direct peer-to-peer connection is not possible.

TURN is more expensive than direct connection because your server relays media, but in rural mobile networks it is often essential.

## coturn

`coturn` is a widely used open-source TURN/STUN server implementation.

For a serious demo, saying "we use coturn for TURN/STUN" sounds much stronger than just saying "we use WebRTC."

## NAT

`NAT` means `Network Address Translation`.

Many devices sit behind routers or mobile carrier networking that hides their private address. This makes direct peer-to-peer connection hard.

STUN and TURN exist largely because of NAT and firewall realities.

## Why low-bandwidth tuning matters

WebRTC will do some adaptation automatically, but that is not enough for rural health use cases.

You should actively design for:

- preferred codec selection
- bitrate caps
- frame rate reduction
- resolution downscaling
- audio priority
- fallback behavior

## Codec basics

A `codec` compresses and decompresses media.

For WebRTC discussions, a codec decision affects:

- quality
- bandwidth use
- CPU load
- browser compatibility

In practice, for cross-browser safety, `VP8` is a common baseline video choice, while `Opus` is the usual audio choice.

Do not overstate exact bitrate numbers as universal truth. Actual performance depends on:

- device
- browser
- network
- lighting
- motion in camera feed

## Controlling bandwidth in practice

WebRTC exposes tools you should understand:

### `RTCRtpSender.setParameters()`

This lets you adjust sending behavior such as:

- `maxBitrate`
- `maxFramerate`
- `scaleResolutionDownBy`

This is how you can reduce outgoing video cost when bandwidth drops.

### `RTCRtpTransceiver.setCodecPreferences()`

This lets you influence codec negotiation order.

This is useful when you want predictable codec choices instead of whatever default ordering the browser prefers.

### `RTCPeerConnection.getStats()`

This gives connection telemetry such as:

- bitrate
- packet loss
- round-trip time
- jitter
- frame rate

You need this to make informed adaptation decisions.

## Practical bandwidth strategy

For your project, implement a policy like this:

### Initial default

- start with low-to-medium video quality
- keep audio stable
- avoid starting with unnecessarily high resolution

### Degradation triggers

If stats show:

- high packet loss
- rising RTT
- falling send bitrate
- repeated freeze events

then:

- reduce resolution
- reduce frame rate
- lower bitrate ceiling
- if still unstable, switch to audio-only

### Recovery triggers

If connection improves consistently for a time window:

- slowly upgrade video again
- do not jump instantly to high quality

This prevents oscillation.

## Why audio matters more than video

In many consultations, audio carries most of the clinical value.

Examples:

- history taking
- medication explanation
- follow-up check
- symptom clarification

Video is still useful for:

- visible swelling
- wound inspection
- skin conditions
- non-verbal assessment

But if you must choose, preserve audio first.

## Clinical workflow design for weak networks

Do not rely only on the live call.

Support these extra flows:

### Pre-call symptom capture

Before the call, gather:

- complaint
- duration
- fever
- blood pressure if available
- past condition summary

This reduces wasted consultation time.

### In-call text chat

Text can help if audio cuts briefly.

### Photo upload

For dermatology or wound cases, a photo may be more clinically useful than unstable video.

### Post-call summary

If the call quality was poor, the patient should still get:

- doctor summary
- prescription
- follow-up plan

## Fallback architecture

Your fallback path should be internal and planned, not improvised.

Recommended fallback hierarchy:

1. WebRTC video
2. WebRTC audio-only
3. store-and-forward consultation package
4. assisted callback scheduling

### Store-and-forward means

The patient or worker can send:

- typed symptoms
- voice note
- images
- vitals

and the doctor can respond later.

This is especially important when synchronous calling is impossible.

## Device and field testing

Claude was right about one thing very strongly:

`Do not test only on college WiFi`

You should test on:

- real Android phones
- weak mobile data
- movement between network conditions
- low battery mode
- background/foreground app switches

Suggested test scenarios:

1. start call on good network, then throttle hard
2. start call on poor network from the beginning
3. disconnect and reconnect mid-consultation
4. switch from video to audio automatically
5. upload image while call quality is poor

## Mistakes to avoid

### Mistake 1: designing for a perfect video demo

Judges care more about robustness than glamour.

### Mistake 2: hiding call quality problems

Show connection status clearly.

Examples:

- Good
- Weak
- Audio only
- Reconnecting

### Mistake 3: depending on third-party chat apps as core fallback

This weakens your product story and can create privacy and workflow problems.

## What to say in your architecture explanation

"Our telemedicine stack uses WebRTC with a custom signaling layer, STUN/TURN via coturn for NAT traversal, bandwidth-aware adaptation based on call stats, and graceful fallback from video to audio to asynchronous consultation when the network cannot sustain a live session."

## Key sources

- MDN getStats: https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/getStats
- MDN setParameters: https://developer.mozilla.org/en-US/docs/Web/API/RTCRtpSender/setParameters
- MDN setCodecPreferences: https://developer.mozilla.org/en-US/docs/Web/API/RTCRtpTransceiver/setCodecPreferences
- MDN TURN glossary: https://developer.mozilla.org/en-US/docs/Glossary/TURN
- coturn project: https://github.com/coturn/coturn
