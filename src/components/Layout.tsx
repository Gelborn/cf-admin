import { Outlet } from 'react-router-dom';
import { LogOut, LayoutDashboard, Store, Heart } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export function Layout() {
  const signOut = async () => {
    setUser(null);
    setSession(null);
    setIsCfUser(false);
    localStorage.removeItem('isCfUser');
    try {
      await supabase.auth.updateUser({ data: { is_cf: null } });
    } finally {
      await supabase.auth.signOut({ scope: 'local' });
    }
  };
  
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Restaurantes', href: '/restaurants', icon: Store },
    { name: 'OSCs', href: '/oscs', icon: Heart },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-sm border-r border-gray-200">
        <div className="p-6">
          <img 
            src="https://connectingfood.com/wp-content/uploads/2023/05/logo-CF.png" 
            alt="Connecting Food" 
            className="h-8 w-auto"
          />
        </div>
        
        <nav className="mt-8">
          <div className="px-3">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`
                    group flex items-center px-3 py-2 text-sm font-medium rounded-md mb-1
                    ${isActive 
                      ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }
                  `}
                >
                  <item.icon
                    className={`
                      mr-3 h-5 w-5
                      ${isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'}
                    `}
                  />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="absolute bottom-0 w-64 p-4">
          <button
            onClick={signOut}
            className="flex items-center w-full px-3 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900"
          >
            <LogOut className="mr-3 h-5 w-5 text-gray-400" />
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

function setUser(arg0: null) {
  throw new Error('Function not implemented.');
}


function setSession(arg0: null) {
  throw new Error('Function not implemented.');
}


function setIsCfUser(arg0: boolean) {
  throw new Error('Function not implemented.');
}
