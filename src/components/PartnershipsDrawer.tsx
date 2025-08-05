import { X } from 'lucide-react';

interface Restaurant {
  id: string;
  name: string;
  email?: string;
  phone?: string | null;
  address_full?: string | null;
  street?: string | null;
  number?: string | null;
  city?: string | null;
  uf?: string | null;
  cep?: string | null;
  lat?: number;
  lng?: number;
  status?: 'active' | 'inactive' | 'invite_sent';
  added_at?: string;
  updated_at?: string;
}

interface PartnershipsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  restaurant: Restaurant | null;
}

export function PartnershipsDrawer({ isOpen, onClose, restaurant }: PartnershipsDrawerProps) {
  if (!isOpen || !restaurant) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-md h-full bg-white shadow-xl overflow-y-auto">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">Parcerias - {restaurant.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4">
          <p className="text-sm text-gray-600">
            Detalhes das parcerias para {restaurant.name} serão exibidos aqui.
          </p>
        </div>
      </div>
    </div>
  );
}

