import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Mail, MapPin, Calendar, MoreHorizontal, Handshake } from 'lucide-react';
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

  const resendInviteMutation = useMutation({
    mutationFn: async (restaurantId: string) => {
      const { data, error } = await supabase.functions.invoke('cf_send_invite_email', {
        body: { restaurant_id: restaurantId },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Convite reenviado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao reenviar convite');
    },
  });

  const renderPartnerships = (restaurant: RestaurantPartner) => {
    const partnerships = [];
    
    // Favorita primeiro (com estrela)
    if (restaurant.favorite_osc) {
      partnerships.push(
        <span key="favorite" className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 mr-1 mb-1">
          ⭐ {restaurant.favorite_osc.name}
        </span>
      );
    }
    
    // Outras parcerias (máximo 2 além da favorita)
    const otherPartners = restaurant.partners_list?.filter(p => p.id !== restaurant.favorite_osc?.id) || [];
    const visiblePartners = otherPartners.slice(0, 2);
    
    visiblePartners.forEach(partner => {
      partnerships.push(
        <span key={partner.id} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-1 mb-1">
          {partner.name}
        </span>
      );
    });
    
    // Badge "+N" se houver mais parcerias
    const remainingCount = otherPartners.length - 2;
    if (remainingCount > 0) {
      partnerships.push(
        <span key="more" className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          +{remainingCount}
        </span>
      );
    }
    
    return partnerships.length > 0 ? partnerships : <span className="text-gray-400 text-sm">Nenhuma parceria</span>;
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Restaurantes</h1>
          <p className="text-gray-600">Gerencie os restaurantes cadastrados</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Restaurante
        </button>
      </div>

      {/* Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nome
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cidade
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  UF
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  CEP
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Parcerias
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
                <th className="relative px-6 py-3">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {restaurants?.map((restaurant) => (
                <tr key={restaurant.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {restaurant.name}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {restaurant.city || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {restaurant.uf || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {restaurant.cep || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-wrap">
                      {renderPartnerships(restaurant)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button
                      onClick={() => handleOpenPartnerships(restaurant.id)}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
                    >
                      <Handshake className="w-3 h-3 mr-1" />
                      Parcerias
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-gray-400 hover:text-gray-600">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {restaurants?.length === 0 && (
          <div className="text-center py-12">
            <Store className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum restaurante</h3>
            <p className="mt-1 text-sm text-gray-500">
              Comece criando um novo restaurante.
            </p>
            <div className="mt-6">
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo Restaurante
              </button>
            </div>
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