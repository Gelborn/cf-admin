import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Search, MapPin, TrendingUp, TrendingDown, Users, Building2, Heart, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import { FunctionsError } from '@supabase/supabase-js';

interface OSCMatch {
  osc_id: string;
  osc_name: string;
  city?: string;
  uf?: string;
  distance_km: number;
  accepted_30: number;
  denied_30: number;
  score: number;
}

interface Partnership {
  osc_id: string;
  osc_name: string;
  city?: string;
  uf?: string;
  is_favorite: boolean;
  created_at: string;
  distance_km?: number;
}

interface Restaurant {
  id: string;
  name: string;
  city?: string;
  uf?: string;
  email: string;
}

interface NewPartnershipModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurantId: string | null;
}

export function NewPartnershipModal({ isOpen, onClose, restaurantId }: NewPartnershipModalProps) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [view, setView] = useState<'manage' | 'search'>('manage');
  const [radiusKm, setRadiusKm] = useState(5);
  const [selectedOsc, setSelectedOsc] = useState<string>('');
  const [isFavorite, setIsFavorite] = useState(false);

  // Buscar dados do restaurante
  const { data: restaurant } = useQuery<Restaurant>({
    queryKey: ['restaurant', restaurantId],
    queryFn: async () => {
      if (!restaurantId) throw new Error('Restaurant ID required');
      
      const { data, error } = await supabase
        .from('restaurants')
        .select('id, name, city, uf, email')
        .eq('id', restaurantId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!restaurantId && isOpen,
  });

  // Buscar parcerias atuais
  const { data: currentPartnerships, isLoading: loadingPartnerships } = useQuery<Partnership[]>({
    queryKey: ['partnerships', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      
      const { data, error } = await supabase
        .from('partnerships')
        .select(`
          osc_id,
          is_favorite,
          created_at,
          distance_km,
          osc:osc_id (
            id,
            name,
            city,
            uf
          )
        `)
        .eq('restaurant_id', restaurantId);
      
      if (error) throw error;
      
      const partnerships = data.map(p => ({
        osc_id: p.osc_id,
        osc_name: (p.osc as any)?.name || 'Nome não encontrado',
        city: (p.osc as any)?.city,
        uf: (p.osc as any)?.uf,
        is_favorite: p.is_favorite,
        created_at: p.created_at,
        distance_km: p.distance_km,
      }));
      
      // Ordenar: favorita primeiro, depois por nome
      return partnerships.sort((a, b) => {
        if (a.is_favorite && !b.is_favorite) return -1;
        if (!a.is_favorite && b.is_favorite) return 1;
        return a.osc_name.localeCompare(b.osc_name);
      });
    },
    enabled: !!restaurantId && isOpen,
  });

  // Buscar OSCs para nova parceria
  const {
    data: oscMatches,
    isLoading: isSearching,
    refetch: searchOscs,
  } = useQuery<OSCMatch[], FunctionsError>({
    queryKey: ['osc-matches', restaurantId, radiusKm],
    queryFn: async () => {
      if (!restaurantId) return [];

      const { data, error } = await supabase.functions.invoke<OSCMatch[]>(
        'cf_match_oscs',
        {
          body: { restaurant_id: restaurantId, radius_km: radiusKm },
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
          },
        }
      );

      if (error) throw error;
      return data ?? [];
    },
    enabled: false,
  });

  // Criar múltiplas parcerias
  const createPartnershipMutation = useMutation<any, FunctionsError, void>({
    mutationFn: async () => {
      if (!restaurantId || !selectedOsc) throw new Error('Restaurant ID and OSC are required');
      
      const { data, error } = await supabase.functions.invoke('cf_create_partnership', {
        body: {
          restaurant_id: restaurantId,
          osc_id: selectedOsc,
          is_favorite: isFavorite,
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partnerships', restaurantId] });
      queryClient.invalidateQueries({ queryKey: ['restaurants'] }); // Atualiza tabela principal
      toast.success('Parceria criada com sucesso!');
      setView('manage');
      setSelectedOsc('');
      setIsFavorite(false);
    },
    onError: (error: FunctionsError) => {
      toast.error(error.message || 'Erro ao criar parceria');
    },
  });

  // Alterar favorita
  const toggleFavoriteMutation = useMutation({
    mutationFn: async ({ oscId, isFavorite }: { oscId: string; isFavorite: boolean }) => {
      // Primeiro, remove favorita de todas as outras
      if (isFavorite) {
        await supabase
          .from('partnerships')
          .update({ is_favorite: false })
          .eq('restaurant_id', restaurantId);
      }
      
      // Depois, define a nova favorita
      const { error } = await supabase
        .from('partnerships')
        .update({ is_favorite: isFavorite })
        .eq('restaurant_id', restaurantId)
        .eq('osc_id', oscId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partnerships', restaurantId] });
      queryClient.invalidateQueries({ queryKey: ['restaurants'] }); // Atualiza tabela principal
      toast.success('Favorita atualizada!');
    },
    onError: () => {
      toast.error('Erro ao atualizar favorita');
    },
  });

  // Mutation para remover parceria (corrigida)
  const removePartnershipMutation = useMutation({
    mutationFn: async (oscId: string) => {
      const { error } = await supabase
        .from('partnerships')
        .delete()
        .eq('restaurant_id', restaurantId)
        .eq('osc_id', oscId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partnerships', restaurantId] });
      queryClient.invalidateQueries({ queryKey: ['restaurants'] }); // Atualiza tabela principal
      toast.success('Parceria removida com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao remover parceria');
    },
  });

  const handleSearch = () => {
    searchOscs();
  };

  const handleOscSelect = (oscId: string) => {
    setSelectedOsc(oscId === selectedOsc ? '' : oscId);
  };

  const handleFavoriteChange = (checked: boolean) => {
    setIsFavorite(checked);
  };

  const handleClose = () => {
    setView('manage');
    setRadiusKm(5);
    setSelectedOsc('');
    setIsFavorite(false);
    onClose();
  };

  const handleSave = () => {
    if (!selectedOsc) {
      toast.error('Selecione uma OSC');
      return;
    }
    createPartnershipMutation.mutate();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 py-8">
        <div className="fixed inset-0 bg-gray-500/75" onClick={handleClose} />

        <div className="relative bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">Gestão de Parcerias</h3>
                  {restaurant && (
                    <p className="text-blue-100">
                      {restaurant.name} • {restaurant.city}, {restaurant.uf}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={handleClose}
                className="text-white/80 hover:text-white p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Navigation */}
          <div className="border-b border-gray-200 px-6">
            <nav className="flex space-x-8">
              <button
                onClick={() => setView('manage')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  view === 'manage'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Building2 className="w-4 h-4 inline mr-2" />
                Parcerias Atuais ({currentPartnerships?.length || 0})
              </button>
              <button
                onClick={() => setView('search')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  view === 'search'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Search className="w-4 h-4 inline mr-2" />
                Buscar Novas Parcerias
              </button>
            </nav>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            {view === 'manage' && (
              <div className="space-y-6">
                {loadingPartnerships ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : currentPartnerships && currentPartnerships.length > 0 ? (
                  <div className="grid gap-6 md:grid-cols-2">
                    {currentPartnerships.map((partnership) => (
                      <div 
                        key={partnership.osc_id}
                        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-4 flex-1">
                            <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 rounded-xl flex items-center justify-center flex-shrink-0">
                              <Building2 className="w-6 h-6 text-green-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-2">
                                <h4 className="font-semibold text-gray-900 text-lg truncate">{partnership.osc_name}</h4>
                                {partnership.is_favorite && (
                                  <div className="flex items-center space-x-1 bg-red-50 px-2 py-1 rounded-full">
                                    <Heart className="w-3 h-3 text-red-500 fill-current" />
                                    <span className="text-xs font-medium text-red-600">Favorita</span>
                                  </div>
                                )}
                              </div>
                              {partnership.city && partnership.uf && (
                                <div className="flex items-center text-gray-600 mb-2">
                                  <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                                  <span className="text-sm">{partnership.city}, {partnership.uf}</span>
                                </div>
                              )}
                              {partnership.distance_km && (
                                <div className="flex items-center text-gray-500 mb-2">
                                  <div className="w-4 h-4 mr-2 flex items-center justify-center">
                                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                                  </div>
                                  <span className="text-sm">Distância {partnership.distance_km.toFixed(1)} km</span>
                                </div>
                              )}
                              <div className="flex items-center text-gray-500">
                                <div className="w-4 h-4 mr-2 bg-blue-100 rounded-full flex items-center justify-center">
                                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                </div>
                                <span className="text-xs">
                                  Parceria desde {new Date(partnership.created_at).toLocaleDateString('pt-BR', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric'
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col space-y-2 ml-4">
                            <button
                              onClick={() => toggleFavoriteMutation.mutate({
                                oscId: partnership.osc_id,
                                isFavorite: !partnership.is_favorite
                              })}
                              disabled={toggleFavoriteMutation.isPending}
                              className={`p-2 rounded-lg transition-all duration-200 ${
                                partnership.is_favorite
                                  ? 'bg-red-100 text-red-600 hover:bg-red-200'
                                  : 'bg-gray-100 text-gray-600 hover:bg-yellow-100 hover:text-yellow-600'
                              }`}
                              title={partnership.is_favorite ? 'Remover dos favoritos' : 'Marcar como favorita'}
                            >
                              <Heart className={`w-4 h-4 ${partnership.is_favorite ? 'fill-current' : ''}`} />
                            </button>
                            <button
                              onClick={() => removePartnershipMutation.mutate(partnership.osc_id)}
                              disabled={removePartnershipMutation.isPending}
                              className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all duration-200 disabled:opacity-50"
                              title="Remover parceria"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Building2 className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma parceria ativa</h3>
                    <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                      Este restaurante ainda não possui parcerias com OSCs. Comece buscando organizações próximas.
                    </p>
                    <button
                      onClick={() => setView('search')}
                      className="inline-flex items-center px-6 py-3 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Search className="w-4 h-4 mr-2" />
                      Buscar Parcerias
                    </button>
                  </div>
                )}
              </div>
            )}

            {view === 'search' && (
              <div className="space-y-6">
                {/* Search Controls */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Search className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-2">Buscar Novas Parcerias</h4>
                      <p className="text-gray-600 text-sm mb-4">
                        Defina a distância máxima para buscarmos OSCs disponíveis para parcerias com este restaurante.
                      </p>
                      <div className="flex items-center space-x-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Raio de busca (km)
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="50"
                            value={radiusKm}
                            onChange={(e) => setRadiusKm(Number(e.target.value))}
                            className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div className="pt-6">
                          <button
                            onClick={handleSearch}
                            disabled={isSearching}
                            className="inline-flex items-center px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                          >
                            <Search className="w-4 h-4 mr-2" />
                            {isSearching ? 'Buscando...' : 'Buscar OSCs'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Results */}
                {oscMatches && oscMatches.length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-gray-900 text-lg">
                        OSCs encontradas ({oscMatches.filter(osc => !currentPartnerships?.some(p => p.osc_id === osc.osc_id)).length} disponíveis)
                      </h4>
                      <div className="text-sm text-gray-500">
                        {currentPartnerships?.length || 0} já são parceiras
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Selecionar
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Nome
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Distância
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Aceites 30d
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Negações 30d
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Score
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {oscMatches.map((osc) => {
                            const isAlreadyPartner = currentPartnerships?.some(p => p.osc_id === osc.osc_id);
                            return (
                              <tr key={osc.osc_id} className={`${isAlreadyPartner ? 'bg-gray-50' : 'hover:bg-gray-50'}`}>
                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                  {isAlreadyPartner ? (
                                    <div className="w-4 h-4 bg-green-100 rounded-full flex items-center justify-center">
                                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    </div>
                                  ) : (
                                    <input
                                      type="radio"
                                      name="selectedOsc"
                                      checked={selectedOsc === osc.osc_id}
                                      onChange={() => handleOscSelect(osc.osc_id)}
                                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">
                                      {osc.osc_name}
                                    </div>
                                    {osc.city && osc.uf && (
                                      <div className="text-sm text-gray-500 flex items-center">
                                        <MapPin className="w-3 h-3 mr-1" />
                                        {osc.city}, {osc.uf}
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {osc.distance_km.toFixed(1)} km
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  <div className="flex items-center">
                                    <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                                    {osc.accepted_30}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  <div className="flex items-center">
                                    <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                                    {osc.denied_30}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    {osc.score.toFixed(1)}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  {isAlreadyPartner ? (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5"></div>
                                      Já é parceira
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                      <div className="w-1.5 h-1.5 bg-gray-500 rounded-full mr-1.5"></div>
                                      Disponível
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : oscMatches && oscMatches.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Search className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma OSC encontrada</h3>
                    <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                      Não encontramos OSCs disponíveis neste raio. Tente aumentar a distância de busca.
                    </p>
                    <button
                      onClick={() => setRadiusKm(Math.min(radiusKm + 5, 50))}
                      className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      Aumentar raio para {Math.min(radiusKm + 5, 50)}km
                    </button>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* Footer */}
          {view === 'search' && selectedOsc && (
            <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
              <div className="flex justify-between items-center">
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    OSC selecionada: <span className="font-medium">{oscMatches?.find(o => o.osc_id === selectedOsc)?.osc_name}</span>
                  </p>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="favorite"
                      checked={isFavorite}
                      onChange={(e) => handleFavoriteChange(e.target.checked)}
                      className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                    />
                    <label htmlFor="favorite" className="ml-2 text-sm text-gray-700">
                      Marcar como favorita
                    </label>
                  </div>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setSelectedOsc('');
                      setIsFavorite(false);
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={createPartnershipMutation.isPending || !selectedOsc}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {createPartnershipMutation.isPending ? 'Criando...' : 'Criar Parceria'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}