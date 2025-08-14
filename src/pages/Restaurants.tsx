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
  Search,
  ChevronDown,
  ChevronRight,
  Calendar,
  TrendingUp,
  Package,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { RestaurantModal } from '../components/RestaurantModal';
import { NewPartnershipModal } from '../components/NewPartnershipModal';
import toast from 'react-hot-toast';
import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from '@supabase/supabase-js';

/* ------------------------------------------------------------------ */
/* Tipos                                                               */
/* ------------------------------------------------------------------ */
interface RestaurantWithPartners {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string | null;
  cnpj: string | null;
  code: string | null;
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

// Mock data para as parcerias (temporário)
interface PartnershipDetail {
  id: string;
  name: string;
  city: string;
  uf: string;
  is_favorite: boolean;
  created_at: string;
  distance_km: number;
  donations_30d: number;
  accepted_30d: number;
  last_donation: string | null;
}

interface CreateRestaurantPayload {
  name: string;
  emailOwner: string;
  cnpj?: string;
  code?: string;
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
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Mock function para gerar dados de parceria
  const getMockPartnerships = (restaurantId: string): PartnershipDetail[] => {
    const mockData: PartnershipDetail[] = [
      {
        id: '1',
        name: 'Instituto Beneficente São José',
        city: 'São Paulo',
        uf: 'SP',
        is_favorite: true,
        created_at: '2024-01-15T10:00:00Z',
        distance_km: 2.3,
        donations_30d: 12,
        accepted_30d: 10,
        last_donation: '2024-01-20T14:30:00Z',
      },
      {
        id: '2',
        name: 'Casa da Esperança',
        city: 'São Paulo',
        uf: 'SP',
        is_favorite: false,
        created_at: '2024-01-10T09:00:00Z',
        distance_km: 4.7,
        donations_30d: 8,
        accepted_30d: 7,
        last_donation: '2024-01-18T16:45:00Z',
      },
      {
        id: '3',
        name: 'Lar dos Idosos Santa Clara',
        city: 'São Paulo',
        uf: 'SP',
        is_favorite: false,
        created_at: '2024-01-05T11:00:00Z',
        distance_km: 1.8,
        donations_30d: 15,
        accepted_30d: 13,
        last_donation: '2024-01-19T12:15:00Z',
      },
    ];
    
    // Retorna diferentes quantidades baseado no ID do restaurante
    const count = restaurantId.length % 4;
    return mockData.slice(0, Math.max(1, count));
  };

  const toggleRowExpansion = (restaurantId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(restaurantId)) {
      newExpanded.delete(restaurantId);
    } else {
      newExpanded.add(restaurantId);
    }
    setExpandedRows(newExpanded);
  };

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
      try {
        const { data, error } = await supabase.functions.invoke<{ id: string }>(
          'cf_create_restaurant',
          {
            body: payload,
            headers: { Authorization: `Bearer ${session?.access_token}` },
          },
        );

        if (error) {
          // Erro retornado pela Edge Function
          if (error instanceof FunctionsHttpError) {
            const status = error.context.status;
            console.log('Edge Function HTTP status:', status);
            throw { status };
          }

          // Erros de rede / relay
          if (error instanceof FunctionsRelayError || error instanceof FunctionsFetchError) {
            console.log('Network/Relay error → usando 503');
            throw { status: 503, message: error.message };
          }

          // Qualquer outro tipo de erro
          throw error;
        }

        // Sucesso (2xx)
        return data ?? {};
      } catch (rawErr: any) {
        // Garante que sempre logamos o status antes de reprojetar
        const status = rawErr.status ?? 500;
        console.log('Mutation error status (catch):', status);
        throw rawErr;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['restaurants'] });
      toast.success('Restaurante criado com sucesso!');
      setIsModalOpen(false);
    },
  });

  /* helper para o modal (async) */
  const handleCreateRestaurant = (data: CreateRestaurantPayload) =>
    createRestaurantMutation.mutateAsync(data);

  /* abrir modal de parceria */
  const handleOpenNewPartnership = (id: string) => {
    setSelectedRestaurantId(id);
    setIsPartnershipModalOpen(true);
  };

  /* filtrar restaurantes por busca */
  const filteredRestaurants = restaurants?.filter(restaurant =>
    restaurant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    restaurant.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    restaurant.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  /* --------------------------- UI ----------------------------- */
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-full mx-auto">
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
            value={filteredRestaurants?.length ?? 0}
          />
          <StatCard
            icon={<MapPin className="h-8 w-8 text-blue-600" />}
            label="Ativos"
            value={filteredRestaurants?.filter(r => r.status === 'active').length ?? 0}
          />
          <StatCard
            icon={<Mail className="h-8 w-8 text-yellow-600" />}
            label="Convites Enviados"
            value={filteredRestaurants?.filter(r => r.status === 'invite_sent').length ?? 0}
          />
          <StatCard
            icon={<Heart className="h-8 w-8 text-red-600" />}
            label="Total de Parcerias"
            value={filteredRestaurants?.reduce((acc, r) => acc + (r.partners_list?.length || 0), 0) ?? 0}
          />
        </div>

        {/* ---------- TABLE ---------- */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Lista de Restaurantes</h2>
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar por nome, email ou cidade..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-80 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            </div>
          </div>

          <div>
            <div className="divide-y divide-gray-200">
              {filteredRestaurants?.map((r) => (
                <RestaurantRow
                  key={r.id}
                  restaurant={r}
                  isExpanded={expandedRows.has(r.id)}
                  onToggleExpansion={() => toggleRowExpansion(r.id)}
                  onOpenPartnership={() => handleOpenNewPartnership(r.id)}
                  partnerships={getMockPartnerships(r.id)}
                />
              ))}
            </div>
          </div>

          {/* Empty state */}
          {(!filteredRestaurants || filteredRestaurants.length === 0) && (
            searchTerm ? (
              <div className="text-center py-12">
                <Search className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum resultado encontrado</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Tente buscar com outros termos ou limpe o filtro.
                </p>
                <div className="mt-6">
                  <button
                    onClick={() => setSearchTerm('')}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                  >
                    Limpar busca
                  </button>
                </div>
              </div>
            ) : (
            <EmptyState onAdd={() => {
              createRestaurantMutation.reset();
              setIsModalOpen(true);
            }} />
            )
          )}
        </div>
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
/* Componente de linha do restaurante com accordion                    */
/* ------------------------------------------------------------------ */
interface RestaurantRowProps {
  restaurant: RestaurantWithPartners;
  isExpanded: boolean;
  onToggleExpansion: () => void;
  onOpenPartnership: () => void;
  partnerships: PartnershipDetail[];
}

function RestaurantRow({ 
  restaurant, 
  isExpanded, 
  onToggleExpansion, 
  onOpenPartnership,
  partnerships 
}: RestaurantRowProps) {
  const hasPartnerships = partnerships.length > 0;

  return (
    <div className="bg-white">
      {/* Linha principal do restaurante */}
      <div className="px-6 py-6 hover:bg-gray-50 transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex items-center flex-1 min-w-0">
            {/* Avatar e info básica */}
            <div className="flex items-center">
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4 flex-1 min-w-0">
                <div className="flex items-center space-x-3">
                  <h3 className="text-lg font-medium text-gray-900 truncate">{restaurant.name}</h3>
                  <StatusPill status={restaurant.status} />
                </div>
                <div className="mt-1 space-y-1">
                  <div className="flex items-center text-sm text-gray-600">
                    <Mail className="h-3 w-3 mr-2 text-gray-400 flex-shrink-0" />
                    <span className="truncate">{restaurant.email}</span>
                  </div>
                  {restaurant.phone && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Phone className="h-3 w-3 mr-2 text-gray-400 flex-shrink-0" />
                      {restaurant.phone}
                    </div>
                  )}
                  {restaurant.cnpj && (
                    <div className="text-sm text-gray-500">
                      CNPJ: {restaurant.cnpj}
                    </div>
                  )}
                  {restaurant.code && (
                    <div className="text-sm text-gray-500">
                      Código: {restaurant.code}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Endereço */}
            <div className="ml-8 flex-shrink-0 hidden lg:block">
              <div className="flex items-center text-sm text-gray-900 mb-1">
                <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                {restaurant.city}, {restaurant.uf}
              </div>
              <div className="text-sm text-gray-500 ml-6">
                {restaurant.street}, {restaurant.number}
              </div>
            </div>

            {/* Info de parcerias */}
            <div className="ml-8 flex-shrink-0 hidden md:block">
              {hasPartnerships ? (
                <div className="space-y-1 text-sm">
                  <div className="flex items-center text-gray-900">
                    <Building2 className="h-4 w-4 mr-2 text-blue-500" />
                    <span className="font-medium">{partnerships.length} parceria(s)</span>
                  </div>
                  {partnerships.find(p => p.is_favorite) && (
                    <div className="flex items-center">
                      <Heart className="h-3 w-3 mr-1 text-red-500 fill-current" />
                      <span className="text-xs text-gray-600">
                        Favorita: {partnerships.find(p => p.is_favorite)?.name}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <span className="text-gray-400 text-sm">Nenhuma parceria</span>
              )}
            </div>
          </div>

          {/* Ações */}
          <div className="flex items-center space-x-3 ml-4">
            <button
              onClick={onOpenPartnership}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
            >
              <Users className="h-3 w-3 mr-1" />
              Gerir Parcerias
            </button>
            
            {hasPartnerships && (
              <button
                onClick={onToggleExpansion}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title={isExpanded ? 'Recolher parcerias' : 'Expandir parcerias'}
              >
                {isExpanded ? (
                  <ChevronDown className="h-5 w-5" />
                ) : (
                  <ChevronRight className="h-5 w-5" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Accordion de parcerias */}
      {hasPartnerships && isExpanded && (
        <div className="border-t border-gray-100 bg-gray-50">
          <div className="px-6 py-4">
            <h4 className="text-sm font-medium text-gray-900 mb-4 flex items-center">
              <Building2 className="h-4 w-4 mr-2 text-blue-500" />
              Parcerias Ativas ({partnerships.length})
            </h4>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {partnerships.map((partnership) => (
                <PartnershipCard key={partnership.id} partnership={partnership} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Card de parceria individual                                         */
/* ------------------------------------------------------------------ */
interface PartnershipCardProps {
  partnership: PartnershipDetail;
}

function PartnershipCard({ partnership }: PartnershipCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start space-x-3 flex-1 min-w-0">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Building2 className="w-5 h-5 text-green-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h5 className="font-medium text-gray-900 text-sm truncate">{partnership.name}</h5>
              {partnership.is_favorite && (
                <Heart className="w-3 h-3 text-red-500 fill-current flex-shrink-0" />
              )}
            </div>
            <div className="flex items-center text-xs text-gray-600">
              <MapPin className="w-3 h-3 mr-1" />
              {partnership.city}, {partnership.uf}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-gray-500">Distância:</span>
          <span className="font-medium text-gray-900">{partnership.distance_km.toFixed(1)} km</span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-gray-500">Doações 30d:</span>
          <div className="flex items-center space-x-1">
            <Package className="w-3 h-3 text-blue-500" />
            <span className="font-medium text-gray-900">{partnership.donations_30d}</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-gray-500">Aceitas 30d:</span>
          <div className="flex items-center space-x-1">
            <TrendingUp className="w-3 h-3 text-green-500" />
            <span className="font-medium text-green-600">{partnership.accepted_30d}</span>
          </div>
        </div>
        
        <div className="pt-2 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Parceria desde:</span>
            <span className="text-gray-700">{formatDate(partnership.created_at)}</span>
          </div>
          {partnership.last_donation && (
            <div className="flex items-center justify-between mt-1">
              <span className="text-gray-500">Última doação:</span>
              <span className="text-gray-700">{formatDateTime(partnership.last_donation)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-componentes utilitários                                         */
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