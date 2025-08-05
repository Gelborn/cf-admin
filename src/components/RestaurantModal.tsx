import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { X, MapPin, Search, CheckCircle, User, Mail, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

/* ────────── types ────────── */
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

/* ────────── component ────────── */
export function RestaurantModal({ isOpen, onClose, onSubmit, isLoading }: Props) {
  /* steps: 1) dados básicos · 2) buscar CEP */
  const [step, setStep] = useState<'form' | 'cep'>('form');
  const [cepLoading, setCepLoading] = useState(false);
  const [cepData, setCepData] = useState<CepData | null>(null);
  const [emailError, setEmailError] = useState<string>('');

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

  /* ───── helpers ───── */
  const closeModal = () => {
    reset();
    setStep('form');
    setCepData(null);
    setEmailError('');
    clearErrors();
    onClose();
  };

  const fetchCepInfo = async (cep: string) => {
    setCepLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke<CepData>('util_cep_info', {
        body: { cep },
      });
      if (error) throw error;
      if (!data) throw new Error('Sem dados');

      /* preenche campos */
      setCepData(data);
      setValue('street', data.street);
      setValue('city', data.city);
      setValue('uf', data.uf);
      toast.success('CEP encontrado com sucesso!');
    } catch {
      toast.error('CEP não encontrado ou inválido');
    } finally {
      setCepLoading(false);
    }
  };

  const handleCepSearch = () => {
    if (/^\d{8}$/.test(cepValue ?? '')) {
      fetchCepInfo(cepValue!);
    } else {
      toast.error('Digite um CEP válido com 8 dígitos');
    }
  };

  const handleNextToCep = (data: Partial<RestaurantFormData>) => {
    // Salva os dados do form e vai para o CEP
    Object.entries(data).forEach(([key, value]) => {
      setValue(key as keyof RestaurantFormData, value);
    });
    setStep('cep');
  };

  const handleFormSubmit = (data: RestaurantFormData) => {
    // Limpa erro anterior do email
    setEmailError('');
    
    // Chama a função de submit do parent
    onSubmit(data);
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
    
    // Cria uma versão que trata erros
    const handleSubmitWithErrorHandling = async (data: RestaurantFormData) => {
      try {
        await originalOnSubmit(data);
        // Se chegou aqui, deu sucesso - limpa o modal
        closeModal();
      } catch (error: any) {
        handleError(error);
      }
    };

    handleSubmitWithErrorHandling(data);
  };

  if (!isOpen) return null;

  /* ───── UI helpers ───── */
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

  /* ────────── render ────────── */
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 py-8">
        {/* overlay */}
        <div className="fixed inset-0 bg-gray-500/75" onClick={closeModal} />

        {/* card */}
        <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full">
          {/* header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div>
              <h3 className="text-xl font-semibold">
                Novo Restaurante
              </h3>
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

          {/* progress */}
          <div className="flex items-center p-6 pt-4">
            <StepBullet active={step === 'form'} completed={step === 'cep'} />
            <div
              className={`flex-1 h-1 mx-4 rounded ${
                step === 'cep' ? 'bg-green-600' : 'bg-gray-200'
              }`}
            />
            <StepBullet active={step === 'cep'} />
          </div>

          {/* body */}
          <div className="p-6 pt-0 space-y-6">
            {step === 'form' && (
              <>
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <User className="w-8 h-8 text-blue-600" />
                  </div>
                  <h4 className="text-lg font-medium mb-2">Informações do Restaurante</h4>
                  <p className="text-gray-500 text-sm">
                    Vamos começar com os dados básicos
                  </p>
                </div>

                <form onSubmit={handleSubmit(handleNextToCep)} className="space-y-4">
                  {/* Nome */}
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

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Email do Proprietário</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="email"
                        className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
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
                        onChange={() => setEmailError('')} // Limpa erro ao digitar
                      />
                    </div>
                    {errors.emailOwner && (
                      <p className="text-sm text-red-600 mt-1">{errors.emailOwner.message}</p>
                    )}
                    {emailError && (
                      <p className="text-sm text-red-600 mt-1">{emailError}</p>
                    )}
                  </div>

                  {/* Telefone */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Telefone</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="tel"
                        className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="(11) 99999-9999"
                        {...register('phone', { required: 'Telefone é obrigatório' })}
                      />
                    </div>
                    {errors.phone && (
                      <p className="text-sm text-red-600 mt-1">{errors.phone.message}</p>
                    )}
                  </div>

                  {/* footer */}
                  <div className="flex justify-end pt-6 space-x-3 border-t">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="px-6 py-3 text-sm font-medium border rounded-lg hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-3 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                    >
                      Próximo: Endereço →
                    </button>
                  </div>
                </form>
              </>
            )}

            {step === 'cep' && (
              <>
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MapPin className="w-8 h-8 text-blue-600" />
                  </div>
                  <h4 className="text-lg font-medium mb-2">Qual o CEP do restaurante?</h4>
                  <p className="text-gray-500 text-sm">
                    Vamos buscar automaticamente o endereço completo
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">CEP</label>
                  <div className="flex space-x-3">
                    <input
                      type="text"
                      maxLength={8}
                      placeholder="00000000"
                      className="flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 text-center text-lg font-mono"
                      {...register('cep', {
                        required: 'CEP é obrigatório',
                        pattern: { value: /^\d{8}$/, message: 'CEP deve ter 8 dígitos' },
                      })}
                    />
                    <button
                      type="button"
                      onClick={handleCepSearch}
                      disabled={cepLoading}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center font-medium"
                    >
                      {cepLoading ? <Spinner /> : <><Search className="w-4 h-4 mr-2" />Buscar</>}
                    </button>
                  </div>
                  {errors.cep && (
                    <p className="mt-2 text-sm text-red-600">{errors.cep.message}</p>
                  )}
                </div>

                {/* endereço encontrado */}
                {cepData && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center mb-2">
                      <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                      <h4 className="text-sm font-medium text-green-800">Endereço encontrado</h4>
                    </div>
                    <p className="text-sm text-green-700">
                      {cepData.street}<br />
                      {cepData.city}, {cepData.uf} — CEP: {cepValue}
                    </p>
                  </div>
                )}

                {/* campo número */}
                {cepData && (
                  <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Número *</label>
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

                    {/* footer */}
                    <div className="flex justify-end pt-6 space-x-3 border-t">
                      <button
                        type="button"
                        onClick={() => setStep('form')}
                        className="px-6 py-3 text-sm font-medium border rounded-lg hover:bg-gray-50"
                      >
                        ← Voltar
                      </button>
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="px-6 py-3 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        {isLoading ? 'Criando…' : 'Criar Restaurante'}
                      </button>
                    </div>
                  </form>
                )}

                {/* botões quando não tem CEP ainda */}
                {!cepData && (
                  <div className="flex justify-end pt-6 space-x-3 border-t">
                    <button
                      type="button"
                      onClick={() => setStep('form')}
                      className="px-6 py-3 text-sm font-medium border rounded-lg hover:bg-gray-50"
                    >
                      ← Voltar
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}