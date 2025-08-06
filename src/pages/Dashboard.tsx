import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Users, 
  Building2, 
  Heart, 
  Calendar,
  TrendingUp,
  CheckCircle,
  XCircle,
  Package
} from 'lucide-react';
import { supabase } from '../lib/supabase';

/* ------------------------------------------------------------------ */
/* Tipos                                                               */
/* ------------------------------------------------------------------ */
type AdminCounters = {
  total_restaurants: number;
  total_oscs: number;
  total_partnerships: number;
};

type FeedItem = {
  event_at: string;  // ISO
  event_type: 'new_partnership' | 'donation_accepted' | 'donation_denied' | 'donation_picked_up';
  description: string;
};

/* ------------------------------------------------------------------ */
/* Hooks                                                               */
/* ------------------------------------------------------------------ */
function useAdminCounters() {
  return useQuery<AdminCounters>({
    queryKey: ['admin', 'counters'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_admin_counters')
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    staleTime: 60_000, // 1 min
  });
}

function useAdminFeed() {
  return useQuery<FeedItem[]>({
    queryKey: ['admin', 'feed'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_admin_recent_activity')
        .select('*')
        .order('event_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    staleTime: 30_000,
  });
}

/* ------------------------------------------------------------------ */
/* Componente Principal                                                */
/* ------------------------------------------------------------------ */
export function Dashboard() {
  const { data: counters, isLoading: loadingCounters } = useAdminCounters();
  const { data: feed, isLoading: loadingFeed } = useAdminFeed();

  if (loadingCounters) {
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
        <div className="mb-8">
          <div className="mb-4">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Bem-vindo, Administrador! 👋</h1>
            <p className="text-lg text-gray-600">
              Aqui está um resumo da sua plataforma Connecting Food
            </p>
          </div>
        </div>

        {/* ---------- QUICK STATS OVERVIEW ---------- */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 mb-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold mb-2">Visão Geral da Plataforma</h2>
              <p className="text-blue-100">
                Conectando restaurantes e organizações sociais para reduzir o desperdício
              </p>
            </div>
            <div className="hidden md:block">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                <Heart className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* ---------- HEADER CONTINUATION ---------- */}
        <div className="mb-8">
          <p className="mt-2 text-gray-600">
            Estatísticas em tempo real
          </p>
        </div>

        {/* ---------- STAT CARDS ---------- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            icon={<Users className="h-8 w-8 text-blue-600" />}
            label="Total de Restaurantes"
            value={counters?.total_restaurants ?? 0}
            bgColor="bg-blue-100"
            textColor="text-blue-600"
          />
          <StatCard
            icon={<Building2 className="h-8 w-8 text-green-600" />}
            label="Total de OSCs"
            value={counters?.total_oscs ?? 0}
            bgColor="bg-green-100"
            textColor="text-green-600"
          />
          <StatCard
            icon={<Heart className="h-8 w-8 text-red-600" />}
            label="Total de Parcerias"
            value={counters?.total_partnerships ?? 0}
            bgColor="bg-red-100"
            textColor="text-red-600"
          />
        </div>

        {/* ---------- FEED DE ATIVIDADES ---------- */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <Calendar className="h-5 w-5 text-blue-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Atividades Recentes</h2>
            </div>
          </div>

          <div className="divide-y divide-gray-200">
            {loadingFeed ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              </div>
            ) : feed && feed.length > 0 ? (
              feed.map((item, index) => (
                <FeedItemComponent key={index} item={item} />
              ))
            ) : (
              <EmptyFeedState />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-componentes                                                     */
/* ------------------------------------------------------------------ */
const StatCard = ({
  icon,
  label,
  value,
  bgColor,
  textColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  bgColor: string;
  textColor: string;
}) => (
  <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
    <div className="flex items-center">
      <div className={`flex-shrink-0 w-12 h-12 ${bgColor} rounded-lg flex items-center justify-center`}>
        {icon}
      </div>
      <div className="ml-4">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
      </div>
    </div>
  </div>
);

const FeedItemComponent = ({ item }: { item: FeedItem }) => {
  const getEventIcon = (eventType: FeedItem['event_type']) => {
    switch (eventType) {
      case 'new_partnership':
        return <Heart className="h-5 w-5 text-blue-500" />;
      case 'donation_accepted':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'donation_denied':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'donation_picked_up':
        return <Package className="h-5 w-5 text-purple-500" />;
      default:
        return <Calendar className="h-5 w-5 text-gray-500" />;
    }
  };

  const getEventColor = (eventType: FeedItem['event_type']) => {
    switch (eventType) {
      case 'new_partnership':
        return 'bg-blue-50 border-blue-200';
      case 'donation_accepted':
        return 'bg-green-50 border-green-200';
      case 'donation_denied':
        return 'bg-red-50 border-red-200';
      case 'donation_picked_up':
        return 'bg-purple-50 border-purple-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const formatEventTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `${diffMinutes}min atrás`;
    } else if (diffHours < 24) {
      return `${diffHours}h atrás`;
    } else if (diffDays < 7) {
      return `${diffDays}d atrás`;
    } else {
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    }
  };

  return (
    <div className="px-6 py-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-start space-x-4">
        <div className={`flex-shrink-0 w-10 h-10 rounded-full border-2 ${getEventColor(item.event_type)} flex items-center justify-center`}>
          {getEventIcon(item.event_type)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-900 leading-relaxed">
            {item.description}
          </p>
          <div className="mt-1 flex items-center text-xs text-gray-500">
            <Calendar className="h-3 w-3 mr-1" />
            {formatEventTime(item.event_at)}
          </div>
        </div>
      </div>
    </div>
  );
};

const EmptyFeedState = () => (
  <div className="text-center py-16">
    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
      <TrendingUp className="w-8 h-8 text-gray-400" />
    </div>
    <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma atividade recente</h3>
    <p className="text-gray-500 max-w-sm mx-auto">
      As atividades da plataforma aparecerão aqui conforme acontecem.
    </p>
  </div>
);