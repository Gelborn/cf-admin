import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, MapPin, Phone, Mail, Users, Heart, Building2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { RestaurantModal } from '../components/RestaurantModal';
import { NewPartnershipModal } from '../components/NewPartnershipModal';
import toast from 'react-hot-toast';

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

export function Restaurants() {
  const { session } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPartnershipModalOpen, setIsPartnershipModalOpen] = useState(false);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null);
  const queryClient = useQueryClient();

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

  const createRestaurantMutation = useMutation({
    mutationFn: async (restaurantData: CreateRestaurantPayload) => {
      const { data, error } = await supabase.functions.invoke<{ id: string }>(
        'cf_create_restaurant',
        {
          body: restaurantData,
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
          },
        }
      );

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurants'] });
      toast.success('Restaurante criado com sucesso!');
      setIsModalOpen(false);
      setIsModalOpen(false);
    },
    onError: (error: any) => {
      // Erros são tratados pelo modal, mas precisamos manter aberto
      console.error('Erro ao criar restaurante:', error);
    },
  });

  const handleOpenNewPartnership = (restaurantId: string) => {
    setSelectedRestaurantId(restaurantId);
    setIsPartnershipModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Restaurantes</h1>
              <p className="mt-2 text-gray-600">
                Gerencie os restaurantes parceiros da plataforma
              </p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Restaurante
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total de Restaurantes</p>
                <p className="text-2xl font-bold text-gray-900">
                  {restaurants?.length || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <MapPin className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Ativos</p>
                <p className="text-2xl font-bold text-gray-900">
                  {restaurants?.filter(r => r.status === 'active').length || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Mail className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Convites Enviados</p>
                <p className="text-2xl font-bold text-gray-900">
                  {restaurants?.filter(r => r.status === 'invite_sent').length || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Heart className="h-8 w-8 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total de Parcerias</p>
                <p className="text-2xl font-bold text-gray-900">
                  {restaurants?.reduce((acc, r) => acc + (r.partners_list?.length || 0), 0) || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Restaurants Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Lista de Restaurantes</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Restaurante
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contato
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Endereço
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Parcerias
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {restaurants?.map((restaurant) => (
                  <tr key={restaurant.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <Users className="h-5 w-5 text-blue-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {restaurant.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            ID: {restaurant.id.slice(0, 8)}...
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 flex items-center">
                        <Mail className="h-4 w-4 mr-2 text-gray-400" />
                        {restaurant.email}
                      </div>
                      {restaurant.phone && (
                        <div className="text-sm text-gray-500 flex items-center mt-1">
                          <Phone className="h-4 w-4 mr-2 text-gray-400" />
                          {restaurant.phone}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 flex items-center">
                        <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                        {restaurant.city}, {restaurant.uf}
                      </div>
                      <div className="text-sm text-gray-500">
                        {restaurant.street}, {restaurant.number}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {restaurant.partners_list && restaurant.partners_list.length > 0 ? (
                          <div className="space-y-1">
                            <div className="flex items-center">
                              <Building2 className="h-4 w-4 mr-2 text-blue-500" />
                              <span className="font-medium">{restaurant.partners_list.length} parceria(s)</span>
                            </div>
                            {restaurant.favorite_osc && (
                              <div className="flex items-center">
                                <Heart className="h-3 w-3 mr-1 text-red-500 fill-current" />
                                <span className="text-xs text-gray-600">
                                  Favorita: {restaurant.favorite_osc.name}
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">Nenhuma parceria</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        restaurant.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : restaurant.status === 'invite_sent'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {restaurant.status === 'active' ? 'Ativo' : 
                         restaurant.status === 'invite_sent' ? 'Convite Enviado' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleOpenNewPartnership(restaurant.id)}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Nova Parceria
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {(!restaurants || restaurants.length === 0) && (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum restaurante</h3>
              <p className="mt-1 text-sm text-gray-500">
                Comece criando um novo restaurante.
              </p>
              <div className="mt-6">
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Restaurante
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <RestaurantModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={(data) => createRestaurantMutation.mutate(data)}
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