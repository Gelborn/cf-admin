import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
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

export function RestaurantModal({ isOpen, onClose, onSubmit, isLoading }: Props) {
  const [step, setStep] = useState<'form' | 'cep'>('form');
  const [cepLoading, setCepLoading] = useState(false);
  const [emailError, setEmailError] = useState<string>('');
  const [cepError, setCepError] = useState<string>('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
    watch,
    setError,
    clearErrors,
  } = useForm<RestaurantFormData>();

  const cepValue = watch('cep');

  const closeModal = () => {
    reset();
    setStep('form');
    setEmailError('');
    setCepError('');
    clearErrors();
    onClose();
  };

  const fetchCepInfo = useCallback(
    async (cep: string) => {
      setCepLoading(true);
      setCepError('');
      try {
        const { data, error } = await supabase.functions.invoke<CepData>('util_cep_info', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          query: { cep },
        });

        if (error) throw error;

        if (data) {
          setValue('street', data.street);
          setValue('city', data.city);
          setValue('uf', data.uf);
          toast.success('CEP encontrado com sucesso!');
        }
      } catch {
        setCepError('CEP inválido');
      } finally {
        setCepLoading(false);
      }
    },
    [setValue]
  );

  useEffect(() => {
    if (cepValue && cepValue.length === 8) {
      fetchCepInfo(cepValue);
    }
  }, [cepValue, fetchCepInfo]);

  const handleFormSubmit = (data: RestaurantFormData) => {
    setEmailError('');
    onSubmit(data);
  };

  const handleNextToCep = (data: Partial<RestaurantFormData>) => {
    Object.entries(data).forEach(([key, value]) => {
      setValue(key as keyof RestaurantFormData, value);
    });
    setStep('cep');
  };

  // Função para tratar erros específicos
  const handleError = (error: any) => {
    if (error.message?.includes('409') || error.message?.includes('Email já cadastrado')) {
      setEmailError('Email já cadastrado');
      setStep('form'); // Volta para o form para mostrar o erro
    } else {
      toast.error('Aconteceu um erro, tente novamente mais tarde.');
    }
  };

  // Override da função onSubmit para tratar erros
  const wrappedOnSubmit = (data: RestaurantFormData) => {
    const originalOnSubmit = onSubmit;
    
    const handleSubmitWithErrorHandling = async (data: RestaurantFormData) => {
      try {
        await originalOnSubmit(data);
        closeModal();
      } catch (error: any) {
        handleError(error);
      }
    };

    handleSubmitWithErrorHandling(data);
  };

  // Função para formatar CEP (apenas números)
  const formatCep = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.slice(0, 8);
  };

  if (!isOpen) return null;

  const Spinner = () => (
    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
  );

  const StepBullet = ({ active, completed }: { active: boolean; completed?: boolean }) => (
    <div
      className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
        completed 
          ? 'bg-green-600 text-white' 
          : active 
          ? 'bg-blue-600 text-white' 
          : 'bg-gray-200 text-gray-500'
      }`}
    >
      {completed ? '✓' : active ? '1' : '2'}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 py-8">
        <div className="fixed inset-0 bg-gray-500/75" onClick={closeModal} />

        <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full">
          <div className="flex items-center justify-between p-6 border-b">
            <div>
              <h3 className="text-xl font-semibold">Novo Restaurante</h3>
              <p className="text-sm text-gray-500">
                {step === 'form'
                  ? 'Primeiro, vamos coletar as informações básicas'
                  : 'Agora vamos buscar o endereço pelo CEP'}
              </p>
            </div>
            <button
              onClick={closeModal}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center p-6 pt-4">
            <StepBullet active={step === 'form'} completed={step === 'cep'} />
            <div
              className={`flex-1 h-1 mx-4 rounded ${
                step === 'cep' ? 'bg-green-600' : 'bg-gray-200'
              }`}
            />
            <StepBullet active={step === 'cep'} />
          </div>

          <div className="p-6 pt-0">
            <form onSubmit={handleSubmit(step === 'form' ? handleNextToCep : wrappedOnSubmit)} className="space-y-4">
              {/* Campos básicos - sempre visíveis */}
              <div>
                <label className="block text-sm font-medium mb-2">Nome do Restaurante</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: McDonald's Av. Paulista"
                  {...register('name', { required: 'Nome é obrigatório' })}
                />
                {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Email do Proprietário</label>
                <input
                  type="email"
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    emailError ? 'border-red-500' : ''
                  }`}
                  placeholder="gerente@restaurante.com"
                  {...register('emailOwner', {
                    required: 'Email é obrigatório',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Email inválido',
                    },
                  })}
                  onChange={() => setEmailError('')}
                />
                {errors.emailOwner && (
                  <p className="text-sm text-red-600 mt-1">{errors.emailOwner.message}</p>
                )}
                {emailError && (
                  <p className="text-sm text-red-600 mt-1">{emailError}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Telefone</label>
                <input
                  type="tel"
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="(11) 99999-9999"
                  {...register('phone', { required: 'Telefone é obrigatório' })}
                />
                {errors.phone && (
                  <p className="text-sm text-red-600 mt-1">{errors.phone.message}</p>
                )}
              </div>

              {/* Campos de endereço - só aparecem no step 2 */}
              {step === 'cep' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2">CEP</label>
                    <div className="relative">
                      <input
                        type="text"
                        maxLength={8}
                        placeholder="00000000"
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                          cepError ? 'border-red-500' : ''
                        }`}
                        {...register('cep', {
                          required: 'CEP é obrigatório',
                          pattern: {
                            value: /^\d{8}$/,
                            message: 'CEP deve ter 8 dígitos',
                          },
                        })}
                        onChange={(e) => {
                          const formatted = formatCep(e.target.value);
                          e.target.value = formatted;
                          setCepError('');
                        }}
                      />
                      {cepLoading && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <Spinner />
                        </div>
                      )}
                    </div>
                    {errors.cep && (
                      <p className="text-sm text-red-600 mt-1">{errors.cep.message}</p>
                    )}
                    {cepError && (
                      <p className="text-sm text-red-600 mt-1">{cepError}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Rua</label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 border rounded-lg bg-gray-50"
                        {...register('street')}
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Número</label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
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
                      <label className="block text-sm font-medium mb-2">Cidade</label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 border rounded-lg bg-gray-50"
                        {...register('city')}
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">UF</label>
                      <input
                        type="text"
                        maxLength={2}
                        className="w-full px-4 py-3 border rounded-lg bg-gray-50"
                        {...register('uf')}
                        readOnly
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="flex justify-end pt-6 space-x-3 border-t">
                {step === 'cep' && (
                  <button
                    type="button"
                    onClick={() => setStep('form')}
                    className="px-6 py-3 text-sm font-medium border rounded-lg hover:bg-gray-50"
                  >
                    ← Voltar
                  </button>
                )}
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-6 py-3 text-sm font-medium border rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading || (step === 'cep' && cepLoading)}
                  className="px-6 py-3 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isLoading ? 'Criando...' : step === 'form' ? 'Próximo: Endereço →' : 'Criar Restaurante'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}