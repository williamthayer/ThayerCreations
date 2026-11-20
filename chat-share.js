(() => {
  const WORDS = [
    'acorn', 'amber', 'anchor', 'apricot', 'arch', 'arrow', 'atlas', 'aurora',
    'badger', 'bamboo', 'beacon', 'birch', 'blossom', 'bluejay', 'breeze', 'brook',
    'cactus', 'candle', 'canvas', 'cedar', 'cherry', 'cinder', 'cobalt', 'comet',
    'coral', 'cosmos', 'cricket', 'crystal', 'daisy', 'delta', 'dolphin', 'dune',
    'eagle', 'echo', 'elm', 'ember', 'falcon', 'fern', 'field', 'finch',
    'flame', 'flint', 'forest', 'fossil', 'fountain', 'fox', 'galaxy', 'garden',
    'garlic', 'gecko', 'ginger', 'glacier', 'glimmer', 'globe', 'goldfinch', 'granite',
    'harbor', 'hazel', 'heron', 'honey', 'horizon', 'hyacinth', 'iceberg', 'indigo',
    'island', 'ivory', 'jasmine', 'jigsaw', 'juniper', 'kestrel', 'kiwi', 'lagoon',
    'lantern', 'laurel', 'lemon', 'lilac', 'linden', 'lotus',
    'lunar', 'maple', 'marble', 'marigold', 'meadow', 'meteor', 'mint', 'mist',
    'moon', 'moss', 'mountain', 'nectar', 'newt', 'nickel', 'north', 'nova',
    'oak', 'ocean', 'olive', 'onyx', 'opal', 'orbit', 'orchid', 'otter',
    'panda', 'paper', 'parrot', 'pebble', 'pepper', 'petal', 'phoenix', 'pine',
    'planet', 'plum', 'pocket', 'poppy', 'prairie', 'prism', 'quartz', 'quest',
    'rabbit', 'radar', 'rainbow', 'raven', 'reef', 'river', 'robin', 'rocket',
    'rose', 'saffron', 'sage', 'sailor', 'saturn', 'scarlet', 'seashell', 'shadow',
    'silver', 'sky', 'slate', 'snow', 'solar', 'sparrow', 'spectrum', 'spice',
    'spring', 'spruce', 'star', 'stone', 'storm', 'summer', 'sunbeam', 'sunset',
    'swift', 'tangerine', 'temple', 'thistle', 'thunder', 'tiger', 'timber', 'topaz',
    'trail', 'tulip', 'tundra', 'turtle', 'twilight', 'umber', 'valley', 'velvet',
    'verbena', 'violet', 'volcano', 'walnut', 'waterfall', 'willow', 'winter', 'wren',
    'xenon', 'yarrow', 'yellow', 'zenith', 'zinnia', 'acorn', 'alpine', 'aster',
    'autumn', 'basil', 'berry', 'brass', 'butterfly', 'canyon', 'cascade', 'cello',
    'chess', 'citrus', 'clover', 'copper', 'dawn', 'drift', 'evergreen', 'flamingo',
    'frost', 'grove', 'harvest', 'indigo', 'jupiter', 'kingfisher', 'lavender', 'magnet',
    'midnight', 'mosaic', 'pancake', 'peacock', 'pinecone', 'rain', 'ripple', 'sapphire',
    'sequoia', 'shamrock', 'shimmer', 'snowflake', 'teal', 'thunderbird', 'truffle', 'voyage',
    'wave', 'whisper', 'wildflower', 'zephyr', 'zigzag', 'airship', 'asteroid', 'badminton',
    'bluebell', 'book', 'boulder', 'buttercup', 'cardinal', 'carnation', 'chestnut', 'cinnamon',
    'compass', 'dandelion', 'daybreak', 'firefly', 'footpath', 'hammock', 'heather', 'hourglass',
    'marsh', 'oatmeal', 'pavilion', 'rainfall', 'redwood', 'seaspray', 'snowdrop', 'woodland'
  ];
  const MAX_BUFFERED_AMOUNT = 1024 * 1024;
  const CHUNK_SIZE = 16 * 1024;
  const FILE_ACK_INTERVAL = 16;
  const MAX_DIRECT_DOWNLOAD_SIZE = 25 * 1024 * 1024;
  const MAX_QUEUE_PREVIEW_FILES = 20;
  const ROOM_SESSION_KEY = 'thayer-creations-chat-share-room-v1';
  const JOIN_RETRY_INTERVAL = 5000;
  const config = window.THAYER_CREATIONS_SUPABASE || {};
  const client = window.supabase && config.url && config.anonKey
    ? window.supabase.createClient(config.url, config.anonKey)
    : null;
  let cryptoKey = null;
  const createView = document.querySelector('#create-view');
  const joinView = document.querySelector('#join-view');
  const activeView = document.querySelector('#active-view');
  const createStatus = document.querySelector('#create-status');
  const joinStatus = document.querySelector('#join-status');
  const connectionStatus = document.querySelector('#connection-status');
  const inviteBox = document.querySelector('#invite-box');
  const inviteCode = document.querySelector('#invite-code');
  const chatLog = document.querySelector('#chat-log');
  const chatEmpty = document.querySelector('#chat-empty');
  const chatForm = document.querySelector('#chat-form');
  const autoSaveStatus = document.querySelector('#auto-save-status');
  const autoSaveFolderButton = document.querySelector('#auto-save-folder');
  const messageInput = document.querySelector('#message-input');
  const fileInput = document.querySelector('#file-input');
  const sendButton = document.querySelector('#send-message');
  const copyCodeButton = document.querySelector('#copy-code');
  const wakeLockToggle = document.querySelector('#wake-lock-toggle');
  const wakeLockStatus = document.querySelector('#wake-lock-status');
  const notificationsToggle = document.querySelector('#notifications-toggle');
  const notificationsStatus = document.querySelector('#notifications-status');
  let screenWakeLock = null;
  let keepScreenAwake = false;
  let wakeLockRequestPending = false;
  const state = {
    role: '',
    roomId: '',
    channel: null,
    peer: null,
    dataChannel: null,
    peerAttempt: -1,
    nextPeerAttempt: 0,
    remotePeerId: '',
    joinId: '',
    joinRestartRequested: false,
    joinRetryTimer: null,
    incomingSignalQueue: Promise.resolve(),
    acceptedPeer: false,
    remoteDescriptionSet: false,
    queuedCandidates: [],
    outgoingQueue: [],
    outgoingQueueRunning: false,
    preparingOutgoingItem: null,
    outgoingQueueUpdate: Promise.resolve(),
    outgoingQueueRevision: 0,
    peerQueueRevision: -1,
    peerQueueItem: null,
    peerQueueFiles: [],
    peerQueueTotal: 0,
    pendingQueueCancelRequests: new Map(),
    notificationsEnabled: false,
    notificationAudioContext: null,
    pendingTransfer: null,
    pendingAck: null,
    activeOutgoingTransfer: null,
    incomingOffer: null,
    incomingFile: null,
    saveDirectoryHandle: null,
    incomingMessageQueue: Promise.resolve(),
    connectTimeout: null,
    objectUrls: [],
    stopped: false
  };

  function setStatus(element, message, isError = false) {
    element.textContent = message;
    if (isError) element.dataset.error = 'true';
    else delete element.dataset.error;
  }

  function randomInt(max) {
    const limit = Math.floor(0x100000000 / max) * max;
    const value = new Uint32Array(1);
    do {
      crypto.getRandomValues(value);
    } while (value[0] >= limit);
    return value[0] % max;
  }

  function makePairingCode() {
    return `${WORDS[randomInt(WORDS.length)]}-${WORDS[randomInt(WORDS.length)]}-${String(randomInt(1000)).padStart(3, '0')}`;
  }

  function normalizeCode(value) {
    const code = value.trim().toLowerCase().replace(/\s+/g, '-');
    return /^[a-z]+-[a-z]+-\d{3}$/.test(code) ? code : '';
  }

  async function deriveRoomCredentials(code) {
    const material = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(code),
      'PBKDF2',
      false,
      ['deriveBits']
    );
    const derivation = (purpose) => crypto.subtle.deriveBits({
      name: 'PBKDF2',
      salt: new TextEncoder().encode(`ThayerCreations/chat-share/v1/${purpose}`),
      iterations: 600000,
      hash: 'SHA-256'
    }, material, 256);
    const [roomBytes, keyBytes] = await Promise.all([derivation('room'), derivation('encryption')]);
    const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
    return { roomId: encodeBase64Url(new Uint8Array(roomBytes)), key };
  }

  function encodeBase64Url(bytes) {
    let binary = '';
    bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  function decodeBase64Url(value) {
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(base64 + '='.repeat((4 - base64.length % 4) % 4));
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  }

  function envelopeAdditionalData(kind, transferId = '', sequence = '', final = false) {
    return new TextEncoder().encode(`chat-share:v1:${kind}:${transferId}:${sequence}:${final ? 1 : 0}`);
  }

  async function encryptEnvelope(bytes, kind, transfer = null) {
    if (!cryptoKey) throw new Error('This room is missing its encryption key.');
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const transferId = transfer ? transfer.id : '';
    const sequence = transfer ? transfer.sequence : '';
    const final = Boolean(transfer && transfer.final);
    const additionalData = envelopeAdditionalData(kind, transferId, sequence, final);
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData }, cryptoKey, bytes);
    const envelope = {
      type: 'encrypted',
      kind,
      iv: encodeBase64Url(iv),
      data: encodeBase64Url(new Uint8Array(ciphertext))
    };
    if (transfer) Object.assign(envelope, { transferId, sequence, final });
    return JSON.stringify(envelope);
  }

  async function decryptEnvelope(value) {
    let envelope;
    try {
      envelope = JSON.parse(value);
    } catch {
      throw new Error('Received an unreadable encrypted packet.');
    }
    if (!envelope || envelope.type !== 'encrypted' ||
        !['json', 'binary'].includes(envelope.kind) ||
        typeof envelope.iv !== 'string' || typeof envelope.data !== 'string') {
      throw new Error('Received an invalid encrypted packet.');
    }
    let transfer = null;
    if (envelope.kind === 'binary') {
      if (typeof envelope.transferId !== 'string' || !/^[a-f0-9-]{20,60}$/.test(envelope.transferId) ||
          !Number.isSafeInteger(envelope.sequence) || envelope.sequence < 0 ||
          typeof envelope.final !== 'boolean') {
        throw new Error('Received invalid file-transfer metadata.');
      }
      transfer = { id: envelope.transferId, sequence: envelope.sequence, final: envelope.final };
    }
    const plaintext = await crypto.subtle.decrypt({
      name: 'AES-GCM',
      iv: decodeBase64Url(envelope.iv),
      additionalData: envelopeAdditionalData(
        envelope.kind,
        transfer ? transfer.id : '',
        transfer ? transfer.sequence : '',
        transfer ? transfer.final : false
      )
    }, cryptoKey, decodeBase64Url(envelope.data));
    return { kind: envelope.kind, plaintext, transfer };
  }

  function setConnectionStatus(message, isError = false) {
    setStatus(connectionStatus, message, isError);
  }

  function markPeerConnected() {
    clearTimeout(state.connectTimeout);
    clearInterval(state.joinRetryTimer);
    state.joinRetryTimer = null;
    state.joinRestartRequested = false;
    messageInput.disabled = false;
    fileInput.disabled = false;
    sendButton.disabled = false;
    setConnectionStatus('Connected. Messages and files use AES-GCM and WebRTC encryption.');
  }

  function disablePeerActions() {
    messageInput.disabled = true;
    fileInput.disabled = true;
    sendButton.disabled = true;
  }

  function showActiveView(role) {
    createView.hidden = true;
    joinView.hidden = true;
    activeView.hidden = false;
    document.querySelector('#room-role').textContent = role === 'host' ? 'Invite created' : 'Joining an invite';
  }

  function updateWakeLockToggle() {
    wakeLockToggle.setAttribute('aria-checked', String(keepScreenAwake));
  }

  function updateNotificationsToggle() {
    notificationsToggle.setAttribute('aria-checked', String(state.notificationsEnabled));
  }

  async function enableNotifications() {
    if (!('Notification' in window)) {
      notificationsToggle.disabled = true;
      setStatus(notificationsStatus, 'This browser does not support desktop notifications.', true);
      return;
    }

    const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
    let audioError = null;
    let audioReady = Promise.resolve();
    if (AudioContextConstructor) {
      try {
        if (!state.notificationAudioContext) {
          state.notificationAudioContext = new AudioContextConstructor();
        }
        if (state.notificationAudioContext.state === 'suspended') {
          audioReady = state.notificationAudioContext.resume().catch((error) => { audioError = error; });
        }
      } catch (error) {
        audioError = error;
      }
    }

    let permission = Notification.permission;
    if (permission === 'default') permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      state.notificationsEnabled = false;
      updateNotificationsToggle();
      setStatus(notificationsStatus, 'Notifications are blocked. Allow them in this site’s browser permissions to turn this on.', true);
      return;
    }

    state.notificationsEnabled = true;
    updateNotificationsToggle();
    if (!AudioContextConstructor) {
      setStatus(notificationsStatus, 'Notifications are on, but this browser does not support the ding sound.', true);
      return;
    }
    await audioReady;
    if (audioError) {
      setStatus(notificationsStatus, `Notifications are on, but the ding sound could not be enabled: ${audioError.message}`, true);
    } else {
      setStatus(notificationsStatus, 'Notifications and the ding sound are on for new messages and completed files.');
    }
  }

  function disableNotifications() {
    state.notificationsEnabled = false;
    updateNotificationsToggle();
    const audioContext = state.notificationAudioContext;
    state.notificationAudioContext = null;
    if (audioContext) {
      audioContext.close().catch((error) => {
        setStatus(notificationsStatus, `Could not stop the notification sound: ${error.message}`, true);
      });
    }
    setStatus(notificationsStatus, 'Notifications are off.');
  }

  async function playNotificationDing() {
    const audioContext = state.notificationAudioContext;
    if (!state.notificationsEnabled || !audioContext) return;
    if (audioContext.state === 'suspended') await audioContext.resume();
    const tones = [
      { frequency: 880, start: 0, duration: 0.18, volume: 0.12 },
      { frequency: 1320, start: 0.1, duration: 0.24, volume: 0.08 }
    ];
    tones.forEach((tone) => {
      const start = audioContext.currentTime + tone.start;
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(tone.frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(tone.volume, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + tone.duration);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(start);
      oscillator.stop(start + tone.duration);
    });
  }

  function notifyRoomEvent(title, body) {
    if (!state.notificationsEnabled) return;
    playNotificationDing().catch((error) => {
      setStatus(notificationsStatus, `Could not play the notification ding: ${error.message}`, true);
    });
    try {
      const notification = new Notification(title, {
        body,
        icon: './tc-logo.svg',
        tag: `chat-share-${Date.now()}`
      });
      notification.addEventListener('click', () => {
        window.focus();
        notification.close();
      }, { once: true });
    } catch (error) {
      setStatus(notificationsStatus, `Could not show the desktop notification: ${error.message}`, true);
    }
  }

  function initializeNotifications() {
    if (!('Notification' in window)) {
      notificationsToggle.disabled = true;
      setStatus(notificationsStatus, 'This browser does not support desktop notifications.', true);
    } else if (Notification.permission === 'denied') {
      setStatus(notificationsStatus, 'Notifications are blocked. Allow them in this site’s browser permissions to turn this on.');
    }
  }

  async function requestScreenWakeLock() {
    if (!keepScreenAwake || state.stopped || activeView.hidden) return;
    if (document.visibilityState !== 'visible') return;
    if (screenWakeLock || wakeLockRequestPending) return;
    if (!navigator.wakeLock || typeof navigator.wakeLock.request !== 'function') {
      keepScreenAwake = false;
      wakeLockToggle.disabled = true;
      updateWakeLockToggle();
      setStatus(wakeLockStatus, 'This browser does not support keeping the screen awake.');
      return;
    }

    wakeLockRequestPending = true;
    try {
      const lock = await navigator.wakeLock.request('screen');
      if (!keepScreenAwake || state.stopped || activeView.hidden || document.visibilityState !== 'visible') {
        await lock.release();
        return;
      }
      screenWakeLock = lock;
      lock.addEventListener('release', () => {
        if (screenWakeLock !== lock) return;
        screenWakeLock = null;
        if (!keepScreenAwake || state.stopped || activeView.hidden) return;
        if (document.visibilityState === 'visible') {
          keepScreenAwake = false;
          updateWakeLockToggle();
          setStatus(wakeLockStatus, 'The browser released the screen wake lock. Tap “Keep screen awake” to try again.');
        } else {
          setStatus(wakeLockStatus, 'Screen wake lock pauses while this page is hidden and resumes when you return.');
        }
      }, { once: true });
      setStatus(wakeLockStatus, 'The screen will stay awake while this room is open and this page is visible.');
    } catch (error) {
      if (keepScreenAwake && !state.stopped) {
        if (document.visibilityState === 'visible') {
          keepScreenAwake = false;
          updateWakeLockToggle();
          const guidance = location.protocol === 'file:'
            ? ' Screen wake lock is blocked on local file pages; open Chat Share over HTTPS.'
            : ' Check that power saving is off and this page is visible.';
          setStatus(wakeLockStatus, `Could not keep the screen awake (${error.name}): ${error.message}.${guidance}`, true);
        } else {
          setStatus(wakeLockStatus, 'Screen wake lock pauses while this page is hidden and resumes when you return.');
        }
      }
    } finally {
      wakeLockRequestPending = false;
      if (keepScreenAwake && !screenWakeLock && !state.stopped && !activeView.hidden &&
          document.visibilityState === 'visible') {
        requestScreenWakeLock();
      }
    }
  }

  function setScreenAwake(enabled) {
    if (enabled) {
      keepScreenAwake = true;
      wakeLockToggle.disabled = false;
      updateWakeLockToggle();
      setStatus(wakeLockStatus, 'Requesting screen wake lock…');
      void requestScreenWakeLock();
      return;
    }

    keepScreenAwake = false;
    updateWakeLockToggle();
    const lock = screenWakeLock;
    screenWakeLock = null;
    if (lock) {
      lock.release().catch((error) => {
        setStatus(wakeLockStatus, `Could not release screen wake lock: ${error.message}`, true);
      });
    }
    setStatus(wakeLockStatus, 'The screen is allowed to sleep while the room remains open.');
  }

  async function chooseAutoSaveFolder() {
    try {
      const directory = await window.showDirectoryPicker({ mode: 'readwrite' });
      let permission = await directory.queryPermission({ mode: 'readwrite' });
      if (permission !== 'granted') {
        permission = await directory.requestPermission({ mode: 'readwrite' });
      }
      if (permission !== 'granted') {
        throw new Error('Folder permission was not granted.');
      }
      state.saveDirectoryHandle = directory;
      autoSaveFolderButton.textContent = 'Change save folder';
      setStatus(autoSaveStatus, `Auto-save is on for this page session. Incoming files will be saved to "${directory.name}".`);
    } catch (error) {
      if (error.name !== 'AbortError') {
        setStatus(autoSaveStatus, `Could not enable auto-save: ${error.message}`, true);
      }
    }
  }

  function makeChannel(roomId) {
    if (!client) throw new Error('Supabase is unavailable. Check the site configuration and try again.');
    return client.channel(`chat-share-${roomId}`, {
      config: { broadcast: { self: false } }
    });
  }

  function subscribeToChannel(roomId) {
    return new Promise((resolve, reject) => {
      const channel = makeChannel(roomId);
      state.channel = channel;
      channel.on('broadcast', { event: 'signal' }, ({ payload }) => {
        state.incomingSignalQueue = state.incomingSignalQueue
          .then(() => state.channel === channel ? handleSignal(payload) : undefined)
          .catch((error) => {
            if (state.channel === channel) setConnectionStatus(`Connection setup failed: ${error.message}`, true);
          });
      });
      let settled = false;
      const timeout = setTimeout(() => {
        if (settled) return;
        settled = true;
        reject(new Error('Timed out connecting to the room service. Refresh this page to retry; this tab will restore the room.'));
      }, 15000);
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED' && !settled) {
          settled = true;
          clearTimeout(timeout);
          resolve(channel);
        } else if (['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(status) && !settled) {
          settled = true;
          clearTimeout(timeout);
          reject(new Error(`Room service connection failed (${status}). Refresh this page to retry; this tab will restore the room.`));
        }
      });
    });
  }

  async function sendSignal(payload) {
    if (!state.channel) throw new Error('The room signaling connection is not available.');
    const result = await state.channel.send({ type: 'broadcast', event: 'signal', payload });
    if (result !== 'ok') throw new Error(`Could not send connection details (${result}).`);
  }

  function createPeerConnection(attempt) {
    const peer = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    state.peer = peer;
    state.peerAttempt = attempt;
    peer.onicecandidate = (event) => {
      if (event.candidate && state.peer === peer) {
        sendSignal({ type: 'candidate', attempt, candidate: event.candidate.toJSON() }).catch((error) => {
          setConnectionStatus(`Could not exchange connection details: ${error.message}`, true);
        });
      }
    };
    peer.onconnectionstatechange = () => {
      if (state.peer !== peer || state.stopped) return;
      if (peer.connectionState === 'failed') {
        disablePeerActions();
        setConnectionStatus('Could not establish a direct connection. Check your network connection and make sure both peers are still in the room. If automatic recovery does not work, refresh both pages in their current tabs to rejoin this room.', true);
        if (state.role === 'host' && state.remotePeerId) {
          startHostNegotiation(state.remotePeerId).catch((error) => {
            setConnectionStatus(`Could not restart the connection: ${error.message}`, true);
          });
        } else if (state.role === 'guest') {
          requestHostJoin(true);
          ensureJoinRetries();
        }
      } else if (peer.connectionState === 'disconnected') {
        disablePeerActions();
        setConnectionStatus('Connection interrupted. Waiting for the peer to reconnect. If it stays interrupted, refresh both pages in their current tabs to rejoin this room.', true);
      } else if (peer.connectionState === 'connected') {
        if (state.dataChannel?.readyState === 'open') {
          markPeerConnected();
        } else {
          setConnectionStatus('Peer connection established; opening chat…');
        }
      }
    };
    if (state.role === 'host') {
      state.dataChannel = peer.createDataChannel('chat', { ordered: true });
      configureDataChannel(state.dataChannel);
    } else {
      peer.ondatachannel = (event) => {
        if (state.peer !== peer || state.stopped) return;
        state.dataChannel = event.channel;
        configureDataChannel(event.channel);
      };
    }
    return peer;
  }

  async function startHostNegotiation(peerId) {
    if (state.stopped || state.role !== 'host' || !peerId) return;
    disablePeerActions();
    state.remotePeerId = peerId;
    const attempt = ++state.nextPeerAttempt;
    state.remoteDescriptionSet = false;
    state.queuedCandidates = [];
    const previousPeer = state.peer;
    state.peer = null;
    state.dataChannel = null;
    if (previousPeer) previousPeer.close();

    const peer = createPeerConnection(attempt);
    setConnectionStatus('Negotiating a new encrypted connection…');
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    if (state.peer !== peer || state.stopped) return;
    await sendSignal({ type: 'offer', attempt, description: peer.localDescription });
  }

  function requestHostJoin(restart = false) {
    if (state.role !== 'guest' || !state.joinId || state.stopped) return;
    if (restart && !state.joinRestartRequested) {
      state.joinId = crypto.randomUUID();
      state.joinRestartRequested = true;
    }
    sendSignal({ type: 'join', peerId: state.joinId }).catch((error) => {
      setConnectionStatus(`Could not request a new connection: ${error.message}`, true);
    });
  }

  function ensureJoinRetries() {
    if (state.joinRetryTimer || state.role !== 'guest' || state.stopped) return;
    state.joinRetryTimer = setInterval(() => {
      if (state.dataChannel?.readyState !== 'open') requestHostJoin();
    }, JOIN_RETRY_INTERVAL);
  }

  function configureDataChannel(channel) {
    channel.bufferedAmountLowThreshold = 512 * 1024;
    channel.onopen = () => {
      if (state.dataChannel !== channel || state.stopped) return;
      markPeerConnected();
      messageInput.focus();
    };
    channel.onclose = () => {
      if (state.dataChannel !== channel || state.stopped) return;
      disablePeerActions();
      setConnectionStatus('The peer connection closed. If it does not reconnect, refresh both pages in their current tabs to rejoin this room.', true);
      if (state.role === 'guest') {
        requestHostJoin(true);
        ensureJoinRetries();
      }
    };
    channel.onerror = () => {
      if (state.dataChannel !== channel || state.stopped) return;
      setConnectionStatus('The encrypted data channel reported an error.', true);
    };
    channel.onmessage = (event) => {
      if (state.dataChannel !== channel || state.stopped) return;
      state.incomingMessageQueue = state.incomingMessageQueue
        .then(() => handleDataMessage(event))
        .catch(async (error) => {
          setConnectionStatus(`File or message receive failed: ${error.message}`, true);
          await abortIncomingFile(error.message);
        });
    };
  }

  async function handleSignal(payload) {
    if (!payload || typeof payload.type !== 'string' || state.stopped) return;
    if (state.role === 'host' && payload.type === 'join') {
      if (typeof payload.peerId !== 'string' || !/^[a-f0-9-]{20,60}$/.test(payload.peerId)) return;
      const peerState = state.peer && state.peer.connectionState;
      if (state.acceptedPeer && payload.peerId === state.remotePeerId &&
          peerState !== 'failed' && peerState !== 'closed') {
        if (state.peer && state.peer.localDescription &&
            state.peer.localDescription.type === 'offer' &&
            state.dataChannel?.readyState !== 'open') {
          await sendSignal({
            type: 'offer',
            attempt: state.peerAttempt,
            description: state.peer.localDescription
          });
        }
        return;
      }
      state.acceptedPeer = true;
      await startHostNegotiation(payload.peerId);
      return;
    }
    if (state.role === 'host' && payload.type === 'answer' && state.acceptedPeer &&
        payload.attempt === state.peerAttempt && state.peer && !state.peer.remoteDescription) {
      await state.peer.setRemoteDescription(payload.description);
      state.remoteDescriptionSet = true;
      await flushCandidates(payload.attempt);
      return;
    }
    if (state.role === 'guest' && payload.type === 'offer' &&
        Number.isSafeInteger(payload.attempt) && payload.attempt > 0) {
      if (payload.attempt < state.peerAttempt) return;
      if (payload.attempt === state.peerAttempt && state.peer && state.peer.remoteDescription) {
        if (state.peer.localDescription && state.peer.localDescription.type === 'answer') {
          await sendSignal({ type: 'answer', attempt: payload.attempt, description: state.peer.localDescription });
        }
        return;
      }
      const previousPeer = state.peer;
      state.peer = null;
      state.dataChannel = null;
      disablePeerActions();
      state.remoteDescriptionSet = false;
      state.joinRestartRequested = false;
      state.queuedCandidates = state.queuedCandidates.filter((candidate) => candidate.attempt >= payload.attempt);
      if (previousPeer) previousPeer.close();
      const peer = createPeerConnection(payload.attempt);
      await peer.setRemoteDescription(payload.description);
      if (state.peer !== peer || state.stopped) return;
      state.remoteDescriptionSet = true;
      await flushCandidates(payload.attempt);
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      if (state.peer !== peer || state.stopped) return;
      await sendSignal({ type: 'answer', attempt: payload.attempt, description: peer.localDescription });
      return;
    }
    if (payload.type === 'candidate' && Number.isSafeInteger(payload.attempt) && payload.candidate) {
      if (payload.attempt < state.peerAttempt) return;
      if (!state.peer || payload.attempt > state.peerAttempt || !state.remoteDescriptionSet) {
        state.queuedCandidates.push({ attempt: payload.attempt, candidate: payload.candidate });
        return;
      }
      if (payload.attempt !== state.peerAttempt) return;
      await state.peer.addIceCandidate(payload.candidate);
    }
  }

  async function flushCandidates(attempt) {
    const candidates = state.queuedCandidates.splice(0);
    for (const entry of candidates) {
      if (entry.attempt > attempt) {
        state.queuedCandidates.push(entry);
      } else if (entry.attempt === attempt && state.peer && state.peerAttempt === attempt) {
        await state.peer.addIceCandidate(entry.candidate);
      }
    }
  }

  function appendChatItem(text, own = false, fileInfo = null) {
    chatEmpty.hidden = true;
    const item = document.createElement('div');
    item.className = 'chat-item';
    item.dataset.own = String(own);
    const content = document.createElement('p');
    content.textContent = text;
    item.append(content);
    const meta = document.createElement('span');
    meta.className = 'chat-meta';
    meta.textContent = `${own ? 'You' : 'Peer'} · ${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
    item.append(meta);
    if (fileInfo) {
      if (fileInfo.progress) {
        const progress = document.createElement('progress');
        progress.className = 'transfer-progress';
        progress.max = fileInfo.progress.max;
        progress.value = fileInfo.progress.value;
        item.append(progress);
        fileInfo.setProgress = (value) => { progress.value = value; };
      }
      if (fileInfo.status) {
        const status = document.createElement('span');
        status.className = 'chat-meta';
        status.textContent = fileInfo.status;
        item.append(status);
        fileInfo.setStatus = (value) => { status.textContent = value; };
      }
      if (fileInfo.cancel) {
        const actions = document.createElement('div');
        actions.className = 'transfer-actions';
        const cancelButton = document.createElement('button');
        cancelButton.type = 'button';
        cancelButton.className = 'secondary-button transfer-cancel';
        cancelButton.textContent = 'Cancel';
        cancelButton.addEventListener('click', () => {
          cancelButton.disabled = true;
          fileInfo.cancel();
        });
        actions.append(cancelButton);
        item.append(actions);
        const hideCancel = fileInfo.setStatus;
        fileInfo.setStatus = (value) => {
          hideCancel(value);
          if (!/^Queued|^Waiting for recipient|^Waiting to save|^Waiting for file data|^Sending|^Receiving file data|^Saving to disk/.test(value)) {
            actions.hidden = true;
          }
        };
      }
      if (fileInfo.download) {
        const link = document.createElement('a');
        link.className = 'download-link';
        link.href = fileInfo.download.url;
        link.download = fileInfo.download.name;
        link.textContent = 'Download file';
        item.append(link);
      }
      if (fileInfo.actions) item.append(...fileInfo.actions);
    }
    chatLog.append(item);
    chatLog.scrollTop = chatLog.scrollHeight;
    return item;
  }

  async function sendData(payload) {
    if (!state.dataChannel || state.dataChannel.readyState !== 'open') {
      throw new Error('The peer is not connected.');
    }
    const packet = await encryptEnvelope(new TextEncoder().encode(JSON.stringify(payload)), 'json');
    state.dataChannel.send(packet);
  }

  async function sendBinaryData(data, transferId, sequence, final) {
    if (!state.dataChannel || state.dataChannel.readyState !== 'open') {
      throw new Error('The peer is not connected.');
    }
    state.dataChannel.send(await encryptEnvelope(new Uint8Array(data), 'binary', {
      id: transferId,
      sequence,
      final
    }));
  }

  async function handleDataMessage(event) {
    if (typeof event.data !== 'string') {
      setConnectionStatus('Received an invalid encrypted packet.', true);
      return;
    }
    const decrypted = await decryptEnvelope(event.data);
    if (decrypted.kind === 'binary') {
      await receiveFileChunk(decrypted.plaintext, decrypted.transfer);
      return;
    }
    let payload;
    try {
      payload = JSON.parse(new TextDecoder().decode(decrypted.plaintext));
    } catch {
      setConnectionStatus('Received an unreadable message from the peer.', true);
      return;
    }
    if (!payload || typeof payload.type !== 'string') return;
    if (payload.type === 'message' && typeof payload.text === 'string' && payload.text.length <= 4000) {
      appendChatItem(payload.text);
      notifyRoomEvent('New message', 'Your peer sent a message.');
    } else if (payload.type === 'file-queue') {
      updatePeerFileQueue(payload);
    } else if (payload.type === 'file-queue-cancel') {
      await cancelQueuedOutgoingFile(payload);
    } else if (payload.type === 'file-queue-cancel-result') {
      resolvePeerQueueCancellation(payload);
    } else if (payload.type === 'file-offer') {
      await receiveFileOffer(payload);
    } else if (payload.type === 'file-response') {
      resolveFileOffer(payload);
    } else if (payload.type === 'file-start') {
      startReceivingFile(payload);
    } else if (payload.type === 'file-ack') {
      resolveFileAck(payload);
    } else if (payload.type === 'file-abort') {
      abortOutgoingTransfer(payload);
      await abortIncomingFile(payload.reason || 'The sender cancelled the transfer.', false);
    } else if (payload.type === 'file-end') {
      await finishReceivingFile(payload);
    }
  }

  function updatePeerFileQueue(payload) {
    if (!Number.isSafeInteger(payload.revision) || payload.revision < 0 ||
        !Number.isSafeInteger(payload.total) || payload.total < 0 ||
        !Array.isArray(payload.files) || payload.files.length > MAX_QUEUE_PREVIEW_FILES ||
        payload.files.length > payload.total ||
        !payload.files.every((file) => file && typeof file.id === 'string' &&
          /^[a-f0-9-]{20,60}$/.test(file.id) && typeof file.name === 'string' &&
          file.name.length <= 255 && Number.isSafeInteger(file.size) && file.size >= 0)) {
      throw new Error('Received invalid file queue information.');
    }
    if (payload.revision <= state.peerQueueRevision) return;
    state.peerQueueRevision = payload.revision;
    state.peerQueueFiles = payload.files;
    state.peerQueueTotal = payload.total;
    renderPeerFileQueue();
  }

  function renderPeerFileQueue() {
    if (state.peerQueueTotal === 0) {
      if (state.peerQueueItem) state.peerQueueItem.remove();
      state.peerQueueItem = null;
      if (!chatLog.querySelector('.chat-item')) chatEmpty.hidden = false;
      return;
    }

    const queuedFiles = state.peerQueueFiles.map((file) => `${file.name} (${formatSize(file.size)})`);
    const remaining = state.peerQueueTotal - queuedFiles.length;
    const summary = `Peer has ${state.peerQueueTotal} file${state.peerQueueTotal === 1 ? '' : 's'} queued${remaining ? ` (${remaining} more not shown)` : ''}.`;
    if (!state.peerQueueItem) {
      state.peerQueueItem = appendChatItem(summary);
    } else {
      state.peerQueueItem.querySelector('p').textContent = summary;
      chatLog.append(state.peerQueueItem);
    }
    let list = state.peerQueueItem.querySelector('.peer-file-queue');
    if (!list) {
      list = document.createElement('ul');
      list.className = 'peer-file-queue';
      state.peerQueueItem.append(list);
    }
    list.replaceChildren();
    state.peerQueueFiles.forEach((file) => {
      const entry = document.createElement('li');
      entry.className = 'peer-queue-entry';
      const name = document.createElement('span');
      name.className = 'peer-queue-name';
      name.textContent = `${file.name} (${formatSize(file.size)})`;
      const cancel = document.createElement('button');
      cancel.type = 'button';
      cancel.className = 'secondary-button transfer-cancel peer-queue-cancel';
      const requestPending = Array.from(state.pendingQueueCancelRequests.values())
        .some((request) => request.queueId === file.id);
      cancel.disabled = requestPending;
      cancel.textContent = requestPending ? 'Canceling…' : 'Cancel';
      cancel.setAttribute('aria-label', `Cancel queued file ${file.name}`);
      cancel.addEventListener('click', () => { void requestPeerQueueCancellation(file, entry, cancel); });
      entry.append(name, cancel);
      list.append(entry);
    });
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  async function requestPeerQueueCancellation(file, entry, button) {
    const requestId = crypto.randomUUID();
    const request = { queueId: file.id, name: file.name, entry, timeout: null };
    request.timeout = setTimeout(() => {
      if (state.pendingQueueCancelRequests.get(requestId) !== request) return;
      state.pendingQueueCancelRequests.delete(requestId);
      setConnectionStatus('The peer did not confirm the queued-file cancellation. Try again.', true);
      renderPeerFileQueue();
    }, 15000);
    state.pendingQueueCancelRequests.set(requestId, request);
    button.disabled = true;
    button.textContent = 'Canceling…';
    try {
      await sendData({ type: 'file-queue-cancel', requestId, queueId: file.id });
    } catch (error) {
      clearTimeout(request.timeout);
      state.pendingQueueCancelRequests.delete(requestId);
      setConnectionStatus(`Could not cancel the queued file: ${error.message}`, true);
      renderPeerFileQueue();
    }
  }

  function resolvePeerQueueCancellation(payload) {
    if (typeof payload.requestId !== 'string' || typeof payload.queueId !== 'string' ||
        typeof payload.cancelled !== 'boolean') {
      throw new Error('Received an invalid queued-file cancellation response.');
    }
    const request = state.pendingQueueCancelRequests.get(payload.requestId);
    if (!request || request.queueId !== payload.queueId) return;
    clearTimeout(request.timeout);
    state.pendingQueueCancelRequests.delete(payload.requestId);
    request.entry.remove();
    if (!payload.cancelled) {
      appendChatItem(`"${request.name}" has already started and can no longer be cancelled from the queue.`);
    }
  }

  async function receiveFileOffer(payload) {
    if (!/^[a-f0-9-]{20,60}$/.test(payload.id || '') ||
        typeof payload.name !== 'string' || payload.name.length > 255 ||
        !Number.isSafeInteger(payload.size) || payload.size < 0) {
      return;
    }
    if (state.incomingOffer || state.incomingFile) {
      await sendData({
        type: 'file-response',
        id: payload.id,
        accepted: false,
        reason: 'Finish the current incoming file before starting another.'
      });
      return;
    }
    const canChooseSaveFolder = typeof window.showDirectoryPicker === 'function';
    const canDownloadWithoutFolder = payload.size < MAX_DIRECT_DOWNLOAD_SIZE;
    if (canChooseSaveFolder && !state.saveDirectoryHandle && !canDownloadWithoutFolder) {
      const reason = 'Choose a save folder for files 25 MB or larger before the sender tries again.';
      appendChatItem(`Could not automatically accept "${payload.name}": ${reason}`);
      await sendData({ type: 'file-response', id: payload.id, accepted: false, reason });
      return;
    }
    const canStreamToDisk = Boolean(state.saveDirectoryHandle);
    state.incomingOffer = payload.id;
    const memoryNote = canStreamToDisk
      ? ''
      : canDownloadWithoutFolder
        ? ' A download link will appear when the file is received.'
        : ' Files are buffered in memory in this browser, so very large transfers may be limited by available memory.';
    let writable = null;
    let progressInfo = null;
    try {
      let fileName = payload.name;
      if (canStreamToDisk) {
        const fileHandle = await createUniqueFileHandle(state.saveDirectoryHandle, payload.name);
        fileName = fileHandle.name;
        writable = await fileHandle.createWritable();
      }
      progressInfo = {
        progress: { max: payload.size || 1, value: 0 },
        status: canStreamToDisk ? 'Waiting to save to disk.' : 'Waiting for file data.'
      };
      state.incomingFile = {
        id: payload.id,
        name: fileName,
        size: payload.size,
        type: typeof payload.mime === 'string' ? payload.mime.slice(0, 120) : '',
        writable,
        chunks: [],
        received: 0,
        nextSequence: 0,
        totalChunks: null,
        started: false,
        progressInfo
      };
      state.incomingOffer = null;
      progressInfo.cancel = () => {
        void abortIncomingFile('The receiver cancelled the transfer.');
      };
      appendChatItem(
        `Automatically receiving "${fileName}" (${formatSize(payload.size)}).${memoryNote}`,
        false,
        progressInfo
      );
      await sendData({ type: 'file-response', id: payload.id, accepted: true });
    } catch (error) {
      state.incomingOffer = null;
      if (writable) {
        try {
          await writable.abort();
        } catch (abortError) {
          setConnectionStatus(`Could not cancel the save: ${abortError.message}`, true);
        }
      }
      state.incomingFile = null;
      const reason = `Could not prepare the file: ${error.message}`;
      if (progressInfo && progressInfo.setStatus) progressInfo.setStatus(reason);
      setConnectionStatus(reason, true);
      try {
        await sendData({ type: 'file-response', id: payload.id, accepted: false, reason });
      } catch (sendError) {
        setConnectionStatus(`Could not notify the sender: ${sendError.message}`, true);
      }
    }
  }

  async function createUniqueFileHandle(directory, name) {
    const safeName = safeFileName(name);
    const extensionIndex = safeName.lastIndexOf('.');
    const baseName = extensionIndex > 0 ? safeName.slice(0, extensionIndex) : safeName;
    const extension = extensionIndex > 0 ? safeName.slice(extensionIndex) : '';
    for (let suffix = 0; suffix < 10000; suffix += 1) {
      const candidate = suffix === 0 ? safeName : `${baseName} (${suffix})${extension}`;
      try {
        await directory.getFileHandle(candidate);
      } catch (error) {
        if (error.name !== 'NotFoundError') throw error;
        return directory.getFileHandle(candidate, { create: true });
      }
    }
    throw new Error('Could not create a unique file name in the save folder.');
  }

  function resolveFileOffer(payload) {
    if (!state.pendingTransfer || state.pendingTransfer.id !== payload.id) return;
    const pending = state.pendingTransfer;
    state.pendingTransfer = null;
    clearTimeout(pending.timeout);
    pending.resolve({ accepted: Boolean(payload.accepted), reason: payload.reason });
  }

  function updateIncomingTransferSpeed(file) {
    const activity = file.writable ? 'Saving to disk' : 'Receiving file data';
    file.progressInfo.setStatus(formatTransferProgress(
      `${activity}…`,
      file.received,
      file.size,
      file.startedAt
    ));
  }

  function startReceivingFile(payload) {
    const file = state.incomingFile;
    const expectedChunks = file ? Math.ceil(file.size / CHUNK_SIZE) : -1;
    if (!file || payload.id !== file.id || payload.size !== file.size ||
        payload.totalChunks !== expectedChunks) {
      throw new Error('The incoming file did not match its offer.');
    }
    file.started = true;
    file.totalChunks = payload.totalChunks;
    file.startedAt = performance.now();
    updateIncomingTransferSpeed(file);
    file.speedTimer = setInterval(() => updateIncomingTransferSpeed(file), 1000);
  }

  async function receiveFileChunk(data, transfer) {
    if (!(data instanceof ArrayBuffer)) throw new Error('Received an invalid file chunk.');
    const file = state.incomingFile;
    const expectedFinal = file && file.nextSequence === file.totalChunks - 1;
    if (!file || !file.started || transfer.id !== file.id ||
        transfer.sequence !== file.nextSequence || transfer.final !== expectedFinal ||
      data.byteLength !== Math.min(CHUNK_SIZE, file.size - file.received) ||
      file.received + data.byteLength > file.size) {
      throw new Error('The received file chunk is out of order or exceeds the offered size.');
    }
    if (file.writable) await file.writable.write(data);
    else file.chunks.push(data);
    file.received += data.byteLength;
    file.nextSequence += 1;
    file.progressInfo.setProgress(file.received);
    updateIncomingTransferSpeed(file);
    if (file.nextSequence % FILE_ACK_INTERVAL === 0 || transfer.final) {
      await sendData({ type: 'file-ack', id: file.id, sequence: transfer.sequence });
    }
  }

  async function finishReceivingFile(payload) {
    const file = state.incomingFile;
    if (!file || payload.id !== file.id) return;
    if (!file.started || file.received !== file.size ||
        file.nextSequence !== file.totalChunks) {
      throw new Error('The file transfer was incomplete.');
    }
    if (file.speedTimer) clearInterval(file.speedTimer);
    if (file.writable) {
      await file.writable.close();
      file.progressInfo.setStatus('Saved to disk.');
    } else {
      const blob = new Blob(file.chunks, { type: file.type || 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      state.objectUrls.push(url);
      appendChatItem(`Received "${file.name}" (${formatSize(file.size)}).`, false, {
        download: { url, name: file.name }
      });
    }
    state.incomingFile = null;
    notifyRoomEvent('File received', `"${file.name}" finished transferring.`);
  }

  function safeFileName(name) {
    const sanitized = name.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').trim();
    return sanitized || 'shared-file';
  }

  async function abortIncomingFile(reason, notifyPeer = true) {
    const file = state.incomingFile;
    if (!file) return;
    state.incomingFile = null;
    if (file.speedTimer) clearInterval(file.speedTimer);
    file.progressInfo.setStatus(`Transfer failed: ${reason}`);
    if (file.writable) {
      try {
        await file.writable.abort();
      } catch (error) {
        setConnectionStatus(`Could not discard the incomplete file: ${error.message}`, true);
      }
    }
    if (notifyPeer) {
      try {
        await sendData({ type: 'file-abort', id: file.id, reason: reason.slice(0, 200) });
      } catch (error) {
        setConnectionStatus(`Could not notify the sender: ${error.message}`, true);
      }
    }
  }

  function prepareFileAck(id, sequence) {
    if (state.pendingAck) throw new Error('A previous file chunk is still awaiting acknowledgement.');
    const pending = { id, sequence, acknowledged: false, error: null, resolve: null, reject: null, timeout: null };
    state.pendingAck = pending;
    return pending;
  }

  function waitForFileAck(pending) {
    if (pending.error) {
      state.pendingAck = null;
      return Promise.reject(new Error(pending.error));
    }
    if (pending.acknowledged) {
      state.pendingAck = null;
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      pending.resolve = resolve;
      pending.reject = reject;
      pending.timeout = setTimeout(() => {
        if (state.pendingAck === pending) state.pendingAck = null;
        reject(new Error('The receiver stopped acknowledging file data. If the connection does not recover, refresh both pages in their current tabs and resend the file.'));
      }, 30000);
    });
  }

  function resolveFileAck(payload) {
    const pending = state.pendingAck;
    if (!pending || payload.id !== pending.id || payload.sequence !== pending.sequence) return;
    pending.acknowledged = true;
    if (pending.resolve) {
      state.pendingAck = null;
      clearTimeout(pending.timeout);
      pending.resolve();
    }
  }

  function abortOutgoingTransfer(payload) {
    const transfer = state.activeOutgoingTransfer;
    if (!transfer || payload.id !== transfer.id) return;
    transfer.abortReason = typeof payload.reason === 'string' ? payload.reason : 'The receiver could not save the file.';
    const pending = state.pendingAck;
    if (pending && pending.id === transfer.id) {
      pending.error = transfer.abortReason;
    }
    if (pending && pending.id === transfer.id && pending.reject) {
      state.pendingAck = null;
      clearTimeout(pending.timeout);
      pending.reject(new Error(transfer.abortReason));
    }
  }

  function formatSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    let size = bytes;
    let unit = 0;
    while (size >= 1024 && unit < units.length - 1) {
      size /= 1024;
      unit += 1;
    }
    return `${unit === 0 ? size : size.toFixed(1)} ${units[unit]}`;
  }

  function formatTransferProgress(activity, transferred, total, startedAt) {
    const elapsedSeconds = Math.max((performance.now() - startedAt) / 1000, 1);
    const bytesPerSecond = transferred / elapsedSeconds;
    const remaining = Math.max(0, total - transferred);
    const eta = bytesPerSecond > 0
      ? formatDuration(remaining / bytesPerSecond)
      : 'calculating…';
    return `${activity} ${formatSize(bytesPerSecond)}/s · ETA ${eta}`;
  }

  function formatDuration(seconds) {
    const totalSeconds = Math.max(0, Math.ceil(seconds));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const remainingSeconds = totalSeconds % 60;
    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(remainingSeconds).padStart(2, '0');
    return hours
      ? `${hours}:${formattedMinutes}:${formattedSeconds}`
      : `${minutes}:${formattedSeconds}`;
  }

  function waitForBuffer(channel) {
    if (channel.bufferedAmount <= MAX_BUFFERED_AMOUNT) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        channel.removeEventListener('bufferedamountlow', onLow);
        reject(new Error('File transfer paused because the connection is not responding. If it stays paused, refresh both pages in their current tabs and resend the file.'));
      }, 30000);
      function onLow() {
        clearTimeout(timeout);
        resolve();
      }
      channel.addEventListener('bufferedamountlow', onLow, { once: true });
    });
  }

  function cancelOutgoingTransfer(transfer, reason) {
    transfer.abortReason = reason;
    if (state.pendingTransfer === transfer) {
      clearTimeout(transfer.timeout);
      state.pendingTransfer = null;
      transfer.resolve({ accepted: false, reason });
    }
    const pending = state.pendingAck;
    if (pending && pending.id === transfer.id) {
      pending.error = reason;
      if (pending.reject) {
        state.pendingAck = null;
        clearTimeout(pending.timeout);
        pending.reject(new Error(reason));
      }
    }
    void sendData({ type: 'file-abort', id: transfer.id, reason }).catch((error) => {
      setConnectionStatus(`Could not notify the receiver: ${error.message}`, true);
    });
  }

  function publishOutgoingQueue() {
    const dataChannel = state.dataChannel;
    const payload = {
      type: 'file-queue',
      revision: ++state.outgoingQueueRevision,
      total: state.outgoingQueue.length,
      files: state.outgoingQueue.slice(0, MAX_QUEUE_PREVIEW_FILES).map(({ id, file }) => ({
        id,
        name: file.name.slice(0, 255),
        size: file.size
      }))
    };
    state.outgoingQueueUpdate = state.outgoingQueueUpdate.then(async () => {
      if (state.stopped || state.dataChannel !== dataChannel) return;
      await sendData(payload);
    }).catch((error) => {
      if (!state.stopped && state.dataChannel === dataChannel) {
        setConnectionStatus(`Could not update the peer's file queue: ${error.message}`, true);
      }
    });
    return state.outgoingQueueUpdate;
  }

  async function cancelQueuedOutgoingFile(payload) {
    if (typeof payload.requestId !== 'string' || !/^[a-f0-9-]{20,60}$/.test(payload.requestId) ||
        typeof payload.queueId !== 'string' || !/^[a-f0-9-]{20,60}$/.test(payload.queueId)) {
      throw new Error('Received an invalid queued-file cancellation request.');
    }
    let cancelled = false;
    const index = state.outgoingQueue.findIndex((item) => item.id === payload.queueId);
    if (index !== -1) {
      const [item] = state.outgoingQueue.splice(index, 1);
      item.progressInfo.setStatus('Cancelled by the recipient.');
      cancelled = true;
    } else if (state.preparingOutgoingItem && state.preparingOutgoingItem.id === payload.queueId) {
      state.preparingOutgoingItem.cancelled = true;
      state.preparingOutgoingItem.progressInfo.setStatus('Cancelled by the recipient.');
      cancelled = true;
    }
    await publishOutgoingQueue();
    await sendData({
      type: 'file-queue-cancel-result',
      requestId: payload.requestId,
      queueId: payload.queueId,
      cancelled
    });
  }

  function queueFiles(files) {
    files.forEach((file) => {
      if (!Number.isSafeInteger(file.size)) {
        setConnectionStatus(`"${file.name}" is too large for the browser to transfer safely.`, true);
        return;
      }
      const item = {
        id: crypto.randomUUID(),
        file,
        transfer: null,
        progressInfo: {
          progress: { max: file.size || 1, value: 0 },
          status: 'Queued for sending…'
        }
      };
      item.progressInfo.cancel = () => {
        if (item.transfer) {
          cancelOutgoingTransfer(item.transfer, 'Transfer cancelled.');
          return;
        }
        const index = state.outgoingQueue.indexOf(item);
        if (index === -1) {
          if (state.preparingOutgoingItem === item) {
            item.cancelled = true;
            item.progressInfo.setStatus('Cancelled before sending.');
          }
          return;
        }
        state.outgoingQueue.splice(index, 1);
        item.progressInfo.setStatus('Cancelled before sending.');
        void publishOutgoingQueue();
      };
      appendChatItem(`Queued "${file.name}" (${formatSize(file.size)}).`, true, item.progressInfo);
      state.outgoingQueue.push(item);
    });
    void publishOutgoingQueue();
    void processOutgoingQueue();
  }

  async function processOutgoingQueue() {
    if (state.outgoingQueueRunning) return;
    state.outgoingQueueRunning = true;
    try {
      while (state.outgoingQueue.length && !state.stopped) {
        const item = state.outgoingQueue.shift();
        state.preparingOutgoingItem = item;
        await publishOutgoingQueue();
        if (state.stopped) {
          state.preparingOutgoingItem = null;
          break;
        }
        if (item.cancelled) {
          state.preparingOutgoingItem = null;
          continue;
        }
        state.preparingOutgoingItem = null;
        item.progressInfo.setStatus('Waiting for recipient…');
        await sendFile(item.file, item);
      }
    } finally {
      state.outgoingQueueRunning = false;
      if (state.outgoingQueue.length && !state.stopped) void processOutgoingQueue();
    }
  }

  async function sendFile(file, item) {
    const id = crypto.randomUUID();
    const transfer = { id, resolve: null, timeout: null };
    item.transfer = transfer;
    const response = new Promise((resolve, reject) => {
      transfer.resolve = resolve;
      transfer.timeout = setTimeout(() => {
        if (state.pendingTransfer === transfer) state.pendingTransfer = null;
        reject(new Error('The file offer expired because the peer did not respond. Check the peer connection, then refresh both pages in their current tabs and retry the file.'));
      }, 5 * 60 * 1000);
    });
    state.pendingTransfer = transfer;
    const progressInfo = item.progressInfo;
    let speedTimer = null;
    try {
      await sendData({
        type: 'file-offer',
        id,
        name: file.name.slice(0, 255),
        size: file.size,
        mime: file.type.slice(0, 120)
      });
      const decision = await response;
      if (!decision.accepted) {
        progressInfo.setStatus(decision.reason || 'The peer declined this file.');
        return;
      }
      state.activeOutgoingTransfer = transfer;
      progressInfo.setStatus('Sending… 0 B/s · ETA calculating…');
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      await sendData({ type: 'file-start', id, size: file.size, totalChunks });
      const sendingStartedAt = performance.now();
      let bytesSent = 0;
      const updateTransferSpeed = () => {
        progressInfo.setStatus(formatTransferProgress('Sending…', bytesSent, file.size, sendingStartedAt));
      };
      speedTimer = setInterval(updateTransferSpeed, 1000);
      for (let sequence = 0, offset = 0; offset < file.size; sequence += 1, offset += CHUNK_SIZE) {
        if (transfer.abortReason) throw new Error(transfer.abortReason);
        const chunk = await file.slice(offset, offset + CHUNK_SIZE).arrayBuffer();
        const isFinal = sequence === totalChunks - 1;
        const shouldWaitForAck = (sequence + 1) % FILE_ACK_INTERVAL === 0 || isFinal;
        const pendingAck = shouldWaitForAck ? prepareFileAck(id, sequence) : null;
        await waitForBuffer(state.dataChannel);
        if (state.dataChannel.readyState !== 'open') throw new Error('The peer connection closed during transfer.');
        await sendBinaryData(chunk, id, sequence, isFinal);
        bytesSent += chunk.byteLength;
        progressInfo.setProgress(Math.min(offset + chunk.byteLength, file.size));
        updateTransferSpeed();
        if (pendingAck) await waitForFileAck(pendingAck);
        if (transfer.abortReason) throw new Error(transfer.abortReason);
      }
      await sendData({ type: 'file-end', id });
      progressInfo.setStatus('File sent.');
      notifyRoomEvent('File sent', `"${file.name}" finished transferring.`);
    } catch (error) {
      progressInfo.setStatus(error.message);
      setConnectionStatus(error.message, true);
    } finally {
      if (state.pendingTransfer === transfer) state.pendingTransfer = null;
      if (state.activeOutgoingTransfer === transfer) state.activeOutgoingTransfer = null;
      if (state.pendingAck && state.pendingAck.id === id) {
        const pending = state.pendingAck;
        state.pendingAck = null;
        clearTimeout(pending.timeout);
        if (pending.reject) pending.reject(new Error('File transfer ended before acknowledgement.'));
      }
      if (speedTimer !== null) clearInterval(speedTimer);
      clearTimeout(transfer.timeout);
      item.transfer = null;
    }
  }

  function persistRoomSession(role, code) {
    try {
      sessionStorage.setItem(ROOM_SESSION_KEY, JSON.stringify({ role, code }));
    } catch (error) {
      setConnectionStatus(`This tab could not remember the room for reload recovery: ${error.message}`, true);
    }
  }

  function clearPersistedRoomSession() {
    try {
      sessionStorage.removeItem(ROOM_SESSION_KEY);
    } catch (error) {
      setConnectionStatus(`Could not clear the saved room: ${error.message}`, true);
    }
  }

  function restoreRoomSession() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(ROOM_SESSION_KEY) || 'null');
      if (!saved) return null;
      const code = normalizeCode(typeof saved.code === 'string' ? saved.code : '');
      if (!code || !['host', 'guest'].includes(saved.role)) {
        sessionStorage.removeItem(ROOM_SESSION_KEY);
        return null;
      }
      return { role: saved.role, code };
    } catch (error) {
      setStatus(createStatus, `Could not restore the previous room: ${error.message}`, true);
      return null;
    }
  }

  async function startHostRoom(resumeCode = '') {
    if (!window.isSecureContext || !window.RTCPeerConnection || !crypto.subtle) {
      setStatus(createStatus, 'This feature requires a secure HTTPS page and a modern browser.', true);
      return;
    }
    try {
      const code = resumeCode || makePairingCode();
      const credentials = await deriveRoomCredentials(code);
      cryptoKey = credentials.key;
      state.stopped = false;
      state.role = 'host';
      state.roomId = credentials.roomId;
      state.acceptedPeer = false;
      state.remotePeerId = '';
      state.nextPeerAttempt = 0;
      state.peerAttempt = -1;
      persistRoomSession('host', code);
      showActiveView('host');
      inviteBox.hidden = false;
      inviteCode.textContent = code;
      setConnectionStatus('Opening share chat…');
      await subscribeToChannel(state.roomId);
      setConnectionStatus('Waiting for someone to enter this code…');
    } catch (error) {
      if (activeView.hidden) setStatus(createStatus, error.message, true);
      else setConnectionStatus(error.message, true);
    }
  }

  async function joinRoom(event, resumeCode = '') {
    if (event) event.preventDefault();
    const code = resumeCode || normalizeCode(document.querySelector('#join-code').value);
    if (!code) {
      setStatus(joinStatus, 'Enter two words followed by three numbers, such as ember-orbit-482.', true);
      return;
    }
    if (!window.isSecureContext || !window.RTCPeerConnection || !crypto.subtle) {
      setStatus(joinStatus, 'This feature requires a secure HTTPS page and a modern browser.', true);
      return;
    }
    const joinButton = document.querySelector('#join-room');
    joinButton.disabled = true;
    state.stopped = false;
    state.role = 'guest';
    state.joinId = crypto.randomUUID();
    state.joinRestartRequested = false;
    state.peerAttempt = -1;
    state.remotePeerId = '';
    persistRoomSession('guest', code);
    showActiveView('guest');
    inviteBox.hidden = false;
    inviteCode.textContent = code;
    setConnectionStatus('Deriving the room and encryption key…');
    try {
      const credentials = await deriveRoomCredentials(code);
      state.roomId = credentials.roomId;
      cryptoKey = credentials.key;
      await subscribeToChannel(state.roomId);
      requestHostJoin();
      ensureJoinRetries();
      setConnectionStatus('Waiting for the host to connect…');
      state.connectTimeout = setTimeout(() => {
        if (state.dataChannel?.readyState !== 'open') {
          setConnectionStatus('Still waiting for the host. Check that the host reopened this room with the same code. If both pages are open and it remains stuck, refresh both pages in their current tabs.', true);
        }
      }, 60000);
    } catch (error) {
      setConnectionStatus(error.message, true);
    } finally {
      joinButton.disabled = false;
    }
  }

  function stopRoom() {
    state.stopped = true;
    setScreenAwake(false);
    clearTimeout(state.connectTimeout);
    clearInterval(state.joinRetryTimer);
    state.joinRetryTimer = null;
    if (state.pendingAck) {
      const pending = state.pendingAck;
      pending.error = 'The room was closed.';
      if (pending.reject) {
        state.pendingAck = null;
        clearTimeout(pending.timeout);
        pending.reject(new Error(pending.error));
      }
    }
    if (state.activeOutgoingTransfer) state.activeOutgoingTransfer.abortReason = 'The room was closed.';
    if (state.incomingFile) {
      if (state.incomingFile.speedTimer) clearInterval(state.incomingFile.speedTimer);
      if (state.incomingFile.writable) {
        state.incomingFile.writable.abort().catch((error) => {
          setConnectionStatus(`Could not cancel the incomplete file: ${error.message}`, true);
        });
      }
    }
    if (state.peer) state.peer.close();
    if (state.channel && client) {
      client.removeChannel(state.channel).then((status) => {
        if (status !== 'ok') setConnectionStatus(`Room cleanup failed (${status}).`, true);
      }).catch((error) => {
        setConnectionStatus(`Room cleanup failed: ${error.message}`, true);
      });
    }
    if (state.pendingTransfer) {
      clearTimeout(state.pendingTransfer.timeout);
      state.pendingTransfer.resolve(false);
    }
    state.objectUrls.forEach((url) => URL.revokeObjectURL(url));
    state.objectUrls = [];
    cryptoKey = null;
    state.role = '';
    state.roomId = '';
    state.channel = null;
    state.peer = null;
    state.dataChannel = null;
    state.peerAttempt = -1;
    state.nextPeerAttempt = 0;
    state.remotePeerId = '';
    state.joinId = '';
    state.joinRestartRequested = false;
    state.acceptedPeer = false;
    state.remoteDescriptionSet = false;
    state.pendingTransfer = null;
    state.pendingAck = null;
    state.activeOutgoingTransfer = null;
    state.outgoingQueue = [];
    state.preparingOutgoingItem = null;
    state.incomingOffer = null;
    state.incomingFile = null;
    state.peerQueueRevision = -1;
    state.peerQueueItem = null;
    state.peerQueueFiles = [];
    state.peerQueueTotal = 0;
    state.pendingQueueCancelRequests.forEach((request) => clearTimeout(request.timeout));
    state.pendingQueueCancelRequests.clear();
    state.queuedCandidates = [];
    inviteBox.hidden = true;
    inviteCode.textContent = '';
    messageInput.disabled = true;
    fileInput.disabled = true;
    sendButton.disabled = true;
    messageInput.value = '';
    fileInput.value = '';
    chatLog.replaceChildren(chatEmpty);
    chatEmpty.hidden = false;
    createView.hidden = false;
    joinView.hidden = false;
    activeView.hidden = true;
    setStatus(createStatus, '');
    setStatus(joinStatus, '');
    clearPersistedRoomSession();
  }

  document.querySelector('#create-room').addEventListener('click', () => { void startHostRoom(); });
  document.querySelector('#join-form').addEventListener('submit', (event) => { void joinRoom(event); });
  document.querySelector('#leave-room').addEventListener('click', stopRoom);
  wakeLockToggle.addEventListener('click', () => {
    setScreenAwake(!keepScreenAwake);
  });
  notificationsToggle.addEventListener('click', () => {
    if (state.notificationsEnabled) {
      disableNotifications();
      return;
    }
    enableNotifications().catch((error) => {
      state.notificationsEnabled = false;
      updateNotificationsToggle();
      setStatus(notificationsStatus, `Could not enable notifications: ${error.message}`, true);
    });
  });
  document.addEventListener('visibilitychange', () => {
    if (!keepScreenAwake) return;
    if (document.visibilityState === 'visible') {
      void requestScreenWakeLock();
      return;
    }
    const lock = screenWakeLock;
    screenWakeLock = null;
    if (lock) {
      lock.release().catch((error) => {
        setStatus(wakeLockStatus, `Could not release screen wake lock: ${error.message}`, true);
      });
    }
    setStatus(wakeLockStatus, 'Screen wake lock pauses while this page is hidden and resumes when you return.');
  });
  window.addEventListener('focus', () => {
    if (keepScreenAwake) void requestScreenWakeLock();
  });
  if (typeof window.showDirectoryPicker === 'function') {
    setStatus(autoSaveStatus, 'Choose a folder to save incoming files directly to disk. Files under 25 MB can be received without a folder and downloaded from the chat.');
    autoSaveFolderButton.addEventListener('click', () => {
      chooseAutoSaveFolder().catch((error) => {
        setStatus(autoSaveStatus, `Could not enable auto-save: ${error.message}`, true);
      });
    });
  } else {
    autoSaveFolderButton.hidden = true;
    setStatus(
      autoSaveStatus,
      'This browser cannot save directly to a chosen folder. Files will be automatically accepted into memory, so very large transfers may fail if memory runs low.'
    );
  }
  document.querySelector('#chat-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const text = messageInput.value.trim();
    if (!text || text.length > 4000) return;
    try {
      sendData({ type: 'message', text }).then(() => {
        appendChatItem(text, true);
        messageInput.value = '';
      }).catch((error) => {
        setConnectionStatus(error.message, true);
      });
    } catch (error) {
      setConnectionStatus(error.message, true);
    }
  });
  fileInput.addEventListener('change', () => {
    const files = Array.from(fileInput.files);
    fileInput.value = '';
    if (files.length) queueFiles(files);
  });
  copyCodeButton.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(inviteCode.textContent);
      copyCodeButton.textContent = 'Copied';
    } catch (error) {
      setConnectionStatus(`Could not copy the pairing code: ${error.message}`, true);
    }
  });

  if (!config.url || !config.anonKey) {
    const message = 'Room service is not configured. Check the Supabase configuration.';
    setStatus(createStatus, message, true);
    setStatus(joinStatus, message, true);
    document.querySelector('#create-room').disabled = true;
    document.querySelector('#join-room').disabled = true;
  }
  if (!navigator.clipboard) copyCodeButton.disabled = true;
  initializeNotifications();
  if (config.url && config.anonKey) {
    const savedRoom = restoreRoomSession();
    if (savedRoom) {
      if (savedRoom.role === 'host') {
        void startHostRoom(savedRoom.code);
      } else {
        document.querySelector('#join-code').value = savedRoom.code;
        void joinRoom(null, savedRoom.code);
      }
    }
  }
})();
