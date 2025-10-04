// Mercado Pago Integration
export interface MercadoPagoConfig {
  publicKey: string;
  accessToken: string;
}

export interface PaymentData {
  amount: number;
  description: string;
  payerEmail: string;
  payerName: string;
  externalReference: string;
}

export interface PaymentResponse {
  id: string;
  status: string;
  detail: string;
  payment_method_id?: string;
  payment_type_id?: string;
}

// Cargar el SDK de Mercado Pago
export const loadMercadoPagoSDK = (publicKey: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    if (window.MercadoPago) {
      const mpInstance = new window.MercadoPago(publicKey);
      resolve(mpInstance);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://sdk.mercadopago.com/js/v2';
    script.onload = () => {
      if (window.MercadoPago) {
        const mpInstance = new window.MercadoPago(publicKey);
        resolve(mpInstance);
      } else {
        reject(new Error('Failed to load MercadoPago SDK'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load MercadoPago SDK'));
    document.head.appendChild(script);
  });
};

// Crear preferencia de pago
export const createPaymentPreference = async (
  accessToken: string,
  paymentData: PaymentData
) => {
  try {
    
    // Detectar si es ambiente de test/sandbox
    const isTestEnvironment = accessToken.startsWith('TEST-') || 
                              accessToken.includes('TEST') || 
                              accessToken.includes('test') || 
                              accessToken.startsWith('APP_USR-');
    const baseUrl = isTestEnvironment 
      ? 'https://api.mercadopago.com/checkout/preferences' // Sandbox usa la misma URL pero con credenciales TEST
      : 'https://api.mercadopago.com/checkout/preferences';
    
    
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        items: [
          {
            title: paymentData.description,
            unit_price: Number(paymentData.amount), // Asegurar que sea número
            quantity: 1,
            currency_id: 'UYU' // Pesos uruguayos para Uruguay
          }
        ],
        payer: {
          email: paymentData.payerEmail,
          name: paymentData.payerName
        },
        external_reference: paymentData.externalReference,
        back_urls: {
          success: `${window.location.origin}/#/?payment=success&external_reference=${paymentData.externalReference}`,
          failure: `${window.location.origin}/#/?payment=failure&external_reference=${paymentData.externalReference}`,
          pending: `${window.location.origin}/#/?payment=pending&external_reference=${paymentData.externalReference}`
        },
        auto_return: 'all',
        // Forzar uso de sandbox para desarrollo
        // Configuración específica para sandbox
        ...(isTestEnvironment && {
          notification_url: `${window.location.origin}/api/webhooks/mercadopago`
        }),
        payment_methods: {
          excluded_payment_methods: [],
          excluded_payment_types: [],
          installments: 12
        },
        // Configuración adicional para sandbox
        binary_mode: false,
        expires: false
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('MercadoPago API Error:', errorData);
      throw new Error(`Error ${response.status}: ${errorData.message || 'Error al crear preferencia de pago'}`);
    }

    const preference = await response.json();
    
    // Siempre usar sandbox_init_point si está disponible para desarrollo
    const checkoutUrl = preference.sandbox_init_point || preference.init_point;
    
    return preference;
  } catch (error) {
    console.error('Error creating payment preference:', error);
    throw error;
  }
};

// Procesar pago con tarjeta
export const processCardPayment = async (
  mp: any,
  paymentData: PaymentData & { token: string; installments: number }
): Promise<PaymentResponse> => {
  try {
    const response = await fetch('/api/process-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token: paymentData.token,
        transaction_amount: paymentData.amount,
        description: paymentData.description,
        installments: paymentData.installments,
        payment_method_id: 'visa', // Se detectará automáticamente
        payer: {
          email: paymentData.payerEmail,
          identification: {
            type: 'DNI',
            number: '12345678'
          }
        },
        external_reference: paymentData.externalReference
      })
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error processing card payment:', error);
    throw error;
  }
};

// Declarar tipos globales para TypeScript
declare global {
  interface Window {
    MercadoPago: any;
  }
}