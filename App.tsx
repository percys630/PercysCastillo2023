import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { 
  LayoutDashboard, 
  Users, 
  ShoppingCart, 
  Package, 
  DollarSign, 
  FileText, 
  Settings, 
  Bell,
  MapPin,
  Heart,
  TrendingUp,
  CreditCard,
  Menu,
  X,
  AlertTriangle,
  CheckCircle,
  Activity,
  Shield,
  Eye,
  Lock,
  Scale
} from 'lucide-react';

// Import your existing ERP modules
import { CRMModule } from '../components/CRMModule';
import { SalesModule } from '../components/SalesModule';
import { InventoryModule } from '../components/InventoryModule';
import { FinanceModule } from '../components/FinanceModule';
import { SettingsModule } from '../components/SettingsModule';
import { POSModule } from '../components/POSModule';
import { ReportsModule } from '../components/ReportsModule';

type UserRole = 'Owner/Admin' | 'Sales Representative' | 'Accountant/Bookkeeper' | 'Viewer Only';

interface Transaction {
  id: string;
  branch: string;
  customer: string;
  customerId?: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  total: number;
  timestamp: Date;
  cashier: string;
  paymentMethod: string;
  notes?: string;
}

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  weight: number; // in pounds
  category: string;
  totalWeight: number; // quantity * weight
}

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  price: number;
  costPrice: number;
  weight: number; // pounds per unit
  stock: Record<string, number>; // units per branch
  stockWeight: Record<string, number>; // total pounds per branch
  lowStockThreshold: number;
  supplier?: string;
  description?: string;
  expirationDates?: Record<string, Date[]>;
  createdAt: Date;
  updatedAt: Date;
  productCode?: string;
  // Enhanced fields for feed and medicine
  productType: 'feed' | 'medicine' | 'supplement' | 'equipment';
  animalTypes: string[];
  composition?: string;
  instructions?: string;
  dosage?: string;
  activeIngredients?: string;
  nutritionalInfo?: {
    protein?: number;
    fat?: number;
    fiber?: number;
    moisture?: number;
    ash?: number;
    vitamins?: string[];
    minerals?: string[];
  };
  presentation?: string; // bag, bottle, sack, etc.
  registrationNumber?: string;
  manufacturingDate?: Date;
  batchNumber?: string;
  contraindications?: string;
  storageConditions?: string;
  withdrawalPeriod?: string; // for medicines
}

interface Branch {
  id: string;
  name: string;
  address: string;
  phone?: string;
  manager?: string;
  active: boolean;
  createdAt: Date;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  address: string;
  city: string;
  department: string;
  farmType: 'small' | 'medium' | 'large' | 'commercial';
  animalTypes: string[]; // ['cattle', 'pigs', 'chickens', 'goats', etc.]
  animalCount: number;
  estimatedMonthlyRevenue: number;
  whereSeesProducts: string[]; // ['farm_store', 'veterinary', 'online', 'referral']
  taxId: string;
  assignedRep: string;
  lastContact: string;
  totalOrders: number;
  totalSpent: number;
  loyaltyPoints: number;
  preferredBranch: string;
  communicationPreference: string;
  joinDate: string;
  lastPurchase: string;
  notes: string;
  gpsCoordinates?: string;
}

interface SystemSettings {
  companyName: string;
  companyEmail: string;
  companyPhone: string;
  companyAddress: string;
  taxId: string;
  currency: string;
  dateFormat: string;
  timeZone: string;
  language: string;
  theme: string;
  discountCode: string;
}

// Nicaraguan Córdoba formatting utility
const formatCordobas = (amount: number): string => {
  return `C$ ${amount.toLocaleString('es-NI', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}`;
};

export default function App() {
  const [currentUser, setCurrentUser] = useState({
    name: 'Sarah González',
    email: 'sarah@mascotacare.com.ni',
    role: 'Owner/Admin' as UserRole,
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b96c?w=150&h=150&fit=crop&crop=face'
  });

  const [currentBranch, setCurrentBranch] = useState('Tienda Principal');
  const [activeModule, setActiveModule] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // System settings state - Make company name dynamic
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    companyName: 'MascotaCare ERP Nicaragua',
    companyEmail: 'info@mascotacare.com.ni',
    companyPhone: '(505) 2222-3333',
    companyAddress: 'Managua, Nicaragua',
    taxId: 'J0310000000000',
    currency: 'NIO',
    dateFormat: 'DD/MM/YYYY',
    timeZone: 'America/Managua',
    language: 'Español',
    theme: 'light',
    discountCode: '1234'
  });

  // Clean data structure - Start with minimal branches for you to customize
  const [branches, setBranches] = useState<Branch[]>([
    {
      id: 'branch1',
      name: 'Tienda Principal',
      address: 'Dirección de tu tienda principal',
      phone: '(505) 0000-0000',
      manager: 'Tu Nombre',
      active: true,
      createdAt: new Date('2024-01-01')
    }
  ]);

  // Clean inventory - Empty to start, you'll add products through the system
  const [inventory, setInventory] = useState<InventoryItem[]>([]);

  // Clean transactions - Real sales will populate this
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);

  // Clean customers - Will be populated through CRM
  const [customers, setCustomers] = useState<Customer[]>([]);

  // Role-based access control
  const isAdmin = useMemo(() => currentUser.role === 'Owner/Admin', [currentUser.role]);
  const isWorker = useMemo(() => currentUser.role === 'Sales Representative', [currentUser.role]);
  const canEditInventory = useMemo(() => isAdmin, [isAdmin]);
  const canEditPrices = useMemo(() => isAdmin, [isAdmin]);
  const canViewFinancials = useMemo(() => isAdmin || currentUser.role === 'Accountant/Bookkeeper', [isAdmin, currentUser.role]);

  // Computed state
  const activeBranches = useMemo(() => branches.filter(branch => branch.active), [branches]);
  const branchNames = useMemo(() => activeBranches.map(branch => branch.name), [activeBranches]);

  // User roles
  const userRoles: Record<UserRole, string[]> = useMemo(() => ({
    'Owner/Admin': ['dashboard', 'pos', 'reports', 'crm', 'sales', 'inventory', 'finance', 'settings'],
    'Sales Representative': ['dashboard', 'pos', 'inventory', 'crm'],
    'Accountant/Bookkeeper': ['dashboard', 'reports', 'finance'],
    'Viewer Only': ['dashboard', 'reports']
  }), []);

  const allowedModules = useMemo(() => userRoles[currentUser.role] || [], [userRoles, currentUser.role]);

  // Menu items
  const adminMenuItems = useMemo(() => [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'pos', label: 'Punto de Venta', icon: CreditCard },
    { id: 'inventory', label: 'Inventario', icon: Package },
    { id: 'crm', label: 'Clientes', icon: Users },
    { id: 'sales', label: 'Ventas', icon: ShoppingCart },
    { id: 'reports', label: 'Reportes', icon: FileText },
    { id: 'finance', label: 'Finanzas', icon: DollarSign },
    { id: 'settings', label: 'Configuración', icon: Settings }
  ], []);

  const workerMenuItems = useMemo(() => [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'pos', label: 'Punto de Venta', icon: CreditCard },
    { id: 'inventory', label: 'Consulta Stock', icon: Eye },
    { id: 'crm', label: 'Clientes', icon: Users }
  ], []);

  const menuItems = useMemo(() => 
    isWorker ? workerMenuItems : adminMenuItems, 
    [isWorker, workerMenuItems, adminMenuItems]
  );

  // Real analytics calculations from actual sales data
  const salesMetrics = useMemo(() => {
    const totalRevenue = allTransactions.reduce((sum, t) => sum + t.total, 0);
    const totalOrders = allTransactions.length;
    const averageOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const totalCOGS = isAdmin ? allTransactions.reduce((sum, t) => {
      return sum + t.items.reduce((itemSum, item) => {
        const inventoryItem = inventory.find(inv => inv.id === item.id);
        const costPrice = inventoryItem?.costPrice || 0;
        return itemSum + (costPrice * item.quantity);
      }, 0);
    }, 0) : 0;
    
    const grossProfit = isAdmin ? totalRevenue - totalCOGS : 0;

    const inventoryValue = isAdmin ? inventory.reduce((sum, item) => {
      const totalStock = branchNames.reduce((branchSum, branch) => 
        branchSum + (item.stock[branch] || 0), 0);
      return sum + (totalStock * item.costPrice);
    }, 0) : 0;

    const totalInventoryWeight = inventory.reduce((sum, item) => {
      const totalStock = branchNames.reduce((branchSum, branch) => 
        branchSum + (item.stock[branch] || 0), 0);
      return sum + (totalStock * item.weight);
    }, 0);

    return { 
      totalRevenue, 
      totalOrders, 
      averageOrder, 
      grossProfit, 
      inventoryValue,
      totalInventoryWeight,
      totalCOGS
    };
  }, [allTransactions, inventory, branchNames, isAdmin]);

  const branchAnalytics = useMemo(() => {
    const branchData: Record<string, any> = {};
    branchNames.forEach(branch => {
      const branchTransactions = allTransactions.filter(t => t.branch === branch);
      const branchRevenue = branchTransactions.reduce((sum, t) => sum + t.total, 0);
      const branchOrders = branchTransactions.length;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayTransactions = branchTransactions.filter(t => new Date(t.timestamp) >= today);
      const todayRevenue = todayTransactions.reduce((sum, t) => sum + t.total, 0);

      const branchInventoryWeight = inventory.reduce((sum, item) => {
        return sum + ((item.stock[branch] || 0) * item.weight);
      }, 0);

      branchData[branch] = {
        totalRevenue: branchRevenue,
        totalOrders: branchOrders,
        todayRevenue,
        todayOrders: todayTransactions.length,
        averageOrder: branchOrders > 0 ? branchRevenue / branchOrders : 0,
        inventoryWeight: branchInventoryWeight
      };
    });
    return branchData;
  }, [allTransactions, branchNames, inventory]);

  // Real alerts from actual inventory data
  const { lowStockAlerts, expirationAlerts } = useMemo(() => {
    const stockAlerts = inventory.filter(item => {
      return branchNames.some(branch => (item.stock[branch] || 0) <= item.lowStockThreshold);
    }).map(item => ({
      id: item.id,
      name: item.name,
      branches: branchNames.filter(branch => (item.stock[branch] || 0) <= item.lowStockThreshold),
      lowestStock: Math.min(...branchNames.map(branch => item.stock[branch] || 0)),
      type: 'stock'
    }));

    const expAlerts = inventory.reduce((alerts: any[], item) => {
      branchNames.forEach(branch => {
        if (item.expirationDates && item.expirationDates[branch]) {
          const expiringItems = item.expirationDates[branch].filter(date => {
            const daysUntilExpiration = Math.ceil((date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
            return daysUntilExpiration <= 20 && daysUntilExpiration > 0;
          });
          
          if (expiringItems.length > 0) {
            alerts.push({
              id: `${item.id}-${branch}`,
              name: item.name,
              branch: branch,
              daysLeft: Math.min(...expiringItems.map(date => 
                Math.ceil((date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
              )),
              type: 'expiration'
            });
          }
        }
      });
      return alerts;
    }, []);

    return { lowStockAlerts: stockAlerts, expirationAlerts: expAlerts };
  }, [inventory, branchNames]);

  // Event handlers
  const handleModuleChange = useCallback((moduleId: string) => {
    if (allowedModules.includes(moduleId)) {
      setActiveModule(moduleId);
      setIsMobileMenuOpen(false);
    } else {
      alert(`Acceso denegado. Su rol (${currentUser.role}) no tiene permisos para acceder a este módulo.`);
    }
  }, [allowedModules, currentUser.role]);

  const switchRole = useCallback(() => {
    if (currentUser.role === 'Owner/Admin') {
      setCurrentUser({
        name: 'Miguel Torres',
        email: 'miguel@mascotacare.com.ni',
        role: 'Sales Representative',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
      });
    } else {
      setCurrentUser({
        name: 'Sarah González',
        email: 'sarah@mascotacare.com.ni',
        role: 'Owner/Admin',
        avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b96c?w=150&h=150&fit=crop&crop=face'
      });
    }
    setActiveModule('dashboard');
  }, [currentUser.role]);

  // ✅ FIXED: Handler that processes transaction AND updates inventory AND customer history
  const handleNewTransaction = useCallback((transaction: Transaction) => {
    console.log('Processing transaction:', transaction);
    
    // 1. Add transaction to history
    setAllTransactions(prev => [transaction, ...prev]);
    
    // 2. ✅ CRITICAL FIX: Deduct inventory stock automatically
    setInventory(prevInventory => {
      return prevInventory.map(item => {
        const soldItem = transaction.items.find(cartItem => cartItem.id === item.id);
        if (soldItem) {
          const currentStock = item.stock[transaction.branch] || 0;
          const newStock = Math.max(0, currentStock - soldItem.quantity);
          const newStockWeight = newStock * item.weight;
          
          console.log(`Updating inventory for ${item.name}: ${currentStock} -> ${newStock} units`);
          
          return {
            ...item,
            stock: {
              ...item.stock,
              [transaction.branch]: newStock
            },
            stockWeight: {
              ...item.stockWeight,
              [transaction.branch]: newStockWeight
            },
            updatedAt: new Date()
          };
        }
        return item;
      });
    });
    
    // 3. ✅ NEW: Update customer history if customer was selected
    if (transaction.customerId) {
      setCustomers(prevCustomers => {
        return prevCustomers.map(customer => {
          if (customer.id === transaction.customerId) {
            return {
              ...customer,
              totalOrders: customer.totalOrders + 1,
              totalSpent: customer.totalSpent + transaction.total,
              lastPurchase: new Date().toLocaleDateString('es-NI'),
              lastContact: new Date().toLocaleDateString('es-NI'),
              loyaltyPoints: customer.loyaltyPoints + Math.floor(transaction.total / 100) // 1 point per C$100
            };
          }
          return customer;
        });
      });
    }
    
    console.log('Transaction processed successfully');
  }, []);

  const handleInventoryUpdate = useCallback((updatedInventory: InventoryItem[]) => {
    setInventory(updatedInventory);
  }, []);

  const handleCustomerUpdate = useCallback((updatedCustomers: Customer[]) => {
    setCustomers(updatedCustomers);
  }, []);

  const handleBranchUpdate = useCallback((updatedBranches: Branch[]) => {
    setBranches(updatedBranches);
    
    // Auto-update current branch if it was deleted or deactivated
    const currentBranchExists = updatedBranches.find(b => b.name === currentBranch && b.active);
    if (!currentBranchExists) {
      const firstActiveBranch = updatedBranches.find(b => b.active);
      if (firstActiveBranch) {
        setCurrentBranch(firstActiveBranch.name);
      }
    }
  }, [currentBranch]);

  const handleSystemSettingsUpdate = useCallback((updatedSettings: SystemSettings) => {
    setSystemSettings(updatedSettings);
    console.log('System settings updated:', updatedSettings);
  }, []);

  // Dashboard Components
  const EmptyStateDashboard = useCallback(() => (
    <div className="space-y-6">
      {/* Welcome Header */}
      <Card className="bg-gradient-to-r from-green-500 to-blue-600 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl text-white mb-2">¡Bienvenido a {systemSettings.companyName}!</h2>
              <p className="text-green-100">
                Sistema completo para distribución de alimentos y productos para animales
              </p>
              <div className="flex items-center gap-4 mt-3 text-sm text-green-100">
                <span>🌾 Manejo de inventario por peso</span>
                <span>🚚 Control multi-sucursal</span>
                <span>🐄 Segmentación por tipo de granja</span>
              </div>
            </div>
            <div className="text-right">
              <Heart className="h-12 w-12 text-green-100 mb-2" />
              <div className="text-xs text-green-100">{currentUser.role}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Setup Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Configuración Inicial del Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="p-4 text-center">
                  <Package className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <h4 className="font-medium text-blue-800">1. Agregar Productos</h4>
                  <p className="text-xs text-blue-700 mt-1">
                    Configura tu inventario de alimentos para animales
                  </p>
                  <Button 
                    size="sm" 
                    className="mt-3 bg-blue-600 hover:bg-blue-700"
                    onClick={() => setActiveModule('inventory')}
                  >
                    Ir a Inventario
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-purple-200 bg-purple-50">
                <CardContent className="p-4 text-center">
                  <Users className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                  <h4 className="font-medium text-purple-800">2. Registrar Clientes</h4>
                  <p className="text-xs text-purple-700 mt-1">
                    Agrega granjas y distribuidores a tu base de datos
                  </p>
                  <Button 
                    size="sm" 
                    className="mt-3 bg-purple-600 hover:bg-purple-700"
                    onClick={() => setActiveModule('crm')}
                  >
                    Ir a Clientes
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-green-200 bg-green-50">
                <CardContent className="p-4 text-center">
                  <CreditCard className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <h4 className="font-medium text-green-800">3. Primera Venta</h4>
                  <p className="text-xs text-green-700 mt-1">
                    Realiza tu primera transacción en el POS
                  </p>
                  <Button 
                    size="sm" 
                    className="mt-3 bg-green-600 hover:bg-green-700"
                    onClick={() => setActiveModule('pos')}
                  >
                    Abrir POS
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-orange-200 bg-orange-50">
                <CardContent className="p-4 text-center">
                  <MapPin className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                  <h4 className="font-medium text-orange-800">4. Configurar Sucursales</h4>
                  <p className="text-xs text-orange-700 mt-1">
                    Define tus ubicaciones de distribución
                  </p>
                  <Button 
                    size="sm" 
                    className="mt-3 bg-orange-600 hover:bg-orange-700"
                    onClick={() => setActiveModule('settings')}
                  >
                    Configuración
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              Control por Peso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Maneja alimentos por libras, desde sacos de 20 hasta 100 libras.
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Productos registrados:</span>
                <span className="font-medium">{inventory.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Peso total inventario:</span>
                <span className="font-medium">{salesMetrics.totalInventoryWeight.toFixed(0)} lbs</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Base de Clientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Gestiona granjas pequeñas, medianas y comerciales.
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Clientes registrados:</span>
                <span className="font-medium">{customers.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Transacciones:</span>
                <span className="font-medium">{allTransactions.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Multi-Sucursal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Control de inventario y ventas por ubicación.
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Sucursales activas:</span>
                <span className="font-medium">{activeBranches.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Sucursal actual:</span>
                <span className="font-medium">{currentBranch}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  ), [currentUser.role, inventory.length, salesMetrics.totalInventoryWeight, customers.length, allTransactions.length, activeBranches.length, currentBranch, systemSettings.companyName]);

  const PopulatedDashboard = useCallback(() => {
    const branchData = branchAnalytics[currentBranch] || {};
    const totalAlerts = lowStockAlerts.length + expirationAlerts.length;
    
    return (
      <div className="space-y-6">
        {/* Real Business Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveModule('finance')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Ingresos Totales</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">{formatCordobas(salesMetrics.totalRevenue)}</div>
              <p className="text-xs text-muted-foreground flex items-center">
                <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                Ganancia: {formatCordobas(salesMetrics.grossProfit)}
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveModule('sales')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Ventas Realizadas</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">{salesMetrics.totalOrders}</div>
              <p className="text-xs text-muted-foreground flex items-center">
                <Activity className="h-3 w-3 mr-1 text-blue-500" />
                Promedio: {formatCordobas(salesMetrics.averageOrder)}
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveModule('inventory')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Inventario Total</CardTitle>
              <Scale className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">{salesMetrics.totalInventoryWeight.toFixed(0)} lbs</div>
              <p className="text-xs text-muted-foreground flex items-center">
                <Package className="h-3 w-3 mr-1 text-purple-500" />
                Valor: {formatCordobas(salesMetrics.inventoryValue)}
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveModule('crm')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Clientes Activos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">{customers.length}</div>
              <p className="text-xs text-muted-foreground flex items-center">
                <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                {totalAlerts > 0 ? `${totalAlerts} alertas` : 'Todo bien'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Branch Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Rendimiento por Sucursal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeBranches.map((branch) => {
                const data = branchAnalytics[branch.name] || {};
                const alerts = lowStockAlerts.filter(alert => alert.branches.includes(branch.name)).length;
                
                return (
                  <div key={branch.id} className="bg-muted/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      <span className="font-medium">{branch.name}</span>
                      {alerts > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {alerts} alertas
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Ventas hoy:</span>
                        <span className="font-medium">{formatCordobas(data.todayRevenue || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total ventas:</span>
                        <span className="font-medium">{formatCordobas(data.totalRevenue || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Inventario:</span>
                        <span className="font-medium">{(data.inventoryWeight || 0).toFixed(0)} lbs</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }, [currentBranch, branchAnalytics, lowStockAlerts, expirationAlerts, salesMetrics, customers.length, activeBranches]);

  const renderDashboard = useCallback(() => {
    return allTransactions.length === 0 && inventory.length === 0 && customers.length === 0 
      ? <EmptyStateDashboard />
      : <PopulatedDashboard />;
  }, [allTransactions.length, inventory.length, customers.length, EmptyStateDashboard, PopulatedDashboard]);

  // Safe render content with error handling
  const renderContent = useCallback(() => {
    try {
      switch (activeModule) {
        case 'dashboard':
          return renderDashboard();
        case 'pos':
          return <POSModule 
            currentBranch={currentBranch} 
            userRole={currentUser.role} 
            onTransaction={handleNewTransaction}
            inventory={inventory}
            customers={customers}
          />;
        case 'reports':
          return <ReportsModule 
            transactions={allTransactions} 
            customers={customers}
            inventory={inventory}
            branches={activeBranches}
            onGenerateReport={() => {}}
            branchAnalytics={branchAnalytics}
            salesMetrics={salesMetrics}
          />;
        case 'inventory':
          return <InventoryModule 
            currentBranch={currentBranch} 
            userRole={currentUser.role}
            inventory={inventory}
            onUpdateInventory={handleInventoryUpdate}
            branches={branches}
            onUpdateBranches={handleBranchUpdate}
            purchaseOrders={[]}
            onUpdatePurchaseOrders={() => {}}
            lowStockAlerts={lowStockAlerts}
            expirationAlerts={expirationAlerts}
            canEditInventory={canEditInventory}
            canEditPrices={canEditPrices}
            canManageBranches={isAdmin}
          />;
        case 'crm':
          return <CRMModule 
            currentBranch={currentBranch} 
            userRole={currentUser.role}
            customers={customers}
            onUpdateCustomers={handleCustomerUpdate}
          />;
        case 'sales':
          return <SalesModule 
            currentBranch={currentBranch} 
            userRole={currentUser.role}
            transactions={allTransactions}
            inventory={inventory}
            customers={customers}
            branchAnalytics={branchAnalytics}
            salesMetrics={salesMetrics}
          />;
        case 'finance':
          if (!canViewFinancials) {
            return (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="h-5 w-5 text-red-500" />
                    Acceso Denegado
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Los datos financieros están restringidos solo para administradores y contadores.
                  </p>
                </CardContent>
              </Card>
            );
          }
          return <FinanceModule 
            currentBranch={currentBranch} 
            userRole={currentUser.role}
            transactions={allTransactions}
            inventory={inventory}
            customers={customers}
            salesMetrics={salesMetrics}
            accountPayables={[]}
            onUpdateAccountPayables={() => {}}
            bankDeposits={[]}
            onUpdateBankDeposits={() => {}}
            expenses={[]}
            onUpdateExpenses={() => {}}
          />;
        case 'settings':
          return <SettingsModule 
            currentBranch={currentBranch} 
            userRole={currentUser.role}
            branches={branches}
            onUpdateBranches={handleBranchUpdate}
            systemSettings={systemSettings}
            onUpdateSystemSettings={handleSystemSettingsUpdate}
          />;
        default:
          return renderDashboard();
      }
    } catch (error) {
      console.error('Error rendering module:', activeModule, error);
      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Error en Módulo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
              <h3 className="font-medium mb-2">Error Temporal</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Hubo un problema cargando el módulo {activeModule}. Intenta usar otro módulo.
              </p>
              <Button 
                onClick={() => setActiveModule('dashboard')}
                variant="outline"
              >
                Volver al Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }
  }, [activeModule, renderDashboard, currentBranch, currentUser.role, inventory, allTransactions, branchAnalytics, salesMetrics, branches, lowStockAlerts, expirationAlerts, canEditInventory, canEditPrices, isAdmin, canViewFinancials, customers, activeBranches, handleNewTransaction, handleInventoryUpdate, handleCustomerUpdate, handleBranchUpdate, systemSettings, handleSystemSettingsUpdate]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b sticky top-0 z-50">
        <div className="flex items-center justify-between h-16 px-4 md:px-6">
          <div className="flex items-center gap-2 md:gap-4">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveModule('dashboard')}>
              <Heart className="h-6 w-6 md:h-8 md:w-8 text-primary" />
              <h1 className="text-lg md:text-xl">{systemSettings.companyName}</h1>
            </div>
            
            <div className="hidden md:flex items-center gap-2 ml-8">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <select 
                value={currentBranch}
                onChange={(e) => setCurrentBranch(e.target.value)}
                className="bg-transparent border-0 outline-none text-sm cursor-pointer"
              >
                {branchNames.map(branch => (
                  <option key={branch} value={branch}>{branch}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            {/* Role Indicator */}
            <div className={`hidden md:flex items-center gap-2 px-3 py-1 rounded-full ${
              isAdmin ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
            }`}>
              {isAdmin ? <Shield className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              <span className="text-xs">
                {isAdmin ? 'Admin' : 'Vista'}
              </span>
            </div>

            <Button 
              variant="outline" 
              size="sm" 
              className="hidden md:flex text-xs"
              onClick={switchRole}
            >
              Cambiar a {currentUser.role === 'Owner/Admin' ? 'Trabajador' : 'Admin'}
            </Button>

            <Button variant="ghost" size="sm" className="relative">
              <Bell className="h-4 w-4" />
              {(lowStockAlerts.length + expirationAlerts.length) > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-destructive rounded-full text-destructive-foreground text-xs flex items-center justify-center">
                  {lowStockAlerts.length + expirationAlerts.length}
                </span>
              )}
            </Button>

            <Button 
              variant="ghost" 
              size="sm" 
              className="md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>

            <div className="hidden md:flex items-center gap-2 md:gap-3">
              <Avatar className="h-7 w-7 md:h-8 md:w-8 cursor-pointer">
                <AvatarImage src={currentUser.avatar} />
                <AvatarFallback className="text-xs">{currentUser.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
              </Avatar>
              <div className="hidden sm:block">
                <p className="text-sm">{currentUser.name}</p>
                <p className="text-xs text-muted-foreground">{currentUser.role}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-card border-t">
            <div className="p-4 space-y-2">
              <div className="mb-4">
                <label className="text-sm text-muted-foreground">Sucursal</label>
                <select 
                  value={currentBranch}
                  onChange={(e) => setCurrentBranch(e.target.value)}
                  className="w-full mt-1 p-2 border rounded-md text-sm bg-background"
                >
                  {branchNames.map(branch => (
                    <option key={branch} value={branch}>{branch}</option>
                  ))}
                </select>
              </div>

              <Button 
                variant="outline" 
                className="w-full justify-start h-12 mb-2"
                onClick={() => {
                  switchRole();
                  setIsMobileMenuOpen(false);
                }}
              >
                <Users className="h-4 w-4 mr-3" />
                <span>Cambiar a {currentUser.role === 'Owner/Admin' ? 'Trabajador' : 'Admin'}</span>
              </Button>

              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeModule === item.id;
                const isAllowed = allowedModules.includes(item.id);
                
                if (!isAllowed) return null;
                
                return (
                  <Button
                    key={item.id}
                    variant={isActive ? "secondary" : "ghost"}
                    className="w-full justify-start h-12"
                    onClick={() => handleModuleChange(item.id)}
                  >
                    <Icon className="h-4 w-4 mr-3" />
                    <span>{item.label}</span>
                  </Button>
                );
              })}
            </div>
          </div>
        )}
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden md:block w-64 bg-card border-r min-h-[calc(100vh-4rem)]">
          <nav className="p-4">
            <div className="space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeModule === item.id;
                const isAllowed = allowedModules.includes(item.id);
                
                if (!isAllowed) return null;
                
                return (
                  <Button
                    key={item.id}
                    variant={isActive ? "secondary" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => setActiveModule(item.id)}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    <span>{item.label}</span>
                    {item.id === 'inventory' && isWorker && (
                      <Eye className="h-3 w-3 ml-auto text-muted-foreground" />
                    )}
                  </Button>
                );
              })}
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6">
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl md:text-2xl capitalize">
                  {activeModule === 'pos' ? 'Sistema Punto de Venta' : 
                   activeModule === 'sales' ? 'Análisis de Ventas' : 
                   activeModule === 'inventory' && isWorker ? 'Consulta de Stock' :
                   activeModule === 'inventory' && isAdmin ? 'Gestión de Inventario' :
                   activeModule === 'reports' ? 'Reportes y Exportes' :
                   activeModule === 'finance' ? 'Análisis Financiero' :
                   activeModule === 'settings' ? 'Configuración' :
                   activeModule === 'crm' ? 'Gestión de Clientes' :
                   'Dashboard Principal'}
                </h2>
                <p className="text-muted-foreground text-sm">
                  {currentBranch} • {currentUser.role}
                  {isWorker && (
                    <span className="ml-2 text-blue-600">
                      • Solo consulta (Los administradores gestionan inventario)
                    </span>
                  )}
                  {isAdmin && (
                    <span className="ml-2 text-green-600">
                      • Control administrativo completo
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
          
          {renderContent()}
        </main>
      </div>
    </div>
  );
}