import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { X, MapPin, Search, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

/* ────────── types ────────── */
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

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: RestaurantFormData) => void;
  isLoading: boolean;
}

/* ────────── component ────────── */
export function RestaurantModal({ isOpen, onClose, onSubmit, isLoading }: Props) {
  /* steps: 1) buscar CEP · 2) preencher form */
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

  /* ───── helpers ───── */
  const closeModal = () => {
    reset();
    setStep('cep');
    setCepData(null);
    onClose();
  };

  const fetchCepInfo = async (cep: string) => {
    setCepLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke<CepData>('util_cep_info', {
        body: { cep }, // POST JSON
      });
      if (error) throw error;
      if (!data) throw new Error('Sem dados');

      /* preenche campos + avança p/ form */
      setCepData(data);
      setValue('street', data.street);
      setValue('city', data.city);
      setValue('uf', data.uf);
      setStep('form');
      toast.success('CEP encontrado com sucesso!');
    } catch {
      toast.error('CEP não encontrado ou inválido');
    } finally {
      setCepLoading(false);
    }
  };

  const handleCepSearch = () => {
    if (/^\d{8}$/.test(cepValue ?? '')) fetchCepInfo(cepValue!);
    else toast.error('Digite um CEP válido com 8 dígitos');
  };

  if (!isOpen) return null;

  /* ───── UI helpers ───── */
  const Spinner = () => (
    <div className="animate-spin rounded-full h-5 w-5 border-b-2" />
  );

  const StepBullet = ({ active }: { active: boolean }) => (
    <div
      className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
        active ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
      }`}
    >
      {active ? '1' : '2'}
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
                {step === 'cep'
                  ? 'Primeiro, vamos buscar o endereço'
                  : 'Complete as informações do restaurante'}
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
            <StepBullet active={step === 'cep'} />
            <div
              className={`flex-1 h-1 mx-4 rounded ${
                step === 'form' ? 'bg-green-600' : 'bg-gray-200'
              }`}
            />
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                step === 'form' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}
            >
              2
            </div>
          </div>

          {/* body */}
          <div className="p-6 pt-0 space-y-8">
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
              </>
            )}

            {step === 'form' && (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* endereço */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                    <h4 className="text-sm font-medium text-green-800">Endereço encontrado</h4>
                  </div>
                  <p className="text-sm text-green-700">
                    {cepData?.street}<br />
                    {cepData?.city}, {cepData?.uf} — CEP: {cepValue}
                  </p>
                  <button
                    type="button"
                    onClick={() => { setStep('cep'); setCepData(null); }}
                    className="mt-2 text-xs text-green-600 hover:text-green-800 underline"
                  >
                    Alterar CEP
                  </button>
                </div>

                {/* grid */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Nome */}
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-2">Nome do Restaurante</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      {...register('name', { required: 'Nome é obrigatório' })}
                    />
                    {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
                  </div>

                  {/* Email */}
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-2">Email do Proprietário</label>
                    <input
                      type="email"
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      {...register('emailOwner', {
                        required: 'Email é obrigatório',
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: 'Email inválido',
                        },
                      })}
                    />
                    {errors.emailOwner && (
                      <p className="text-sm text-red-600">{errors.emailOwner.message}</p>
                    )}
                  </div>

                  {/* Rua */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Rua</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 border rounded-lg bg-gray-50 text-gray-600"
                      {...register('street')}
                      readOnly
                    />
                  </div>

                  {/* Número */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Número *</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      {...register('number', { required: 'Número é obrigatório' })}
                    />
                    {errors.number && (
                      <p className="text-sm text-red-600">{errors.number.message}</p>
                    )}
                  </div>

                  {/* Cidade */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Cidade</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 border rounded-lg bg-gray-50 text-gray-600"
                      {...register('city')}
                      readOnly
                    />
                  </div>

                  {/* UF */}
                  <div>
                    <label className="block text-sm font-medium mb-2">UF</label>
                    <input
                      type="text"
                      maxLength={2}
                      className="w-full px-4 py-3 border rounded-lg bg-gray-50 text-gray-600"
                      {...register('uf')}
                      readOnly
                    />
                  </div>

                  {/* Telefone */}
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-2">Telefone</label>
                    <input
                      type="tel"
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      {...register('phone', { required: 'Telefone é obrigatório' })}
                    />
                    {errors.phone && (
                      <p className="text-sm text-red-600">{errors.phone.message}</p>
                    )}
                  </div>
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
                    disabled={isLoading}
                    className="px-6 py-3 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isLoading ? 'Criando…' : 'Criar Restaurante'}
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
