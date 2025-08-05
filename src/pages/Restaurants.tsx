import React, { useState } from 'react';
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  Plus,
  MapPin,
  Phone,
  Mail,
  Users,
  Heart,
  Building2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { RestaurantModal } from '../components/RestaurantModal';
import { NewPartnershipModal } from '../components/NewPartnershipModal';
import toast from 'react-hot-toast';

/* ------------------------------------------------------------------ */
/* Tipos                                                               */
/* ------------------------------------------------------------------ */
interface RestaurantWithPartners {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string | null;
  address_full: string | null;
  street: string | null;
  number: string | null;
  city: string | null;
  uf: string | null;
  cep: string | null;
  lat: number;
  lng: number;
  status: 'active' | 'inactive' | 'invite_sent';
  added_at: string;
  updated_at: string;
  partners_list: { id: string; name: string }[] | null;
  favorite_osc: { id: string; name: string } | null;
}

interface CreateRestaurantPayload {
  name: string;
  emailOwner: string;
  cep: string;
  number: string;
  street?: string;
  city?: string;
  uf?: string;
  phone: string;
}

/* ------------------------------------------------------------------ */
/* Componente                                                          */
/* ------------------------------------------------------------------ */
export function Restaurants() {
  const { session } = useAuth();
  const qc = useQueryClient();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPartnershipModalOpen, setIsPartnershipModalOpen] = useState(false);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null);

  /* ----------------------- Query: lista ----------------------- */
  const { data: restaurants, isLoading } = useQuery<RestaurantWithPartners[]>({
    queryKey: ['restaurants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_restaurants_partners')
        .select('*')
        .order('added_at', { ascending: false });

      if (error) throw error;
      return data as RestaurantWithPartners[];
    },
  });

  /* ---------------------- Mutation: create -------------------- */
  const createRestaurantMutation = useMutation({
    mutationFn: async (payload: CreateRestaurantPayload) => {
      const { data } = await supabase.functions
        .invoke<{ id: string }>('cf_create_restaurant', {
          body: payload,
          headers: { Authorization: `Bearer ${session?.access_token}` },
        })
        .throwOnError();                    // lança se HTTP >= 400

      if (!data) throw new Error('Função não retornou dados.');
      return data;                          // { id }
    },

    onSuccess: () => {
      toast.success('Restaurante criado!');
      qc.invalidateQueries({ queryKey: ['restaurants'] });
      setIsModalOpen(false);
    },

    onError: (err: any) => {
      const msg = err.message ?? '';
      if (msg.includes('email_exists') || msg.includes('E-mail já cadastrado')) {
        toast.error('E-mail já cadastrado');
      } else {
        toast.error('Aconteceu um erro, tente novamente.');
      }
    },
  });

  /* helper para o modal */
  const handleCreateRestaurant = (data: CreateRestaurantPayload) =>
    createRestaurantMutation.mutateAsync(data);

  /* abrir modal de parceria */
  const handleOpenNewPartnership = (id: string) => {
    setSelectedRestaurantId(id);
    setIsPartnershipModalOpen(true);
  };

  /* --------------------------- UI ----------------------------- */
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ---------- HEADER ---------- */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Restaurantes</h1>
            <p className="mt-2 text-gray-600">
              Gerencie os restaurantes parceiros da plataforma
            </p>
          </div>
          <button
            onClick={() => {
              createRestaurantMutation.reset();
              setIsModalOpen(true);
            }}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Restaurante
          </button>
        </div>

        {/* ---------- STAT CARDS ---------- */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={<Users className="h-8 w-8 text-green-600" />}
            label="Total de Restaurantes"
            value={restaurants?.length ?? 0}
          />
          <StatCard
            icon={<MapPin className="h-8 w-8 text-blue-600" />}
            label="Ativos"
            value={restaurants?.filter(r => r.status === 'active').length ?? 0}
          />
          <StatCard
            icon={<Mail className="h-8 w-8 text-yellow-600" />}
            label="Convites Enviados"
            value={restaurants?.filter(r => r.status === 'invite_sent').length ?? 0}
          />
          <StatCard
            icon={<Heart className="h-8 w-8 text-red-600" />}
            label="Total de Parcerias"
            value={restaurants?.reduce((acc, r) => acc + (r.partners_list?.length || 0), 0) ?? 0}
          />
        </div>

        {/* ---------- TABLE ---------- */}
        {/* ... resto do componente permanece igual ... */}
      </div>

      {/* ---------- MODAIS ---------- */}
      <RestaurantModal
        isOpen={isModalOpen}
        onClose={() => {
          createRestaurantMutation.reset();
          setIsModalOpen(false);
        }}
        onSubmit={handleCreateRestaurant}
        isLoading={createRestaurantMutation.isPending}
      />

      <NewPartnershipModal
        isOpen={isPartnershipModalOpen}
        onClose={() => setIsPartnershipModalOpen(false)}
        restaurantId={selectedRestaurantId}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-componentes utilitários — permanecem inalterados                */
/* ------------------------------------------------------------------ */
const StatCard = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) => (
  <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
    <div className="flex items-center">
      <div className="flex-shrink-0">{icon}</div>
      <div className="ml-4">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  </div>
);

const ContactLine = ({
  icon: Icon,
  value,
}: {
  icon: typeof Mail;
  value: string;
}) => (
  <div className="text-sm text-gray-900 flex items-center">
    <Icon className="h-4 w-4 mr-2 text-gray-400" />
    {value}
  </div>
);

const StatusPill = ({ status }: { status: RestaurantWithPartners['status'] }) => {
  const map = {
    active: { color: 'green', label: 'Ativo' },
    invite_sent: { color: 'yellow', label: 'Convite Enviado' },
    inactive: { color: 'gray', label: 'Inativo' },
  }[status];

  return (
    <span
      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-${map.color}-100 text-${map.color}-800`}
    >
      {map.label}
    </span>
  );
};

const EmptyState = ({ onAdd }: { onAdd: () => void }) => (
  <div className="text-center py-12">
    <Users className="mx-auto h-12 w-12 text-gray-400" />
    <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum restaurante</h3>
    <p className="mt-1 text-sm text-gray-500">
      Comece criando um novo restaurante.
    </p>
    <div className="mt-6">
      <button
        onClick={onAdd}
        className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
      >
        <Plus className="h-4 w-4 mr-2" />
        Novo Restaurante
      </button>
    </div>
  </div>
);
