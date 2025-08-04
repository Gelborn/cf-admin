import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Heart, TrendingUp, Package, Gift } from 'lucide-react';

// Mock data
const weeklyDonations = [
  { week: 'mar. de 25', donations: 4, kilos: 3, units: 5 },
  { week: 'mar. de 25', donations: 6, kilos: 0, units: 6 },
  { week: 'mai. de 25', donations: 8, kilos: 0, units: 4 },
  { week: 'mai. de 25', donations: 5, kilos: 6, units: 6 },
  { week: 'jul. de 25', donations: 4, kilos: 5, units: 5 },
  { week: 'jul. de 25', donations: 9, kilos: 4, units: 4 },
];

const packageStatus = [
  { name: 'Pão', value: 30, color: '#3B82F6' },
  { name: 'Frutas', value: 25, color: '#10B981' },
  { name: 'Verduras', value: 20, color: '#8B5CF6' },
  { name: 'Laticínios', value: 15, color: '#F59E0B' },
  { name: 'Outros', value: 10, color: '#EF4444' },
];

const stats = [
  {
    name: 'Doações Feitas',
    value: '6',
    subtitle: 'Total realizadas',
    icon: Heart,
    color: 'bg-blue-500',
    bgColor: 'bg-blue-50',
  },
  {
    name: 'Kilos Doados',
    value: '94.2',
    subtitle: 'Em peso total',
    icon: TrendingUp,
    color: 'bg-green-500',
    bgColor: 'bg-green-50',
  },
  {
    name: 'Unidades Doadas',
    value: '420',
    subtitle: 'Total de itens',
    icon: Package,
    color: 'bg-purple-500',
    bgColor: 'bg-purple-50',
  },
  {
    name: 'Em Estoque',
    value: '1',
    subtitle: 'Pacotes prontos',
    icon: Gift,
    color: 'bg-orange-500',
    bgColor: 'bg-orange-50',
  },
];

export function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        </div>
        <div className="text-sm text-gray-600">
          Visão geral das suas doações
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                    <stat.icon className={`w-6 h-6 text-white ${stat.color.replace('bg-', 'text-')}`} />
                  </div>
                </div>
                <div className="ml-4 flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                      <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                      <p className="text-xs text-gray-500">{stat.subtitle}</p>
                    </div>
                    <div className={`w-8 h-8 ${stat.color} rounded-lg flex items-center justify-center`}>
                      <stat.icon className="w-4 h-4 text-white" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center mb-4">
            <BarChart className="w-5 h-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Atividade dos Últimos 6 Meses</h3>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyDonations}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="donations" fill="#3B82F6" name="Doações" />
                <Bar dataKey="kilos" fill="#10B981" name="Kilos" />
                <Bar dataKey="units" fill="#8B5CF6" name="Unidades" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center mt-4 space-x-6 text-sm">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
              <span className="text-gray-600">Doações</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              <span className="text-gray-600">Kilos</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-purple-500 rounded-full mr-2"></div>
              <span className="text-gray-600">Unidades</span>
            </div>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center mb-4">
            <Package className="w-5 h-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Itens Mais Doados</h3>
          </div>
          <div className="h-80 flex items-center justify-center">
            <div className="relative">
              <ResponsiveContainer width={300} height={300}>
                <PieChart>
                  <Pie
                    data={packageStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {packageStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">100%</div>
                  <div className="text-sm text-gray-500">Total</div>
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            {packageStatus.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div 
                    className="w-3 h-3 rounded-full mr-3"
                    style={{ backgroundColor: item.color }}
                  ></div>
                  <span className="text-sm text-gray-600">{item.name}</span>
                </div>
                <span className="text-sm font-medium text-gray-900">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}