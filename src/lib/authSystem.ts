// External Authentication Service for AbacusAI
const AUTH_BASE_URL = import.meta.env.VITE_AUTH_BASE_URL;
const APP_ID = import.meta.env.VITE_AUTH_APP_ID || 'app_mg1rvnob8d0563aa3323fa8e';
const APP_CALLBACK_URL = window.location.origin + '/auth/callback';

// Debug environment variables
console.log('🔍 External Auth Environment Check:', {
  AUTH_BASE_URL: AUTH_BASE_URL ? `✅ Set (${AUTH_BASE_URL})` : '❌ Missing VITE_AUTH_BASE_URL',
  APP_ID: APP_ID ? `✅ Set (${APP_ID})` : '❌ Missing VITE_AUTH_APP_ID'
});

if (!AUTH_BASE_URL) {
  console.error('❌ External Auth configuration missing');
  throw new Error('VITE_AUTH_BASE_URL environment variable is required');
}

export interface ExternalAuthResponse {
  success: boolean;
  token: string;
  user: {
    id: string;
    email: string;
    role: string;
  };
}

export interface ExternalUser {
  id: string;
  email: string;
  role: string;
  token: string;
}

// Redirect to external auth provider
export const redirectToExternalAuth = () => {
  const authUrl = `${AUTH_BASE_URL}/auth?app_id=${APP_ID}&redirect_uri=${encodeURIComponent(APP_CALLBACK_URL)}`;
  console.log('🔗 External auth URL:', authUrl);
  window.location.href = authUrl;
};

// Process callback from external auth
export const processAuthCallback = async (callbackData: any): Promise<ExternalUser | null> => {
  try {
    // If the callback includes the auth response directly
    if (callbackData.success && callbackData.token && callbackData.user) {
      const user: ExternalUser = {
        id: callbackData.user.id,
        email: callbackData.user.email,
        role: callbackData.user.role.toLowerCase(), // Convert to lowercase for consistency
        token: callbackData.token
      };
      
      // Store in localStorage for persistence
      localStorage.setItem('external_auth_user', JSON.stringify(user));
      localStorage.setItem('external_auth_token', callbackData.token);
      
      return user;
    }
    
    return null;
  } catch (error) {
    console.error('Error processing auth callback:', error);
    return null;
  }
};

// Get stored user from localStorage
export const getStoredExternalUser = (): ExternalUser | null => {
  try {
    const storedUser = localStorage.getItem('external_auth_user');
    const storedToken = localStorage.getItem('external_auth_token');
    
    if (storedUser && storedToken) {
      const user = JSON.parse(storedUser);
      return { ...user, token: storedToken };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting stored user:', error);
    return null;
  }
};

// Validate token with external service
export const validateExternalToken = async (token: string): Promise<boolean> => {
  try {
    const response = await fetch(`${AUTH_BASE_URL}/api/auth/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    return response.ok;
  } catch (error) {
    console.error('Error validating token:', error);
    return false;
  }
};

// Logout from external auth
export const logoutExternalAuth = () => {
  localStorage.removeItem('external_auth_user');
  localStorage.removeItem('external_auth_token');
};

// Check if user is authenticated
export const isExternallyAuthenticated = (): boolean => {
  const user = getStoredExternalUser();
  return user !== null && user.token !== null;
};