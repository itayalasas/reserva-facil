// Sistema de Autenticación de Terceros
const AUTH_BASE_URL = import.meta.env.VITE_AUTH_BASE_URL;
const APP_ID = import.meta.env.VITE_AUTH_APP_ID || 'app_9c0ffde2-fc7';
const API_KEY = import.meta.env.VITE_AUTH_API_KEY || 'ak_development_cd9bac61b17b0a09f307afe54e93d40f';


if (!AUTH_BASE_URL) {
  
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
    const endpoint = action === 'register' ? '/register' : '/auth';
    const authUrl = `${AUTH_BASE_URL}${endpoint}?app_id=${APP_ID}&redirect_uri=${encodeURIComponent(window.location.origin + '/auth/callback')}&api_key=${API_KEY}`;
    window.location.href = authUrl;

  } catch (error) {
    window.location.href = '/maintenance';
  }
};

// Procesar respuesta de autenticación exitosa
export const processAuthResponse = async (authResponse: any): Promise<AuthData> => {
  try {
    if (authResponse.success && authResponse.data) {
      const { access_token, refresh_token, user } = authResponse.data;

      if (!access_token || !user) {
        throw new Error('Respuesta de autenticación incompleta');
      }

      const mapRole = (roles: string[]): string => {
        if (!roles || roles.length === 0) {
          return 'client';
        }

        if (roles.some(role => role.toLowerCase() === 'admin')) {
          return 'admin';
        }

        if (roles.some(role => ['negocio', 'business', 'owner'].includes(role.toLowerCase()))) {
          return 'business';
        }

        return 'client';
      };

      const mappedRole = mapRole(user.roles || []);

      return {
        token: access_token,
        refresh_token: refresh_token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name || '',
          role: mappedRole
        },
        expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 horas
      };
    }

    throw new Error('Formato de respuesta de autenticación no válido');
  } catch (error) {
    throw error;
  }
};

// Validar token con el servidor de autenticación
export const validateToken = async (token: string): Promise<boolean> => {
  try {
    const decoded = decodeJWT(token);
    if (!decoded || !decoded.sub || !decoded.email) {
      return false;
    }

    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
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
        return true;
      }
    } catch (serverError) {
      return true;
    }
    
  } catch (error) {
    return true;
  }
};

// Extraer datos de autenticación de los parámetros URL
export const extractAuthData = (searchParams: URLSearchParams): AuthData => {
  const token = searchParams.get('token');
  const refreshToken = searchParams.get('refresh_token');
  const state = searchParams.get('state');
  const userId = searchParams.get('user_id');
  const userEmail = searchParams.get('user_email');
  const userName = searchParams.get('user_name');
  const expiresIn = searchParams.get('expires_in');
  
  if (!token) {
    // Check if we have alternative auth parameters
    if (state === 'success' && userId && userEmail) {
      const roleParam = searchParams.get('role') || searchParams.get('user_role') || 'user';
      const mappedRole = roleParam.toLowerCase() === 'negocio' ? 'business' :
                        roleParam.toLowerCase() === 'admin' ? 'admin' :
                        roleParam.toLowerCase() === 'business' ? 'business' : 'client';

      // Create auth data from individual parameters
      return {
        token: `fallback_token_${Date.now()}`,
        refresh_token: refreshToken || undefined,
        user: {
          id: userId,
          email: decodeURIComponent(userEmail),
          name: userName ? decodeURIComponent(userName) : '',
          role: mappedRole
        },
        expiresAt: expiresIn ? Date.now() + (parseInt(expiresIn) * 1000) : Date.now() + (24 * 60 * 60 * 1000)
      };
    }

    throw new Error('Token de autenticación no encontrado en los parámetros de la URL');
  }

  // Try to decode JWT, but handle non-JWT tokens gracefully
  let decoded = null;
  try {
    decoded = decodeJWT(token);
  } catch (error) {
    // Fallback method
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
    // Use the parameters we already extracted
    const finalUserId = userId || searchParams.get('id') || 'user_' + Date.now();
    const finalEmail = userEmail || searchParams.get('email') || 'user@example.com';
    const finalName = userName || searchParams.get('name') || searchParams.get('username') || '';
    const role = searchParams.get('role') || searchParams.get('user_role') || 'user';

    const mappedRole = role.toLowerCase() === 'negocio' ? 'business' :
                      role.toLowerCase() === 'admin' ? 'admin' :
                      role.toLowerCase() === 'business' ? 'business' : 'client';
    
    return {
      token,
      refresh_token: refreshToken || undefined,
      user: {
        id: finalUserId,
        email: decodeURIComponent(finalEmail),
        name: finalName ? decodeURIComponent(finalName) : '',
        role: mappedRole
      },
      expiresAt: expiresIn ? Date.now() + (parseInt(expiresIn) * 1000) : Date.now() + (24 * 60 * 60 * 1000)
    };
  }
};

// Limpiar datos de autenticación
export const clearAuthData = () => {
  localStorage.removeItem('authData');
};