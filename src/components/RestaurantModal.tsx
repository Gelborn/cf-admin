import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { X, MapPin, Search, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface RestaurantFormData {
  name: string;
  emailOwner: string;
  cep: string;
  number: string;
  phone: string;
  street?: string;
  city?: string;
  uf?: string;
}

interface CepData {
  street: string;
  city: string;
  uf: string;
}

interface RestaurantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: RestaurantFormData) => void;
  isLoading: boolean;
}

export function RestaurantModal({ isOpen, onClose, onSubmit, isLoading }: RestaurantModalProps) {
  const [step, setStep] = useState<'cep' | 'form'>('cep');
  const [cepLoading, setCepLoading] = useState(false);
  const [cepData, setCepData] = useState<CepData | null>(null);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
    watch,
  } = useForm<RestaurantFormData>();

  const cepValue = watch('cep');

  const fetchCepInfo = async (cep: string) => {
    setCepLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke<CepData>('util_cep_info', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        query: { cep },
      });

      if (error) throw error;

      if (data) {
        setCepData(data);
        setValue('street', data.street);
        setValue('city', data.city);
        setValue('uf', data.uf);
        setValue('cep', cep);
        setStep('form');
        toast.success('CEP encontrado com sucesso!');
      }
    } catch {
      toast.error('CEP não encontrado ou inválido');
    } finally {
      setCepLoading(false);
    }
  };

  const handleCepSearch = () => {
    if (cepValue && cepValue.length === 8) {
      fetchCepInfo(cepValue);
    } else {
      toast.error('Digite um CEP válido com 8 dígitos');
    }
  };

  const handleFormSubmit = (data: RestaurantFormData) => {
    onSubmit(data);
  };

  const handleClose = () => {
    reset();
    setStep('cep');
    setCepData(null);
    onClose();
  };

  const handleBackToCep = () => {
    setStep('cep');
    setCepData(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={handleClose} />

        <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-6 pt-6 pb-4">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Novo Restaurante</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {step === 'cep' ? 'Primeiro, vamos buscar o endereço' : 'Complete as informações do restaurante'}
                </p>
              </div>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step Indicator */}
            <div className="flex items-center mb-8">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                step === 'cep' ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'
              }`}>
                {step === 'cep' ? '1' : <CheckCircle className="w-4 h-4" />}
              </div>
              <div className={`flex-1 h-1 mx-4 rounded ${
                step === 'form' ? 'bg-green-600' : 'bg-gray-200'
              }`}></div>
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                step === 'form' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                2
              </div>
            </div>

            {step === 'cep' && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MapPin className="w-8 h-8 text-blue-600" />
                  </div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">
                    Qual o CEP do restaurante?
                  </h4>
                  <p className="text-gray-500 text-sm">
                    Vamos buscar automaticamente o endereço completo
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      CEP
                    </label>
                    <div className="flex space-x-3">
                      <input
                        type="text"
                        maxLength={8}
                        placeholder="00000000"
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg font-mono"
                        {...register('cep', {
                          required: 'CEP é obrigatório',
                          pattern: {
                            value: /^\d{8}$/,
                            message: 'CEP deve ter 8 dígitos',
                          },
                        })}
                      />
                      <button
                        type="button"
                        onClick={handleCepSearch}
                        disabled={cepLoading}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center font-medium transition-colors"
                      >
                        {cepLoading ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        ) : (
                          <>
                            <Search className="w-4 h-4 mr-2" />
                            Buscar
                          </>
                        )}
                      </button>
                    </div>
                    {errors.cep && (
                      <p className="mt-2 text-sm text-red-600">{errors.cep.message}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {step === 'form' && (
              <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
                {/* Endereço encontrado */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                    <h4 className="text-sm font-medium text-green-800">Endereço encontrado</h4>
                  </div>
                  <div className="text-sm text-green-700">
                    <p>{cepData?.street}</p>
                    <p>{cepData?.city}, {cepData?.uf} - CEP: {cepValue}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleBackToCep}
                    className="mt-2 text-xs text-green-600 hover:text-green-800 underline"
                  >
                    Alterar CEP
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nome do Restaurante
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      {...register('name', { required: 'Nome é obrigatório' })}
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                    )}
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email do Proprietário
                    </label>
                    <input
                      type="email"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      {...register('emailOwner', {
                        required: 'Email é obrigatório',
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: 'Email inválido',
                        },
                      })}
                    />
                    {errors.emailOwner && (
                      <p className="mt-1 text-sm text-red-600">{errors.emailOwner.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rua
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                      {...register('street')}
                      readOnly
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Número *
                    </label>
                    <input
                      type="text"
                      placeholder="123"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      {...register('number', { required: 'Número é obrigatório' })}
                    />
                    {errors.number && (
                      <p className="mt-1 text-sm text-red-600">{errors.number.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cidade
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                      {...register('city')}
                      readOnly
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      UF
                    </label>
                    <input
                      type="text"
                      maxLength={2}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                      {...register('uf')}
                      readOnly
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Telefone
                    </label>
                    <input
                      type="tel"
                      placeholder="(11) 99999-9999"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      {...register('phone', { required: 'Telefone é obrigatório' })}
                    />
                    {errors.phone && (
                      <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-6 border-t">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-6 py-3 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isLoading ? 'Criando...' : 'Criar Restaurante'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}