import { Outlet } from 'react-router-dom';
import { LogOut, LayoutDashboard, Store, Heart } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Link, useLocation } from 'react-router-dom';

function LogoutButton({ onSignOut }: { onSignOut: () => void }) {
  const { user } = useAuth();
  
  return (
    <div className="fixed bottom-6 left-6 z-50">
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 max-w-xs">
        <div className="flex items-start space-x-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
            <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">
                {user?.email?.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-900 mb-1">
              Você está logado como:
            </p>
            <p className="text-xs text-gray-600 truncate mb-3">
              {user?.email}
            </p>
            <button
              onClick={onSignOut}
              className="flex items-center w-full px-3 py-2 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-all duration-200 group"
            >
              <LogOut className="mr-2 h-3 w-3 group-hover:text-red-700 transition-colors" />
              Sair da conta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Layout() {
  const { signOut } = useAuth();
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Restaurantes', href: '/restaurants', icon: Store },
    { name: 'OSCs', href: '/oscs', icon: Heart },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg border-r border-gray-200">
        <div className="p-6 border-b border-gray-100">
          <img 
            src="https://connectingfood.com/wp-content/uploads/2023/05/logo-CF.png" 
            alt="Connecting Food" 
            className="h-8 w-auto mb-2"
          />
          <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">
            Plataforma do Administrador
          </p>
        </div>
        
        <nav className="mt-6">
          <div className="px-4">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`
                    group flex items-center px-4 py-3 text-sm font-medium rounded-xl mb-2 transition-all duration-200
                    ${isActive 
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:shadow-sm'
                    }
                  `}
                >
                  <item.icon
                    className={`
                      mr-3 h-5 w-5 transition-colors
                      ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'}
                    `}
                  />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1">
        <Outlet />
      </div>

      {/* Fixed logout button */}
      <LogoutButton onSignOut={signOut} />
    </div>
  );
}