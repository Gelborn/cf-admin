import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { X, Search, MapPin, TrendingUp, TrendingDown } from 'lucide-react';
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

interface NewPartnershipModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurantId: string | null;
}

export function NewPartnershipModal({ isOpen, onClose, restaurantId }: NewPartnershipModalProps) {
  const { session } = useAuth();
  const [step, setStep] = useState<'search' | 'select'>('search');
  const [radiusKm, setRadiusKm] = useState(5);
  const [selectedOscs, setSelectedOscs] = useState<Set<string>>(new Set());
  const [favoriteOsc, setFavoriteOsc] = useState<string>('');

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
    enabled: false, // Only run when explicitly called
  });

  const createPartnershipsMutation = useMutation<void, FunctionsError, void>({
    mutationFn: async () => {
      if (!restaurantId) throw new Error('Restaurant ID is required');
      const headers = {
        Authorization: `Bearer ${session?.access_token}`,
      };

      const requests = Array.from(selectedOscs).map((oscId) =>
        supabase.functions
          .invoke('cf_create_partnership', {
            body: {
              restaurant_id: restaurantId,
              osc_id: oscId,
              is_favorite: oscId === favoriteOsc,
            },
            headers,
          })
          .then(({ error }) => {
            if (error) throw error;
          })
      );

      const results = await Promise.allSettled(requests);
      const errors = results.filter(
        (result): result is PromiseRejectedResult => result.status === 'rejected'
      );

      if (errors.length > 0) {
        throw new Error(
          errors.map((e) => e.reason?.message || e.reason || '').join('; ')
        );
      }
    },
    onSuccess: () => {
      toast.success('Parcerias criadas com sucesso!');
      handleClose();
    },
    onError: (error: FunctionsError) => {
      toast.error(error.message || 'Erro ao criar parcerias');
    },
  });

  const handleSearch = () => {
    searchOscs();
    setStep('select');
  };

  const handleOscToggle = (oscId: string) => {
    const newSelected = new Set(selectedOscs);
    if (newSelected.has(oscId)) {
      newSelected.delete(oscId);
      // If removing the favorite, clear it
      if (favoriteOsc === oscId) {
        setFavoriteOsc('');
      }
    } else {
      newSelected.add(oscId);
    }
    setSelectedOscs(newSelected);
  };

  const handleFavoriteChange = (oscId: string) => {
    setFavoriteOsc(oscId);
    // Ensure the favorite is also selected
    if (!selectedOscs.has(oscId)) {
      setSelectedOscs(new Set([...selectedOscs, oscId]));
    }
  };

  const handleClose = () => {
    setStep('search');
    setRadiusKm(5);
    setSelectedOscs(new Set());
    setFavoriteOsc('');
    onClose();
  };

  const handleSave = () => {
    if (selectedOscs.size === 0) {
      toast.error('Selecione pelo menos uma OSC');
      return;
    }
    createPartnershipsMutation.mutate();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={handleClose} />

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Nova Parceria</h3>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {step === 'search' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Raio de busca (km)
                  </label>
                  <div className="flex items-center space-x-4">
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={radiusKm}
                      onChange={(e) => setRadiusKm(Number(e.target.value))}
                      className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      onClick={handleSearch}
                      disabled={isSearching}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Search className="w-4 h-4 mr-2" />
                      {isSearching ? 'Buscando...' : 'Buscar OSCs'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {step === 'select' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-md font-medium text-gray-900">
                    OSCs encontradas ({oscMatches?.length || 0})
                  </h4>
                  <button
                    onClick={() => setStep('search')}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    ← Voltar à busca
                  </button>
                </div>

                {oscMatches && oscMatches.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Favorita
                          </th>
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
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {oscMatches.map((osc) => (
                          <tr key={osc.osc_id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <input
                                type="radio"
                                name="favorite"
                                checked={favoriteOsc === osc.osc_id}
                                onChange={() => handleFavoriteChange(osc.osc_id)}
                                className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300"
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <input
                                type="checkbox"
                                checked={selectedOscs.has(osc.osc_id)}
                                onChange={() => handleOscToggle(osc.osc_id)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
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
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">
                      {isSearching ? 'Buscando OSCs...' : 'Nenhuma OSC encontrada no raio especificado'}
                    </p>
                  </div>
                )}

                {oscMatches && oscMatches.length > 0 && (
                  <div className="flex justify-end space-x-3 pt-4 border-t">
                    <button
                      onClick={handleClose}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={createPartnershipsMutation.isPending || selectedOscs.size === 0}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {createPartnershipsMutation.isPending ? 'Salvando...' : `Salvar (${selectedOscs.size})`}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}