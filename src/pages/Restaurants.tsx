import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Filter, ChevronDown, ChevronRight, Star, Users, MapPin, Building2, Handshake } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { RestaurantModal } from '../components/RestaurantModal';
import { PartnershipsDrawer } from '../components/PartnershipsDrawer';
import toast from 'react-hot-toast';

interface RestaurantPartner {
  id: string;
  name: string;
  city?: string;
  uf?: string;
  cep?: string;
  partners_list?: Array<{ id: string; name: string }>;
  favorite_osc?: { id: string; name: string } | null;
}

export function Restaurants() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [partnershipFilter, setPartnershipFilter] = useState<'all' | 'with' | 'without'>('all');

  const { data: restaurants, isLoading } = useQuery({
    queryKey: ['restaurants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_restaurants_partners')
        .select('id,name,city,uf,cep,partners_list,favorite_osc')
        .order('name');
      
      if (error) throw error;
      return data as RestaurantPartner[];
    },
  });

  const createRestaurantMutation = useMutation({
    mutationFn: async (restaurantData: any) => {
      const { data, error } = await supabase.functions.invoke('cf_create_restaurant', {
        body: restaurantData,
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurants'] });
      setIsModalOpen(false);
      toast.success('Restaurante criado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao criar restaurante');
    },
  });

  // Filtrar restaurantes
  const filteredRestaurants = restaurants?.filter(restaurant => {
    const matchesSearch = restaurant.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const hasPartnerships = (restaurant.partners_list?.length || 0) > 0;
    const matchesPartnership = 
      partnershipFilter === 'all' ||
      (partnershipFilter === 'with' && hasPartnerships) ||
      (partnershipFilter === 'without' && !hasPartnerships);
    
    return matchesSearch && matchesPartnership;
  });

  const toggleRowExpansion = (restaurantId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(restaurantId)) {
      newExpanded.delete(restaurantId);
    } else {
      newExpanded.add(restaurantId);
    }
    setExpandedRows(newExpanded);
  };

  const renderPartnershipDetails = (restaurant: RestaurantPartner) => {
    const allPartners = restaurant.partners_list || [];
    
    if (allPartners.length === 0) {
      return (
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
          <div className="flex items-center justify-center py-8 text-gray-500">
            <Users className="w-5 h-5 mr-2" />
            <span className="text-sm">Nenhuma parceria estabelecida</span>
          </div>
        </div>
      );
    }

    return (
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-900 flex items-center">
            <Handshake className="w-4 h-4 mr-2 text-blue-600" />
            Parcerias Ativas ({allPartners.length})
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {allPartners.map(partner => (
              <div
                key={partner.id}
                className={`p-3 rounded-lg border-2 transition-all ${
                  restaurant.favorite_osc?.id === partner.id
                    ? 'border-yellow-200 bg-yellow-50'
                    : 'border-blue-200 bg-blue-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">
                    {partner.name}
                  </span>
                  {restaurant.favorite_osc?.id === partner.id && (
                    <div className="flex items-center">
                      <Star className="w-4 h-4 text-yellow-500 fill-current" />
                      <span className="text-xs text-yellow-700 ml-1 font-medium">Favorita</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          <div className="pt-2 border-t border-gray-200">
            <button
              onClick={() => handleOpenPartnerships(restaurant.id)}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors"
            >
              <Handshake className="w-4 h-4 mr-2" />
              Gerenciar Parcerias
            </button>
          </div>
        </div>
      </div>
    );
  };

  const getPartnershipSummary = (restaurant: RestaurantPartner) => {
    const totalPartners = restaurant.partners_list?.length || 0;
    const hasFavorite = !!restaurant.favorite_osc;
    
    if (totalPartners === 0) {
      return <span className="text-gray-400 text-sm">Sem parcerias</span>;
    }
    
    return (
      <div className="flex items-center space-x-2">
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          {totalPartners} parceria{totalPartners !== 1 ? 's' : ''}
        </span>
        {hasFavorite && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Star className="w-3 h-3 mr-1 fill-current" />
            Favorita
          </span>
        )}
      </div>
    );
  };

  const handleOpenPartnerships = (restaurantId: string) => {
    setSelectedRestaurantId(restaurantId);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedRestaurantId(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header moderno */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-8 text-white">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">Restaurantes</h1>
            <p className="text-blue-100 text-lg">
              Gerencie os restaurantes cadastrados e suas parcerias
            </p>
            <div className="flex items-center mt-4 space-x-6 text-blue-100">
              <div className="flex items-center">
                <Building2 className="w-5 h-5 mr-2" />
                <span className="font-medium">{restaurants?.length || 0}</span>
                <span className="ml-1">restaurantes</span>
              </div>
              <div className="flex items-center">
                <Handshake className="w-5 h-5 mr-2" />
                <span className="font-medium">
                  {restaurants?.reduce((acc, r) => acc + (r.partners_list?.length || 0), 0) || 0}
                </span>
                <span className="ml-1">parcerias</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-white text-blue-600 hover:bg-blue-50 px-6 py-3 rounded-xl font-semibold shadow-lg transition-all duration-200 flex items-center"
          >
            <Plus className="w-5 h-5 mr-2" />
            Novo Restaurante
          </button>
        </div>
      </div>

      {/* Filtros modernos */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-6">
          {/* Busca */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar restaurantes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Filtro de parcerias */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <Filter className="w-5 h-5 text-gray-400 mr-2" />
              <span className="text-sm font-medium text-gray-700">Parcerias:</span>
            </div>
            <select
              value={partnershipFilter}
              onChange={(e) => setPartnershipFilter(e.target.value as 'all' | 'with' | 'without')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="all">Todos</option>
              <option value="with">Com parcerias</option>
              <option value="without">Sem parcerias</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabela moderna */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {filteredRestaurants && filteredRestaurants.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Restaurante
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Localização
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Parcerias
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredRestaurants.map((restaurant) => (
                  <>
                    <tr key={restaurant.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mr-4">
                            <Building2 className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-900">
                              {restaurant.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              ID: {restaurant.id.slice(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center text-sm text-gray-900">
                          <MapPin className="w-4 h-4 text-gray-400 mr-2" />
                          <div>
                            <div>{restaurant.city || 'N/A'}, {restaurant.uf || 'N/A'}</div>
                            <div className="text-xs text-gray-500">CEP: {restaurant.cep || 'N/A'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-between">
                          {getPartnershipSummary(restaurant)}
                          <button
                            onClick={() => toggleRowExpansion(restaurant.id)}
                            className="ml-3 p-1 hover:bg-gray-100 rounded-full transition-colors"
                          >
                            {expandedRows.has(restaurant.id) ? (
                              <ChevronDown className="w-4 h-4 text-gray-500" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-gray-500" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleOpenPartnerships(restaurant.id)}
                          className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors"
                        >
                          <Handshake className="w-4 h-4 mr-2" />
                          Gerenciar
                        </button>
                      </td>
                    </tr>
                    {expandedRows.has(restaurant.id) && (
                      <tr>
                        <td colSpan={4} className="p-0">
                          {renderPartnershipDetails(restaurant)}
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-16">
            {searchTerm || partnershipFilter !== 'all' ? (
              <div>
                <Search className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum resultado encontrado</h3>
                <p className="text-gray-500 mb-6">
                  Tente ajustar os filtros ou termos de busca
                </p>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setPartnershipFilter('all');
                  }}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg"
                >
                  Limpar filtros
                </button>
              </div>
            ) : (
              <div>
                <Building2 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum restaurante cadastrado</h3>
                <p className="text-gray-500 mb-6">
                  Comece criando seu primeiro restaurante
                </p>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="inline-flex items-center px-6 py-3 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Restaurante
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      <RestaurantModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={(data) => createRestaurantMutation.mutate(data)}
        isLoading={createRestaurantMutation.isPending}
      />

      {/* Partnerships Drawer */}
      <PartnershipsDrawer
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        restaurantId={selectedRestaurantId}
      />
    </div>
  );
}