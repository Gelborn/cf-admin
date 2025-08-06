import { Outlet } from 'react-router-dom';
import { LogOut, LayoutDashboard, Store, Heart } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Link, useLocation } from 'react-router-dom';

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

        <div className="absolute bottom-0 w-64 p-4 border-t border-gray-100">
          <button
            onClick={signOut}
            className="flex items-center w-full px-4 py-3 text-sm font-medium text-gray-600 rounded-xl hover:bg-red-50 hover:text-red-600 transition-all duration-200 group"
          >
            <LogOut className="mr-3 h-5 w-5 text-gray-400 group-hover:text-red-500 transition-colors" />
            Sair
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  );
}