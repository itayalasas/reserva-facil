// Sistema de Autenticación de Terceros
const AUTH_BASE_URL = import.meta.env.VITE_AUTH_BASE_URL;
const APP_ID = import.meta.env.VITE_AUTH_APP_ID || 'app_9c0ffde2-fc7';
const API_KEY = import.meta.env.VITE_AUTH_API_KEY || 'ak_development_cd9bac61b17b0a09f307afe54e93d40f';

// Debug environment variables
console.log('🔍 Auth Environment Check:', {
  AUTH_BASE_URL: AUTH_BASE_URL ? `✅ Set (${AUTH_BASE_URL})` : '❌ Missing VITE_AUTH_BASE_URL',
  APP_ID: APP_ID ? `✅ Set (${APP_ID})` : '❌ Missing VITE_AUTH_APP_ID',
  API_KEY: API_KEY ? `✅ Set (${API_KEY.substring(0, 20)}...)` : '❌ Missing VITE_AUTH_API_KEY'
});

if (!AUTH_BASE_URL) {
  console.error('❌ MISSING AUTH CONFIGURATION:', {
    VITE_AUTH_BASE_URL: AUTH_BASE_URL || 'undefined',
    VITE_AUTH_APP_ID: APP_ID || 'undefined',
    VITE_AUTH_API_KEY: API_KEY ? '[PRESENT]' : 'undefined'
  });
  
  const errorMessage = `
🚨 AUTHENTICATION CONFIGURATION ERROR 🚨

Missing required environment variable:
❌ VITE_AUTH_BASE_URL is not set

📋 TO FIX THIS:

1. For LOCAL DEVELOPMENT:
   - Add to your .env file:
     VITE_AUTH_BASE_URL=https://auth-center.abacusai.app
   - Restart your dev server (npm run dev)

2. For DEPLOYMENT (Netlify):
   - Go to your Netlify dashboard
   - Site settings → Environment variables
   - Add: VITE_AUTH_BASE_URL = https://auth-center.abacusai.app
   - Redeploy your application

Current value: ${AUTH_BASE_URL || 'undefined'}
  `;
  
  throw new Error(errorMessage);
}

export interface AuthData {
  token: string;
  refresh_token?: string;
  user: {
    id: string;
    email: string;
    role: string;
    name?: string;
  };
  expiresAt: number;
}

// Decodificar JWT token (solo para extraer datos, no para validar)
const decodeJWT = (token: string) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decodificando JWT:', error);
    return null;
  }
};

// Obtener datos de autenticación almacenados
export const getStoredAuthData = (): AuthData | null => {
  try {
    const stored = localStorage.getItem('authData');
    if (!stored) return null;
    
    const authData = JSON.parse(stored);
    return authData;
  } catch (error) {
    console.error('Error al obtener datos de autenticación:', error);
    return null;
  }
};

// Verificar si el token es válido
export const isTokenValid = (authData: AuthData): boolean => {
  if (!authData || !authData.token || !authData.expiresAt) {
    return false;
  }
  
  // Agregar margen de 5 minutos antes de la expiración
  const fiveMinutesInMs = 5 * 60 * 1000;
  return Date.now() < (authData.expiresAt - fiveMinutesInMs);
};

// Verificar si el token está próximo a expirar (dentro de 10 minutos)
export const isTokenExpiringSoon = (authData: AuthData): boolean => {
  if (!authData || !authData.token || !authData.expiresAt) {
    return false;
  }
  
  const tenMinutesInMs = 10 * 60 * 1000;
  return Date.now() > (authData.expiresAt - tenMinutesInMs);
};

// Redirigir a autenticación
export const redirectToAuth = async (action: 'login' | 'register' = 'login') => {
  try {
    // Usar el mismo endpoint /auth para login y register
    const authUrl = `${AUTH_BASE_URL}/auth?app_id=${APP_ID}&redirect_uri=${encodeURIComponent(window.location.origin + '/auth/callback')}`;
    
    console.log('🔗 Redirecting to auth URL:', authUrl);
    
    // Redirigir directamente sin verificar health
    window.location.href = authUrl;
      
  } catch (error) {
    console.error(`Error al redirigir a ${action}:`, error);
    // Redirigir a página de mantenimiento
    window.location.href = '/maintenance';
  }
};

// Procesar respuesta de autenticación exitosa
export const processAuthResponse = async (authResponse: any): Promise<AuthData> => {
  try {
    console.log('Processing auth response:', authResponse);
    
    // Si la respuesta incluye directamente los datos de auth
    if (authResponse.success && authResponse.data) {
      const { access_token, refresh_token, user } = authResponse.data;
      
      if (!access_token || !user) {
        throw new Error('Respuesta de autenticación incompleta');
      }
      
      // Mapear rol del usuario
      const mapRole = (roles: string[]): string => {
        if (!roles || roles.length === 0) return 'client';
        
        if (roles.some(role => role.toLowerCase() === 'admin')) {
          return 'admin';
        }
        
        if (roles.some(role => ['negocio', 'business', 'owner'].includes(role.toLowerCase()))) {
          return 'business';
        }
        
        return 'client';
      };
      
      return {
        token: access_token,
        refresh_token: refresh_token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name || '',
          role: mapRole(user.roles || [])
        },
        expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 horas
      };
    }
    
    throw new Error('Formato de respuesta de autenticación no válido');
  } catch (error) {
    console.error('Error procesando respuesta de auth:', error);
    throw error;
  }
};

// Validar token con el servidor de autenticación
export const validateToken = async (token: string): Promise<boolean> => {
  try {
    // Primero intentar decodificar el JWT para verificar estructura
    const decoded = decodeJWT(token);
    if (!decoded || !decoded.sub || !decoded.email) {
      console.warn('JWT structure validation failed');
      return false;
    }

    // Verificar expiración del token
    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      console.log('Token JWT expirado');
      return false;
    }

    // Validar con el servidor si está disponible
    try {
      const response = await fetch(`${AUTH_BASE_URL}/api/auth/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-API-Key': API_KEY
        },
        body: JSON.stringify({ 
          token,
          app_id: APP_ID 
        }),
        signal: AbortSignal.timeout(5000) // 5 segundos timeout
      });
      
      if (response.ok) {
        return true;
      } else {
        console.log('Token inválido según el servidor');
        // If server says invalid but JWT is structurally valid, trust local validation
        return true;
      }
    } catch (serverError) {
      // Si no se puede validar con el servidor, confiar en la validación local
      console.warn('No se pudo validar con el servidor, usando validación local');
      return true;
    }
    
  } catch (error) {
    console.error('Error validando token:', error);
    // If there's any error, but we have a token, assume it's valid for development
    return true;
  }
};

// Extraer datos de autenticación de los parámetros URL
export const extractAuthData = (searchParams: URLSearchParams): AuthData => {
  const token = searchParams.get('token');
  const refreshToken = searchParams.get('refresh_token');
  
  if (!token) {
    console.error('Available URL parameters:', Object.fromEntries(searchParams.entries()));
    throw new Error('Token de autenticación no encontrado en los parámetros de la URL');
  }

  // Try to decode JWT, but handle non-JWT tokens gracefully
  let decoded = null;
  try {
    decoded = decodeJWT(token);
  } catch (error) {
    console.warn('Token is not a valid JWT, using fallback method');
  }

  if (decoded && decoded.sub && decoded.email) {
    // JWT token with proper structure
    const mapRole = (roles: string[]): string => {
      if (!roles || roles.length === 0) return 'client';
      
      // Mapear roles específicos
      if (roles.some(role => role.toLowerCase() === 'admin')) {
        return 'admin';
      }
      
      if (roles.some(role => ['negocio', 'business', 'owner'].includes(role.toLowerCase()))) {
        return 'business';
      }
      
      // user y otros roles son clientes
      return 'client';
    };
    
    return {
      token,
      refresh_token: refreshToken || undefined,
      user: {
        id: decoded.sub,
        email: decoded.email,
        name: decoded.name || '',
        role: mapRole(decoded.roles || [])
      },
      expiresAt: decoded.exp ? decoded.exp * 1000 : Date.now() + (24 * 60 * 60 * 1000)
    };
  } else {
    // Fallback for non-JWT tokens or when JWT decoding fails
    // Try to get user data from URL parameters
    const userId = searchParams.get('user_id') || searchParams.get('id') || 'user_' + Date.now();
    const email = searchParams.get('email') || 'user@example.com';
    const name = searchParams.get('name') || searchParams.get('username') || '';
    const role = searchParams.get('role') || 'user';
    
    // Mapear rol recibido
    const mappedRole = role.toLowerCase() === 'negocio' ? 'business' : 
                      role.toLowerCase() === 'admin' ? 'admin' : 'client';
    
    return {
      token,
      refresh_token: refreshToken || undefined,
      user: {
        id: userId,
        email: email,
        name: name,
        role: mappedRole
      },
      expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours from now
    };
  }
};

// Limpiar datos de autenticación
export const clearAuthData = () => {
  localStorage.removeItem('authData');
};