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
  Building2,
  Search,
  User,
  Calendar,
  Heart,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { OSCModal } from '../components/OSCModal';
import toast from 'react-hot-toast';

/* ------------------------------------------------------------------ */
/* Tipos                                                               */
/* ------------------------------------------------------------------ */
interface OSC {
  id: string;
  name: string;
  cnpj?: string;
  email?: string;
  phone: string;
  responsible_name?: string;
  street?: string;
  number?: string;
  city?: string;
  uf?: string;
  cep?: string;
  status: 'active' | 'inactive' | 'invite_sent';
  added_at: string;
  updated_at: string;
}

interface CreateOSCPayload {
  name: string;
  cnpj?: string;
  email?: string;
  cep: string;
  number: string;
  street?: string;
  city?: string;
  uf?: string;
  responsible_name: string;
  phone?: string;
}

/* ------------------------------------------------------------------ */
/* Componente                                                          */
/* ------------------------------------------------------------------ */
export function OSCs() {
  const { session } = useAuth();
  const qc = useQueryClient();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  /* ----------------------- Query: lista ----------------------- */
  const { data: oscs, isLoading } = useQuery<OSC[]>({
    queryKey: ['oscs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('osc')
        .select('*')
        .order('added_at', { ascending: false });

      if (error) throw error;
      return data as OSC[];
    },
  });

  /* ---------------------- Mutation: create -------------------- */
  const createOSCMutation = useMutation({
    mutationFn: async (payload: CreateOSCPayload) => {
      try {
        const { error } = await supabase.functions.invoke('cf_create_osc', {
          body: payload,
          headers: { Authorization: `Bearer ${session?.access_token}` },
        });

        if (error) {
          throw { status: error.status ?? 500, message: error.message };
        }

        return {};
      } catch (rawErr: any) {
        const resp: Response | undefined =
          rawErr?.response ?? rawErr?.context?.response;

        const status = resp?.status ?? rawErr?.status ?? 500;
        let message = rawErr?.message ?? 'Erro desconhecido';

        if (resp) {
          try { message = await resp.text(); } catch {/* ignore */}
        }
        throw { status, message };
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['oscs'] });
      toast.success('OSC criada com sucesso!');
      setIsModalOpen(false);
    },
  });

  /* helper para o modal (async) */
  const handleCreateOSC = (data: CreateOSCPayload) =>
    createOSCMutation.mutateAsync(data);

  /* filtrar OSCs por busca */
  const filteredOSCs = oscs?.filter(osc =>
    osc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    osc.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    osc.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    osc.responsible_name?.toLowerCase().includes(searchTerm.toLowerCase())
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
            <h1 className="text-3xl font-bold text-gray-900">OSCs</h1>
            <p className="mt-2 text-gray-600">
              Gerencie as organizações sociais cadastradas na plataforma
            </p>
          </div>
          <button
            onClick={() => {
              createOSCMutation.reset();
              setIsModalOpen(true);
            }}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova OSC
          </button>
        </div>

        {/* ---------- STAT CARDS ---------- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            icon={<Building2 className="h-8 w-8 text-green-600" />}
            label="Total de OSCs"
            value={filteredOSCs?.length ?? 0}
          />
          <StatCard
            icon={<Heart className="h-8 w-8 text-red-600" />}
            label="Inativas"
            value={filteredOSCs?.filter(o => o.status === 'inactive').length ?? 0}
          />
        </div>

        {/* ---------- TABLE ---------- */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Lista de OSCs</h2>
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar por nome, email, cidade ou responsável..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-80 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            </div>
          </div>

          <div>
            <table className="w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                {['OSC & Contato', 'Responsável', 'Endereço', 'Status', 'Adicionado em'].map(h => (
                  <th
                    key={h}
                    className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOSCs?.map((osc) => (
                  <tr key={osc.id} className="hover:bg-gray-50">
                    {/* OSC & Contato */}
                    <td className="px-6 py-6">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-green-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{osc.name}</div>
                          <div className="mt-1 space-y-1">
                            {osc.email && (
                              <div className="flex items-center text-sm text-gray-600">
                                <Mail className="h-3 w-3 mr-2 text-gray-400" />
                                {osc.email}
                              </div>
                            )}
                            {osc.phone && (
                              <div className="flex items-center text-sm text-gray-600">
                                <Phone className="h-3 w-3 mr-2 text-gray-400" />
                                {osc.phone}
                              </div>
                            )}
                            {osc.cnpj && (
                              <div className="text-sm text-gray-500">
                                CNPJ: {osc.cnpj}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Responsável */}
                    <td className="px-6 py-6">
                      {osc.responsible_name ? (
                        <div className="flex items-center text-sm text-gray-900">
                          <User className="h-4 w-4 mr-2 text-gray-400" />
                          {osc.responsible_name}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">Não informado</span>
                      )}
                    </td>

                    {/* Endereço */}
                    <td className="px-6 py-6">
                      {osc.city && osc.uf ? (
                        <div>
                          <div className="flex items-center text-sm text-gray-900 mb-1">
                            <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                            {osc.city}, {osc.uf}
                          </div>
                          <div className="text-sm text-gray-500 ml-6">
                            {osc.street && osc.number && `${osc.street}, ${osc.number}`}
                            {osc.cep && ` • CEP: ${osc.cep}`}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">Endereço não informado</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-6 py-6">
                      <StatusPill status={osc.status} />
                    </td>

                    {/* Adicionado em */}
                    <td className="px-6 py-6">
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="h-3 w-3 mr-1" />
                        {new Date(osc.added_at).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Empty state */}
          {(!filteredOSCs || filteredOSCs.length === 0) && (
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
                createOSCMutation.reset();
                setIsModalOpen(true);
              }} />
            )
          )}
        </div>
      </div>

      {/* ---------- MODAL ---------- */}
      <OSCModal
        isOpen={isModalOpen}
        onClose={() => {
          createOSCMutation.reset();
          setIsModalOpen(false);
        }}
        onSubmit={handleCreateOSC}
        isLoading={createOSCMutation.isPending}
      />
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

const StatusPill = ({ status }: { status: OSC['status'] }) => {
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
    <Building2 className="mx-auto h-12 w-12 text-gray-400" />
    <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhuma OSC</h3>
    <p className="mt-1 text-sm text-gray-500">
      Comece criando uma nova organização social.
    </p>
    <div className="mt-6">
      <button
        onClick={onAdd}
        className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
      >
        <Plus className="h-4 w-4 mr-2" />
        Nova OSC
      </button>
    </div>
  </div>
);