import { useState, useEffect } from 'react';
import { Settings, CreditCard, Eye, EyeOff, Save, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Notification, useNotification } from './Notification';
import { Business, PaymentConfig } from '../types';

interface BusinessSettingsProps {
  setCurrentView: (view: string) => void;
}

export const BusinessSettings = ({ setCurrentView }: BusinessSettingsProps) => {
  const { user, externalUser, isExternalAuth } = useAuth();
  const { notification, showSuccess, showError, hideNotification } = useNotification();
  const [business, setBusiness] = useState<Business | null>(null);
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showTokens, setShowTokens] = useState(false);
  const [formData, setFormData] = useState({
    mercado_pago_access_token: '',
    mercado_pago_public_key: '',
    is_active: false
  });

  // Get current user ID from external auth or Supabase
  const getCurrentUserId = () => {
    if (isExternalAuth && externalUser) {
      return externalUser.user.id;
    }
    return user?.id;
  };
  useEffect(() => {
    const userId = getCurrentUserId();
    if (userId) {
      fetchData();
    }
  }, [user, externalUser, isExternalAuth]);

  const fetchData = async () => {
    try {
      const userId = getCurrentUserId();
      if (!userId) return;

      // Fetch business
      const { data: businessData } = await supabase
        .from('businesses')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (businessData) {
        setBusiness(businessData);

        // Fetch payment config
        const { data: paymentData } = await supabase
          .from('payment_configs')
          .select('*')
          .eq('business_id', businessData.id)
          .maybeSingle();

        if (paymentData) {
          setPaymentConfig(paymentData);
          setFormData({
            mercado_pago_access_token: paymentData.mercado_pago_access_token,
            mercado_pago_public_key: paymentData.mercado_pago_public_key,
            is_active: paymentData.is_active
          });
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business) return;

    setSaving(true);
    try {
      const configData = {
        business_id: business.id,
        mercado_pago_access_token: formData.mercado_pago_access_token,
        mercado_pago_public_key: formData.mercado_pago_public_key,
        is_active: formData.is_active
      };

      if (paymentConfig) {
        // Update existing config
        const { error } = await supabase
          .from('payment_configs')
          .update(configData)
          .eq('id', paymentConfig.id);

        if (error) throw error;
      } else {
        // Create new config
        const { error } = await supabase
          .from('payment_configs')
          .insert([configData]);

        if (error) throw error;
      }

      showSuccess('Configuración guardada', 'La configuración de pagos se guardó correctamente');
      fetchData();
    } catch (error) {
      console.error('Error saving payment config:', error);
      showError('Error al guardar', 'No se pudo guardar la configuración. Intenta nuevamente.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <p className="text-gray-600 mb-4">Primero necesitas configurar tu negocio</p>
            <button
              onClick={() => setCurrentView('business-setup')}
              className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700"
            >
              Configurar Negocio
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Configuración - {business.name}
          </h1>
          <p className="text-gray-600">
            Configure los métodos de pago y otras opciones de su negocio
          </p>
        </div>

        {/* Payment Configuration */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <CreditCard className="h-6 w-6 text-green-600" />
              <h2 className="text-xl font-semibold text-gray-900">
                Configuración de Mercado Pago
              </h2>
            </div>
            <p className="text-gray-600 mt-2">
              Configure sus credenciales de Mercado Pago para recibir pagos de sus clientes
            </p>
          </div>

          <form onSubmit={handleSave} className="p-6 space-y-6">
            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-blue-900 mb-2">
                    ¿Cómo obtener las credenciales de Mercado Pago?
                  </h3>
                  <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                    <li>Ingresa a tu cuenta de <a href="https://www.mercadopago.com.ar/developers" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-900">Mercado Pago Developers</a></li>
                    <li>Ve a "Tus integraciones" y crea una nueva aplicación</li>
                    <li>Para pruebas: usa las credenciales de <strong>TEST</strong></li>
                    <li>Para producción: usa las credenciales de <strong>PRODUCCIÓN</strong></li>
                    <li>Pega las credenciales en los campos de abajo</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Access Token */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Access Token * {(formData.mercado_pago_access_token.startsWith('TEST-') || formData.mercado_pago_access_token.includes('TEST') || formData.mercado_pago_access_token.startsWith('APP_USR-')) && <span className="text-green-600 font-semibold">(SANDBOX/TEST)</span>}
              </label>
              <div className="relative">
                <input
                  type={showTokens ? 'text' : 'password'}
                  required
                  value={formData.mercado_pago_access_token}
                  onChange={(e) => setFormData({ ...formData, mercado_pago_access_token: e.target.value })}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="TEST-1234567890-123456-abcdef... (sandbox)"
                />
                <button
                  type="button"
                  onClick={() => setShowTokens(!showTokens)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showTokens ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Token privado: TEST-... (sandbox) o APP_USR-... (desarrollo)
              </p>
            </div>

            {/* Public Key */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Public Key * {(formData.mercado_pago_public_key.startsWith('TEST-') || formData.mercado_pago_public_key.includes('TEST') || formData.mercado_pago_public_key.startsWith('APP_USR-')) && <span className="text-green-600 font-semibold">(SANDBOX/TEST)</span>}
              </label>
              <input
                type="text"
                required
                value={formData.mercado_pago_public_key}
                onChange={(e) => setFormData({ ...formData, mercado_pago_public_key: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="TEST-abcdef12-3456-7890-abcd-ef1234567890 (sandbox)"
              />
              <p className="text-sm text-gray-500 mt-1">
                Clave pública: TEST-... (sandbox) o APP_USR-... (desarrollo)
              </p>
            </div>

            {/* Active Toggle */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div>
                <h3 className="font-medium text-gray-900">Activar Pagos</h3>
                <p className="text-sm text-gray-600">
                  Permite que los clientes paguen sus reservas con Mercado Pago
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Status */}
            {paymentConfig && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${paymentConfig.is_active ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                  <span className="font-medium text-gray-900">
                    Estado: {paymentConfig.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {paymentConfig.is_active 
                    ? 'Los clientes pueden pagar sus reservas con Mercado Pago'
                    : 'Los pagos están deshabilitados'
                  }
                </p>
              </div>
            )}

            {/* Save Button */}
            <div className="flex justify-end pt-6">
              <button
                type="submit"
                disabled={saving}
                className="bg-gradient-to-r from-green-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:from-green-700 hover:to-blue-700 transition-all duration-200 flex items-center space-x-2 disabled:opacity-50"
              >
                <Save className="h-5 w-5" />
                <span>{saving ? 'Guardando...' : 'Guardar Configuración'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Security Notice */}
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-yellow-900 mb-1">
                Información de Seguridad
              </h3>
              <p className="text-sm text-yellow-800">
                Sus credenciales de Mercado Pago se almacenan de forma segura y encriptada. 
                Nunca comparta estas credenciales con terceros. Si sospecha que han sido comprometidas, 
                genere nuevas credenciales en su panel de Mercado Pago inmediatamente.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Notification */}
      {notification && (
        <Notification
          type={notification.type}
          title={notification.title}
          message={notification.message}
          isVisible={notification.isVisible}
          onClose={hideNotification}
        />
      )}
    </div>
  );
};