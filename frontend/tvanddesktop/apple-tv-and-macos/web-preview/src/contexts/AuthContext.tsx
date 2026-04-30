import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';

var API_BASE = 'https://api.themegaradio.com';

function getAuthDeviceId(): string {
  try {
    var w = window as any;
    if (w.webapis && w.webapis.productinfo && typeof w.webapis.productinfo.getDuid === 'function') {
      return w.webapis.productinfo.getDuid();
    }
  } catch (e) {}
  try {
    var w2 = window as any;
    if (w2.webOS && w2.webOS.deviceInfo) {
      if (typeof w2.webOS.deviceInfo === 'object' && w2.webOS.deviceInfo.serialNumber) {
        return w2.webOS.deviceInfo.serialNumber;
      }
    }
  } catch (e) {}
  try {
    var saved = localStorage.getItem('tv_device_id');
    if (saved) return saved;
  } catch (e) {}
  var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0;
    var v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
  try { localStorage.setItem('tv_device_id', uuid); } catch (e) {}
  return uuid;
}

function getAuthPlatformName(): string {
  var ua = (typeof navigator !== 'undefined' && navigator.userAgent) ? navigator.userAgent.toLowerCase() : '';
  if (ua.indexOf('tizen') !== -1) return 'tizen';
  if (ua.indexOf('webos') !== -1) return 'webos';
  return 'other';
}

function getAuthDeviceName(): string {
  var platform = getAuthPlatformName();
  if (platform === 'tizen') return 'Samsung TV';
  if (platform === 'webos') return 'LG TV';
  return 'TV';
}

function fixAvatarUrl(user: any): any {
  if (!user) return user;
  if (user.avatar && user.avatar.indexOf('http') !== 0) {
    user.avatar = 'https://themegaradio.com/' + user.avatar;
  }
  if (user.profileImage && user.profileImage.indexOf('http') !== 0) {
    user.profileImage = 'https://themegaradio.com/' + user.profileImage;
  }
  return user;
}

interface User {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
  deviceCode: string | null;
  codeExpiresAt: string | null;
  isPolling: boolean;
  loginError: boolean;
}

var AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  var [user, setUser] = useState<User | null>(null);
  var [token, setToken] = useState<string | null>(null);
  var [isLoading, setIsLoading] = useState(true);
  var [deviceCode, setDeviceCode] = useState<string | null>(null);
  var [codeExpiresAt, setCodeExpiresAt] = useState<string | null>(null);
  var [isPolling, setIsPolling] = useState(false);
  var [loginError, setLoginError] = useState(false);
  var pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  var codeExpiresAtRef = useRef<string | null>(null);

  useEffect(function() {
    codeExpiresAtRef.current = codeExpiresAt;
  }, [codeExpiresAt]);

  var isAuthenticated = !!token && !!user;

  useEffect(function() {
    var savedToken = null;
    try {
      savedToken = localStorage.getItem('tv_auth_token');
    } catch (e) {
      // localStorage not available
    }

    if (!savedToken) {
      setIsLoading(false);
      return;
    }

    verifyToken(savedToken);
  }, []);

  function verifyToken(savedToken: string) {
    fetch(API_BASE + '/api/auth/tv/verify', {
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + savedToken }
    })
    .then(function(response) {
      if (!response.ok) {
        throw new Error('Token invalid');
      }
      return response.json();
    })
    .then(function(data) {
      setToken(savedToken);
      var savedUser = null;
      try {
        var raw = localStorage.getItem('tv_auth_user');
        if (raw) {
          savedUser = JSON.parse(raw);
        }
      } catch (e) {
        // parse error
      }
      if (savedUser) {
        setUser(fixAvatarUrl(savedUser));
      } else if (data && data.user) {
        setUser(fixAvatarUrl(data.user));
      }
      setIsLoading(false);
    })
    .catch(function() {
      try {
        localStorage.removeItem('tv_auth_token');
        localStorage.removeItem('tv_auth_user');
      } catch (e) {
        // ignore
      }
      setToken(null);
      setUser(null);
      setIsLoading(false);
    });
  }

  function stopPolling() {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setIsPolling(false);
  }

  function login() {
    stopPolling();
    setDeviceCode(null);
    setCodeExpiresAt(null);
    setLoginError(false);

    fetch(API_BASE + '/api/auth/tv/code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId: getAuthDeviceId(),
        deviceName: getAuthDeviceName(),
        platform: getAuthPlatformName()
      })
    })
    .then(function(response) {
      if (!response.ok) {
        throw new Error('Failed to get device code');
      }
      return response.json();
    })
    .then(function(data) {
      console.log('[Auth] Code response:', JSON.stringify(data));
      var code = data.code;
      var expiresAt = data.expiresAt;
      if (!expiresAt && data.expiresIn) {
        expiresAt = new Date(Date.now() + data.expiresIn * 1000).toISOString();
      }
      setDeviceCode(code);
      setCodeExpiresAt(expiresAt);
      setLoginError(false);
      startPolling(code);
    })
    .catch(function(err) {
      console.error('[Auth] Failed to get device code:', err);
      setLoginError(true);
    });
  }

  function startPolling(code: string) {
    setIsPolling(true);

    pollingRef.current = setInterval(function() {
      var expiresStr = codeExpiresAtRef.current;
      if (expiresStr) {
        var expiresTime = new Date(expiresStr).getTime();
        if (Date.now() >= expiresTime) {
          console.log('[Auth] Device code expired, requesting new code');
          stopPolling();
          login();
          return;
        }
      }

      var currentDeviceId = getAuthDeviceId();
      var statusUrl = API_BASE + '/api/auth/tv/code/' + code + '/status?deviceId=' + encodeURIComponent(currentDeviceId);
      fetch(statusUrl, {
        method: 'GET'
      })
      .then(function(response) {
        if (!response.ok) {
          if (response.status === 404 || response.status === 410) {
            console.log('[Auth] Code expired/invalid on server, requesting new code');
            stopPolling();
            login();
            return;
          }
          throw new Error('Polling failed: ' + response.status);
        }
        return response.json();
      })
      .then(function(data) {
        if (!data) return;
        console.log('[Auth] Polling response:', JSON.stringify(data));
        if (data.expired || data.status === 'expired') {
          console.log('[Auth] Server reported code expired, requesting new code');
          stopPolling();
          login();
          return;
        }
        var isActivated = data.activated || data.status === 'activated' || data.status === 'verified';
        if (isActivated && data.token) {
          var newToken = data.token;
          var newUser = fixAvatarUrl(data.user);

          try {
            localStorage.setItem('tv_auth_token', newToken);
            localStorage.setItem('tv_auth_user', JSON.stringify(newUser));
          } catch (e) {
            // localStorage error
          }

          setToken(newToken);
          setUser(newUser);
          setDeviceCode(null);
          setCodeExpiresAt(null);
          stopPolling();
        }
      })
      .catch(function(err) {
        console.warn('[Auth] Polling error:', err);
      });
    }, 3000);
  }

  function logout() {
    var currentToken = token;
    stopPolling();

    if (currentToken) {
      fetch(API_BASE + '/api/auth/tv/logout', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + currentToken }
      }).catch(function() {
        // ignore logout API errors
      });
    }

    try {
      localStorage.removeItem('tv_auth_token');
      localStorage.removeItem('tv_auth_user');
    } catch (e) {
      // ignore
    }

    setToken(null);
    setUser(null);
    setDeviceCode(null);
    setCodeExpiresAt(null);
  }

  useEffect(function() {
    return function() {
      stopPolling();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: isAuthenticated,
        user: user,
        token: token,
        isLoading: isLoading,
        login: login,
        logout: logout,
        deviceCode: deviceCode,
        codeExpiresAt: codeExpiresAt,
        isPolling: isPolling,
        loginError: loginError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  var context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
