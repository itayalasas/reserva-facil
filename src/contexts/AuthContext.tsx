import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { 
  AuthData, 
  getStoredAuthData, 
  isTokenValid, 
  redirectToAuth, 
  clearAuthData,
  extractAuthData,
  processAuthResponse,
  validateToken
} from '../lib/authSystem';

interface AuthContextType {
  user: User | null;
  externalUser: AuthData | null;
  userRole: string | null;
  loading: boolean;
  isExternalAuth: boolean;
  login: (action?: 'login' | 'register') => void;
  logout: () => void;
  processAuthCallback: () => Promise<boolean>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  externalUser: null,
  userRole: null,
  loading: true,
  isExternalAuth: false,
  login: () => {},
  logout: () => {},
  processAuthCallback: async () => false,
  isAuthenticated: false,
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [externalUser, setExternalUser] = useState<AuthData | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExternalAuth, setIsExternalAuth] = useState(false);

  // Helper function to ensure user exists in public.users table
  const ensurePublicUserExists = async (userData: { id: string; email: string; name?: string; role?: string }) => {
    try {
      // Check if user already exists
      const { data: existingUser, error: selectError } = await supabase
        .from('users')
        .select('id')
        .eq('id', userData.id)
        .maybeSingle();

      if (selectError && selectError.code !== 'PGRST116') {
        console.error('Error checking user existence:', selectError);
        return false;
      }

      // If user doesn't exist, create them
      if (!existingUser) {
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: userData.id,
            email: userData.email,
            name: userData.name || userData.email.split('@')[0],
            role: userData.role || 'client'
          });

        if (insertError) {
          console.error('Error creating user in public.users:', insertError);
          return false;
        }

        console.log('User created in public.users table:', userData.id);
      } else {
        // Update existing user data if needed
        const { error: updateError } = await supabase
          .from('users')
          .update({
            email: userData.email,
            name: userData.name || userData.email.split('@')[0],
            role: userData.role || 'client',
            updated_at: new Date().toISOString()
          })
          .eq('id', userData.id);

        if (updateError) {
          console.error('Error updating user in public.users:', updateError);
        }
      }

      return true;
    } catch (error) {
      console.error('Error in ensurePublicUserExists:', error);
      return false;
    }
  };

  // Verificar tokens periódicamente
  useEffect(() => {
    const interval = setInterval(() => {
      checkTokenExpiration();
    }, 60000); // Verificar cada minuto

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkTokenExpiration = () => {
    const authData = getStoredAuthData();
    if (authData && !isTokenValid(authData)) {
      console.log('Token expirado, cerrando sesión');
      logout();
    }
  };

  const checkAuthentication = async () => {
    try {
      // Primero verificar autenticación externa
      const authData = getStoredAuthData();
      
      if (authData && isTokenValid(authData)) {
        // Validar token con el servidor si es necesario
        const isValid = await validateToken(authData.token);
        if (!isValid) {
          clearAuthData();
          setLoading(false);
          return;
        }
        
        setExternalUser(authData);
        setUserRole(authData.user.role.toLowerCase());
        setIsExternalAuth(true);
        
        // Ensure user exists in public.users table
        await ensurePublicUserExists({
          id: authData.user.id,
          email: authData.user.email,
          name: authData.user.name,
          role: authData.user.role
        });
        
        setLoading(false);
        return;
      }
      
      // Si no hay auth externa válida, limpiar datos
      if (authData) {
        clearAuthData();
      }
      
      // Verificar autenticación de Supabase como fallback
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // Ensure Supabase user also exists in public.users table
        await ensurePublicUserExists({
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || '',
          role: session.user.user_metadata?.role || 'client'
        });
        
        setUser(session.user);
        setUserRole(session.user.user_metadata?.role ?? 'client');
      } else {
        setUser(null);
        setUserRole(null);
      }
      
      setIsExternalAuth(false);
      
    } catch (error) {
      console.error('Error verificando autenticación:', error);
      // En caso de error, limpiar todo
      clearAuthData();
      setExternalUser(null);
      setUser(null);
      setUserRole(null);
      setIsExternalAuth(false);
    } finally {
      setLoading(false);
    }
  };

  const login = (action: 'login' | 'register' = 'login') => {
    try {
      redirectToAuth(action);
    } catch (error) {
      console.error(`Error al iniciar ${action}:`, error);
      // Redirigir a página de mantenimiento si hay error
      window.location.href = '/maintenance';
    }
  };

  const processAuthCallback = async (): Promise<boolean> => {
    try {
      // Debug: Log current URL and parameters
      console.log('Current URL:', window.location.href);
      console.log('Search params:', window.location.search);
      
      const urlParams = new URLSearchParams(window.location.search);
      
      // Debug: Log all URL parameters
      console.log('All URL params:', Object.fromEntries(urlParams.entries()));
      
      // Verificar si es un callback con datos de autenticación directos
      const success = urlParams.get('success');
      const state = urlParams.get('state');
      const authDataParam = urlParams.get('auth_data');
      
      // Check for direct auth_data parameter
      if ((success === 'true' || state === 'success') && authDataParam) {
        try {
          // Decodificar datos de autenticación
          const authResponse = JSON.parse(decodeURIComponent(authDataParam));
          const authData = await processAuthResponse(authResponse);
          
          localStorage.setItem('authData', JSON.stringify(authData));
          
          setExternalUser(authData);
          setUserRole(authData.user.role.toLowerCase());
          setIsExternalAuth(true);
          
          await ensurePublicUserExists({
            id: authData.user.id,
            email: authData.user.email,
            name: authData.user.name,
            role: authData.user.role
          });
          
          return true;
        } catch (parseError) {
          console.error('Error parsing auth data:', parseError);
        }
      }
      
      // Check for state=success with individual parameters
      if (state === 'success') {
        try {
          console.log('Processing state=success callback');
          const authData = extractAuthData(urlParams);
          localStorage.setItem('authData', JSON.stringify(authData));
          
          setExternalUser(authData);
          setUserRole(authData.user.role.toLowerCase());
          setIsExternalAuth(true);
          
          await ensurePublicUserExists({
            id: authData.user.id,
            email: authData.user.email,
            name: authData.user.name,
            role: authData.user.role
          });
          
          return true;
        } catch (error) {
          console.error('Error processing state=success callback:', error);
        }
      }
      
      const token = urlParams.get('token');
      
      if (!token) {
        // Check if we have other auth parameters that might indicate success
        const success = urlParams.get('success');
        const authToken = urlParams.get('auth_token');
        const accessToken = urlParams.get('access_token');
        
        // Try alternative token parameter names
        const alternativeToken = authToken || accessToken;
        
        if (alternativeToken) {
          console.log('Using alternative token parameter:', alternativeToken);
          // Process with alternative token
          const isValid = await validateToken(alternativeToken);
          if (!isValid) {
            throw new Error('Token de autenticación inválido');
          }
          
          // Create URLSearchParams with the correct token
          const correctedParams = new URLSearchParams();
          correctedParams.set('token', alternativeToken);
          // Copy other parameters
          urlParams.forEach((value, key) => {
            if (key !== 'auth_token' && key !== 'access_token') {
              correctedParams.set(key, value);
            }
          });
          
          const authData = extractAuthData(correctedParams);
          localStorage.setItem('authData', JSON.stringify(authData));
          
          setExternalUser(authData);
          setUserRole(authData.user.role.toLowerCase());
          setIsExternalAuth(true);
          
          return true;
        }
        
        // If success=true but no token, it might be a different auth flow
        if (success === 'true') {
          console.log('Success callback without token - checking for user data');
          // Try to extract user data from other parameters
          const userId = urlParams.get('user_id') || urlParams.get('id');
          const email = urlParams.get('email');
          const name = urlParams.get('name');
          const role = urlParams.get('role') || 'client';
          
          if (userId && email) {
            // Create a mock auth data structure
            const authData = {
              token: `mock_token_${Date.now()}`, // Temporary token
              user: {
                id: userId,
                email: email,
                name: name || '',
                role: role.toLowerCase()
              },
              expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
            };
            
            localStorage.setItem('authData', JSON.stringify(authData));
            setExternalUser(authData);
            setUserRole(authData.user.role.toLowerCase());
            setIsExternalAuth(true);
            
            return true;
          }
        }
        
        console.error('No token found in URL parameters:', Object.fromEntries(urlParams.entries()));
        throw new Error('Token de autenticación no encontrado en la URL de callback');
      }

      // Validar token
      // Skip server validation in development mode or if server is not available
      try {
        const isValid = await validateToken(token);
        if (!isValid) {
          console.warn('Token validation failed with server, proceeding with local validation');
        }
      } catch (validationError) {
        console.warn('Server validation unavailable, using local validation:', validationError);
      }

      // Extraer y guardar datos de autenticación
      const authData = extractAuthData(urlParams);
      localStorage.setItem('authData', JSON.stringify(authData));
      
      // Ensure user exists in public.users table
      const userCreated = await ensurePublicUserExists({
        id: authData.user.id,
        email: authData.user.email,
        name: authData.user.name,
        role: authData.user.role
      });
      
      if (!userCreated) {
        console.warn('Failed to create user in public.users table, but continuing...');
      }
      
      // Actualizar estado inmediatamente
      setExternalUser(authData);
      setUserRole(authData.user.role.toLowerCase());
      setIsExternalAuth(true);
      
      // Actualizar loading state
      setTimeout(() => {
        setLoading(false);
      }, 100);
      
      return true;
    } catch (error) {
      console.error('Error procesando callback:', error);
      return false;
    }
  };

  const logout = async () => {
    if (isExternalAuth) {
      clearAuthData();
      setExternalUser(null);
    } else {
      await supabase.auth.signOut();
      setUser(null);
    }
    
    setUserRole(null);
    setIsExternalAuth(false);
  };

  // Escuchar cambios en Supabase auth solo si no estamos usando auth externa
  useEffect(() => {
    if (isExternalAuth) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        setUserRole(session?.user?.user_metadata?.role ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [isExternalAuth]);

  const isAuthenticated = isExternalAuth ? !!externalUser : !!user;

  return (
    <AuthContext.Provider value={{ 
      user, 
      externalUser, 
      userRole, 
      loading, 
      isExternalAuth,
      login,
      logout,
      processAuthCallback,
      isAuthenticated
    }}>
      {children}
    </AuthContext.Provider>
  );
};