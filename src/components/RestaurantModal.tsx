import React, { useState, useCallback, useEffect } from 'react';
import {
  useForm,
  FieldError,
  FieldErrorsImpl,
  Merge,
} from 'react-hook-form';
import { X, User, MapPin, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { FunctionsHttpError } from '@supabase/supabase-js';

/* ------------------------------------------------------------------ */
/* Tipos                                                               */
/* ------------------------------------------------------------------ */
export interface RestaurantFormData {
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
  onSubmit: (data: RestaurantFormData) => Promise<any>;
  isLoading: boolean;
}

/* ------------------------------------------------------------------ */
/* Componente                                                          */
/* ------------------------------------------------------------------ */
export function RestaurantModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
}: Props) {
  /* ----------------------------- estado ----------------------------- */
  const [cepLoading, setCepLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [cepError, setCepError] = useState('');
  const [cepSearched, setCepSearched] = useState(false);

  /* --------------------------- React Hook Form ---------------------- */
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    setError,
    trigger,
    reset,
    watch,
    clearErrors,
  } = useForm<RestaurantFormData>();

  const cepValue = watch('cep');

  /* -------------------- autofill: garante 1º clique ----------------- */
  useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(() => {
      const domEmail = (
        document.querySelector(
          'input[name="emailOwner"]',
        ) as HTMLInputElement | null
      )?.value;
      if (domEmail) {
        setValue('emailOwner', domEmail);
        // força revalidação imediata
        trigger('emailOwner').catch(() => null);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [isOpen, setValue, trigger]);

  /* ------------------------ Helpers --------------------------------- */
  const formatCep = (v: string) => v.replace(/\D/g, '').slice(0, 8);

  const closeModal = () => {
    reset();
    setEmailError('');
    setCepError('');
    setCepSearched(false);
    clearErrors();
    onClose();
  };

  const fetchCepInfo = useCallback(async () => {
    if (!cepValue || cepValue.length !== 8) {
      setCepError('CEP deve ter 8 dígitos');
      return;
    }

    setCepLoading(true);
    setCepError('');

    try {
      const { data, error } = await supabase.functions.invoke<CepData>(
        'util_cep_info',
        { method: 'POST', body: { cep: cepValue } },
      );
      if (error) throw error;
      if (!data) throw new Error('Sem dados');

      setValue('street', data.street);
      setValue('city', data.city);
      setValue('uf', data.uf);
      setCepSearched(true);
      toast.success('CEP encontrado com sucesso!');
    } catch {
      setCepError('CEP inválido');
      setCepSearched(false);
    } finally {
      setCepLoading(false);
    }
  }, [cepValue, setValue]);

  /* ----------------------- Submit handler --------------------------- */
  const handleFormSubmit = async (data: RestaurantFormData) => {
    setEmailError('');
    clearErrors('emailOwner');

    try {
      await onSubmit(data);
    } catch (err: unknown) {
      /* ----------- SUPABASE FUNCTIONS ERROR ----------- */
      let status: number | undefined;
      let body   = '';
  
      if (typeof err === 'object' && err !== null) {
        // Supabase coloca o response bruto aqui ↓ (não-enumerável)
        const resp = (err as any).response as Response | undefined;
        if (resp) {
          status = resp.status;
          try {
            body = await resp.clone().text();
          } catch {/* ignore */}
        } else {
          // fallback – message padrão do SDK
          body = (err as any).message ?? '';
        }
      }
  
      /* ----------- LOG para ver no DevTools ----------- */
      console.error('❌ status=', status, 'body=', body, err);
  
      /* ----------- DUPLICIDADE ------------------------ */
      const duplicate =
        status === 409 ||
        /e-?mail.+cadastrado|duplicate/i.test(body);
  
      if (duplicate) {
        const msg = 'Email já cadastrado';
        setEmailError(msg);
        setError('emailOwner', { type: 'manual', message: msg });
      } else {
        /* -- toast isolado (z-index muito alto) -- */
        toast.error('Aconteceu um erro, tente novamente mais tarde.', {
          style: { zIndex: 9999 },
        });
      }
    }  
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = formatCep(e.target.value);
    setValue('cep', f);
    setCepError('');
    setCepSearched(false);
    setValue('street', '');
    setValue('city', '');
    setValue('uf', '');
  };

  /* ----------------------------- JSX ------------------------------- */
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 py-8">
        <div className="fixed inset-0 bg-gray-500/75" onClick={closeModal} />

        <div className="relative bg-white rounded-xl shadow-xl max-w-4xl w-full">
          {/* ---------- Header ---------- */}
          <Header onClose={closeModal} />

          {/* ---------- Form ---------- */}
          <div className="p-6">
            <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
              <FormGrid
                register={register}
                errors={errors}
                emailError={emailError}
                cepValue={cepValue}
                cepError={cepError}
                cepLoading={cepLoading}
                cepSearched={cepSearched}
                handleCepChange={handleCepChange}
                fetchCepInfo={fetchCepInfo}
              />
              {/* ---------- Ações ---------- */}
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

/* ------------------------------------------------------------------ */
/* Header                                                              */
/* ------------------------------------------------------------------ */
const Header = ({ onClose }: { onClose: () => void }) => (
  <div className="flex items-center justify-between p-6 border-b">
    <div>
      <h3 className="text-xl font-semibold text-gray-900">
        Novo Restaurante
      </h3>
      <p className="text-sm text-gray-500">
        Preencha as informações para cadastrar um novo restaurante
      </p>
    </div>
    <button
      onClick={onClose}
      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
    >
      <X className="w-5 h-5" />
    </button>
  </div>
);

/* ------------------------------------------------------------------ */
/* Grid com os campos                                                  */
/* ------------------------------------------------------------------ */
interface GridProps {
  register: ReturnType<typeof useForm<RestaurantFormData>>['register'];
  errors: {
    [K in keyof RestaurantFormData]?:
      | FieldError
      | Merge<FieldError, FieldErrorsImpl<any>>;
  };
  emailError: string;
  cepValue: string;
  cepError: string;
  cepLoading: boolean;
  cepSearched: boolean;
  handleCepChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fetchCepInfo: () => void;
}
const FormGrid: React.FC<GridProps> = ({
  register,
  errors,
  emailError,
  cepValue,
  cepError,
  cepLoading,
  cepSearched,
  handleCepChange,
  fetchCepInfo,
}) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
    {/* ===== Identificação / Contato ===== */}
    <div className="space-y-4">
      <SectionHeader
        iconBg="bg-blue-100"
        iconColor="text-blue-600"
        Icon={User}
        title="Identificação e Contato"
      />
      {/* Nome */}
      <InputField
        label="Nome do Restaurante"
        placeholder="Ex: McDonald's Av. Paulista"
        error={errors.name?.message}
        {...register('name', { required: 'Nome é obrigatório' })}
      />
      {/* Email */}
      <InputField
        label="Email do Proprietário"
        type="email"
        autoComplete="email"
        placeholder="gerente@restaurante.com"
        error={errors.emailOwner?.message || emailError}
        inputClassName={
          emailError ? 'border-red-500 focus:ring-red-500' : ''
        }
        {...register('emailOwner', {
          required: 'Email é obrigatório',
          pattern: {
            value: /^[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}$/i,
            message: 'Email inválido',
          },
        })}
      />
      {/* Telefone */}
      <InputField
        label="Telefone"
        type="tel"
        placeholder="(11) 99999-9999"
        error={errors.phone?.message}
        {...register('phone', {
          required: 'Telefone é obrigatório',
        })}
      />
    </div>

    {/* ===== Endereço ===== */}
    <div className="space-y-4">
      <SectionHeader
        iconBg="bg-green-100"
        iconColor="text-green-600"
        Icon={MapPin}
        title="Endereço"
      />

      {/* CEP */}
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
            {(errors.cep || cepError) && (
              <p className="text-sm text-red-600 mt-1">
                {errors.cep?.message || cepError}
              </p>
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

      {/* Endereço completo – aparece após CEP válido */}
      {cepSearched && (
        <AddressFields register={register} errors={errors} />
      )}
    </div>
  </div>
);

/* ------------------------------------------------------------------ */
/* Bloco de endereço pós-CEP                                           */
/* ------------------------------------------------------------------ */
const AddressFields = ({
  register,
  errors,
}: Pick<GridProps, 'register' | 'errors'>) => (
  <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
      <p className="text-sm text-green-800 font-medium">
        ✓ CEP encontrado com sucesso!
      </p>
    </div>

    <div className="grid grid-cols-2 gap-4">
      <InputField
        label="Rua"
        readOnly
        bg="bg-gray-50 text-gray-600"
        {...register('street')}
      />

      <InputField
        label="Número *"
        placeholder="Ex: 1578"
        error={errors.number?.message}
        {...register('number', {
          required: 'Número é obrigatório',
        })}
      />
    </div>
    <div className="grid grid-cols-2 gap-4">
      <InputField
        label="Cidade"
        readOnly
        bg="bg-gray-50 text-gray-600"
        {...register('city')}
      />
      <InputField
        label="UF"
        maxLength={2}
        readOnly
        bg="bg-gray-50 text-gray-600"
        {...register('uf')}
      />
    </div>
  </div>
);

/* ------------------------------------------------------------------ */
/* SectionHeader & InputField                                          */
/* ------------------------------------------------------------------ */
const SectionHeader = ({
  iconBg,
  iconColor,
  Icon,
  title,
}: {
  iconBg: string;
  iconColor: string;
  Icon: typeof User;
  title: string;
}) => (
  <div className="flex items-center mb-4">
    <div
      className={`w-8 h-8 ${iconBg} rounded-lg flex items-center justify-center mr-3`}
    >
      <Icon className={`w-4 h-4 ${iconColor}`} />
    </div>
    <h4 className="text-lg font-medium text-gray-900">{title}</h4>
  </div>
);

interface InputFieldProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'ref' | 'name'
  > {
  label: string;
  error?: string;
  bg?: string;
  inputClassName?: string;
}
const InputField = React.forwardRef<HTMLInputElement, InputFieldProps>(
  ({ label, error, bg, inputClassName = '', ...rest }, ref) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <input
        ref={ref}
        className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${bg ?? ''} ${inputClassName}`}
        {...rest}
      />
      {error && (
        <p className="text-sm text-red-600 mt-1">{error}</p>
      )}
    </div>
  ),
);
InputField.displayName = 'InputField';
