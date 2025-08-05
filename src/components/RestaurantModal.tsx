import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { X, User, MapPin, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface RestaurantFormData {
  name: string;
  emailOwner: string;
  phone: string;
  cep: string;
  number: string;
  street?: string;
  city?: string;
  uf?: string;
}

interface CepData {
  street: string;
  city: string;
  uf: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: RestaurantFormData) => void;
  isLoading: boolean;
}

export function RestaurantModal({ isOpen, onClose, onSubmit, isLoading, error }: Props) {
  const [cepLoading, setCepLoading] = useState(false);
  const [emailError, setEmailError] = useState<string>('');
  const [cepError, setCepError] = useState<string>('');
  const [cepSearched, setCepSearched] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
    watch,
    clearErrors,
  } = useForm<RestaurantFormData>();

  const cepValue = watch('cep');

  const closeModal = () => {
    reset();
    setEmailError('');
    setCepError('');
    setCepSearched(false);
    clearErrors();
    onClose();
  };

  // Função para formatar CEP (apenas números, preservando todos os dígitos)
  const formatCep = (value: string) => {
    // Remove tudo que não é número e limita a 8 dígitos
    const numbers = value.replace(/\D/g, '').slice(0, 8);
    return numbers;
  };

  const fetchCepInfo = useCallback(async () => {
    if (!cepValue || cepValue.length !== 8) {
      setCepError('CEP deve ter 8 dígitos');
      return;
    }

    setCepLoading(true);
    setCepError('');
    
    try {
      const { data, error } = await supabase.functions.invoke<CepData>('util_cep_info', {
        method: 'POST',
        body: { cep: cepValue },
      });

      if (error) throw error;

      if (data) {
        setValue('street', data.street);
        setValue('city', data.city);
        setValue('uf', data.uf);
        setCepSearched(true);
        toast.success('CEP encontrado com sucesso!');
      }
    } catch {
      setCepError('CEP inválido');
      setCepSearched(false);
    } finally {
      setCepLoading(false);
    }
  }, [cepValue, setValue]);

  const handleFormSubmit = async (data: RestaurantFormData) => {
    setEmailError('');
    
    try {
      onSubmit(data);
    } catch (error: any) {
      if (error.message?.includes('409') || error.message?.includes('Email já cadastrado')) {
        setEmailError('Email já cadastrado');
      } else {
        toast.error('Aconteceu um erro, tente novamente mais tarde.');
      }
    }
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCep(e.target.value);
    setValue('cep', formatted);
    setCepError('');
    setCepSearched(false);
    // Limpa os campos de endereço quando CEP muda
    setValue('street', '');
    setValue('city', '');
    setValue('uf', '');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 py-8">
        <div className="fixed inset-0 bg-gray-500/75" onClick={closeModal} />

        <div className="relative bg-white rounded-xl shadow-xl max-w-4xl w-full">
          <div className="flex items-center justify-between p-6 border-b">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Novo Restaurante</h3>
              <p className="text-sm text-gray-500">
                Preencha as informações para cadastrar um novo restaurante
              </p>
            </div>
            <button
              onClick={closeModal}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6">
            <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Bloco 1: Identificação e Contato */}
                <div className="space-y-4">
                  <div className="flex items-center mb-4">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                      <User className="w-4 h-4 text-blue-600" />
                    </div>
                    <h4 className="text-lg font-medium text-gray-900">Identificação e Contato</h4>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nome do Restaurante
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      placeholder="Ex: McDonald's Av. Paulista"
                      {...register('name', { required: 'Nome é obrigatório' })}
                    />
                    {errors.name && (
                      <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email do Proprietário
                    </label>
                    <input
                      type="email"
                      autoComplete="email"
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                        emailError ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'
                      }`}
                      placeholder="gerente@restaurante.com"
                      {...register('emailOwner', {
                        required: 'Email é obrigatório',
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: 'Email inválido',
                        },
                        onChange: () => setEmailError(''),
                      })}
                    />
                    {errors.emailOwner && (
                      <p className="text-sm text-red-600 mt-1">{errors.emailOwner.message}</p>
                    )}
                    {emailError && (
                      <p className="text-sm text-red-600 mt-1">{emailError}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Telefone
                    </label>
                    <input
                      type="tel"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      placeholder="(11) 99999-9999"
                      {...register('phone', { required: 'Telefone é obrigatório' })}
                    />
                    {errors.phone && (
                      <p className="text-sm text-red-600 mt-1">{errors.phone.message}</p>
                    )}
                  </div>
                </div>

                {/* Bloco 2: Endereço */}
                <div className="space-y-4">
                  <div className="flex items-center mb-4">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                      <MapPin className="w-4 h-4 text-green-600" />
                    </div>
                    <h4 className="text-lg font-medium text-gray-900">Endereço</h4>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      CEP
                    </label>
                    <div className="flex space-x-3">
                      <div className="flex-1">
                        <input
                          type="text"
                          placeholder="00000000"
                          value={cepValue || ''}
                          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-colors ${
                            cepError 
                              ? 'border-red-500 focus:ring-red-500' 
                              : 'border-gray-300 focus:ring-blue-500'
                          }`}
                          {...register('cep', {
                            required: 'CEP é obrigatório',
                            pattern: {
                              value: /^\d{8}$/,
                              message: 'CEP deve ter 8 dígitos',
                            },
                          })}
                          onChange={handleCepChange}
                        />
                        {errors.cep && (
                          <p className="text-sm text-red-600 mt-1">{errors.cep.message}</p>
                        )}
                        {cepError && (
                          <p className="text-sm text-red-600 mt-1">{cepError}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={fetchCepInfo}
                        disabled={cepLoading || !cepValue || cepValue.length !== 8}
                        className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                      >
                        {cepLoading ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                        ) : (
                          <Search className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Campos de endereço - só aparecem após buscar CEP */}
                  {cepSearched && (
                    <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm text-green-800 font-medium">✓ CEP encontrado com sucesso!</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
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
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                            placeholder="Ex: 1578"
                            {...register('number', { required: 'Número é obrigatório' })}
                          />
                          {errors.number && (
                            <p className="text-sm text-red-600 mt-1">{errors.number.message}</p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
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
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-6 space-x-3 border-t">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !cepSearched}
                  className="px-6 py-3 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? 'Criando...' : 'Criar Restaurante'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}