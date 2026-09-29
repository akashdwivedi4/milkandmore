const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

class ApiService {
  private token: string | null = null;
  private role: string | null = null;

  setAuth(token: string | null, role: string | null = null) {
    this.token = token;
    this.role = role;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('auth_token');
    }
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    idempotencyKey?: string
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    const currentToken = this.getToken();
    if (currentToken) {
      headers['Authorization'] = `Bearer ${currentToken}`;
    }

    if (this.role) {
      headers['x-dev-role'] = this.role;
    }

    if (idempotencyKey) {
      headers['idempotency-key'] = idempotencyKey;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || 'Network error occurred');
    }

    return data;
  }

  // Auth
  async login(email: string, password: string) {
    return this.request<{ success: boolean; data: { token: string; user: any; business: any } }>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }
    );
  }

  async register(data: {
    businessName: string;
    name: string;
    email: string;
    password: string;
    mobile?: string;
  }) {
    return this.request<{ success: boolean; data: { token: string; user: any; business: any } }>(
      '/auth/register',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  }

  async getMe() {
    return this.request<{ success: boolean; data: { user: any; business: any } }>('/auth/me');
  }

  async completeOnboarding(data: {
    businessName?: string;
    ownerName?: string;
    mobile?: string;
    address?: string;
    logo?: string;
    timezone?: string;
    currency?: string;
    openingCash?: number;
    openingUpi?: number;
    openingBank?: number;
  }) {
    return this.request<{ success: boolean; data: any }>('/auth/setup', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Dashboard
  async getDashboardMetrics() {
    return this.request<{ success: boolean; data: any }>('/dashboard');
  }

  // Customers
  async getCustomers(
    params: {
      search?: string;
      active?: boolean;
      status?: 'ALL' | 'ACTIVE' | 'INACTIVE';
      shift?: string;
      locality?: string;
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    } = {}
  ) {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.active !== undefined) query.set('active', String(params.active));
    if (params.status) query.set('status', params.status);
    if (params.shift) query.set('shift', params.shift);
    if (params.locality) query.set('locality', params.locality);
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.sortBy) query.set('sortBy', params.sortBy);
    if (params.sortOrder) query.set('sortOrder', params.sortOrder);

    const q = query.toString() ? `?${query.toString()}` : '';
    return this.request<{ success: boolean; data: any[]; total: number }>(`/customers${q}`);
  }

  async getCustomerById(id: string) {
    return this.request<{ success: boolean; data: any }>(`/customers/${id}`);
  }

  async getCustomerByQr(token: string) {
    return this.request<{ success: boolean; data: any; today?: any }>(
      `/customers/qr/${encodeURIComponent(token)}`
    );
  }

  async createCustomer(data: any) {
    return this.request<{ success: boolean; data: any }>('/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCustomer(id: string, data: any) {
    return this.request<{ success: boolean; data: any }>(`/customers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deactivateCustomer(id: string, reason?: string) {
    return this.request<{ success: boolean; data: any }>(`/customers/${id}/deactivate`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async reactivateCustomer(id: string) {
    return this.request<{ success: boolean; data: any }>(`/customers/${id}/reactivate`, {
      method: 'POST',
    });
  }

  async deleteCustomer(id: string) {
    return this.request<{ success: boolean; message: string; canDeactivate?: boolean }>(`/customers/${id}`, {
      method: 'DELETE',
    });
  }

  async updateCustomerLocation(
    id: string,
    data: { latitude: number; longitude: number; accuracy?: number }
  ) {
    return this.request<{ success: boolean; data: any }>(`/customers/${id}/location`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async refundCustomerCredit(
    customerId: string,
    data: { amount: number; paymentMode: string; notes?: string }
  ) {
    return this.request<{ success: boolean; message: string; data: any }>(
      `/customers/${customerId}/refund-credit`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  }

  // QR Management
  async generateQRs(count: number = 1, prefix: string = 'MM-QR-') {
    return this.request<{ success: boolean; data: any[]; count: number }>('/qr/generate', {
      method: 'POST',
      body: JSON.stringify({ count, prefix }),
    });
  }

  async listQRs(params: { status?: string; page?: number; limit?: number } = {}) {
    const q = new URLSearchParams();
    if (params.status) q.set('status', params.status);
    if (params.page) q.set('page', String(params.page));
    if (params.limit) q.set('limit', String(params.limit));
    const query = q.toString() ? `?${q.toString()}` : '';
    return this.request<{ success: boolean; data: any[]; total: number }>(`/qr${query}`);
  }

  async resolveQR(qrCode: string) {
    return this.request<{ success: boolean; data: any }>(`/qr/${encodeURIComponent(qrCode)}`);
  }

  async assignQR(qrCode: string, customerId: string) {
    return this.request<{ success: boolean; message: string; data: any }>('/qr/assign', {
      method: 'POST',
      body: JSON.stringify({ qrCode, customerId }),
    });
  }

  // Deliveries
  async getDeliveries(
    params: {
      customerId?: string;
      date?: string;
      startDate?: string;
      endDate?: string;
      shift?: string;
      limit?: number;
    } = {}
  ) {
    const query = new URLSearchParams();
    if (params.customerId) query.set('customerId', params.customerId);
    if (params.date) query.set('date', params.date);
    if (params.startDate) query.set('startDate', params.startDate);
    if (params.endDate) query.set('endDate', params.endDate);
    if (params.shift) query.set('shift', params.shift);
    if (params.limit) query.set('limit', String(params.limit));

    const q = query.toString() ? `?${query.toString()}` : '';
    return this.request<{ success: boolean; data: any[] }>(`/deliveries${q}`);
  }

  async checkCustomerTodayDelivery(customerId: string) {
    const res = await this.request<{
      success: boolean;
      data: {
        hasDeliveryToday: boolean;
        todayDeliveriesCount: number;
        morningDelivered: boolean;
        eveningDelivered: boolean;
        deliveries: any[];
      };
    }>(`/deliveries/check-today/${customerId}`);
    return {
      ...res,
      hasDeliveryToday: res.data?.hasDeliveryToday || false,
      count: res.data?.todayDeliveriesCount || 0,
      morningDelivered: res.data?.morningDelivered || false,
      eveningDelivered: res.data?.eveningDelivered || false,
    };
  }

  async checkTodayDelivery(customerId: string) {
    return this.checkCustomerTodayDelivery(customerId);
  }

  async createDelivery(data: any, idempotencyKey?: string) {
    return this.request<{ success: boolean; data: any }>(
      '/deliveries',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      idempotencyKey
    );
  }

  async updateDelivery(id: string, data: any, idempotencyKey?: string) {
    return this.request<{ success: boolean; data: any }>(
      `/deliveries/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      },
      idempotencyKey
    );
  }

  async editDelivery(id: string, data: any, idempotencyKey?: string) {
    return this.updateDelivery(id, data, idempotencyKey);
  }

  async deleteDelivery(id: string) {
    return this.request<{ success: boolean; message: string }>(`/deliveries/${id}`, {
      method: 'DELETE',
    });
  }

  // GPS Route & Proximity
  async getRouteDeliveries(shift: string = 'MORNING', locality?: string) {
    const q = new URLSearchParams({ shift });
    if (locality) q.set('locality', locality);
    return this.request<{
      success: boolean;
      data: {
        shift: string;
        date: string;
        totalScheduled: number;
        deliveredCount: number;
        pendingCount: number;
        customers: any[];
      };
    }>(`/deliveries/route?${q.toString()}`);
  }

  async getNearbyCustomers(lat: number, lng: number, shift: string = 'MORNING', radius: number = 100) {
    const q = new URLSearchParams({
      lat: String(lat),
      lng: String(lng),
      shift,
      radius: String(radius),
    });
    return this.request<{
      success: boolean;
      data: any[];
      count: number;
      pendingNearbyCount: number;
    }>(`/deliveries/nearby?${q.toString()}`);
  }

  // Products
  async getProducts(params: { status?: 'ALL' | 'ACTIVE' | 'INACTIVE'; search?: string } = {}) {
    const query = new URLSearchParams();
    if (params.status) query.set('status', params.status);
    if (params.search) query.set('search', params.search);
    const q = query.toString() ? `?${query.toString()}` : '';
    return this.request<{ success: boolean; data: any[] }>(`/products${q}`);
  }

  async createProduct(data: any) {
    return this.request<{ success: boolean; data: any }>('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProduct(id: string, data: any) {
    return this.request<{ success: boolean; data: any }>(`/products/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteProduct(id: string) {
    return this.request<{ success: boolean; message: string; canDeactivate?: boolean }>(`/products/${id}`, {
      method: 'DELETE',
    });
  }

  async activateProduct(id: string) {
    return this.request<{ success: boolean; data: any; message: string }>(`/products/${id}/activate`, {
      method: 'POST',
    });
  }

  async deactivateProduct(id: string) {
    return this.request<{ success: boolean; data: any; message: string }>(`/products/${id}/deactivate`, {
      method: 'POST',
    });
  }

  async getCustomerRates(customerId: string) {
    return this.request<{ success: boolean; data: any[] }>(`/products/customer/${customerId}/rates`);
  }

  async setCustomerRate(data: { customer_id: string; product_id: string; custom_rate: number }) {
    return this.request<{ success: boolean; data: any }>('/products/rates', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Purchases
  async getPurchases() {
    return this.request<{ success: boolean; data: any[] }>('/purchases');
  }

  async createPurchase(data: any, idempotencyKey?: string) {
    return this.request<{ success: boolean; data: any }>(
      '/purchases',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      idempotencyKey
    );
  }

  async deletePurchase(id: string) {
    return this.request<{ success: boolean; message: string }>(`/purchases/${id}`, {
      method: 'DELETE',
    });
  }

  // Purchase Returns
  async getPurchaseReturns() {
    return this.request<{ success: boolean; data: any[] }>('/purchases/returns');
  }

  async createPurchaseReturn(data: any) {
    return this.request<{ success: boolean; message?: string; data: any }>('/purchases/returns', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Suppliers
  async getSuppliers(params: { search?: string; active?: boolean } = {}) {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.active !== undefined) query.set('active', String(params.active));
    const q = query.toString() ? `?${query.toString()}` : '';
    return this.request<{ success: boolean; data: any[] }>(`/suppliers${q}`);
  }

  async getSupplierById(id: string) {
    return this.request<{ success: boolean; data: any }>(`/suppliers/${id}`);
  }

  async getSupplierLedger(id: string) {
    return this.request<{ success: boolean; data: any }>(`/suppliers/${id}/ledger`);
  }

  async createSupplier(data: {
    name: string;
    mobile: string;
    address?: string;
    notes?: string;
    opening_payable?: number;
  }) {
    return this.request<{ success: boolean; data: any }>('/suppliers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateSupplier(id: string, data: any) {
    return this.request<{ success: boolean; data: any }>(`/suppliers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteSupplier(id: string) {
    return this.request<{ success: boolean; message: string }>(`/suppliers/${id}`, {
      method: 'DELETE',
    });
  }

  // Supplier Payments
  async getSupplierPayments(
    params: { supplier_id?: string; start_date?: string; end_date?: string } = {}
  ) {
    const query = new URLSearchParams();
    if (params.supplier_id) query.set('supplier_id', params.supplier_id);
    if (params.start_date) query.set('start_date', params.start_date);
    if (params.end_date) query.set('end_date', params.end_date);
    const q = query.toString() ? `?${query.toString()}` : '';
    return this.request<{ success: boolean; data: any[] }>(`/supplier-payments${q}`);
  }

  async createSupplierPayment(
    data: {
      supplier_id: string;
      amount: number;
      payment_date: string;
      payment_method: string;
      reference_number?: string;
      notes?: string;
    },
    idempotencyKey?: string
  ) {
    return this.request<{ success: boolean; data: any }>(
      '/supplier-payments',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      idempotencyKey
    );
  }

  async deleteSupplierPayment(id: string) {
    return this.request<{ success: boolean; message: string }>(`/supplier-payments/${id}`, {
      method: 'DELETE',
    });
  }

  // Expenses
  async getExpenses(params: { category?: string; start_date?: string; end_date?: string } = {}) {
    const query = new URLSearchParams();
    if (params.category) query.set('category', params.category);
    if (params.start_date) query.set('start_date', params.start_date);
    if (params.end_date) query.set('end_date', params.end_date);
    const q = query.toString() ? `?${query.toString()}` : '';
    return this.request<{ success: boolean; data: any[] }>(`/expenses${q}`);
  }

  async createExpense(data: {
    category: string;
    description: string;
    amount: number;
    expense_date: string;
    payment_method: string;
    notes?: string;
  }) {
    return this.request<{ success: boolean; data: any }>('/expenses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateExpense(id: string, data: any) {
    return this.request<{ success: boolean; data: any }>(`/expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteExpense(id: string) {
    return this.request<{ success: boolean; message: string }>(`/expenses/${id}`, {
      method: 'DELETE',
    });
  }

  // Payments (Customer)
  async getPayments(
    params?: string | { customerId?: string; startDate?: string; endDate?: string }
  ) {
    if (typeof params === 'string') {
      const q = params ? `?customerId=${encodeURIComponent(params)}` : '';
      return this.request<{ success: boolean; data: any[] }>(`/payments${q}`);
    }
    const query = new URLSearchParams();
    if (params?.customerId) query.set('customerId', params.customerId);
    if (params?.startDate) query.set('startDate', params.startDate);
    if (params?.endDate) query.set('endDate', params.endDate);
    const q = query.toString() ? `?${query.toString()}` : '';
    return this.request<{ success: boolean; data: any[] }>(`/payments${q}`);
  }

  async createPayment(
    data: {
      customer_id: string;
      amount: number;
      payment_method: string;
      payment_date?: string;
      paid_at?: string;
      reference_number?: string;
      notes?: string;
    },
    idempotencyKey?: string
  ) {
    return this.request<{ success: boolean; data: any }>(
      '/payments',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      idempotencyKey
    );
  }

  async updatePayment(
    paymentId: string,
    data: {
      amount?: number;
      payment_method?: string;
      paymentMode?: string;
      payment_date?: string;
      reference_number?: string;
      referenceNumber?: string;
      notes?: string;
    }
  ) {
    return this.request<{ success: boolean; data: any; message?: string }>(
      `/payments/${paymentId}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    );
  }

  async deletePayment(paymentId: string) {
    return this.request<{ success: boolean; message?: string }>(`/payments/${paymentId}`, {
      method: 'DELETE',
    });
  }

  // Statements / Bills
  async getStatement(customerId: string, startDate?: string, endDate?: string) {
    const query = new URLSearchParams({ customerId });
    if (startDate) query.set('startDate', startDate);
    if (endDate) query.set('endDate', endDate);

    return this.request<{ success: boolean; data: any }>(`/bills/statement?${query.toString()}`);
  }

  async getAccountBalances() {
    return this.request<{ success: boolean; data: any }>('/reports/accounts');
  }

  // Other Reports
  async getDailyReport(date?: string) {
    const q = date ? `?date=${date}` : '';
    return this.request<{ success: boolean; data: any }>(`/reports/daily${q}`);
  }

  async getProductReport() {
    return this.request<{ success: boolean; data: any[] }>('/reports/products');
  }

  async getCustomerReport(params?: { status?: string; includeInactive?: boolean }) {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.includeInactive) query.set('includeInactive', 'true');
    const q = query.toString() ? `?${query.toString()}` : '';
    return this.request<{ success: boolean; data: any[] }>(`/reports/customers${q}`);
  }

  // Settings & Staff
  async getSettings() {
    return this.request<{ success: boolean; data: any }>('/settings');
  }

  async updateSettings(data: any) {
    return this.request<{ success: boolean; data: any }>('/settings', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async getStaff() {
    return this.request<{ success: boolean; data: any[] }>('/settings/staff');
  }

  async addStaff(data: any) {
    return this.request<{ success: boolean; data: any }>('/settings/staff', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // CSV Exports
  async downloadExport(type: string) {
    const headers: Record<string, string> = {};
    const currentToken = this.getToken();
    if (currentToken) {
      headers['Authorization'] = `Bearer ${currentToken}`;
    }
    if (this.role) {
      headers['x-dev-role'] = this.role;
    }

    const response = await fetch(`${API_BASE_URL}/exports/${type}`, {
      headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to export ${type}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `milk_and_more_${type}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  // ---------------------------------------------------------------------------
  // DOUBLE-ENTRY ACCOUNTING & MILK & MORE FINANCIAL BOOKS
  // ---------------------------------------------------------------------------
  async getChartOfAccounts() {
    return this.request<{ success: boolean; data: any[] }>('/accounting/chart-of-accounts');
  }

  async getGeneralLedger(params?: {
    accountCode?: string;
    startDate?: string;
    endDate?: string;
    partyId?: string;
  }) {
    const q = new URLSearchParams();
    if (params?.accountCode) q.append('accountCode', params.accountCode);
    if (params?.startDate) q.append('startDate', params.startDate);
    if (params?.endDate) q.append('endDate', params.endDate);
    if (params?.partyId) q.append('partyId', params.partyId);
    return this.request<{ success: boolean; data: any }>(`/accounting/general-ledger?${q.toString()}`);
  }

  async getJournalEntries(params?: {
    startDate?: string;
    endDate?: string;
    sourceType?: string;
    limit?: number;
  }) {
    const q = new URLSearchParams();
    if (params?.startDate) q.append('startDate', params.startDate);
    if (params?.endDate) q.append('endDate', params.endDate);
    if (params?.sourceType) q.append('sourceType', params.sourceType);
    if (params?.limit) q.append('limit', String(params.limit));
    return this.request<{ success: boolean; data: any[] }>(`/accounting/journal-entries?${q.toString()}`);
  }

  async getTrialBalance(asOfDate?: string) {
    const q = asOfDate ? `?asOfDate=${asOfDate}` : '';
    return this.request<{ success: boolean; data: any }>(`/accounting/trial-balance${q}`);
  }

  async getProfitAndLoss(startDate?: string, endDate?: string) {
    const q = new URLSearchParams();
    if (startDate) q.append('startDate', startDate);
    if (endDate) q.append('endDate', endDate);
    return this.request<{ success: boolean; data: any }>(`/accounting/profit-loss?${q.toString()}`);
  }

  async getBalanceSheet(asOfDate?: string) {
    const q = asOfDate ? `?asOfDate=${asOfDate}` : '';
    return this.request<{ success: boolean; data: any }>(`/accounting/balance-sheet${q}`);
  }

  async getCashBook(startDate?: string, endDate?: string) {
    const q = new URLSearchParams();
    if (startDate) q.append('startDate', startDate);
    if (endDate) q.append('endDate', endDate);
    return this.request<{ success: boolean; data: any }>(`/accounting/cash-book?${q.toString()}`);
  }

  async getBankUpiLedger(type: 'BANK' | 'UPI' = 'BANK', startDate?: string, endDate?: string) {
    const q = new URLSearchParams({ type });
    if (startDate) q.append('startDate', startDate);
    if (endDate) q.append('endDate', endDate);
    return this.request<{ success: boolean; data: any }>(`/accounting/bank-upi-ledger?${q.toString()}`);
  }

  async getDayBook(date?: string) {
    const q = date ? `?date=${date}` : '';
    return this.request<{ success: boolean; data: any }>(`/accounting/day-book${q}`);
  }

  async getReceivableAgeing() {
    return this.request<{ success: boolean; data: any }>('/accounting/receivable-ageing');
  }

  async getPayableAgeing() {
    return this.request<{ success: boolean; data: any }>('/accounting/payable-ageing');
  }

  async recordTransfer(data: {
    fromAccount: 'CASH' | 'BANK' | 'UPI';
    toAccount: 'CASH' | 'BANK' | 'UPI';
    amount: number;
    date?: string;
    notes?: string;
  }) {
    return this.request<{ success: boolean; message: string; data: any }>('/accounting/transfer', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getReconciliation() {
    return this.request<{ success: boolean; data: any }>('/accounting/reconciliation');
  }

  // Customer QR Portal
  async getCustomerPortalInfo(token: string) {
    return this.request<{
      success: boolean;
      data: {
        valid: boolean;
        maskedMobile: string;
        businessName: string;
        token: string;
      };
    }>(`/customer-portal/verify-info/${encodeURIComponent(token)}`);
  }

  async requestCustomerPortalOtp(token: string) {
    return this.request<{
      success: boolean;
      message: string;
      cooldownSeconds: number;
    }>('/customer-portal/request-otp', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  async verifyCustomerPortalOtp(token: string, otp: string) {
    return this.request<{
      success: boolean;
      sessionToken: string;
      message: string;
    }>('/customer-portal/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ token, otp }),
    });
  }

  async getCustomerPortalProfile(sessionToken?: string) {
    const headers: Record<string, string> = {};
    if (sessionToken) headers['Authorization'] = `Bearer ${sessionToken}`;
    return this.request<{ success: boolean; data: any }>('/customer-portal/me', { headers });
  }

  async getCustomerPortalToday(sessionToken?: string) {
    const headers: Record<string, string> = {};
    if (sessionToken) headers['Authorization'] = `Bearer ${sessionToken}`;
    return this.request<{ success: boolean; data: any }>('/customer-portal/today', { headers });
  }

  async getCustomerPortalDeliveries(sessionToken?: string) {
    const headers: Record<string, string> = {};
    if (sessionToken) headers['Authorization'] = `Bearer ${sessionToken}`;
    return this.request<{ success: boolean; data: { totalDeliveries: number; items: any[] } }>(
      '/customer-portal/deliveries',
      { headers }
    );
  }

  async getCustomerPortalPayments(sessionToken?: string) {
    const headers: Record<string, string> = {};
    if (sessionToken) headers['Authorization'] = `Bearer ${sessionToken}`;
    return this.request<{ success: boolean; data: any[] }>('/customer-portal/payments', { headers });
  }

  async getCustomerPortalStatement(sessionToken?: string) {
    const headers: Record<string, string> = {};
    if (sessionToken) headers['Authorization'] = `Bearer ${sessionToken}`;
    return this.request<{ success: boolean; data: any }>('/customer-portal/statement', { headers });
  }

  async customerPortalLogout() {
    return this.request<{ success: boolean; message: string }>('/customer-portal/logout', {
      method: 'POST',
    });
  }

  // Admin Customer QR Actions
  async regenerateCustomerQr(customerId: string) {
    return this.request<{
      success: boolean;
      message: string;
      data: { customerPortalToken: string };
    }>(`/customers/${customerId}/regenerate-qr`, {
      method: 'POST',
    });
  }

  async revokeCustomerQr(customerId: string) {
    return this.request<{ success: boolean; message: string }>(
      `/customers/${customerId}/revoke-qr`,
      {
        method: 'POST',
      }
    );
  }
}

export const api = new ApiService();
