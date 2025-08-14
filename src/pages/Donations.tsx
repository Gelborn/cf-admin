import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Package,
  Clock,
  CheckCircle,
  AlertCircle,
  MapPin,
  Calendar,
  Timer,
  Building2,
  Heart,
  Truck,
  Scale,
  TrendingUp,
  XCircle,
  Users
} from 'lucide-react';
import { supabase } from '../lib/supabase';

/* ------------------------------------------------------------------ */
/* Tipos                                                               */
/* ------------------------------------------------------------------ */
type DonationCounters = {
  total_donations_done: number;
  total_kg_donated: string;
  total_ongoing_donations: number;
  total_ongoing_kgs: string;
  total_discarded_kgs: string;
};

type DonationIntent = {
  id: string;
  status: 'waiting_response' | 'accepted' | 'denied' | 'expired' | 're_routed';
  created_at: string;
  updated_at: string;
  expires_at: string | null;
};

type PackageInfo = {
  id: string;
  quantity: number;
  total_kg: number;
  expires_at: string;
  label_code: string;
  status: string;
  item: {
    id: string;
    name: string;
    description: string;
  };
};

type OngoingDonation = {
  donation_id: string;
  donation_status: 'pending' | 'accepted' | 'denied' | 'released' | 'picked_up';
  created_at: string;
  pickup_deadline_at: string | null;
  accepted_at: string | null;
  released_at: string | null;
  picked_up_at: string | null;
  restaurant_id: string;
  restaurant_name: string;
  restaurant_email: string;
  restaurant_phone: string | null;
  osc_id: string;
  osc_name: string;
  osc_phone: string;
  osc_email: string | null;
  distance_km: number;
  donation_intents: DonationIntent[];
  packages: PackageInfo[];
};

/* ------------------------------------------------------------------ */
/* Hooks                                                               */
/* ------------------------------------------------------------------ */
function useDonationCounters() {
  return useQuery<DonationCounters>({
    queryKey: ['admin', 'donation-counters'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_admin_donation_counters')
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    staleTime: 60_000, // 1 min
  });
}

function useOngoingDonations() {
  return useQuery<OngoingDonation[]>({
    queryKey: ['admin', 'ongoing-donations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_admin_donations_ongoing')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    staleTime: 30_000,
  });
}

/* ------------------------------------------------------------------ */
/* Componente Principal                                                */
/* ------------------------------------------------------------------ */
export function Donations() {
  const { data: counters, isLoading: loadingCounters } = useDonationCounters();
  const { data: donations, isLoading: loadingDonations } = useOngoingDonations();

  if (loadingCounters) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600" />
      </div>
    );
  }

  const pendingDonations = donations?.filter(d => d.donation_status === 'pending') || [];
  const acceptedDonations = donations?.filter(d => d.donation_status === 'accepted') || [];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-full mx-auto">
        {/* ---------- HEADER ---------- */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Doações</h1>
          <p className="text-lg text-gray-600">
            Acompanhe o fluxo de doações da plataforma
          </p>
        </div>

        {/* ---------- STAT CARDS ---------- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            icon={<CheckCircle className="h-8 w-8 text-green-600" />}
            label="Total de Doações"
            value={counters?.total_donations_done ?? 0}
            subtitle={`${counters?.total_kg_donated ?? '0'} kg doados`}
            bgColor="bg-green-100"
            textColor="text-green-600"
          />
          <StatCard
            icon={<Clock className="h-8 w-8 text-blue-600" />}
            label="Doações em Andamento"
            value={counters?.total_ongoing_donations ?? 0}
            subtitle={`${counters?.total_ongoing_kgs ?? '0'} kg em processo`}
            bgColor="bg-blue-100"
            textColor="text-blue-600"
          />
          <StatCard
            icon={<XCircle className="h-8 w-8 text-red-600" />}
            label="Total Descartado"
            value={`${counters?.total_discarded_kgs ?? '0'} kg`}
            subtitle="Alimentos não aproveitados"
            bgColor="bg-red-100"
            textColor="text-red-600"
          />
        </div>

        {/* ---------- DOAÇÕES PENDENTES ---------- */}
        {pendingDonations.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center mr-4">
                <AlertCircle className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Aguardando Aceite da OSC ({pendingDonations.length})
                </h2>
                <p className="text-gray-600">Doações que ainda precisam ser aceitas pelas OSCs</p>
              </div>
            </div>
            <div className="grid gap-6">
              {pendingDonations.map((donation) => (
                <DonationCard key={donation.donation_id} donation={donation} />
              ))}
            </div>
          </div>
        )}

        {/* ---------- DOAÇÕES ACEITAS ---------- */}
        {acceptedDonations.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mr-4">
                <Truck className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Aguardando Coleta ({acceptedDonations.length})
                </h2>
                <p className="text-gray-600">Doações aceitas aguardando retirada</p>
              </div>
            </div>
            <div className="grid gap-6">
              {acceptedDonations.map((donation) => (
                <DonationCard key={donation.donation_id} donation={donation} />
              ))}
            </div>
          </div>
        )}

        {/* ---------- EMPTY STATE ---------- */}
        {loadingDonations ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : (!pendingDonations.length && !acceptedDonations.length) && (
          <EmptyDonationsState />
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Card de Doação                                                      */
/* ------------------------------------------------------------------ */
interface DonationCardProps {
  donation: OngoingDonation;
}

function DonationCard({ donation }: DonationCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTimeRemaining = () => {
    if (donation.donation_status === 'pending') {
      const waitingIntent = donation.donation_intents.find(i => i.status === 'waiting_response');
      if (waitingIntent?.expires_at) {
        const expiresAt = new Date(waitingIntent.expires_at);
        const now = new Date();
        const diffMs = expiresAt.getTime() - now.getTime();
        
        if (diffMs <= 0) return { text: 'Expirado', color: 'text-red-600', urgent: true };
        
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        
        const urgent = hours < 2;
        return {
          text: `${hours}h ${minutes}min restantes`,
          color: urgent ? 'text-red-600' : 'text-yellow-600',
          urgent
        };
      }
    } else if (donation.donation_status === 'accepted' && donation.pickup_deadline_at) {
      const deadlineAt = new Date(donation.pickup_deadline_at);
      const now = new Date();
      const diffMs = deadlineAt.getTime() - now.getTime();
      
      if (diffMs <= 0) return { text: 'Prazo vencido', color: 'text-red-600', urgent: true };
      
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      
      const urgent = hours < 4;
      return {
        text: `${hours}h ${minutes}min para coleta`,
        color: urgent ? 'text-red-600' : 'text-blue-600',
        urgent
      };
    }
    
    return null;
  };

  const timeInfo = getTimeRemaining();
  const totalKg = donation.packages.reduce((sum, pkg) => sum + pkg.total_kg, 0);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Doação #{donation.donation_id.slice(-8)}
              </h3>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  Criada em {formatDate(donation.created_at)}
                </div>
                <StatusBadge status={donation.donation_status} />
              </div>
            </div>
          </div>
          
          {timeInfo && (
            <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
              timeInfo.urgent ? 'bg-red-100' : 'bg-yellow-100'
            }`}>
              <Timer className={`h-4 w-4 ${timeInfo.color}`} />
              <span className={`text-sm font-medium ${timeInfo.color}`}>
                {timeInfo.text}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Restaurante e OSC */}
          <div className="lg:col-span-2 space-y-6">
            {/* Fluxo Restaurante -> OSC */}
            <div className="flex items-center space-x-4">
              <RestaurantInfo 
                name={donation.restaurant_name}
                email={donation.restaurant_email}
                phone={donation.restaurant_phone}
              />
              
              <div className="flex-shrink-0 flex flex-col items-center">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mb-1">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                </div>
                {donation.distance_km && (
                  <span className="text-xs text-gray-500">{parseFloat(donation.distance_km).toFixed(1)} km</span>
                )}
              </div>
              
              <OSCInfo 
                name={donation.osc_name}
                email={donation.osc_email}
                phone={donation.osc_phone}
              />
            </div>

            {/* Timeline dos Intents */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                <Clock className="h-4 w-4 mr-2 text-blue-500" />
                Histórico da Doação
              </h4>
              <IntentTimeline intents={donation.donation_intents} />
            </div>
          </div>

          {/* Pacotes */}
          <div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-medium text-gray-900 flex items-center">
                  <Scale className="h-4 w-4 mr-2 text-green-500" />
                  Pacotes ({donation.packages.length})
                </h4>
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900">{totalKg.toFixed(1)} kg</div>
                  <div className="text-xs text-gray-500">Total</div>
                </div>
              </div>
              
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {donation.packages.map((pkg) => (
                  <PackageItem key={pkg.id} package={pkg} />
                ))}
              </div>
            </div>
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
  subtitle,
  bgColor,
  textColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  subtitle: string;
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
        <p className="text-2xl font-bold text-gray-900">{typeof value === 'number' ? value.toLocaleString() : value}</p>
        <p className="text-sm text-gray-600">{subtitle}</p>
      </div>
    </div>
  </div>
);

const StatusBadge = ({ status }: { status: string }) => {
  const statusMap = {
    pending: { color: 'yellow', label: 'Aguardando Aceite' },
    accepted: { color: 'blue', label: 'Aceita - Aguardando Coleta' },
    released: { color: 'green', label: 'Liberada' },
    picked_up: { color: 'green', label: 'Coletada' },
    denied: { color: 'red', label: 'Negada' },
  }[status] || { color: 'gray', label: status };

  return (
    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-${statusMap.color}-100 text-${statusMap.color}-800`}>
      {statusMap.label}
    </span>
  );
};

const RestaurantInfo = ({ name, email, phone }: { name: string; email: string; phone: string | null }) => (
  <div className="flex items-center space-x-3 bg-blue-50 rounded-lg p-4 flex-1">
    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
      <Users className="h-5 w-5 text-blue-600" />
    </div>
    <div className="min-w-0 flex-1">
      <h5 className="font-medium text-gray-900 truncate">{name}</h5>
      <div className="text-sm text-gray-600 space-y-1">
        <div className="flex items-center">
          <span className="truncate">{email}</span>
        </div>
        {phone && (
          <div className="flex items-center">
            <span>{phone}</span>
          </div>
        )}
      </div>
    </div>
  </div>
);

const OSCInfo = ({ name, email, phone }: { name: string; email: string | null; phone: string }) => (
  <div className="flex items-center space-x-3 bg-green-50 rounded-lg p-4 flex-1">
    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
      <Heart className="h-5 w-5 text-green-600" />
    </div>
    <div className="min-w-0 flex-1">
      <h5 className="font-medium text-gray-900 truncate">{name}</h5>
      <div className="text-sm text-gray-600 space-y-1">
        {email && (
          <div className="flex items-center">
            <span className="truncate">{email}</span>
          </div>
        )}
        <div className="flex items-center">
          <span>{phone}</span>
        </div>
      </div>
    </div>
  </div>
);

const IntentTimeline = ({ intents }: { intents: DonationIntent[] }) => {
  const sortedIntents = [...intents].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const getIntentIcon = (status: string) => {
    switch (status) {
      case 'waiting_response': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'accepted': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'denied': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'expired': return <AlertCircle className="h-4 w-4 text-gray-500" />;
      case 're_routed': return <TrendingUp className="h-4 w-4 text-blue-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getIntentLabel = (status: string) => {
    switch (status) {
      case 'waiting_response': return 'Aguardando resposta';
      case 'accepted': return 'Aceita pela OSC';
      case 'denied': return 'Negada pela OSC';
      case 'expired': return 'Expirada';
      case 're_routed': return 'Redirecionada';
      default: return status;
    }
  };

  return (
    <div className="space-y-3">
      {sortedIntents.map((intent, index) => (
        <div key={intent.id} className="flex items-center space-x-3">
          <div className="flex-shrink-0 w-8 h-8 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center">
            {getIntentIcon(intent.status)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900">
                {getIntentLabel(intent.status)}
              </span>
              <span className="text-xs text-gray-500">
                {new Date(intent.updated_at).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const PackageItem = ({ package: pkg }: { package: PackageInfo }) => {
  const isExpiringSoon = () => {
    const expiresAt = new Date(pkg.expires_at);
    const now = new Date();
    const diffDays = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 2;
  };

  const formatExpiryDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
    });
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h6 className="text-sm font-medium text-gray-900 truncate">{pkg.item.name}</h6>
          <p className="text-xs text-gray-500">{pkg.item.description}</p>
          <p className="text-xs text-gray-400 mt-1">Código: {pkg.label_code}</p>
        </div>
        <div className="text-right flex-shrink-0 ml-2">
          <div className="text-sm font-bold text-gray-900">{pkg.total_kg.toFixed(1)} kg</div>
          <div className="text-xs text-gray-500">
            {pkg.quantity} unidades
          </div>
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">
          Validade: {formatExpiryDate(pkg.expires_at)}
        </span>
        {isExpiringSoon() && (
          <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
            <AlertCircle className="h-3 w-3 mr-1" />
            Vencendo
          </span>
        )}
      </div>
    </div>
  );
};

const EmptyDonationsState = () => (
  <div className="text-center py-16">
    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
      <Package className="w-8 h-8 text-gray-400" />
    </div>
    <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma doação em andamento</h3>
    <p className="text-gray-500 max-w-sm mx-auto">
      Quando houver doações pendentes ou aguardando coleta, elas aparecerão aqui.
    </p>
  </div>
);