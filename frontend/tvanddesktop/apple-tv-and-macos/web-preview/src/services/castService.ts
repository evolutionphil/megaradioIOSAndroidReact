import { Station } from '@/services/megaRadioApi';

var API_BASE = 'https://api.themegaradio.com';

var _pollInterval: ReturnType<typeof setInterval> | null = null;
var _shouldPoll: boolean = false;
var _token: string | null = null;
var _deviceId: string | null = null;
var _onMessage: ((msg: any) => void) | null = null;
var _onStatusChange: ((status: string) => void) | null = null;
var _lastCommandHash: string | null = null;
var _isConnected: boolean = false;
var _pollCount: number = 0;

function getDeviceId(): string {
  if (_deviceId) return _deviceId;

  try {
    var w = window as any;
    if (w.webapis && w.webapis.productinfo && typeof w.webapis.productinfo.getDuid === 'function') {
      _deviceId = w.webapis.productinfo.getDuid();
      return _deviceId!;
    }
  } catch (e) {}

  try {
    var w2 = window as any;
    if (w2.webOS && w2.webOS.deviceInfo) {
      if (typeof w2.webOS.deviceInfo === 'object' && w2.webOS.deviceInfo.serialNumber) {
        _deviceId = w2.webOS.deviceInfo.serialNumber;
        return _deviceId!;
      }
    }
  } catch (e) {}

  try {
    var saved = localStorage.getItem('tv_device_id');
    if (saved) {
      _deviceId = saved;
      return saved;
    }
  } catch (e) {}

  var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0;
    var v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });

  try {
    localStorage.setItem('tv_device_id', uuid);
  } catch (e) {}

  _deviceId = uuid;
  return uuid;
}

function getPlatformName(): string {
  var ua = (typeof navigator !== 'undefined' && navigator.userAgent) ? navigator.userAgent.toLowerCase() : '';
  if (ua.indexOf('tizen') !== -1) return 'tizen';
  if (ua.indexOf('webos') !== -1) return 'webos';
  return 'browser';
}

function makeCommandHash(data: any): string {
  try {
    if (data.id) return 'id:' + data.id;
    if (data.timestamp) return 'ts:' + data.timestamp;
    if (data.commandId) return 'cmd:' + data.commandId;
    if (data._id) return '_id:' + data._id;
    if (data.createdAt) return 'ca:' + data.createdAt;
    return 'h:' + JSON.stringify(data).length + ':' + JSON.stringify(data).substring(0, 100);
  } catch (e) {
    return 'err:' + Date.now();
  }
}

function extractStationFromResponse(data: any): any {
  if (!data) return null;

  if (data.pendingCommand && data.pendingCommand.station) {
    return data.pendingCommand.station;
  }
  if (data.pendingCommand && data.pendingCommand.data && data.pendingCommand.data.station) {
    return data.pendingCommand.data.station;
  }

  if (data.command && typeof data.command === 'object') {
    if (data.command.station) return data.command.station;
    if (data.command.data && data.command.data.station) return data.command.data.station;
  }

  if (data.lastCommand && typeof data.lastCommand === 'object') {
    if (data.lastCommand.station) return data.lastCommand.station;
    if (data.lastCommand.data && data.lastCommand.data.station) return data.lastCommand.data.station;
  }

  if (data.station && typeof data.station === 'object') return data.station;
  if (data.currentStation && typeof data.currentStation === 'object') return data.currentStation;
  if (data.playStation && typeof data.playStation === 'object') return data.playStation;

  if (data.data && typeof data.data === 'object') {
    if (data.data.station) return data.data.station;
  }

  return null;
}

function extractAction(data: any): string {
  if (!data) return '';

  if (data.pendingCommand) {
    var pc = data.pendingCommand;
    if (pc.type) return pc.type;
    if (pc.action) return pc.action;
    if (pc.command) return pc.command;
  }

  if (data.command && typeof data.command === 'object') {
    if (data.command.type) return data.command.type;
    if (data.command.action) return data.command.action;
  }

  if (data.type) return data.type;
  if (data.action) return data.action;
  if (data.command && typeof data.command === 'string') return data.command;

  return '';
}

function pollForCommands() {
  if (!_token) return;

  _pollCount++;
  var currentPoll = _pollCount;

  var url = API_BASE + '/api/cast/poll?deviceId=' + encodeURIComponent(getDeviceId()) + '&platform=' + encodeURIComponent(getPlatformName());

  console.log('[Cast] Poll #' + currentPoll + ' fetching...');

  fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': 'Bearer ' + _token,
      'Content-Type': 'application/json'
    }
  })
  .then(function(response) {
    console.log('[Cast] Poll #' + currentPoll + ' HTTP ' + response.status);
    if (!response.ok) {
      return response.text().then(function(txt) {
        throw new Error('Poll HTTP ' + response.status + ': ' + txt.substring(0, 200));
      });
    }
    return response.json();
  })
  .then(function(data) {
    console.log('[Cast] Poll #' + currentPoll + ' response:', JSON.stringify(data).substring(0, 500));

    if (!_isConnected) {
      _isConnected = true;
      console.log('[Cast] Poll connected OK');
      if (_onStatusChange) _onStatusChange('connected');
    }

    var station = extractStationFromResponse(data);
    var action = extractAction(data);

    console.log('[Cast] Poll #' + currentPoll + ' extracted: station=' + (station ? (station.name || station._id || 'YES') : 'null') + ' action=' + (action || 'none'));

    if (station) {
      var cmdHash = makeCommandHash(data.pendingCommand || data.command || data.lastCommand || data);
      console.log('[Cast] cmdHash=' + cmdHash + ' lastHash=' + _lastCommandHash);
      if (cmdHash !== _lastCommandHash) {
        _lastCommandHash = cmdHash;
        console.log('[Cast] >>> NEW STATION from poll:', station.name || station._id, 'action:', action);
        if (_onMessage) {
          _onMessage({ type: 'cast:play', station: station });
        } else {
          console.error('[Cast] No _onMessage handler!');
        }
      } else {
        console.log('[Cast] Same command hash, skipping duplicate');
      }
    } else if (action) {
      var normalizedAction = action.indexOf('cast:') === 0 ? action : 'cast:' + action;
      if (normalizedAction === 'cast:pause' || normalizedAction === 'cast:resume' || normalizedAction === 'cast:stop') {
        var actionHash = makeCommandHash(data.pendingCommand || data.command || data);
        if (actionHash !== _lastCommandHash) {
          _lastCommandHash = actionHash;
          console.log('[Cast] >>> ACTION from poll:', normalizedAction);
          if (_onMessage) {
            _onMessage({ type: normalizedAction });
          }
        }
      }
    } else {
      console.log('[Cast] Poll #' + currentPoll + ' no station or action found in response');
    }
  })
  .catch(function(err) {
    console.warn('[Cast] Poll #' + currentPoll + ' error:', err.message || err);
    if (_isConnected) {
      _isConnected = false;
      if (_onStatusChange) _onStatusChange('disconnected');
    }
  });
}

export var castService = {
  startPolling: function(token: string, onMessage: (msg: any) => void, onStatusChange: (status: string) => void) {
    console.log('[Cast] startPolling() token=' + (token ? 'yes' : 'no') + ' deviceId=' + getDeviceId());

    castService.stopPolling();

    _token = token;
    _onMessage = onMessage;
    _onStatusChange = onStatusChange;
    _shouldPoll = true;
    _lastCommandHash = null;
    _pollCount = 0;

    pollForCommands();

    _pollInterval = setInterval(function() {
      if (_shouldPoll) {
        pollForCommands();
      }
    }, 3000);
  },

  stopPolling: function() {
    _shouldPoll = false;
    _isConnected = false;
    _onMessage = null;
    _onStatusChange = null;
    _token = null;
    _lastCommandHash = null;
    _pollCount = 0;

    if (_pollInterval) {
      clearInterval(_pollInterval);
      _pollInterval = null;
    }
  },

  sendNowPlaying: function(data: { title?: string; artist?: string; stationName?: string; isPlaying: boolean }) {
    if (!_token || !_isConnected) return;

    fetch(API_BASE + '/api/cast/now-playing', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + _token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        deviceId: getDeviceId(),
        platform: getPlatformName(),
        title: data.title,
        artist: data.artist,
        stationName: data.stationName,
        isPlaying: data.isPlaying
      })
    }).catch(function(err) {
      console.warn('[Cast] sendNowPlaying error:', err);
    });
  },

  isConnected: function(): boolean {
    return _isConnected;
  }
};
