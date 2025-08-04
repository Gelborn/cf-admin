import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Plus, Star, StarOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { NewPartnershipModal } from './NewPartnershipModal';
import toast from 'react-hot-toast';

interface Partnership {
  osc: {
    id: string;
    name: string;
    city?: string;
    uf?: string;
  };
  is_favorite: boolean;
  created_at: string;
}

interface PartnershipsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  restaurantId: string | null;
}

export function PartnershipsDrawer({ isOpen, onClose, restaurantId }: PartnershipsDrawerProps) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: partnerships, isLoading } = useQuery({
    queryKey: ['partnerships', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      
      const { data, error } = await supabase
        .from('partnerships')
        .select('osc(id,name,city,uf), is_favorite, created_at')
        .eq('restaurant_id', restaurantId)
        .order('is_favorite', { ascending: false });
      
      if (error) throw error;
      return data as Partnership[];
    },
    enabled: !!restaurantId && isOpen,
  });

  const updateFavoriteMutation = useMutation({
    mutationFn: async ({ oscId }: { oscId: string }) => {
      const { data, error } = await supabase.functions.invoke('cf_update_favorite', {
        body: { restaurant_id: restaurantId, osc_id: oscId },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partnerships', restaurantId] });
      queryClient.invalidateQueries({ queryKey: ['restaurants'] });
      toast.success('Favorita atualizada com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar favorita');
    },
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    queryClient.invalidateQueries({ queryKey: ['partnerships', restaurantId] });
    queryClient.invalidateQueries({ queryKey: ['restaurants'] });
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={onClose} />
      
      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-xl z-50 transform transition-transform duration-300">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Parcerias do Restaurante
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="space-y-4">
                {partnerships?.map((partnership) => (
                  <div
                    key={partnership.osc.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-sm font-medium text-gray-900">
                          {partnership.osc.name}
                        </h3>
                        {partnership.is_favorite && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            ⭐ Favorita
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {partnership.osc.city && partnership.osc.uf 
                          ? `${partnership.osc.city}, ${partnership.osc.uf}`
                          : 'Localização não informada'
                        }
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Parceria desde {formatDate(partnership.created_at)}
                      </p>
                    </div>
                    
                    <button
                      onClick={() => updateFavoriteMutation.mutate({ oscId: partnership.osc.id })}
                      disabled={updateFavoriteMutation.isPending}
                      className={`p-2 rounded-full transition-colors ${
                        partnership.is_favorite
                          ? 'text-yellow-500 hover:text-yellow-600'
                          : 'text-gray-400 hover:text-yellow-500'
                      }`}
                      title={partnership.is_favorite ? 'Remover dos favoritos' : 'Marcar como favorita'}
                    >
                      {partnership.is_favorite ? (
                        <Star className="w-5 h-5 fill-current" />
                      ) : (
                        <StarOff className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                ))}

                {partnerships?.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500 text-sm">
                      Nenhuma parceria encontrada
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200">
            <button
              onClick={() => setIsModalOpen(true)}
              className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nova Parceria
            </button>
          </div>
        </div>
      </div>

      {/* New Partnership Modal */}
      <NewPartnershipModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        restaurantId={restaurantId}
      />
    </>
  );
}