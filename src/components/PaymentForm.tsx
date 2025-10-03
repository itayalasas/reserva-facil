import { useState, useEffect } from 'react';
import { CreditCard, Lock, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { loadMercadoPagoSDK, createPaymentPreference, PaymentData } from '../lib/mercadoPago';

interface PaymentFormProps {
  amount: number;
  description: string;
  payerEmail: string;
  payerName: string;
  publicKey: string;
  accessToken: string;
  externalReference: string;
  onPaymentSuccess: (paymentId: string) => void;
  onPaymentError: (error: string) => void;
}

export const PaymentForm = ({
  amount,
  description,
  payerEmail,
  payerName,
  publicKey,
  accessToken,
  externalReference,
  onPaymentSuccess,
  onPaymentError
}: PaymentFormProps) => {
  const [mp, setMp] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'checkout' | 'card'>('checkout');
  const [cardForm, setCardForm] = useState<any>(null);

  useEffect(() => {
    initializeMercadoPago();
  }, []);

  const initializeMercadoPago = async () => {
    try {
      const mercadoPago = await loadMercadoPagoSDK(publicKey);
      setMp(mercadoPago);
      setLoading(false);
    } catch (error) {
      console.error('Error loading MercadoPago:', error);
      onPaymentError('Error al cargar el sistema de pagos');
      setLoading(false);
    }
  };

  const handleCheckoutPayment = async () => {
    if (!mp) return;

    setProcessing(true);
    try {
      const paymentData: PaymentData = {
        amount,
        description,
        payerEmail,
        payerName,
        externalReference
      };

      console.log('Creating payment preference with data:', paymentData);
      console.log('Using access token:', accessToken.substring(0, 20) + '...'); // Debug (solo primeros 20 chars)
      const preference = await createPaymentPreference(accessToken, paymentData);
      console.log('Preference created, redirecting to:', preference.init_point);
      
      // Priorizar sandbox_init_point para desarrollo
      const checkoutUrl = preference.sandbox_init_point 
        ? preference.sandbox_init_point 
        : preference.init_point;
      
      console.log('Environment: DEVELOPMENT/SANDBOX');
      console.log('Final checkout URL:', checkoutUrl);
      
      // Redirigir al checkout de Mercado Pago
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      } else {
        throw new Error('No se pudo obtener la URL de pago');
      }
    } catch (error) {
      console.error('Error creating payment:', error);
      onPaymentError(`Error al procesar el pago: ${error.message || 'Intenta nuevamente.'}`);
      setProcessing(false);
    }
  };

  const initializeCardForm = () => {
    if (!mp || cardForm) return;

    const form = mp.cardForm({
      amount: amount.toString(),
      iframe: true,
      form: {
        id: "form-checkout",
        cardNumber: {
          id: "form-checkout__cardNumber",
          placeholder: "Número de tarjeta",
        },
        expirationDate: {
          id: "form-checkout__expirationDate",
          placeholder: "MM/YY",
        },
        securityCode: {
          id: "form-checkout__securityCode",
          placeholder: "Código de seguridad",
        },
        cardholderName: {
          id: "form-checkout__cardholderName",
          placeholder: "Titular de la tarjeta",
        },
        issuer: {
          id: "form-checkout__issuer",
          placeholder: "Banco emisor",
        },
        installments: {
          id: "form-checkout__installments",
          placeholder: "Cuotas",
        },
        identificationType: {
          id: "form-checkout__identificationType",
          placeholder: "Tipo de documento",
        },
        identificationNumber: {
          id: "form-checkout__identificationNumber",
          placeholder: "Número de documento",
        },
        cardholderEmail: {
          id: "form-checkout__cardholderEmail",
          placeholder: "E-mail",
        },
      },
      callbacks: {
        onFormMounted: (error: any) => {
          if (error) {
            console.error('Form mount error:', error);
            onPaymentError('Error al cargar el formulario de pago');
          }
        },
        onSubmit: (event: any) => {
          event.preventDefault();
          setProcessing(true);

          const {
            paymentMethodId,
            issuerId,
            cardholderEmail: email,
            amount,
            token,
            installments,
            identificationNumber,
            identificationType,
          } = form.getCardFormData();

          // Aquí procesarías el pago con tu backend
          // Por ahora simularemos un pago exitoso
          setTimeout(() => {
            onPaymentSuccess('mock_payment_id');
            setProcessing(false);
          }, 2000);
        },
        onFetching: (resource: string) => {
          console.log("Fetching resource: ", resource);
        }
      },
    });

    setCardForm(form);
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <Loader className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
        <p className="text-gray-600">Cargando sistema de pagos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Payment Method Selection */}
      <div className="bg-gray-50 rounded-xl p-4">
        <h3 className="font-semibold text-gray-900 mb-4">Método de Pago</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <button
            onClick={() => setPaymentMethod('checkout')}
            className={`p-4 border-2 rounded-xl transition-all ${
              paymentMethod === 'checkout'
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <CreditCard className="h-5 w-5 text-blue-600" />
              </div>
              <div className="text-left">
                <h4 className="font-medium text-gray-900">Checkout Mercado Pago</h4>
                <p className="text-sm text-gray-600">Todos los métodos de pago</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => {
              setPaymentMethod('card');
              setTimeout(initializeCardForm, 100);
            }}
            className={`p-4 border-2 rounded-xl transition-all ${
              paymentMethod === 'card'
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className="bg-green-100 p-2 rounded-lg">
                <Lock className="h-5 w-5 text-green-600" />
              </div>
              <div className="text-left">
                <h4 className="font-medium text-gray-900">Tarjeta de Crédito</h4>
                <p className="text-sm text-gray-600">Pago directo y seguro</p>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Payment Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-semibold text-blue-900 mb-4">Resumen del Pago</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-blue-800">Servicio:</span>
            <span className="font-medium text-blue-900">{description}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-blue-800">Cliente:</span>
            <span className="font-medium text-blue-900">{payerName}</span>
          </div>
          <div className="border-t border-blue-200 pt-2 flex justify-between">
            <span className="text-lg font-semibold text-blue-900">Total:</span>
            <span className="text-lg font-bold text-blue-900">${amount}</span>
          </div>
        </div>
      </div>

      {/* Checkout Payment */}
      {paymentMethod === 'checkout' && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-green-900">Checkout Seguro</h4>
                <p className="text-sm text-green-800">
                  Serás redirigido al checkout seguro de Mercado Pago donde podrás pagar con:
                </p>
                <ul className="text-sm text-green-800 mt-2 list-disc list-inside">
                  <li>Tarjetas de crédito y débito</li>
                  <li>Mercado Pago</li>
                  <li>Efectivo (Rapipago, Pago Fácil)</li>
                  <li>Transferencia bancaria</li>
                </ul>
              </div>
            </div>
          </div>

          <button
            onClick={handleCheckoutPayment}
            disabled={processing}
            className="w-full bg-gradient-to-r from-blue-600 to-green-600 text-white py-4 rounded-xl font-semibold hover:from-blue-700 hover:to-green-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {processing ? (
              <>
                <Loader className="h-5 w-5 animate-spin" />
                <span>Procesando...</span>
              </>
            ) : (
              <>
                <Lock className="h-5 w-5" />
                <span>Pagar con Mercado Pago</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Card Payment Form */}
      {paymentMethod === 'card' && (
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-900">Pago con Tarjeta</h4>
                <p className="text-sm text-yellow-800">
                  Completa los datos de tu tarjeta de forma segura
                </p>
              </div>
            </div>
          </div>

          <form id="form-checkout" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número de tarjeta
                </label>
                <div id="form-checkout__cardNumber" className="h-12"></div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha de vencimiento
                </label>
                <div id="form-checkout__expirationDate" className="h-12"></div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Código de seguridad
                </label>
                <div id="form-checkout__securityCode" className="h-12"></div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Titular de la tarjeta
                </label>
                <div id="form-checkout__cardholderName" className="h-12"></div>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Banco emisor
                </label>
                <select id="form-checkout__issuer" className="w-full h-12 px-3 border border-gray-300 rounded-lg"></select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cuotas
                </label>
                <select id="form-checkout__installments" className="w-full h-12 px-3 border border-gray-300 rounded-lg"></select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de documento
                </label>
                <select id="form-checkout__identificationType" className="w-full h-12 px-3 border border-gray-300 rounded-lg"></select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número de documento
                </label>
                <input
                  type="text"
                  id="form-checkout__identificationNumber"
                  className="w-full h-12 px-3 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  id="form-checkout__cardholderEmail"
                  defaultValue={payerEmail}
                  className="w-full h-12 px-3 border border-gray-300 rounded-lg"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={processing}
              className="w-full bg-gradient-to-r from-green-600 to-blue-600 text-white py-4 rounded-xl font-semibold hover:from-green-700 hover:to-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {processing ? (
                <>
                  <Loader className="h-5 w-5 animate-spin" />
                  <span>Procesando pago...</span>
                </>
              ) : (
                <>
                  <CreditCard className="h-5 w-5" />
                  <span>Pagar ${amount}</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Security Notice */}
      <div className="bg-gray-50 rounded-xl p-4">
        <div className="flex items-center space-x-2">
          <Lock className="h-4 w-4 text-gray-600" />
          <span className="text-sm text-gray-600">
            Pago 100% seguro procesado por Mercado Pago
          </span>
        </div>
      </div>
    </div>
  );
};