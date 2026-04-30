import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useGlobalPlayer } from '@/contexts/GlobalPlayerContext';
import { castService } from '@/services/castService';
import { Station, megaRadioApi } from '@/services/megaRadioApi';

interface CastContextType {
  isConnected: boolean;
}

var CastContext = createContext<CastContextType | undefined>(undefined);

export function CastProvider({ children }: { children: ReactNode }) {
  var { isAuthenticated, token } = useAuth();
  var { playStation, pauseStation, resumeStation, stopStation, currentStation, isPlaying, nowPlayingMetadata } = useGlobalPlayer();

  var [isConnected, setIsConnected] = useState(false);

  var playStationRef = useRef(playStation);
  var pauseStationRef = useRef(pauseStation);
  var resumeStationRef = useRef(resumeStation);
  var stopStationRef = useRef(stopStation);

  useEffect(function() { playStationRef.current = playStation; }, [playStation]);
  useEffect(function() { pauseStationRef.current = pauseStation; }, [pauseStation]);
  useEffect(function() { resumeStationRef.current = resumeStation; }, [resumeStation]);
  useEffect(function() { stopStationRef.current = stopStation; }, [stopStation]);

  function navigateToRadioPlaying(stationId: string) {
    console.log('[Cast] navigateToRadioPlaying stationId=' + stationId);
    console.log('[Cast] Current hash before nav:', window.location.hash);

    try {
      if (stationId) {
        try {
          localStorage.setItem('cast_pending_station', stationId);
        } catch (e) {}
      }

      var currentHash = window.location.hash || '';
      var isAlreadyOnRadioPlaying = currentHash.indexOf('radio-playing') !== -1;

      if (isAlreadyOnRadioPlaying) {
        console.log('[Cast] Already on radio-playing, forcing reload');
        window.location.hash = '#/discover-no-user';
        setTimeout(function() {
          window.location.hash = '#/radio-playing';
          console.log('[Cast] Hash after double-nav:', window.location.hash);
        }, 100);
      } else {
        window.location.hash = '#/radio-playing';
        console.log('[Cast] Hash set to:', window.location.hash);
      }

      setTimeout(function() {
        var afterHash = window.location.hash || '';
        console.log('[Cast] Hash verification after 500ms:', afterHash);
        if (afterHash.indexOf('radio-playing') === -1) {
          console.warn('[Cast] Hash not set correctly, retrying...');
          window.location.hash = '#/radio-playing';
        }
      }, 500);

    } catch (e) {
      console.error('[Cast] Navigation error:', e);
    }
  }

  function playStationFromCast(station: any) {
    var stationId = station._id || station.id || station.stationuuid || '';

    console.log('[Cast] playStationFromCast:', station.name, 'ID:', stationId);
    console.log('[Cast] Cast station data:', JSON.stringify(station).substring(0, 300));

    if (stationId) {
      console.log('[Cast] Fetching fresh station data from API:', stationId);

      megaRadioApi.getStationById(stationId).then(function(result) {
        if (result && result.station) {
          console.log('[Cast] API station loaded:', result.station.name, 'URL:', (result.station.url_resolved || result.station.url || '').substring(0, 60));
          console.log('[Cast] Calling playStation with API data...');
          playStationRef.current(result.station);
          console.log('[Cast] playStation called, now navigating...');
          setTimeout(function() { navigateToRadioPlaying(stationId); }, 200);
        } else {
          console.warn('[Cast] Station not found in API, trying cast data');
          var streamUrl = station.url_resolved || station.urlResolved || station.url || '';
          if (streamUrl) {
            if (station.urlResolved && !station.url_resolved) {
              station.url_resolved = station.urlResolved;
            }
            playStationRef.current(station as Station);
          }
          setTimeout(function() { navigateToRadioPlaying(stationId); }, 200);
        }
      }).catch(function(err) {
        console.error('[Cast] API fetch error, trying cast data:', err);
        var streamUrl = station.url_resolved || station.urlResolved || station.url || '';
        if (streamUrl) {
          if (station.urlResolved && !station.url_resolved) {
            station.url_resolved = station.urlResolved;
          }
          playStationRef.current(station as Station);
        }
        setTimeout(function() { navigateToRadioPlaying(stationId); }, 200);
      });
    } else {
      console.log('[Cast] No stationId, trying direct play with cast data');
      var streamUrl = station.url_resolved || station.urlResolved || station.url || '';
      if (streamUrl) {
        if (station.urlResolved && !station.url_resolved) {
          station.url_resolved = station.urlResolved;
        }
        playStationRef.current(station as Station);
        navigateToRadioPlaying('');
      }
    }
  }

  function handleMessage(msg: any) {
    console.log('[Cast] ====== MESSAGE RECEIVED ======');
    console.log('[Cast] Message type:', msg ? msg.type : 'undefined');
    console.log('[Cast] Message data:', JSON.stringify(msg).substring(0, 300));

    var msgType = msg && msg.type ? msg.type : '';

    if (msgType === 'cast:play' || msgType === 'cast:change_station') {
      var station = msg.station || (msg.data && msg.data.station);
      if (station) {
        console.log('[Cast] Playing station from cast:', station.name || station._id);
        playStationFromCast(station);
      } else {
        console.error('[Cast] cast:play message but no station found in msg');
      }
    } else if (msgType === 'cast:pause') {
      console.log('[Cast] Pause command received');
      pauseStationRef.current();
    } else if (msgType === 'cast:resume') {
      console.log('[Cast] Resume command received');
      resumeStationRef.current();
    } else if (msgType === 'cast:stop') {
      console.log('[Cast] Stop command received');
      stopStationRef.current();
    } else {
      console.log('[Cast] Unknown message type:', msgType);
    }
  }

  function handleStatusChange(status: string) {
    console.log('[Cast] Status changed to:', status);
    setIsConnected(status === 'connected');
  }

  useEffect(function() {
    console.log('[Cast] === Effect === auth=' + isAuthenticated + ' token=' + (token ? 'yes(' + token.substring(0, 10) + '...)' : 'no'));

    if (isAuthenticated && token) {
      console.log('[Cast] Starting auto-poll (same account = auto cast)');
      castService.startPolling(token, handleMessage, handleStatusChange);
    } else {
      console.log('[Cast] Not starting poll - auth=' + isAuthenticated + ' token=' + (token ? 'yes' : 'no'));
    }

    return function() {
      console.log('[Cast] Effect cleanup - stopping poll');
      castService.stopPolling();
    };
  }, [isAuthenticated, token]);

  useEffect(function() {
    if (isConnected && currentStation) {
      var stationName = currentStation.name || '';
      var metadata = nowPlayingMetadata || '';
      var parts = metadata.split(' - ');
      var title = parts.length > 1 ? parts[1] : metadata;
      var artist = parts.length > 1 ? parts[0] : '';

      castService.sendNowPlaying({
        title: title || undefined,
        artist: artist || undefined,
        stationName: stationName || undefined,
        isPlaying: isPlaying
      });
    }
  }, [currentStation, nowPlayingMetadata, isPlaying, isConnected]);

  return (
    <CastContext.Provider value={{ isConnected: isConnected }}>
      {children}
    </CastContext.Provider>
  );
}

export function useCast() {
  var context = useContext(CastContext);
  if (!context) {
    throw new Error('useCast must be used within CastProvider');
  }
  return context;
}
